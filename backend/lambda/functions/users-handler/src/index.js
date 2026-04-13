"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = handler;
const client_cognito_identity_provider_1 = require("@aws-sdk/client-cognito-identity-provider");
const aws_1 = require("../../../shared/src/aws");
const auth_1 = require("../../../shared/src/auth");
const env_1 = require("../../../shared/src/env");
const http_1 = require("../../../shared/src/http");
const realtime_1 = require("../../../shared/src/realtime");
const response_1 = require("../../../shared/src/response");
const serializers_1 = require("../../../shared/src/serializers");
const validation_1 = require("../../../shared/src/validation");
const dynamo_repository_1 = require("../../../shared/src/dynamo-repository");
const roleGroupMap = {
    admin: "Admins",
    teacher: "Teachers",
    student: "Students"
};
async function syncUserRoleInCognito(email, role, approvalStatus) {
    await aws_1.cognitoClient.send(new client_cognito_identity_provider_1.AdminUpdateUserAttributesCommand({
        UserPoolId: env_1.env.userPoolId,
        Username: email,
        UserAttributes: [
            { Name: "custom:role", Value: role }
        ]
    }));
    await Promise.all(Object.values(roleGroupMap).map(function (groupName) {
        return aws_1.cognitoClient.send(new client_cognito_identity_provider_1.AdminRemoveUserFromGroupCommand({
            GroupName: groupName,
            Username: email,
            UserPoolId: env_1.env.userPoolId
        })).catch(function () {
            return undefined;
        });
    }));
    if (approvalStatus === "approved") {
        await aws_1.cognitoClient.send(new client_cognito_identity_provider_1.AdminAddUserToGroupCommand({
            GroupName: roleGroupMap[role],
            Username: email,
            UserPoolId: env_1.env.userPoolId
        }));
    }
}
async function handler(event) {
    try {
        if (event.httpMethod === "OPTIONS") {
            return (0, auth_1.optionsResponse)();
        }
        const auth = (0, auth_1.getAuthContext)(event);
        const actor = await (0, dynamo_repository_1.ensureUserFromAuthContext)(auth);
        if (event.httpMethod === "GET" && event.path === "/users/me") {
            return (0, response_1.json)(200, (0, serializers_1.serializeUser)(actor));
        }
        if (event.httpMethod === "PUT" && event.path === "/users/me") {
            const data = validation_1.profileSchema.parse((0, http_1.parseJson)(event.body));
            const updated = await (0, dynamo_repository_1.updateUserProfile)(actor.id, {
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
            return (0, response_1.json)(200, (0, serializers_1.serializeUser)(updated));
        }
        if (event.httpMethod === "GET" && event.path === "/users") {
            (0, auth_1.ensureRole)(auth.role, ["admin"]);
            const approvalStatus = String(event.queryStringParameters?.approvalStatus || "").trim().toLowerCase();
            let users = await (0, dynamo_repository_1.listUsers)();
            if (approvalStatus === "pending" || approvalStatus === "approved" || approvalStatus === "rejected") {
                users = users.filter((user) => (user.approval_status ?? "approved") === approvalStatus);
            }
            return (0, response_1.json)(200, {
                items: users.map((user) => (0, serializers_1.serializeUser)(user))
            });
        }
        if (event.httpMethod === "GET" && event.path === "/users/messages") {
            const items = await (0, dynamo_repository_1.listMessagesByRecipient)(actor.id);
            return (0, response_1.json)(200, {
                items: items.map((item) => (0, serializers_1.serializeMessage)(item))
            });
        }
        if (event.httpMethod === "POST" && event.path === "/users/messages") {
            (0, auth_1.ensureRole)(auth.role, ["admin"]);
            const data = validation_1.adminMessageSchema.parse((0, http_1.parseJson)(event.body));
            const recipients = data.sendToAll
                ? (await (0, dynamo_repository_1.listUsers)())
                    .filter((user) => Boolean(user.email) && Boolean(user.is_active ?? true))
                    .map((user) => ({
                    userId: user.id,
                    email: user.email
                }))
                : [];
            if (!data.sendToAll) {
                const targetUser = await (0, dynamo_repository_1.findUserByEmail)(String(data.recipientEmail || "").trim().toLowerCase());
                if (!targetUser) {
                    throw new Error("Recipient user not found");
                }
                recipients.push({
                    userId: targetUser.id,
                    email: targetUser.email
                });
            }
            const sentItems = await (0, dynamo_repository_1.createMessages)(recipients, {
                targetScope: data.sendToAll ? "all" : "user",
                subject: data.subject.trim(),
                body: data.body.trim(),
                sentByUserId: actor.id,
                sentByEmail: actor.email || "admin@ems.app"
            });
            await Promise.all(sentItems.map((item) => (0, realtime_1.broadcastRealtime)("mail_message", {
                message: (0, serializers_1.serializeMessage)(item)
            }, { type: "user", userId: item.recipient_user_id })));
            return (0, response_1.json)(200, {
                sent: sentItems.length,
                items: sentItems.map((item) => (0, serializers_1.serializeMessage)(item))
            });
        }
        if (event.httpMethod === "PUT" && event.path.endsWith("/approval") && event.pathParameters?.id) {
            (0, auth_1.ensureRole)(auth.role, ["admin"]);
            const data = validation_1.userApprovalSchema.parse((0, http_1.parseJson)(event.body));
            const targetUser = await (0, dynamo_repository_1.getUserById)(event.pathParameters.id);
            await syncUserRoleInCognito(targetUser.email, data.role, data.approvalStatus);
            const updated = await (0, dynamo_repository_1.updateUserApproval)(targetUser.id, {
                role: data.role,
                approvalStatus: data.approvalStatus
            });
            return (0, response_1.json)(200, (0, serializers_1.serializeUser)(updated));
        }
        return (0, response_1.json)(404, { message: "Route not found" });
    }
    catch (error) {
        return (0, http_1.handleError)(error);
    }
}
