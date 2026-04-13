import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { ensureRole, getAuthContext, optionsResponse } from "../../../shared/src/auth";
import { handleError, parseJson } from "../../../shared/src/http";
import { broadcastRealtime } from "../../../shared/src/realtime";
import { json } from "../../../shared/src/response";
import { attendanceSchema } from "../../../shared/src/validation";
import {
  batchGetEvents,
  batchGetUsers,
  buildAttendanceId,
  ensureUserFromAuthContext,
  getEventById,
  getRegistrationById,
  listAttendanceByEvent,
  listAttendanceByStudent,
  listRegistrationsByStudent,
  saveRegistration,
  upsertAttendance
} from "../../../shared/src/dynamo-repository";

function getStaffAssignmentIds(event: Awaited<ReturnType<typeof getEventById>>) {
  return Array.isArray(event?.staff_assignments)
    ? event.staff_assignments.map((item) => item.user_id).filter(Boolean)
    : [];
}

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    if (event.httpMethod === "OPTIONS") {
      return optionsResponse();
    }

    const auth = getAuthContext(event);
    const actor = await ensureUserFromAuthContext(auth);

    if (event.httpMethod === "GET" && event.path === "/attendance") {
      ensureRole(auth.role, ["teacher", "admin"]);
      const eventId = event.queryStringParameters?.event_id;

      if (!eventId) {
        return json(400, { message: "event_id is required" });
      }

      const targetEvent = await getEventById(eventId);
      if (!targetEvent) {
        return json(404, { message: "Event not found" });
      }

      if (
        auth.role === "teacher" &&
        targetEvent.created_by !== actor.id &&
        targetEvent.created_by !== actor.cognito_sub &&
        !getStaffAssignmentIds(targetEvent).includes(actor.id) &&
        !getStaffAssignmentIds(targetEvent).includes(actor.cognito_sub)
      ) {
        return json(403, { message: "Teachers can only access attendance for their own events or joined staff events" });
      }

      const items = await listAttendanceByEvent(eventId);
      const users = await batchGetUsers(items.map((item) => item.student_id));
      const userMap = new Map(users.map((user) => [user.id, user]));

      return json(200, {
        items: items.map((item) => ({
          ...item,
          status: item.status ?? "present",
          full_name: userMap.get(item.student_id)?.full_name ?? null,
          email: userMap.get(item.student_id)?.email ?? null
        }))
      });
    }

    if (event.httpMethod === "GET" && event.path === "/attendance/me") {
      ensureRole(auth.role, ["student"]);
      const [attendanceItems, registrations] = await Promise.all([
        listAttendanceByStudent(actor.id),
        listRegistrationsByStudent(actor.id)
      ]);
      const events = await batchGetEvents([
        ...attendanceItems.map((item) => item.event_id),
        ...registrations.map((item) => item.event_id)
      ]);
      const eventMap = new Map(events.map((item) => [item.id, item]));
      const markers = await batchGetUsers(attendanceItems.map((item) => item.marked_by));
      const markerMap = new Map(markers.map((item) => [item.id, item]));
      const attendanceMap = new Map(attendanceItems.map((item) => [item.event_id, item]));

      const items = registrations.map((registration) => {
        const eventDetails = eventMap.get(registration.event_id);
        const attendance = attendanceMap.get(registration.event_id);
        return {
          eventId: registration.event_id,
          registrationStatus: registration.status,
          title: eventDetails?.title ?? null,
          venue: eventDetails?.venue ?? null,
          eventDate: eventDetails?.event_date ?? null,
          eventType: eventDetails?.event_type ?? null,
          startTime: eventDetails?.start_time ?? null,
          endTime: eventDetails?.end_time ?? null,
          posterUrl: eventDetails?.poster_url ?? null,
          status: attendance?.status ?? "not_marked",
          markedAt: attendance?.marked_at ?? null,
          markedBy: markerMap.get(attendance?.marked_by ?? "")?.full_name ?? null
        };
      });

      return json(200, { items });
    }

    if (event.httpMethod === "POST" && event.path === "/attendance") {
      ensureRole(auth.role, ["teacher", "admin"]);
      const data = attendanceSchema.parse(parseJson(event.body));
      const targetEvent = await getEventById(data.eventId);
      if (!targetEvent) {
        return json(404, { message: "Event not found" });
      }

      if (
        auth.role === "teacher" &&
        targetEvent.created_by !== actor.id &&
        targetEvent.created_by !== actor.cognito_sub &&
        !getStaffAssignmentIds(targetEvent).includes(actor.id) &&
        !getStaffAssignmentIds(targetEvent).includes(actor.cognito_sub)
      ) {
        return json(403, { message: "Teachers can only mark attendance for their own events or joined staff events" });
      }

      const attendance = await upsertAttendance({
        id: buildAttendanceId(data.eventId, data.studentId),
        event_id: data.eventId,
        student_id: data.studentId,
        marked_by: actor.id,
        marked_at: new Date().toISOString(),
        method: data.method,
        status: data.status
      });

      const registration = await getRegistrationById(`${data.eventId}#${data.studentId}`);
      if (registration) {
        await saveRegistration({
          ...registration,
          status: data.status === "present" ? "attended" : "registered"
        });
      }

      await broadcastRealtime("attendance_submitted", {
        eventId: data.eventId,
        studentId: data.studentId,
        status: data.status,
        markedBy: actor.full_name,
        markedAt: attendance.marked_at
      });

      return json(200, attendance);
    }

    return json(404, { message: "Route not found" });
  } catch (error) {
    return handleError(error);
  }
}
