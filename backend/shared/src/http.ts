import { ZodError } from "zod";
import { json } from "./response";

export function parseJson<T>(body: string | null): T {
  if (!body) {
    throw new Error("Request body is required");
  }

  return JSON.parse(body) as T;
}

export function getPathId(path: string | null | undefined): string | null {
  if (!path) {
    return null;
  }

  const parts = path.split("/").filter(Boolean);
  return parts.at(-1) ?? null;
}

export function handleError(error: unknown) {
  console.error("[EMS API Error]", {
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined
  });

  if (error instanceof ZodError) {
    return json(400, {
      message: "Validation failed",
      issues: error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message
      }))
    });
  }

  if (error instanceof Error) {
    const normalized = error.message.toLowerCase();
    const statusCode =
      normalized.includes("forbidden")
        ? 403
        : normalized.includes("not found")
          ? 404
          : normalized.includes("missing session") || normalized.includes("unauthorized")
            ? 401
            : 400;

    return json(statusCode, { message: error.message });
  }

  return json(500, { message: "Unexpected error" });
}
