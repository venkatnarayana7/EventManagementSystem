import type { APIGatewayProxyEvent } from "aws-lambda";
import { json } from "./response";

export type AppRole = "admin" | "teacher" | "student";

export interface AuthContext {
  userId: string;
  role: AppRole;
  email?: string;
  fullName?: string;
  department?: string | null;
  rollNo?: string | null;
  empId?: string | null;
}

function normalizeRoleFromGroups(groupsClaim: unknown): AppRole | null {
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

export function getAuthContext(event: APIGatewayProxyEvent): AuthContext {
  const claims = event.requestContext.authorizer?.claims ?? {};
  const role =
    normalizeRoleFromGroups(claims["cognito:groups"]) ||
    normalizeRoleFromGroups(claims.groups) ||
    ((claims["custom:role"] ?? claims.role) as AppRole | undefined);
  const userId = (claims.sub ?? claims["cognito:username"] ?? "") as string;
  const email = claims.email as string | undefined;
  const fullName = (claims.name ?? claims["cognito:username"] ?? claims.email ?? "") as string;
  const department = (claims["custom:department"] as string | undefined) ?? null;
  const rollNo = (claims["custom:rollNo"] as string | undefined) ?? null;
  const empId = (claims["custom:empId"] as string | undefined) ?? null;

  if (!userId || !role) {
    throw new Error("Missing authenticated user context");
  }

  return { userId, role, email, fullName, department, rollNo, empId };
}

export function ensureRole(role: AppRole, allowed: AppRole[]) {
  if (!allowed.includes(role)) {
    throw new Error("Forbidden");
  }
}

export function optionsResponse() {
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
