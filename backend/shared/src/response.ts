import type { APIGatewayProxyResult } from "aws-lambda";

const defaultHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS"
};

export function json(statusCode: number, body: unknown): APIGatewayProxyResult {
  return {
    statusCode,
    headers: defaultHeaders,
    body: JSON.stringify(body)
  };
}

