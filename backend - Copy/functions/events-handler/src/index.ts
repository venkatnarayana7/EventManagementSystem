import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { dynamoClient } from "../../../shared/src/aws";
import { ensureRole, getAuthContext, optionsResponse } from "../../../shared/src/auth";
import { env } from "../../../shared/src/env";
import { handleError, parseJson } from "../../../shared/src/http";
import { broadcastRealtime } from "../../../shared/src/realtime";
import { json } from "../../../shared/src/response";
import { serializeEvent, serializeRegistration } from "../../../shared/src/serializers";
import { eventSchema } from "../../../shared/src/validation";
import {
  batchGetSeatCounters,
  batchGetUsers,
  createEvent,
  ensureUserFromAuthContext,
  getEventById,
  getRegistrationById,
  getUserByCognitoSub,
  listEvents,
  listRegistrationsByEvent,
  saveEvent,
  type EventRecord
} from "../../../shared/src/dynamo-repository";

function getStaffAssignments(event: EventRecord) {
  return Array.isArray(event.staff_assignments) ? event.staff_assignments : [];
}

function getStaffAssignmentIds(event: EventRecord) {
  return getStaffAssignments(event).map((item) => item.user_id).filter(Boolean);
}

function isAssignedStaff(event: EventRecord, userId?: string | null) {
  return Boolean(userId) && getStaffAssignmentIds(event).includes(String(userId));
}

function buildAssignedStaffPayload(
  event: EventRecord,
  users: Array<{ id: string; full_name: string; email: string }>
) {
  return getStaffAssignments(event).map((assignment) => {
    const user = users.find((item) => item.id === assignment.user_id);
    return {
      id: assignment.user_id,
      fullName: user?.full_name ?? "Teacher",
      email: user?.email ?? null,
      joinedAt: assignment.joined_at
    };
  });
}

function withOrganizerName(
  event: EventRecord,
  organizerName?: string | null,
  myRegistrationStatus?: string | null,
  assignedStaff?: Array<Record<string, unknown>>,
  waitlistCount?: number | null
) {
  return serializeEvent({
    ...event,
    organizer_name: organizerName ?? null,
    my_registration_status: myRegistrationStatus ?? null,
    assigned_staff: assignedStaff ?? [],
    waitlist_count: waitlistCount ?? 0
  });
}

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    if (event.httpMethod === "OPTIONS") {
      return optionsResponse();
    }

    const auth = getAuthContext(event);
    const actor = await ensureUserFromAuthContext(auth);

    if (event.httpMethod === "GET" && event.path === "/events") {
      const statusFilter = event.queryStringParameters?.status;
      const mineFilter = event.queryStringParameters?.mine === "true";
      let items = await listEvents();

      if (statusFilter) {
        items = items.filter((item) => item.status === statusFilter);
      } else if (auth.role === "student") {
        items = items.filter((item) => item.status === "approved");
      }

      if (mineFilter && auth.role === "teacher") {
        items = items.filter((item) => item.created_by === actor.id || item.created_by === actor.cognito_sub);
      }

      const relatedUsers = await batchGetUsers([
        ...items.map((item) => item.created_by),
        ...items.flatMap((item) => getStaffAssignmentIds(item))
      ]);
      const seatCounters = await batchGetSeatCounters(items.map((item) => item.id));
      const organizerMap = new Map(relatedUsers.map((user) => [user.id, user.full_name] as const));
      const seatCounterMap = new Map(seatCounters.map((item) => [item.event_id, item]));

      const registrationMap = new Map<string, string>();
      if (auth.role === "student") {
        const registrationIds = items.map((item) => `${item.id}#${actor.id}`);
        const registrations = await Promise.all(registrationIds.map((id) => getRegistrationById(id)));
        registrations
          .filter((item): item is NonNullable<typeof item> => Boolean(item))
          .forEach((item) => {
            registrationMap.set(item.event_id, item.status);
          });
      }

      return json(200, {
        items: items.map((item) =>
          withOrganizerName(
            item,
            organizerMap.get(item.created_by),
            registrationMap.get(item.id) ?? null,
            buildAssignedStaffPayload(item, relatedUsers),
            seatCounterMap.get(item.id)?.waitlist_count ?? 0
          )
        )
      });
    }

    if (event.httpMethod === "GET" && event.path.endsWith("/registrations") && event.pathParameters?.id) {
      ensureRole(auth.role, ["admin", "teacher"]);

      const targetEvent = await getEventById(event.pathParameters.id);
      if (!targetEvent) {
        return json(404, { message: "Event not found" });
      }

      if (
        auth.role === "teacher" &&
        targetEvent.created_by !== actor.id &&
        targetEvent.created_by !== actor.cognito_sub &&
        !isAssignedStaff(targetEvent, actor.id) &&
        !isAssignedStaff(targetEvent, actor.cognito_sub)
      ) {
        return json(403, { message: "Teachers can only inspect registrations for their own events or joined staff events" });
      }

      const registrations = await listRegistrationsByEvent(event.pathParameters.id);
      const students = await batchGetUsers(registrations.map((item) => item.student_id));
      const studentMap = new Map(students.map((student) => [student.id, student]));

      return json(200, {
        items: registrations.map((registration) =>
          serializeRegistration({
            ...registration,
            student_name: studentMap.get(registration.student_id)?.full_name ?? null,
            student_email: studentMap.get(registration.student_id)?.email ?? null,
            student_roll_no: studentMap.get(registration.student_id)?.roll_no ?? null,
            student_department: studentMap.get(registration.student_id)?.department ?? null
          })
        )
      });
    }

    if (event.httpMethod === "GET" && event.pathParameters?.id) {
      const targetEvent = await getEventById(event.pathParameters.id);
      if (!targetEvent) {
        return json(404, { message: "Event not found" });
      }

      const organizer = await getUserByCognitoSub(targetEvent.created_by);
      const assignedStaffUsers = await batchGetUsers(getStaffAssignmentIds(targetEvent));
      const seatCounter = await batchGetSeatCounters([targetEvent.id]);
      const registration =
        auth.role === "student" ? await getRegistrationById(`${targetEvent.id}#${actor.id}`) : null;

      return json(
        200,
        withOrganizerName(
          targetEvent,
          organizer.full_name,
          registration?.status ?? null,
          buildAssignedStaffPayload(targetEvent, assignedStaffUsers),
          seatCounter[0]?.waitlist_count ?? 0
        )
      );
    }

    if (event.httpMethod === "POST" && event.path === "/events") {
      ensureRole(auth.role, ["admin", "teacher"]);
      const data = eventSchema.parse(parseJson(event.body));
      const item = await createEvent({
        title: data.title,
        description: data.description,
        event_type: data.eventType,
        status:
          data.status ??
          (auth.role === "admin" ? "approved" : "pending_approval"),
        price: data.price ?? 0,
        created_by: actor.id,
        approved_by:
          (data.status ?? (auth.role === "admin" ? "approved" : "pending_approval")) === "approved"
            ? actor.id
            : null,
        venue: data.venue,
        event_date: data.eventDate,
        start_time: data.startTime,
        end_time: data.endTime,
        max_capacity: data.maxCapacity,
        current_count: 0,
        registration_deadline: data.registrationDeadline ?? null,
        poster_url: data.posterUrl ?? null,
        is_public: data.isPublic,
        department_filter: data.departmentFilter ?? null,
        tags: data.tags,
        staff_assignments: [],
        rejection_reason: null
      });

      await dynamoClient.send(
        new PutCommand({
          TableName: env.seatCounterTable,
          Item: {
            event_id: item.id,
            current_count: 0,
            max_capacity: data.maxCapacity,
            waitlist_count: 0,
            last_updated: new Date().toISOString()
          }
        })
      );

      if (item.status === "approved") {
        await broadcastRealtime("event_approved", {
          eventId: item.id,
          eventTitle: item.title,
          eventDate: item.event_date,
          category: item.event_type
        });
      } else {
        await broadcastRealtime("event_submitted", {
          eventId: item.id,
          eventTitle: item.title,
          teacherName: actor.full_name
        }, { type: "portal", portal: "admin" });
      }

      return json(201, withOrganizerName(item, actor.full_name));
    }

    if (event.httpMethod === "PUT" && event.pathParameters?.id && event.path.endsWith("/approve")) {
      ensureRole(auth.role, ["admin"]);
      const targetEvent = await getEventById(event.pathParameters.id);

      if (!targetEvent) {
        return json(404, { message: "Event not found" });
      }

      const updated = await saveEvent({
        ...targetEvent,
        status: "approved",
        approved_by: actor.id,
        rejection_reason: null
      });

      await broadcastRealtime("event_approved", {
        eventId: updated.id,
        eventTitle: updated.title,
        eventDate: updated.event_date,
        category: updated.event_type
      });

      return json(200, withOrganizerName(updated, actor.full_name));
    }

    if (event.httpMethod === "PUT" && event.pathParameters?.id && event.path.endsWith("/reject")) {
      ensureRole(auth.role, ["admin"]);
      const body = parseJson<{ reason?: string }>(event.body);
      const targetEvent = await getEventById(event.pathParameters.id);

      if (!targetEvent) {
        return json(404, { message: "Event not found" });
      }

      const updated = await saveEvent({
        ...targetEvent,
        status: "rejected",
        rejection_reason: body.reason ?? "Rejected by admin"
      });

      await broadcastRealtime("event_rejected", {
        eventId: updated.id,
        eventTitle: updated.title,
        reason: updated.rejection_reason
      });

      return json(200, withOrganizerName(updated));
    }

    if (event.httpMethod === "PUT" && event.pathParameters?.id && event.path.endsWith("/staff/join")) {
      ensureRole(auth.role, ["teacher"]);
      const existing = await getEventById(event.pathParameters.id);

      if (!existing) {
        return json(404, { message: "Event not found" });
      }

      if (existing.created_by === actor.id || existing.created_by === actor.cognito_sub) {
        return json(400, { message: "Event owner does not need to join as staff" });
      }

      if (existing.status !== "approved") {
        return json(400, { message: "Only approved events are open for staff joining" });
      }

      const nextAssignments = [...getStaffAssignments(existing)];
      if (!isAssignedStaff(existing, actor.id) && !isAssignedStaff(existing, actor.cognito_sub)) {
        nextAssignments.push({
          user_id: actor.id,
          joined_at: new Date().toISOString()
        });
      }

      const updated = await saveEvent({
        ...existing,
        staff_assignments: nextAssignments
      });

      const assignedStaffUsers = await batchGetUsers(getStaffAssignmentIds(updated));
      const organizer = await getUserByCognitoSub(updated.created_by);
      const seatCounter = await batchGetSeatCounters([updated.id]);
      await broadcastRealtime("staff_joined", {
        eventId: updated.id,
        eventTitle: updated.title,
        teacherId: actor.id,
        teacherName: actor.full_name
      });
      return json(200, withOrganizerName(updated, organizer.full_name, null, buildAssignedStaffPayload(updated, assignedStaffUsers), seatCounter[0]?.waitlist_count ?? 0));
    }

    if (event.httpMethod === "PUT" && event.pathParameters?.id) {
      ensureRole(auth.role, ["admin", "teacher"]);
      const data = eventSchema.partial().parse(parseJson(event.body));
      const existing = await getEventById(event.pathParameters.id);

      if (!existing) {
        return json(404, { message: "Event not found" });
      }

      if (auth.role === "teacher" && existing.created_by !== actor.id) {
        return json(403, { message: "Teachers can only update their own events" });
      }

      const updated = await saveEvent({
        ...existing,
        title: data.title ?? existing.title,
        description: data.description ?? existing.description,
        event_type: data.eventType ?? existing.event_type,
        status: data.status ?? existing.status,
        price: data.price ?? existing.price ?? 0,
        venue: data.venue ?? existing.venue,
        event_date: data.eventDate ?? existing.event_date,
        start_time: data.startTime ?? existing.start_time,
        end_time: data.endTime ?? existing.end_time,
        max_capacity: data.maxCapacity ?? existing.max_capacity,
        registration_deadline: data.registrationDeadline ?? existing.registration_deadline,
        poster_url: data.posterUrl ?? existing.poster_url,
        department_filter: data.departmentFilter ?? existing.department_filter,
        is_public: data.isPublic ?? existing.is_public,
        tags: data.tags ?? existing.tags,
        staff_assignments: getStaffAssignments(existing)
      });

      return json(200, withOrganizerName(updated));
    }

    return json(404, { message: "Route not found" });
  } catch (error) {
    return handleError(error);
  }
}
