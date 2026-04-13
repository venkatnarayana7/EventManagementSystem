import type { PostConfirmationTriggerEvent } from "aws-lambda";
import { AdminAddUserToGroupCommand } from "@aws-sdk/client-cognito-identity-provider";
import { cognitoClient } from "../../../shared/src/aws";
import { putUserFromCognito } from "../../../shared/src/dynamo-repository";

const groupMap = {
  admin: "Admins",
  teacher: "Teachers",
  student: "Students"
} as const;

type AppRole = keyof typeof groupMap;

export async function handler(event: PostConfirmationTriggerEvent) {
  const role = (event.request.userAttributes["custom:role"] as AppRole | undefined) ?? "student";
  const approvalStatus = (event.request.userAttributes["custom:approvalStatus"] as string | undefined) ?? (role === "admin" ? "approved" : "pending");

  if (approvalStatus === "approved") {
    await cognitoClient.send(
      new AdminAddUserToGroupCommand({
        GroupName: groupMap[role],
        Username: event.userName,
        UserPoolId: event.userPoolId
      })
    );
  }

  await putUserFromCognito({
    cognitoSub: event.request.userAttributes.sub,
    email: event.request.userAttributes.email,
    fullName: event.request.userAttributes.name ?? event.userName,
    role,
    approvalStatus: approvalStatus === "rejected" ? "rejected" : approvalStatus === "pending" ? "pending" : "approved",
    department: event.request.userAttributes["custom:department"] ?? null,
    rollNo: event.request.userAttributes["custom:rollNo"] ?? null,
    empId: event.request.userAttributes["custom:empId"] ?? null
  });

  return event;
}
