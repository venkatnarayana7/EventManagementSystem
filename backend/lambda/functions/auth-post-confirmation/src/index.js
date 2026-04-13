"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = handler;
const client_cognito_identity_provider_1 = require("@aws-sdk/client-cognito-identity-provider");
const aws_1 = require("../../../shared/src/aws");
const dynamo_repository_1 = require("../../../shared/src/dynamo-repository");
const groupMap = {
    admin: "Admins",
    teacher: "Teachers",
    student: "Students"
};
async function handler(event) {
    const role = event.request.userAttributes["custom:role"] ?? "student";
    const approvalStatus = event.request.userAttributes["custom:approvalStatus"] ?? (role === "admin" ? "approved" : "pending");
    if (approvalStatus === "approved") {
        await aws_1.cognitoClient.send(new client_cognito_identity_provider_1.AdminAddUserToGroupCommand({
            GroupName: groupMap[role],
            Username: event.userName,
            UserPoolId: event.userPoolId
        }));
    }
    await (0, dynamo_repository_1.putUserFromCognito)({
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
