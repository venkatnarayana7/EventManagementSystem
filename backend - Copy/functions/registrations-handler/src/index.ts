import { ConditionalCheckFailedException } from "@aws-sdk/client-dynamodb";
import { GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { dynamoClient } from "../../../shared/src/aws";
import { ensureRole, getAuthContext, optionsResponse } from "../../../shared/src/auth";
import { env } from "../../../shared/src/env";
import { handleError, parseJson } from "../../../shared/src/http";
import { broadcastRealtime } from "../../../shared/src/realtime";
import { json } from "../../../shared/src/response";
import { serializeRegistration } from "../../../shared/src/serializers";
import { registrationSchema } from "../../../shared/src/validation";
import {
  adjustEventCurrentCount,
  batchGetEvents,
  batchGetSeatCounters,
  batchGetUsers,
  buildRegistrationId,
  ensureUserFromAuthContext,
  getEventById,
  getRegistrationById,
  getSeatCounterByEvent,
  listRegistrationsByEvent,
  listAttendanceByStudent,
  listRegistrationsByStudent,
  putRegistration,
  saveRegistration,
  type RegistrationRecord
} from "../../../shared/src/dynamo-repository";

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    if (event.httpMethod === "OPTIONS") {
      return optionsResponse();
    }

    const auth = getAuthContext(event);
    ensureRole(auth.role, ["student", "teacher", "admin"]);
    const actor = await ensureUserFromAuthContext(auth);

    if (event.httpMethod === "GET" && event.path === "/registrations/me") {
      const registrations = await listRegistrationsByStudent(actor.id);
      const events = await batchGetEvents(registrations.map((item) => item.event_id));
      const eventMap = new Map(events.map((item) => [item.id, item]));
      const organizers = await batchGetUsers(events.map((item) => item.created_by));
      const organizerMap = new Map(organizers.map((item) => [item.id, item]));
      const attendance = await listAttendanceByStudent(actor.id);
      const attendanceMap = new Map(attendance.map((item) => [item.event_id, item]));
      const seatCounters = await batchGetSeatCounters(registrations.map((item) => item.event_id));
      const seatCounterMap = new Map(seatCounters.map((item) => [item.event_id, item]));
      const registrationLists = await Promise.all(
        registrations
          .filter((item) => item.status === "waitlisted")
          .map(async (item) => [item.event_id, await listRegistrationsByEvent(item.event_id)] as const)
      );
      const waitlistMap = new Map(
        registrationLists.map(([eventId, items]) => {
          const activeWaitlist = items
            .filter((item) => item.status === "waitlisted")
            .sort((left, right) => String(left.registered_at).localeCompare(String(right.registered_at)));
          const position = activeWaitlist.findIndex((item) => item.student_id === actor.id);
          return [eventId, position >= 0 ? position + 1 : null] as const;
        })
      );

      return json(200, {
        items: registrations.map((registration) =>
          serializeRegistration({
            ...registration,
            title: eventMap.get(registration.event_id)?.title ?? null,
            event_date: eventMap.get(registration.event_id)?.event_date ?? null,
            venue: eventMap.get(registration.event_id)?.venue ?? null,
            event_type: eventMap.get(registration.event_id)?.event_type ?? null,
            start_time: eventMap.get(registration.event_id)?.start_time ?? null,
            end_time: eventMap.get(registration.event_id)?.end_time ?? null,
            price: eventMap.get(registration.event_id)?.price ?? 0,
            poster_url: eventMap.get(registration.event_id)?.poster_url ?? null,
            organizer_name: organizerMap.get(eventMap.get(registration.event_id)?.created_by ?? "")?.full_name ?? null,
            max_capacity: eventMap.get(registration.event_id)?.max_capacity ?? 0,
            current_count: eventMap.get(registration.event_id)?.current_count ?? 0,
            waitlist_count: seatCounterMap.get(registration.event_id)?.waitlist_count ?? 0,
            waitlist_position: waitlistMap.get(registration.event_id) ?? null,
            attendance_status: attendanceMap.get(registration.event_id)?.status ?? null,
            marked_at: attendanceMap.get(registration.event_id)?.marked_at ?? null,
            marked_by: attendanceMap.get(registration.event_id)?.marked_by ?? null
          })
        )
      });
    }

    if (event.httpMethod === "POST" && event.path === "/registrations") {
      ensureRole(auth.role, ["student"]);
      const data = registrationSchema.parse(parseJson(event.body));
      const targetEvent = await getEventById(data.eventId);

      if (!targetEvent) {
        return json(404, { message: "Event not found" });
      }

      if (targetEvent.status !== "approved") {
        return json(400, { message: "This event is not open for registrations" });
      }

      if (
        targetEvent.registration_deadline &&
        new Date(targetEvent.registration_deadline).getTime() < Date.now()
      ) {
        return json(400, { message: "Registration deadline has passed" });
      }

      const counter = await dynamoClient.send(
        new GetCommand({
          TableName: env.seatCounterTable,
          Key: { event_id: data.eventId }
        })
      );

      if (!counter.Item) {
        return json(500, { message: "Seat counter is not initialized for this event" });
      }

      let registrationStatus: RegistrationRecord["status"] = "registered";

      try {
        await dynamoClient.send(
          new UpdateCommand({
            TableName: env.seatCounterTable,
            Key: { event_id: data.eventId },
            ConditionExpression: "current_count < max_capacity",
            UpdateExpression: "ADD current_count :increment SET last_updated = :updatedAt",
            ExpressionAttributeValues: {
              ":increment": 1,
              ":updatedAt": new Date().toISOString()
            }
          })
        );
      } catch (error) {
        if (error instanceof ConditionalCheckFailedException) {
          registrationStatus = "waitlisted";

          await dynamoClient.send(
            new UpdateCommand({
              TableName: env.seatCounterTable,
              Key: { event_id: data.eventId },
              UpdateExpression: "ADD waitlist_count :increment SET last_updated = :updatedAt",
              ExpressionAttributeValues: {
                ":increment": 1,
                ":updatedAt": new Date().toISOString()
              }
            })
          );
        } else {
          throw error;
        }
      }

      const registration: RegistrationRecord = {
        id: buildRegistrationId(data.eventId, actor.id),
        event_id: data.eventId,
        student_id: actor.id,
        status: registrationStatus,
        registered_at: new Date().toISOString(),
        cancelled_at: null
      };

      try {
        await putRegistration(registration, "attribute_not_exists(id)");
      } catch (error) {
        if (registrationStatus === "registered") {
          await dynamoClient.send(
            new UpdateCommand({
              TableName: env.seatCounterTable,
              Key: { event_id: data.eventId },
              UpdateExpression: "ADD current_count :decrement SET last_updated = :updatedAt",
              ExpressionAttributeValues: {
                ":decrement": -1,
                ":updatedAt": new Date().toISOString()
              }
            })
          );
        }

        if (registrationStatus === "waitlisted") {
          await dynamoClient.send(
            new UpdateCommand({
              TableName: env.seatCounterTable,
              Key: { event_id: data.eventId },
              UpdateExpression: "ADD waitlist_count :decrement SET last_updated = :updatedAt",
              ExpressionAttributeValues: {
                ":decrement": -1,
                ":updatedAt": new Date().toISOString()
              }
            })
          );
        }

        if (error instanceof ConditionalCheckFailedException) {
          return json(409, { message: "You are already registered for this event" });
        }

        throw error;
      }

      if (registrationStatus === "registered") {
        await adjustEventCurrentCount(data.eventId, 1);
      }

      const seatCounter = await getSeatCounterByEvent(data.eventId);
      await broadcastRealtime("seat_updated", {
        eventId: data.eventId,
        eventTitle: targetEvent.title,
        currentCount: seatCounter?.current_count ?? targetEvent.current_count ?? 0,
        maxCapacity: seatCounter?.max_capacity ?? targetEvent.max_capacity ?? 0,
        seatsRemaining: Math.max(0, Number(seatCounter?.max_capacity ?? targetEvent.max_capacity ?? 0) - Number(seatCounter?.current_count ?? targetEvent.current_count ?? 0)),
        waitlistCount: seatCounter?.waitlist_count ?? 0
      });
      await broadcastRealtime("new_registration", {
        eventId: data.eventId,
        eventTitle: targetEvent.title,
        status: registrationStatus,
        studentId: actor.id
      });

      return json(
        201,
        serializeRegistration({
          ...registration,
          title: targetEvent.title,
          event_date: targetEvent.event_date,
          venue: targetEvent.venue
        })
      );
    }

    if (event.httpMethod === "DELETE" && event.pathParameters?.id) {
      ensureRole(auth.role, ["student", "admin"]);
      const registration = await getRegistrationById(event.pathParameters.id);

      if (!registration) {
        return json(404, { message: "Registration not found" });
      }

      if (auth.role === "student" && registration.student_id !== actor.id) {
        return json(403, { message: "You can only cancel your own registrations" });
      }

      const updated: RegistrationRecord = {
        ...registration,
        status: "cancelled",
        cancelled_at: new Date().toISOString()
      };

      await saveRegistration(updated);

      if (registration.status === "registered") {
        await adjustEventCurrentCount(registration.event_id, -1);
        await dynamoClient.send(
          new UpdateCommand({
            TableName: env.seatCounterTable,
            Key: { event_id: registration.event_id },
            UpdateExpression: "ADD current_count :decrement SET last_updated = :updatedAt",
            ExpressionAttributeValues: {
              ":decrement": -1,
              ":updatedAt": new Date().toISOString()
            }
          })
        );
      }

      if (registration.status === "waitlisted") {
        await dynamoClient.send(
          new UpdateCommand({
            TableName: env.seatCounterTable,
            Key: { event_id: registration.event_id },
            UpdateExpression: "ADD waitlist_count :decrement SET last_updated = :updatedAt",
            ExpressionAttributeValues: {
              ":decrement": -1,
              ":updatedAt": new Date().toISOString()
            }
          })
        );
      }

      const seatCounter = await getSeatCounterByEvent(registration.event_id);
      const targetEvent = await getEventById(registration.event_id);
      await broadcastRealtime("seat_updated", {
        eventId: registration.event_id,
        eventTitle: targetEvent?.title ?? "Event",
        currentCount: seatCounter?.current_count ?? 0,
        maxCapacity: seatCounter?.max_capacity ?? 0,
        seatsRemaining: Math.max(0, Number(seatCounter?.max_capacity ?? 0) - Number(seatCounter?.current_count ?? 0)),
        waitlistCount: seatCounter?.waitlist_count ?? 0
      });
      await broadcastRealtime("registration_cancelled", {
        eventId: registration.event_id,
        registrationId: registration.id,
        studentId: registration.student_id
      });

      return json(200, { message: "Registration cancelled" });
    }

    return json(404, { message: "Route not found" });
  } catch (error) {
    return handleError(error);
  }
}
