"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = handler;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const aws_1 = require("../../../shared/src/aws");
const auth_1 = require("../../../shared/src/auth");
const env_1 = require("../../../shared/src/env");
const http_1 = require("../../../shared/src/http");
const realtime_1 = require("../../../shared/src/realtime");
const response_1 = require("../../../shared/src/response");
const serializers_1 = require("../../../shared/src/serializers");
const validation_1 = require("../../../shared/src/validation");
const dynamo_repository_1 = require("../../../shared/src/dynamo-repository");
async function handler(event) {
    try {
        if (event.httpMethod === "OPTIONS") {
            return (0, auth_1.optionsResponse)();
        }
        const auth = (0, auth_1.getAuthContext)(event);
        (0, auth_1.ensureRole)(auth.role, ["student", "teacher", "admin"]);
        const actor = await (0, dynamo_repository_1.ensureUserFromAuthContext)(auth);
        if (event.httpMethod === "GET" && event.path === "/registrations/me") {
            const registrations = await (0, dynamo_repository_1.listRegistrationsByStudent)(actor.id);
            const events = await (0, dynamo_repository_1.batchGetEvents)(registrations.map((item) => item.event_id));
            const eventMap = new Map(events.map((item) => [item.id, item]));
            const organizers = await (0, dynamo_repository_1.batchGetUsers)(events.map((item) => item.created_by));
            const organizerMap = new Map(organizers.map((item) => [item.id, item]));
            const attendance = await (0, dynamo_repository_1.listAttendanceByStudent)(actor.id);
            const attendanceMap = new Map(attendance.map((item) => [item.event_id, item]));
            const seatCounters = await (0, dynamo_repository_1.batchGetSeatCounters)(registrations.map((item) => item.event_id));
            const seatCounterMap = new Map(seatCounters.map((item) => [item.event_id, item]));
            const registrationLists = await Promise.all(registrations
                .filter((item) => item.status === "waitlisted")
                .map(async (item) => [item.event_id, await (0, dynamo_repository_1.listRegistrationsByEvent)(item.event_id)]));
            const waitlistMap = new Map(registrationLists.map(([eventId, items]) => {
                const activeWaitlist = items
                    .filter((item) => item.status === "waitlisted")
                    .sort((left, right) => String(left.registered_at).localeCompare(String(right.registered_at)));
                const position = activeWaitlist.findIndex((item) => item.student_id === actor.id);
                return [eventId, position >= 0 ? position + 1 : null];
            }));
            return (0, response_1.json)(200, {
                items: registrations.map((registration) => (0, serializers_1.serializeRegistration)({
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
                }))
            });
        }
        if (event.httpMethod === "POST" && event.path === "/registrations") {
            (0, auth_1.ensureRole)(auth.role, ["student"]);
            const data = validation_1.registrationSchema.parse((0, http_1.parseJson)(event.body));
            const targetEvent = await (0, dynamo_repository_1.getEventById)(data.eventId);
            if (!targetEvent) {
                return (0, response_1.json)(404, { message: "Event not found" });
            }
            if (targetEvent.status !== "approved") {
                return (0, response_1.json)(400, { message: "This event is not open for registrations" });
            }
            if (targetEvent.registration_deadline &&
                new Date(targetEvent.registration_deadline).getTime() < Date.now()) {
                return (0, response_1.json)(400, { message: "Registration deadline has passed" });
            }
            const counter = await aws_1.dynamoClient.send(new lib_dynamodb_1.GetCommand({
                TableName: env_1.env.seatCounterTable,
                Key: { event_id: data.eventId }
            }));
            if (!counter.Item) {
                return (0, response_1.json)(500, { message: "Seat counter is not initialized for this event" });
            }
            let registrationStatus = "registered";
            try {
                await aws_1.dynamoClient.send(new lib_dynamodb_1.UpdateCommand({
                    TableName: env_1.env.seatCounterTable,
                    Key: { event_id: data.eventId },
                    ConditionExpression: "current_count < max_capacity",
                    UpdateExpression: "ADD current_count :increment SET last_updated = :updatedAt",
                    ExpressionAttributeValues: {
                        ":increment": 1,
                        ":updatedAt": new Date().toISOString()
                    }
                }));
            }
            catch (error) {
                if (error instanceof client_dynamodb_1.ConditionalCheckFailedException) {
                    registrationStatus = "waitlisted";
                    await aws_1.dynamoClient.send(new lib_dynamodb_1.UpdateCommand({
                        TableName: env_1.env.seatCounterTable,
                        Key: { event_id: data.eventId },
                        UpdateExpression: "ADD waitlist_count :increment SET last_updated = :updatedAt",
                        ExpressionAttributeValues: {
                            ":increment": 1,
                            ":updatedAt": new Date().toISOString()
                        }
                    }));
                }
                else {
                    throw error;
                }
            }
            const registration = {
                id: (0, dynamo_repository_1.buildRegistrationId)(data.eventId, actor.id),
                event_id: data.eventId,
                student_id: actor.id,
                status: registrationStatus,
                registered_at: new Date().toISOString(),
                cancelled_at: null
            };
            try {
                await (0, dynamo_repository_1.putRegistration)(registration, "attribute_not_exists(id)");
            }
            catch (error) {
                if (registrationStatus === "registered") {
                    await aws_1.dynamoClient.send(new lib_dynamodb_1.UpdateCommand({
                        TableName: env_1.env.seatCounterTable,
                        Key: { event_id: data.eventId },
                        UpdateExpression: "ADD current_count :decrement SET last_updated = :updatedAt",
                        ExpressionAttributeValues: {
                            ":decrement": -1,
                            ":updatedAt": new Date().toISOString()
                        }
                    }));
                }
                if (registrationStatus === "waitlisted") {
                    await aws_1.dynamoClient.send(new lib_dynamodb_1.UpdateCommand({
                        TableName: env_1.env.seatCounterTable,
                        Key: { event_id: data.eventId },
                        UpdateExpression: "ADD waitlist_count :decrement SET last_updated = :updatedAt",
                        ExpressionAttributeValues: {
                            ":decrement": -1,
                            ":updatedAt": new Date().toISOString()
                        }
                    }));
                }
                if (error instanceof client_dynamodb_1.ConditionalCheckFailedException) {
                    return (0, response_1.json)(409, { message: "You are already registered for this event" });
                }
                throw error;
            }
            if (registrationStatus === "registered") {
                await (0, dynamo_repository_1.adjustEventCurrentCount)(data.eventId, 1);
            }
            const seatCounter = await (0, dynamo_repository_1.getSeatCounterByEvent)(data.eventId);
            await (0, realtime_1.broadcastRealtime)("seat_updated", {
                eventId: data.eventId,
                eventTitle: targetEvent.title,
                currentCount: seatCounter?.current_count ?? targetEvent.current_count ?? 0,
                maxCapacity: seatCounter?.max_capacity ?? targetEvent.max_capacity ?? 0,
                seatsRemaining: Math.max(0, Number(seatCounter?.max_capacity ?? targetEvent.max_capacity ?? 0) - Number(seatCounter?.current_count ?? targetEvent.current_count ?? 0)),
                waitlistCount: seatCounter?.waitlist_count ?? 0
            });
            await (0, realtime_1.broadcastRealtime)("new_registration", {
                eventId: data.eventId,
                eventTitle: targetEvent.title,
                status: registrationStatus,
                studentId: actor.id
            });
            return (0, response_1.json)(201, (0, serializers_1.serializeRegistration)({
                ...registration,
                title: targetEvent.title,
                event_date: targetEvent.event_date,
                venue: targetEvent.venue
            }));
        }
        if (event.httpMethod === "DELETE" && event.pathParameters?.id) {
            (0, auth_1.ensureRole)(auth.role, ["student", "admin"]);
            const registration = await (0, dynamo_repository_1.getRegistrationById)(event.pathParameters.id);
            if (!registration) {
                return (0, response_1.json)(404, { message: "Registration not found" });
            }
            if (auth.role === "student" && registration.student_id !== actor.id) {
                return (0, response_1.json)(403, { message: "You can only cancel your own registrations" });
            }
            const updated = {
                ...registration,
                status: "cancelled",
                cancelled_at: new Date().toISOString()
            };
            await (0, dynamo_repository_1.saveRegistration)(updated);
            if (registration.status === "registered") {
                await (0, dynamo_repository_1.adjustEventCurrentCount)(registration.event_id, -1);
                await aws_1.dynamoClient.send(new lib_dynamodb_1.UpdateCommand({
                    TableName: env_1.env.seatCounterTable,
                    Key: { event_id: registration.event_id },
                    UpdateExpression: "ADD current_count :decrement SET last_updated = :updatedAt",
                    ExpressionAttributeValues: {
                        ":decrement": -1,
                        ":updatedAt": new Date().toISOString()
                    }
                }));
            }
            if (registration.status === "waitlisted") {
                await aws_1.dynamoClient.send(new lib_dynamodb_1.UpdateCommand({
                    TableName: env_1.env.seatCounterTable,
                    Key: { event_id: registration.event_id },
                    UpdateExpression: "ADD waitlist_count :decrement SET last_updated = :updatedAt",
                    ExpressionAttributeValues: {
                        ":decrement": -1,
                        ":updatedAt": new Date().toISOString()
                    }
                }));
            }
            const seatCounter = await (0, dynamo_repository_1.getSeatCounterByEvent)(registration.event_id);
            const targetEvent = await (0, dynamo_repository_1.getEventById)(registration.event_id);
            await (0, realtime_1.broadcastRealtime)("seat_updated", {
                eventId: registration.event_id,
                eventTitle: targetEvent?.title ?? "Event",
                currentCount: seatCounter?.current_count ?? 0,
                maxCapacity: seatCounter?.max_capacity ?? 0,
                seatsRemaining: Math.max(0, Number(seatCounter?.max_capacity ?? 0) - Number(seatCounter?.current_count ?? 0)),
                waitlistCount: seatCounter?.waitlist_count ?? 0
            });
            await (0, realtime_1.broadcastRealtime)("registration_cancelled", {
                eventId: registration.event_id,
                registrationId: registration.id,
                studentId: registration.student_id
            });
            return (0, response_1.json)(200, { message: "Registration cancelled" });
        }
        return (0, response_1.json)(404, { message: "Route not found" });
    }
    catch (error) {
        return (0, http_1.handleError)(error);
    }
}
