"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = handler;
const node_crypto_1 = require("node:crypto");
const client_cognito_identity_provider_1 = require("@aws-sdk/client-cognito-identity-provider");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const client_ses_1 = require("@aws-sdk/client-ses");
const aws_1 = require("../../../shared/src/aws");
const env_1 = require("../../../shared/src/env");
const http_1 = require("../../../shared/src/http");
const response_1 = require("../../../shared/src/response");
const dynamo_repository_1 = require("../../../shared/src/dynamo-repository");
const auth_1 = require("../../../shared/src/auth");
const roleGroupMap = {
    admin: "Admins",
    teacher: "Teachers",
    student: "Students"
};
function isRoute(event, method, path) {
    return event.httpMethod === method && event.path === path;
}
function normalizeEmail(value) {
    return String(value ?? "").trim().toLowerCase();
}
function normalizeFlow(value) {
    const flow = String(value ?? "").trim().toLowerCase();
    if (flow === "signup" || flow === "signin") {
        return flow;
    }
    throw new Error("Flow must be signup or signin");
}
function normalizeRole(value) {
    const role = String(value ?? "").trim().toLowerCase();
    if (role === "admin" || role === "teacher" || role === "student") {
        return role;
    }
    throw new Error("Role must be admin, teacher, or student");
}
function buildOtpId(email, flow) {
    return `${flow}#${email}`;
}
function hashValue(email, flow, value) {
    return (0, node_crypto_1.createHash)("sha256")
        .update(`${env_1.env.userPoolId}:${flow}:${email}:${value}`)
        .digest("hex");
}
function generateOtp() {
    return String((0, node_crypto_1.randomInt)(0, 1_000_000)).padStart(6, "0");
}
function getUserAttribute(user, name) {
    return user.UserAttributes?.find((attribute) => attribute.Name === name)?.Value ?? null;
}
async function getCognitoUser(email) {
    try {
        return await aws_1.cognitoClient.send(new client_cognito_identity_provider_1.AdminGetUserCommand({
            UserPoolId: env_1.env.userPoolId,
            Username: email
        }));
    }
    catch (error) {
        if (error instanceof Error && /UserNotFoundException/i.test(error.name)) {
            return null;
        }
        throw error;
    }
}
async function addApprovedUserToGroup(email, role) {
    await aws_1.cognitoClient.send(new client_cognito_identity_provider_1.AdminAddUserToGroupCommand({
        GroupName: roleGroupMap[role],
        Username: email,
        UserPoolId: env_1.env.userPoolId
    }));
}
async function ensureOtpSenderConfigured() {
    if (!env_1.env.otpSenderEmail || env_1.env.otpSenderEmail === "no-reply@example.com") {
        throw new Error("OTP sender email is not configured in the backend deployment");
    }
}
async function sendOtpEmail(email, otp, flow) {
    await ensureOtpSenderConfigured();
    const subject = flow === "signup"
        ? "Your Event Management System signup OTP"
        : "Your Event Management System sign-in OTP";
    const body = `Your OTP is ${otp}.\n\n` +
        "It is valid for 5 minutes.\n" +
        "If you did not request this code, you can ignore this email.";
    await aws_1.sesClient.send(new client_ses_1.SendEmailCommand({
        Source: env_1.env.otpSenderEmail,
        Destination: {
            ToAddresses: [email]
        },
        Message: {
            Subject: { Data: subject },
            Body: {
                Text: { Data: body }
            }
        }
    }));
}
async function requestOtp(body) {
    const email = normalizeEmail(body.email);
    const flow = normalizeFlow(body.flow);
    if (!email) {
        throw new Error("Email is required");
    }
    const cognitoUser = await getCognitoUser(email);
    if (flow === "signup" && cognitoUser) {
        throw new Error("An account with this email already exists");
    }
    if (flow === "signin" && !cognitoUser) {
        throw new Error("No account exists for this email");
    }
    const otp = generateOtp();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 5 * 60 * 1000);
    const record = {
        id: buildOtpId(email, flow),
        email,
        flow,
        otp_hash: hashValue(email, flow, otp),
        verification_token: null,
        expires_at: expiresAt.toISOString(),
        expires_at_epoch: Math.floor(expiresAt.getTime() / 1000),
        created_at: now.toISOString(),
        verified_at: null
    };
    await aws_1.dynamoClient.send(new lib_dynamodb_1.PutCommand({
        TableName: env_1.env.otpTable,
        Item: record
    }));
    await sendOtpEmail(email, otp, flow);
    return {
        message: "OTP sent successfully",
        expiresAt: record.expires_at
    };
}
async function verifyOtp(body) {
    const email = normalizeEmail(body.email);
    const flow = normalizeFlow(body.flow);
    const otp = String(body.otp ?? "").trim();
    if (!email || !otp) {
        throw new Error("Email and OTP are required");
    }
    const response = await aws_1.dynamoClient.send(new lib_dynamodb_1.GetCommand({
        TableName: env_1.env.otpTable,
        Key: { id: buildOtpId(email, flow) }
    }));
    const record = response.Item;
    if (!record) {
        throw new Error("OTP not found or already expired");
    }
    if (Date.parse(record.expires_at) < Date.now()) {
        throw new Error("OTP expired. Please request a new OTP");
    }
    if (record.otp_hash !== hashValue(email, flow, otp)) {
        throw new Error("Invalid OTP");
    }
    const verificationToken = `${(0, node_crypto_1.randomUUID)()}-${(0, node_crypto_1.randomUUID)()}`;
    const updated = {
        ...record,
        verification_token: verificationToken,
        verified_at: new Date().toISOString()
    };
    await aws_1.dynamoClient.send(new lib_dynamodb_1.PutCommand({
        TableName: env_1.env.otpTable,
        Item: updated
    }));
    return {
        message: "OTP verified successfully",
        verificationToken,
        expiresAt: record.expires_at
    };
}
async function consumeVerifiedOtp(email, flow, verificationToken) {
    const response = await aws_1.dynamoClient.send(new lib_dynamodb_1.GetCommand({
        TableName: env_1.env.otpTable,
        Key: { id: buildOtpId(email, flow) }
    }));
    const record = response.Item;
    if (!record) {
        throw new Error("OTP verification session not found");
    }
    if (Date.parse(record.expires_at) < Date.now()) {
        throw new Error("OTP verification expired. Please request a new OTP");
    }
    if (!record.verification_token || record.verification_token !== verificationToken) {
        throw new Error("OTP verification is incomplete");
    }
    await aws_1.dynamoClient.send(new lib_dynamodb_1.DeleteCommand({
        TableName: env_1.env.otpTable,
        Key: { id: record.id }
    }));
}
async function signUp(body) {
    const fullName = String(body.fullName ?? "").trim();
    const email = normalizeEmail(body.email);
    const password = String(body.password ?? "");
    const role = normalizeRole(body.role);
    const verificationToken = String(body.verificationToken ?? "").trim();
    const approvalStatus = role === "admin" ? "approved" : "pending";
    if (!fullName || !email || !password) {
        throw new Error("Full name, email, and password are required");
    }
    if (verificationToken) {
        await consumeVerifiedOtp(email, "signup", verificationToken);
    }
    const signupResponse = await aws_1.cognitoClient.send(new client_cognito_identity_provider_1.AdminCreateUserCommand({
        UserPoolId: env_1.env.userPoolId,
        Username: email,
        TemporaryPassword: `${password}Aa1!`,
        MessageAction: "SUPPRESS",
        UserAttributes: [
            { Name: "email", Value: email },
            { Name: "name", Value: fullName },
            { Name: "custom:role", Value: role },
            { Name: "email_verified", Value: "true" }
        ]
    }));
    await aws_1.cognitoClient.send(new client_cognito_identity_provider_1.AdminSetUserPasswordCommand({
        UserPoolId: env_1.env.userPoolId,
        Username: email,
        Password: password,
        Permanent: true
    }));
    const createdUser = await getCognitoUser(email);
    const cognitoSub = getUserAttribute(createdUser, "sub");
    await (0, dynamo_repository_1.putUserFromCognito)({
        cognitoSub: cognitoSub ??
            getUserAttribute({
                UserAttributes: signupResponse.User?.Attributes
            }, "sub") ??
            email,
        email,
        fullName,
        role,
        approvalStatus
    });
    if (approvalStatus === "approved") {
        await addApprovedUserToGroup(email, role);
    }
    if (approvalStatus !== "approved") {
        return {
            message: "Signup completed. Your account is waiting for admin approval.",
            approvalStatus
        };
    }
    const authResponse = await aws_1.cognitoClient.send(new client_cognito_identity_provider_1.InitiateAuthCommand({
        ClientId: env_1.env.userPoolClientId,
        AuthFlow: "USER_PASSWORD_AUTH",
        AuthParameters: {
            USERNAME: email,
            PASSWORD: password
        }
    }));
    return {
        message: "Signup completed successfully",
        tokens: authResponse.AuthenticationResult
    };
}
async function signIn(body) {
    const email = normalizeEmail(body.email);
    const password = String(body.password ?? "");
    const role = normalizeRole(body.role);
    const verificationToken = String(body.verificationToken ?? "").trim();
    if (!email || !password) {
        throw new Error("Email and password are required");
    }
    if (verificationToken) {
        await consumeVerifiedOtp(email, "signin", verificationToken);
    }
    const user = await getCognitoUser(email);
    if (!user) {
        throw new Error("No account exists for this email");
    }
    const userRole = (getUserAttribute(user, "custom:role") ?? "").toLowerCase();
    if (userRole !== role) {
        throw new Error("Selected role does not match this account");
    }
    const cognitoSub = getUserAttribute(user, "sub");
    const localUser = (cognitoSub ? await (0, dynamo_repository_1.getUserById)(cognitoSub).catch(() => null) : null) ?? await (0, dynamo_repository_1.findUserByEmail)(email);
    const approvalStatus = (localUser?.approval_status ?? (role === "admin" ? "approved" : "pending")).toLowerCase();
    if (role !== "admin" && approvalStatus !== "approved") {
        throw new Error(approvalStatus === "rejected"
            ? "Your account request was rejected by the admin."
            : "Your account is waiting for admin approval.");
    }
    const authResponse = await aws_1.cognitoClient.send(new client_cognito_identity_provider_1.InitiateAuthCommand({
        ClientId: env_1.env.userPoolClientId,
        AuthFlow: "USER_PASSWORD_AUTH",
        AuthParameters: {
            USERNAME: email,
            PASSWORD: password
        }
    }));
    return {
        message: "Signin completed successfully",
        tokens: authResponse.AuthenticationResult
    };
}
async function requestPasswordReset(body) {
    const email = normalizeEmail(body.email);
    if (!email) {
        throw new Error("Email is required");
    }
    await aws_1.cognitoClient.send(new client_cognito_identity_provider_1.ForgotPasswordCommand({
        ClientId: env_1.env.userPoolClientId,
        Username: email
    }));
    return {
        message: "Password reset code sent to your email."
    };
}
async function confirmPasswordReset(body) {
    const email = normalizeEmail(body.email);
    const confirmationCode = String(body.confirmationCode ?? "").trim();
    const password = String(body.password ?? "");
    if (!email || !confirmationCode || !password) {
        throw new Error("Email, confirmation code, and new password are required");
    }
    await aws_1.cognitoClient.send(new client_cognito_identity_provider_1.ConfirmForgotPasswordCommand({
        ClientId: env_1.env.userPoolClientId,
        Username: email,
        ConfirmationCode: confirmationCode,
        Password: password
    }));
    return {
        message: "Password changed successfully."
    };
}
async function handler(event) {
    try {
        if (event.httpMethod === "OPTIONS") {
            return (0, auth_1.optionsResponse)();
        }
        if (!event.body) {
            throw new Error("Request body is required");
        }
        const body = (0, http_1.parseJson)(event.body);
        if (isRoute(event, "POST", "/auth/request-otp")) {
            return (0, response_1.json)(200, await requestOtp(body));
        }
        if (isRoute(event, "POST", "/auth/verify-otp")) {
            return (0, response_1.json)(200, await verifyOtp(body));
        }
        if (isRoute(event, "POST", "/auth/signup")) {
            return (0, response_1.json)(200, await signUp(body));
        }
        if (isRoute(event, "POST", "/auth/signin")) {
            return (0, response_1.json)(200, await signIn(body));
        }
        if (isRoute(event, "POST", "/auth/password-reset/request")) {
            return (0, response_1.json)(200, await requestPasswordReset(body));
        }
        if (isRoute(event, "POST", "/auth/password-reset/confirm")) {
            return (0, response_1.json)(200, await confirmPasswordReset(body));
        }
        return (0, response_1.json)(404, { message: "Route not found" });
    }
    catch (error) {
        return (0, http_1.handleError)(error);
    }
}
