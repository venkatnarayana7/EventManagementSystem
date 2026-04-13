"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseJson = parseJson;
exports.getPathId = getPathId;
exports.handleError = handleError;
const zod_1 = require("zod");
const response_1 = require("./response");
function parseJson(body) {
    if (!body) {
        throw new Error("Request body is required");
    }
    return JSON.parse(body);
}
function getPathId(path) {
    if (!path) {
        return null;
    }
    const parts = path.split("/").filter(Boolean);
    return parts.at(-1) ?? null;
}
function handleError(error) {
    console.error("[EMS API Error]", {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
    });
    if (error instanceof zod_1.ZodError) {
        return (0, response_1.json)(400, {
            message: "Validation failed",
            issues: error.issues.map((issue) => ({
                path: issue.path.join("."),
                message: issue.message
            }))
        });
    }
    if (error instanceof Error) {
        const normalized = error.message.toLowerCase();
        const statusCode = normalized.includes("forbidden")
            ? 403
            : normalized.includes("not found")
                ? 404
                : normalized.includes("missing session") || normalized.includes("unauthorized")
                    ? 401
                    : 400;
        return (0, response_1.json)(statusCode, { message: error.message });
    }
    return (0, response_1.json)(500, { message: "Unexpected error" });
}
