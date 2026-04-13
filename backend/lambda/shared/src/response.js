"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.json = json;
const defaultHeaders = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS"
};
function json(statusCode, body) {
    return {
        statusCode,
        headers: defaultHeaders,
        body: JSON.stringify(body)
    };
}
