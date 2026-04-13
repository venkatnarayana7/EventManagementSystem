import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { ensureRole, getAuthContext, optionsResponse } from "../../../shared/src/auth";
import { handleError } from "../../../shared/src/http";
import { json } from "../../../shared/src/response";
import {
  countAttendanceRecords,
  countEvents,
  countRegistrations
} from "../../../shared/src/dynamo-repository";

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    if (event.httpMethod === "OPTIONS") {
      return optionsResponse();
    }

    const auth = getAuthContext(event);
    ensureRole(auth.role, ["admin"]);

    if (event.httpMethod === "GET" && event.path === "/analytics/overview") {
      const [totalEvents, totalRegistrations, totalAttendanceRecords] = await Promise.all([
        countEvents(),
        countRegistrations(),
        countAttendanceRecords()
      ]);

      return json(200, {
        totalEvents,
        totalRegistrations,
        totalAttendanceRecords
      });
    }

    return json(404, { message: "Route not found" });
  } catch (error) {
    return handleError(error);
  }
}
