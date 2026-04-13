"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAuthContext = getAuthContext;
exports.ensureRole = ensureRole;
exports.optionsResponse = optionsResponse;
function normalizeRoleFromGroups(groupsClaim) {
    const groups = Array.isArray(groupsClaim)
        ? groupsClaim
        : String(groupsClaim ?? "")
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean);
    const normalized = groups.map((group) => String(group).replace(/[[\]"]/g, "").trim().toLowerCase());
    if (normalized.includes("admins")) {
        return "admin";
    }
    if (normalized.includes("teachers")) {
        return "teacher";
    }
    if (normalized.includes("students")) {
        return "student";
    }
    return null;
}
function getAuthContext(event) {
    const claims = event.requestContext.authorizer?.claims ?? {};
    const role = normalizeRoleFromGroups(claims["cognito:groups"]) ||
        normalizeRoleFromGroups(claims.groups) ||
        (claims["custom:role"] ?? claims.role);
    const userId = (claims.sub ?? claims["cognito:username"] ?? "");
    const email = claims.email;
    const fullName = (claims.name ?? claims["cognito:username"] ?? claims.email ?? "");
    const department = claims["custom:department"] ?? null;
    const rollNo = claims["custom:rollNo"] ?? null;
    const empId = claims["custom:empId"] ?? null;
    if (!userId || !role) {
        throw new Error("Missing authenticated user context");
    }
    return { userId, role, email, fullName, department, rollNo, empId };
}
function ensureRole(role, allowed) {
    if (!allowed.includes(role)) {
        throw new Error("Forbidden");
    }
}
function optionsResponse() {
    return {
        statusCode: 204,
        headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type,Authorization",
            "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS"
        },
        body: ""
    };
}
