"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = handler;
const auth_1 = require("../../../shared/src/auth");
const http_1 = require("../../../shared/src/http");
const realtime_1 = require("../../../shared/src/realtime");
const response_1 = require("../../../shared/src/response");
const validation_1 = require("../../../shared/src/validation");
const dynamo_repository_1 = require("../../../shared/src/dynamo-repository");
function getStaffAssignmentIds(event) {
    return Array.isArray(event?.staff_assignments)
        ? event.staff_assignments.map((item) => item.user_id).filter(Boolean)
        : [];
}
async function handler(event) {
    try {
        if (event.httpMethod === "OPTIONS") {
            return (0, auth_1.optionsResponse)();
        }
        const auth = (0, auth_1.getAuthContext)(event);
        const actor = await (0, dynamo_repository_1.ensureUserFromAuthContext)(auth);
        if (event.httpMethod === "GET" && event.path === "/attendance") {
            (0, auth_1.ensureRole)(auth.role, ["teacher", "admin"]);
            const eventId = event.queryStringParameters?.event_id;
            if (!eventId) {
                return (0, response_1.json)(400, { message: "event_id is required" });
            }
            const targetEvent = await (0, dynamo_repository_1.getEventById)(eventId);
            if (!targetEvent) {
                return (0, response_1.json)(404, { message: "Event not found" });
            }
            if (auth.role === "teacher" &&
                targetEvent.created_by !== actor.id &&
                targetEvent.created_by !== actor.cognito_sub &&
                !getStaffAssignmentIds(targetEvent).includes(actor.id) &&
                !getStaffAssignmentIds(targetEvent).includes(actor.cognito_sub)) {
                return (0, response_1.json)(403, { message: "Teachers can only access attendance for their own events or joined staff events" });
            }
            const items = await (0, dynamo_repository_1.listAttendanceByEvent)(eventId);
            const users = await (0, dynamo_repository_1.batchGetUsers)(items.map((item) => item.student_id));
            const userMap = new Map(users.map((user) => [user.id, user]));
            return (0, response_1.json)(200, {
                items: items.map((item) => ({
                    ...item,
                    status: item.status ?? "present",
                    full_name: userMap.get(item.student_id)?.full_name ?? null,
                    email: userMap.get(item.student_id)?.email ?? null
                }))
            });
        }
        if (event.httpMethod === "GET" && event.path === "/attendance/me") {
            (0, auth_1.ensureRole)(auth.role, ["student"]);
            const [attendanceItems, registrations] = await Promise.all([
                (0, dynamo_repository_1.listAttendanceByStudent)(actor.id),
                (0, dynamo_repository_1.listRegistrationsByStudent)(actor.id)
            ]);
            const events = await (0, dynamo_repository_1.batchGetEvents)([
                ...attendanceItems.map((item) => item.event_id),
                ...registrations.map((item) => item.event_id)
            ]);
            const eventMap = new Map(events.map((item) => [item.id, item]));
            const markers = await (0, dynamo_repository_1.batchGetUsers)(attendanceItems.map((item) => item.marked_by));
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
            return (0, response_1.json)(200, { items });
        }
        if (event.httpMethod === "POST" && event.path === "/attendance") {
            (0, auth_1.ensureRole)(auth.role, ["teacher", "admin"]);
            const data = validation_1.attendanceSchema.parse((0, http_1.parseJson)(event.body));
            const targetEvent = await (0, dynamo_repository_1.getEventById)(data.eventId);
            if (!targetEvent) {
                return (0, response_1.json)(404, { message: "Event not found" });
            }
            if (auth.role === "teacher" &&
                targetEvent.created_by !== actor.id &&
                targetEvent.created_by !== actor.cognito_sub &&
                !getStaffAssignmentIds(targetEvent).includes(actor.id) &&
                !getStaffAssignmentIds(targetEvent).includes(actor.cognito_sub)) {
                return (0, response_1.json)(403, { message: "Teachers can only mark attendance for their own events or joined staff events" });
            }
            const attendance = await (0, dynamo_repository_1.upsertAttendance)({
                id: (0, dynamo_repository_1.buildAttendanceId)(data.eventId, data.studentId),
                event_id: data.eventId,
                student_id: data.studentId,
                marked_by: actor.id,
                marked_at: new Date().toISOString(),
                method: data.method,
                status: data.status
            });
            const registration = await (0, dynamo_repository_1.getRegistrationById)(`${data.eventId}#${data.studentId}`);
            if (registration) {
                await (0, dynamo_repository_1.saveRegistration)({
                    ...registration,
                    status: data.status === "present" ? "attended" : "registered"
                });
            }
            await (0, realtime_1.broadcastRealtime)("attendance_submitted", {
                eventId: data.eventId,
                studentId: data.studentId,
                status: data.status,
                markedBy: actor.full_name,
                markedAt: attendance.marked_at
            });
            return (0, response_1.json)(200, attendance);
        }
        return (0, response_1.json)(404, { message: "Route not found" });
    }
    catch (error) {
        return (0, http_1.handleError)(error);
    }
}
