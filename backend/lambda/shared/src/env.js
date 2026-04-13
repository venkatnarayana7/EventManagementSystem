"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const requiredVariables = [
    "APP_ENV",
    "AWS_REGION",
    "MEDIA_BUCKET_NAME",
    "USERS_TABLE",
    "EVENTS_TABLE",
    "REGISTRATIONS_TABLE",
    "ATTENDANCE_TABLE",
    "SEAT_COUNTER_TABLE",
    "MESSAGES_TABLE",
    "OTP_TABLE",
    "WS_CONNECTIONS_TABLE",
    "OTP_SENDER_EMAIL",
    "USER_POOL_ID",
    "USER_POOL_CLIENT_ID",
    "WS_MANAGEMENT_ENDPOINT"
];
function read(name) {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
}
exports.env = {
    appEnv: read("APP_ENV"),
    awsRegion: read("AWS_REGION"),
    mediaBucketName: read("MEDIA_BUCKET_NAME"),
    usersTable: read("USERS_TABLE"),
    eventsTable: read("EVENTS_TABLE"),
    registrationsTable: read("REGISTRATIONS_TABLE"),
    attendanceTable: read("ATTENDANCE_TABLE"),
    seatCounterTable: read("SEAT_COUNTER_TABLE"),
    messagesTable: read("MESSAGES_TABLE"),
    otpTable: read("OTP_TABLE"),
    wsConnectionsTable: read("WS_CONNECTIONS_TABLE"),
    otpSenderEmail: read("OTP_SENDER_EMAIL"),
    userPoolId: read("USER_POOL_ID"),
    userPoolClientId: read("USER_POOL_CLIENT_ID"),
    wsManagementEndpoint: read("WS_MANAGEMENT_ENDPOINT")
};
