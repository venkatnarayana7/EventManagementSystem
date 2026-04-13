"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = handler;
const auth_1 = require("../../../shared/src/auth");
const http_1 = require("../../../shared/src/http");
const response_1 = require("../../../shared/src/response");
const dynamo_repository_1 = require("../../../shared/src/dynamo-repository");
async function handler(event) {
    try {
        if (event.httpMethod === "OPTIONS") {
            return (0, auth_1.optionsResponse)();
        }
        const auth = (0, auth_1.getAuthContext)(event);
        (0, auth_1.ensureRole)(auth.role, ["admin"]);
        if (event.httpMethod === "GET" && event.path === "/analytics/overview") {
            const [totalEvents, totalRegistrations, totalAttendanceRecords] = await Promise.all([
                (0, dynamo_repository_1.countEvents)(),
                (0, dynamo_repository_1.countRegistrations)(),
                (0, dynamo_repository_1.countAttendanceRecords)()
            ]);
            return (0, response_1.json)(200, {
                totalEvents,
                totalRegistrations,
                totalAttendanceRecords
            });
        }
        return (0, response_1.json)(404, { message: "Route not found" });
    }
    catch (error) {
        return (0, http_1.handleError)(error);
    }
}
