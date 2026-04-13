"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = handler;
const realtime_1 = require("../../../shared/src/realtime");
function response(statusCode, body) {
    return {
        statusCode,
        body: JSON.stringify(body)
    };
}
async function handler(event) {
    try {
        await (0, realtime_1.unregisterRealtimeConnection)(event.requestContext.connectionId);
        return response(200, { message: "Disconnected" });
    }
    catch (error) {
        console.error("[EMS WS Disconnect Error]", error);
        return response(500, { message: "Disconnect failed" });
    }
}
