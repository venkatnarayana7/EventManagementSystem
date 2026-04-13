import { createHash, randomInt, randomUUID } from "node:crypto";
import {
  AdminAddUserToGroupCommand,
  AdminCreateUserCommand,
  AdminGetUserCommand,
  AdminSetUserPasswordCommand,
  ConfirmForgotPasswordCommand,
  ForgotPasswordCommand,
  InitiateAuthCommand,
  type AdminGetUserCommandOutput
} from "@aws-sdk/client-cognito-identity-provider";
import { DeleteCommand, GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { SendEmailCommand } from "@aws-sdk/client-ses";
import { cognitoClient, dynamoClient, sesClient } from "../../../shared/src/aws";
import { env } from "../../../shared/src/env";
import { handleError, parseJson } from "../../../shared/src/http";
import { json } from "../../../shared/src/response";
import { findUserByEmail, getUserById, putUserFromCognito } from "../../../shared/src/dynamo-repository";
import { optionsResponse } from "../../../shared/src/auth";

type AuthFlow = "signup" | "signin";
type AppRole = "admin" | "teacher" | "student";
type ApprovalStatus = "pending" | "approved" | "rejected";

const roleGroupMap = {
  admin: "Admins",
  teacher: "Teachers",
  student: "Students"
} as const;

interface OtpRecord {
  id: string;
  email: string;
  flow: AuthFlow;
  otp_hash: string;
  verification_token: string | null;
  expires_at: string;
  expires_at_epoch: number;
  created_at: string;
  verified_at: string | null;
}

function isRoute(event: APIGatewayProxyEvent, method: string, path: string) {
  return event.httpMethod === method && event.path === path;
}

function normalizeEmail(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function normalizeFlow(value: unknown): AuthFlow {
  const flow = String(value ?? "").trim().toLowerCase();
  if (flow === "signup" || flow === "signin") {
    return flow;
  }

  throw new Error("Flow must be signup or signin");
}

function normalizeRole(value: unknown): AppRole {
  const role = String(value ?? "").trim().toLowerCase();
  if (role === "admin" || role === "teacher" || role === "student") {
    return role;
  }

  throw new Error("Role must be admin, teacher, or student");
}

function buildOtpId(email: string, flow: AuthFlow) {
  return `${flow}#${email}`;
}

function hashValue(email: string, flow: AuthFlow, value: string) {
  return createHash("sha256")
    .update(`${env.userPoolId}:${flow}:${email}:${value}`)
    .digest("hex");
}

function generateOtp() {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

function getUserAttribute(user: AdminGetUserCommandOutput, name: string) {
  return user.UserAttributes?.find((attribute) => attribute.Name === name)?.Value ?? null;
}

async function getCognitoUser(email: string) {
  try {
    return await cognitoClient.send(
      new AdminGetUserCommand({
        UserPoolId: env.userPoolId,
        Username: email
      })
    );
  } catch (error) {
    if (error instanceof Error && /UserNotFoundException/i.test(error.name)) {
      return null;
    }

    throw error;
  }
}

async function addApprovedUserToGroup(email: string, role: AppRole) {
  await cognitoClient.send(
    new AdminAddUserToGroupCommand({
      GroupName: roleGroupMap[role],
      Username: email,
      UserPoolId: env.userPoolId
    })
  );
}

async function ensureOtpSenderConfigured() {
  if (!env.otpSenderEmail || env.otpSenderEmail === "no-reply@example.com") {
    throw new Error("OTP sender email is not configured in the backend deployment");
  }
}

async function sendOtpEmail(email: string, otp: string, flow: AuthFlow) {
  await ensureOtpSenderConfigured();

  const subject =
    flow === "signup"
      ? "Your Event Management System signup OTP"
      : "Your Event Management System sign-in OTP";
  const body =
    `Your OTP is ${otp}.\n\n` +
    "It is valid for 5 minutes.\n" +
    "If you did not request this code, you can ignore this email.";

  await sesClient.send(
    new SendEmailCommand({
      Source: env.otpSenderEmail,
      Destination: {
        ToAddresses: [email]
      },
      Message: {
        Subject: { Data: subject },
        Body: {
          Text: { Data: body }
        }
      }
    })
  );
}

async function requestOtp(body: Record<string, unknown>) {
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
  const record: OtpRecord = {
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

  await dynamoClient.send(
    new PutCommand({
      TableName: env.otpTable,
      Item: record
    })
  );

  await sendOtpEmail(email, otp, flow);

  return {
    message: "OTP sent successfully",
    expiresAt: record.expires_at
  };
}

async function verifyOtp(body: Record<string, unknown>) {
  const email = normalizeEmail(body.email);
  const flow = normalizeFlow(body.flow);
  const otp = String(body.otp ?? "").trim();

  if (!email || !otp) {
    throw new Error("Email and OTP are required");
  }

  const response = await dynamoClient.send(
    new GetCommand({
      TableName: env.otpTable,
      Key: { id: buildOtpId(email, flow) }
    })
  );

  const record = response.Item as OtpRecord | undefined;
  if (!record) {
    throw new Error("OTP not found or already expired");
  }

  if (Date.parse(record.expires_at) < Date.now()) {
    throw new Error("OTP expired. Please request a new OTP");
  }

  if (record.otp_hash !== hashValue(email, flow, otp)) {
    throw new Error("Invalid OTP");
  }

  const verificationToken = `${randomUUID()}-${randomUUID()}`;
  const updated: OtpRecord = {
    ...record,
    verification_token: verificationToken,
    verified_at: new Date().toISOString()
  };

  await dynamoClient.send(
    new PutCommand({
      TableName: env.otpTable,
      Item: updated
    })
  );

  return {
    message: "OTP verified successfully",
    verificationToken,
    expiresAt: record.expires_at
  };
}

async function consumeVerifiedOtp(email: string, flow: AuthFlow, verificationToken: string) {
  const response = await dynamoClient.send(
    new GetCommand({
      TableName: env.otpTable,
      Key: { id: buildOtpId(email, flow) }
    })
  );

  const record = response.Item as OtpRecord | undefined;
  if (!record) {
    throw new Error("OTP verification session not found");
  }

  if (Date.parse(record.expires_at) < Date.now()) {
    throw new Error("OTP verification expired. Please request a new OTP");
  }

  if (!record.verification_token || record.verification_token !== verificationToken) {
    throw new Error("OTP verification is incomplete");
  }

  await dynamoClient.send(
    new DeleteCommand({
      TableName: env.otpTable,
      Key: { id: record.id }
    })
  );
}

async function signUp(body: Record<string, unknown>) {
  const fullName = String(body.fullName ?? "").trim();
  const email = normalizeEmail(body.email);
  const password = String(body.password ?? "");
  const role = normalizeRole(body.role);
  const verificationToken = String(body.verificationToken ?? "").trim();
  const approvalStatus: ApprovalStatus = role === "admin" ? "approved" : "pending";

  if (!fullName || !email || !password) {
    throw new Error("Full name, email, and password are required");
  }

  if (verificationToken) {
    await consumeVerifiedOtp(email, "signup", verificationToken);
  }

  const signupResponse = await cognitoClient.send(
    new AdminCreateUserCommand({
      UserPoolId: env.userPoolId,
      Username: email,
      TemporaryPassword: `${password}Aa1!`,
      MessageAction: "SUPPRESS",
      UserAttributes: [
        { Name: "email", Value: email },
        { Name: "name", Value: fullName },
        { Name: "custom:role", Value: role },
        { Name: "email_verified", Value: "true" }
      ]
    })
  );

  await cognitoClient.send(
    new AdminSetUserPasswordCommand({
      UserPoolId: env.userPoolId,
      Username: email,
      Password: password,
      Permanent: true
    })
  );

  const createdUser = await getCognitoUser(email);
  const cognitoSub = getUserAttribute(createdUser as AdminGetUserCommandOutput, "sub");

  await putUserFromCognito({
    cognitoSub:
      cognitoSub ??
      getUserAttribute(
        {
          UserAttributes: signupResponse.User?.Attributes
        } as AdminGetUserCommandOutput,
        "sub"
      ) ??
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

  const authResponse = await cognitoClient.send(
    new InitiateAuthCommand({
      ClientId: env.userPoolClientId,
      AuthFlow: "USER_PASSWORD_AUTH",
      AuthParameters: {
        USERNAME: email,
        PASSWORD: password
      }
    })
  );

  return {
    message: "Signup completed successfully",
    tokens: authResponse.AuthenticationResult
  };
}

async function signIn(body: Record<string, unknown>) {
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
  const localUser = (cognitoSub ? await getUserById(cognitoSub).catch(() => null) : null) ?? await findUserByEmail(email);
  const approvalStatus = (localUser?.approval_status ?? (role === "admin" ? "approved" : "pending")).toLowerCase();
  if (role !== "admin" && approvalStatus !== "approved") {
    throw new Error(
      approvalStatus === "rejected"
        ? "Your account request was rejected by the admin."
        : "Your account is waiting for admin approval."
    );
  }

  const authResponse = await cognitoClient.send(
    new InitiateAuthCommand({
      ClientId: env.userPoolClientId,
      AuthFlow: "USER_PASSWORD_AUTH",
      AuthParameters: {
        USERNAME: email,
        PASSWORD: password
      }
    })
  );

  return {
    message: "Signin completed successfully",
    tokens: authResponse.AuthenticationResult
  };
}

async function requestPasswordReset(body: Record<string, unknown>) {
  const email = normalizeEmail(body.email);
  if (!email) {
    throw new Error("Email is required");
  }

  await cognitoClient.send(
    new ForgotPasswordCommand({
      ClientId: env.userPoolClientId,
      Username: email
    })
  );

  return {
    message: "Password reset code sent to your email."
  };
}

async function confirmPasswordReset(body: Record<string, unknown>) {
  const email = normalizeEmail(body.email);
  const confirmationCode = String(body.confirmationCode ?? "").trim();
  const password = String(body.password ?? "");

  if (!email || !confirmationCode || !password) {
    throw new Error("Email, confirmation code, and new password are required");
  }

  await cognitoClient.send(
    new ConfirmForgotPasswordCommand({
      ClientId: env.userPoolClientId,
      Username: email,
      ConfirmationCode: confirmationCode,
      Password: password
    })
  );

  return {
    message: "Password changed successfully."
  };
}

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    if (event.httpMethod === "OPTIONS") {
      return optionsResponse();
    }

    if (!event.body) {
      throw new Error("Request body is required");
    }

    const body = parseJson<Record<string, unknown>>(event.body);

    if (isRoute(event, "POST", "/auth/request-otp")) {
      return json(200, await requestOtp(body));
    }

    if (isRoute(event, "POST", "/auth/verify-otp")) {
      return json(200, await verifyOtp(body));
    }

    if (isRoute(event, "POST", "/auth/signup")) {
      return json(200, await signUp(body));
    }

    if (isRoute(event, "POST", "/auth/signin")) {
      return json(200, await signIn(body));
    }

    if (isRoute(event, "POST", "/auth/password-reset/request")) {
      return json(200, await requestPasswordReset(body));
    }

    if (isRoute(event, "POST", "/auth/password-reset/confirm")) {
      return json(200, await confirmPasswordReset(body));
    }

    return json(404, { message: "Route not found" });
  } catch (error) {
    return handleError(error);
  }
}
