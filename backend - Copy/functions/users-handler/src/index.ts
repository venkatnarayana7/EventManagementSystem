import {
  AdminAddUserToGroupCommand,
  AdminRemoveUserFromGroupCommand,
  AdminUpdateUserAttributesCommand
} from "@aws-sdk/client-cognito-identity-provider";
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { cognitoClient } from "../../../shared/src/aws";
import { ensureRole, getAuthContext, optionsResponse } from "../../../shared/src/auth";
import { env } from "../../../shared/src/env";
import { handleError, parseJson } from "../../../shared/src/http";
import { broadcastRealtime } from "../../../shared/src/realtime";
import { json } from "../../../shared/src/response";
import { serializeMessage, serializeUser } from "../../../shared/src/serializers";
import { adminMessageSchema, profileSchema, userApprovalSchema } from "../../../shared/src/validation";
import { createMessages, ensureUserFromAuthContext, findUserByEmail, getUserById, listMessagesByRecipient, listUsers, updateUserApproval, updateUserProfile } from "../../../shared/src/dynamo-repository";

const roleGroupMap = {
  admin: "Admins",
  teacher: "Teachers",
  student: "Students"
} as const;

async function syncUserRoleInCognito(email: string, role: "admin" | "teacher" | "student", approvalStatus: "pending" | "approved" | "rejected") {
  await cognitoClient.send(
    new AdminUpdateUserAttributesCommand({
      UserPoolId: env.userPoolId,
      Username: email,
      UserAttributes: [
        { Name: "custom:role", Value: role }
      ]
    })
  );

  await Promise.all(
    Object.values(roleGroupMap).map(function (groupName) {
      return cognitoClient.send(
        new AdminRemoveUserFromGroupCommand({
          GroupName: groupName,
          Username: email,
          UserPoolId: env.userPoolId
        })
      ).catch(function () {
        return undefined;
      });
    })
  );

  if (approvalStatus === "approved") {
    await cognitoClient.send(
      new AdminAddUserToGroupCommand({
        GroupName: roleGroupMap[role],
        Username: email,
        UserPoolId: env.userPoolId
      })
    );
  }
}

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    if (event.httpMethod === "OPTIONS") {
      return optionsResponse();
    }

    const auth = getAuthContext(event);
    const actor = await ensureUserFromAuthContext(auth);

    if (event.httpMethod === "GET" && event.path === "/users/me") {
      return json(200, serializeUser(actor));
    }

    if (event.httpMethod === "PUT" && event.path === "/users/me") {
      const data = profileSchema.parse(parseJson(event.body));
      const updated = await updateUserProfile(actor.id, {
        fullName: data.fullName,
        department: data.department?.trim() ? data.department.trim() : null,
        avatarUrl: data.avatarUrl ?? null,
        phoneNumber: data.phoneNumber?.trim() ? data.phoneNumber.trim() : null,
        dateOfBirth: data.dateOfBirth?.trim() ? data.dateOfBirth.trim() : null,
        address: data.address?.trim() ? data.address.trim() : null,
        bio: data.bio?.trim() ? data.bio.trim() : null,
        notificationPreferences: data.notificationPreferences
          ? {
              new_events: data.notificationPreferences.newEvents ?? true,
              registration_confirmation: data.notificationPreferences.registrationConfirmation ?? true,
              seat_alerts: data.notificationPreferences.seatAlerts ?? true,
              attendance_updates: data.notificationPreferences.attendanceUpdates ?? true,
              event_reminders: data.notificationPreferences.eventReminders ?? true,
              waitlist_updates: data.notificationPreferences.waitlistUpdates ?? true
            }
          : undefined
      });

      return json(200, serializeUser(updated));
    }

    if (event.httpMethod === "GET" && event.path === "/users") {
      ensureRole(auth.role, ["admin"]);
      const approvalStatus = String(event.queryStringParameters?.approvalStatus || "").trim().toLowerCase();
      let users = await listUsers();
      if (approvalStatus === "pending" || approvalStatus === "approved" || approvalStatus === "rejected") {
        users = users.filter((user) => (user.approval_status ?? "approved") === approvalStatus);
      }

      return json(200, {
        items: users.map((user) => serializeUser(user))
      });
    }

    if (event.httpMethod === "GET" && event.path === "/users/messages") {
      const items = await listMessagesByRecipient(actor.id);
      return json(200, {
        items: items.map((item) => serializeMessage(item))
      });
    }

    if (event.httpMethod === "POST" && event.path === "/users/messages") {
      ensureRole(auth.role, ["admin"]);
      const data = adminMessageSchema.parse(parseJson(event.body));

      const recipients = data.sendToAll
        ? (await listUsers())
            .filter((user) => Boolean(user.email) && Boolean(user.is_active ?? true))
            .map((user) => ({
              userId: user.id,
              email: user.email
            }))
        : [];

      if (!data.sendToAll) {
        const targetUser = await findUserByEmail(String(data.recipientEmail || "").trim().toLowerCase());
        if (!targetUser) {
          throw new Error("Recipient user not found");
        }

        recipients.push({
          userId: targetUser.id,
          email: targetUser.email
        });
      }

      const sentItems = await createMessages(recipients, {
        targetScope: data.sendToAll ? "all" : "user",
        subject: data.subject.trim(),
        body: data.body.trim(),
        sentByUserId: actor.id,
        sentByEmail: actor.email || "admin@ems.app"
      });

      await Promise.all(
        sentItems.map((item) =>
          broadcastRealtime(
            "mail_message",
            {
              message: serializeMessage(item)
            },
            { type: "user", userId: item.recipient_user_id }
          )
        )
      );

      return json(200, {
        sent: sentItems.length,
        items: sentItems.map((item) => serializeMessage(item))
      });
    }

    if (event.httpMethod === "PUT" && event.path.endsWith("/approval") && event.pathParameters?.id) {
      ensureRole(auth.role, ["admin"]);
      const data = userApprovalSchema.parse(parseJson(event.body));
      const targetUser = await getUserById(event.pathParameters.id);

      await syncUserRoleInCognito(targetUser.email, data.role, data.approvalStatus);
      const updated = await updateUserApproval(targetUser.id, {
        role: data.role,
        approvalStatus: data.approvalStatus
      });

      return json(200, serializeUser(updated));
    }

    return json(404, { message: "Route not found" });
  } catch (error) {
    return handleError(error);
  }
}
