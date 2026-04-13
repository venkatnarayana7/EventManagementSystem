"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildRegistrationId = buildRegistrationId;
exports.buildAttendanceId = buildAttendanceId;
exports.getUserById = getUserById;
exports.getUserByCognitoSub = getUserByCognitoSub;
exports.ensureUserFromAuthContext = ensureUserFromAuthContext;
exports.batchGetUsers = batchGetUsers;
exports.listUsers = listUsers;
exports.findUserByEmail = findUserByEmail;
exports.putUserFromCognito = putUserFromCognito;
exports.updateUserProfile = updateUserProfile;
exports.updateUserApproval = updateUserApproval;
exports.listMessagesByRecipient = listMessagesByRecipient;
exports.createMessages = createMessages;
exports.getEventById = getEventById;
exports.batchGetEvents = batchGetEvents;
exports.listEvents = listEvents;
exports.createEvent = createEvent;
exports.saveEvent = saveEvent;
exports.adjustEventCurrentCount = adjustEventCurrentCount;
exports.listRegistrationsByStudent = listRegistrationsByStudent;
exports.listRegistrationsByEvent = listRegistrationsByEvent;
exports.getRegistrationById = getRegistrationById;
exports.putRegistration = putRegistration;
exports.saveRegistration = saveRegistration;
exports.listAttendanceByEvent = listAttendanceByEvent;
exports.listAttendanceByStudent = listAttendanceByStudent;
exports.getSeatCounterByEvent = getSeatCounterByEvent;
exports.batchGetSeatCounters = batchGetSeatCounters;
exports.upsertAttendance = upsertAttendance;
exports.countEvents = countEvents;
exports.countRegistrations = countRegistrations;
exports.countAttendanceRecords = countAttendanceRecords;
const node_crypto_1 = require("node:crypto");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const aws_1 = require("./aws");
const env_1 = require("./env");
function nowIso() {
    return new Date().toISOString();
}
async function scanAll(tableName) {
    const items = [];
    let lastEvaluatedKey;
    do {
        const response = await aws_1.dynamoClient.send(new lib_dynamodb_1.ScanCommand({
            TableName: tableName,
            ExclusiveStartKey: lastEvaluatedKey
        }));
        items.push(...(response.Items ?? []));
        lastEvaluatedKey = response.LastEvaluatedKey;
    } while (lastEvaluatedKey);
    return items;
}
async function queryAll(input) {
    const items = [];
    let lastEvaluatedKey;
    do {
        const response = await aws_1.dynamoClient.send(new lib_dynamodb_1.QueryCommand({
            ...input,
            ExclusiveStartKey: lastEvaluatedKey
        }));
        items.push(...(response.Items ?? []));
        lastEvaluatedKey = response.LastEvaluatedKey;
    } while (lastEvaluatedKey);
    return items;
}
async function batchGetByIds(tableName, ids) {
    if (!ids.length) {
        return [];
    }
    const chunks = [];
    for (let index = 0; index < ids.length; index += 100) {
        chunks.push(ids.slice(index, index + 100));
    }
    const items = [];
    for (const chunk of chunks) {
        const response = await aws_1.dynamoClient.send(new lib_dynamodb_1.BatchGetCommand({
            RequestItems: {
                [tableName]: {
                    Keys: chunk.map((id) => ({ id }))
                }
            }
        }));
        items.push(...(response.Responses?.[tableName] ?? []));
    }
    return items;
}
function sortByDateDescending(items, field) {
    return [...items].sort((left, right) => String(right[field] ?? "").localeCompare(String(left[field] ?? "")));
}
function sortByEventSchedule(items) {
    return [...items].sort((left, right) => {
        const leftDate = String(left.event_date ?? "");
        const rightDate = String(right.event_date ?? "");
        const dateCompare = leftDate.localeCompare(rightDate);
        if (dateCompare !== 0) {
            return dateCompare;
        }
        return String(left.start_time ?? "").localeCompare(String(right.start_time ?? ""));
    });
}
function buildRegistrationId(eventId, studentId) {
    return `${eventId}#${studentId}`;
}
function buildAttendanceId(eventId, studentId) {
    return `${eventId}#${studentId}`;
}
async function getUserById(userId) {
    const response = await aws_1.dynamoClient.send(new lib_dynamodb_1.GetCommand({
        TableName: env_1.env.usersTable,
        Key: { id: userId }
    }));
    if (!response.Item) {
        throw new Error("Authenticated user does not exist in DynamoDB");
    }
    return response.Item;
}
async function getUserByCognitoSub(cognitoSub) {
    return getUserById(cognitoSub);
}
async function ensureUserFromAuthContext(auth) {
    const response = await aws_1.dynamoClient.send(new lib_dynamodb_1.GetCommand({
        TableName: env_1.env.usersTable,
        Key: { id: auth.userId }
    }));
    if (response.Item) {
        return response.Item;
    }
    if (auth.email) {
        const existingByEmail = await findUserByEmail(auth.email);
        if (existingByEmail) {
            const migrated = {
                ...existingByEmail,
                id: auth.userId,
                cognito_sub: auth.userId,
                email: auth.email,
                full_name: auth.fullName ?? existingByEmail.full_name,
                role: existingByEmail.role ?? auth.role,
                department: auth.department ?? existingByEmail.department ?? null,
                roll_no: auth.rollNo ?? existingByEmail.roll_no ?? null,
                emp_id: auth.empId ?? existingByEmail.emp_id ?? null,
                updated_at: nowIso()
            };
            await aws_1.dynamoClient.send(new lib_dynamodb_1.PutCommand({
                TableName: env_1.env.usersTable,
                Item: migrated
            }));
            if (existingByEmail.id !== auth.userId) {
                await aws_1.dynamoClient.send(new lib_dynamodb_1.DeleteCommand({
                    TableName: env_1.env.usersTable,
                    Key: { id: existingByEmail.id }
                }));
            }
            return migrated;
        }
    }
    return putUserFromCognito({
        cognitoSub: auth.userId,
        email: auth.email ?? `${auth.userId}@unknown.local`,
        fullName: auth.fullName ?? auth.email ?? "EMS User",
        role: auth.role,
        department: auth.department ?? null,
        rollNo: auth.rollNo ?? null,
        empId: auth.empId ?? null
    });
}
async function batchGetUsers(userIds) {
    return batchGetByIds(env_1.env.usersTable, [...new Set(userIds)]);
}
async function listUsers() {
    const items = await scanAll(env_1.env.usersTable);
    return sortByDateDescending(items, "created_at");
}
async function findUserByEmail(email) {
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const items = await scanAll(env_1.env.usersTable);
    return items.find((item) => String(item.email || "").trim().toLowerCase() === normalizedEmail) ?? null;
}
async function putUserFromCognito(input) {
    const timestamp = nowIso();
    const existing = await aws_1.dynamoClient.send(new lib_dynamodb_1.GetCommand({
        TableName: env_1.env.usersTable,
        Key: { id: input.cognitoSub }
    }));
    const item = {
        id: input.cognitoSub,
        cognito_sub: input.cognitoSub,
        email: input.email,
        full_name: input.fullName,
        role: input.role,
        approval_status: input.approvalStatus ??
            (existing.Item?.approval_status ??
                (input.role === "admin" ? "approved" : "pending")),
        department: input.department ?? null,
        roll_no: input.rollNo ?? null,
        emp_id: input.empId ?? null,
        phone_number: existing.Item?.phone_number ?? null,
        date_of_birth: existing.Item?.date_of_birth ?? null,
        address: existing.Item?.address ?? null,
        bio: existing.Item?.bio ?? null,
        notification_preferences: existing.Item?.notification_preferences ?? null,
        avatar_url: existing.Item?.avatar_url ?? null,
        is_active: true,
        created_at: existing.Item?.created_at ?? timestamp,
        updated_at: timestamp
    };
    await aws_1.dynamoClient.send(new lib_dynamodb_1.PutCommand({
        TableName: env_1.env.usersTable,
        Item: item
    }));
    return item;
}
async function updateUserProfile(userId, updates) {
    const user = await getUserById(userId);
    const item = {
        ...user,
        full_name: updates.fullName,
        department: updates.department !== undefined ? updates.department : user.department ?? null,
        avatar_url: updates.avatarUrl !== undefined ? updates.avatarUrl : user.avatar_url ?? null,
        phone_number: updates.phoneNumber !== undefined ? updates.phoneNumber : user.phone_number ?? null,
        date_of_birth: updates.dateOfBirth !== undefined ? updates.dateOfBirth : user.date_of_birth ?? null,
        address: updates.address !== undefined ? updates.address : user.address ?? null,
        bio: updates.bio !== undefined ? updates.bio : user.bio ?? null,
        notification_preferences: updates.notificationPreferences !== undefined
            ? updates.notificationPreferences
            : user.notification_preferences ?? null,
        updated_at: nowIso()
    };
    await aws_1.dynamoClient.send(new lib_dynamodb_1.PutCommand({
        TableName: env_1.env.usersTable,
        Item: item
    }));
    return item;
}
async function updateUserApproval(userId, updates) {
    const user = await getUserById(userId);
    const item = {
        ...user,
        role: updates.role,
        approval_status: updates.approvalStatus,
        updated_at: nowIso()
    };
    await aws_1.dynamoClient.send(new lib_dynamodb_1.PutCommand({
        TableName: env_1.env.usersTable,
        Item: item
    }));
    return item;
}
async function listMessagesByRecipient(recipientUserId) {
    return queryAll({
        TableName: env_1.env.messagesTable,
        IndexName: "RecipientIndex",
        KeyConditionExpression: "recipient_user_id = :recipientUserId",
        ExpressionAttributeValues: {
            ":recipientUserId": recipientUserId
        },
        ScanIndexForward: false
    });
}
async function createMessages(recipients, input) {
    const timestamp = nowIso();
    const items = [];
    for (const recipient of recipients) {
        const item = {
            id: (0, node_crypto_1.randomUUID)(),
            recipient_user_id: recipient.userId,
            recipient_email: recipient.email,
            target_scope: input.targetScope,
            subject: input.subject,
            body: input.body,
            sent_by_user_id: input.sentByUserId,
            sent_by_email: input.sentByEmail,
            created_at: timestamp
        };
        await aws_1.dynamoClient.send(new lib_dynamodb_1.PutCommand({
            TableName: env_1.env.messagesTable,
            Item: item
        }));
        items.push(item);
    }
    return items;
}
async function getEventById(eventId) {
    const response = await aws_1.dynamoClient.send(new lib_dynamodb_1.GetCommand({
        TableName: env_1.env.eventsTable,
        Key: { id: eventId }
    }));
    return response.Item ?? null;
}
async function batchGetEvents(eventIds) {
    return batchGetByIds(env_1.env.eventsTable, [...new Set(eventIds)]);
}
async function listEvents() {
    const items = await scanAll(env_1.env.eventsTable);
    return sortByEventSchedule(items);
}
async function createEvent(input) {
    const timestamp = nowIso();
    const item = {
        ...input,
        id: (0, node_crypto_1.randomUUID)(),
        created_at: timestamp,
        updated_at: timestamp
    };
    await aws_1.dynamoClient.send(new lib_dynamodb_1.PutCommand({
        TableName: env_1.env.eventsTable,
        Item: item
    }));
    return item;
}
async function saveEvent(event) {
    const item = {
        ...event,
        updated_at: nowIso()
    };
    await aws_1.dynamoClient.send(new lib_dynamodb_1.PutCommand({
        TableName: env_1.env.eventsTable,
        Item: item
    }));
    return item;
}
async function adjustEventCurrentCount(eventId, delta) {
    await aws_1.dynamoClient.send(new lib_dynamodb_1.UpdateCommand({
        TableName: env_1.env.eventsTable,
        Key: { id: eventId },
        UpdateExpression: "SET current_count = if_not_exists(current_count, :zero) + :delta, updated_at = :updatedAt",
        ExpressionAttributeValues: {
            ":delta": delta,
            ":zero": 0,
            ":updatedAt": nowIso()
        }
    }));
}
async function listRegistrationsByStudent(studentId) {
    return queryAll({
        TableName: env_1.env.registrationsTable,
        IndexName: "StudentIdIndex",
        KeyConditionExpression: "student_id = :studentId",
        ExpressionAttributeValues: {
            ":studentId": studentId
        },
        ScanIndexForward: false
    });
}
async function listRegistrationsByEvent(eventId) {
    return queryAll({
        TableName: env_1.env.registrationsTable,
        IndexName: "EventIdIndex",
        KeyConditionExpression: "event_id = :eventId",
        ExpressionAttributeValues: {
            ":eventId": eventId
        },
        ScanIndexForward: true
    });
}
async function getRegistrationById(registrationId) {
    const response = await aws_1.dynamoClient.send(new lib_dynamodb_1.GetCommand({
        TableName: env_1.env.registrationsTable,
        Key: { id: registrationId }
    }));
    return response.Item ?? null;
}
async function putRegistration(item, conditionExpression) {
    await aws_1.dynamoClient.send(new lib_dynamodb_1.PutCommand({
        TableName: env_1.env.registrationsTable,
        Item: item,
        ConditionExpression: conditionExpression
    }));
    return item;
}
async function saveRegistration(item) {
    await aws_1.dynamoClient.send(new lib_dynamodb_1.PutCommand({
        TableName: env_1.env.registrationsTable,
        Item: item
    }));
    return item;
}
async function listAttendanceByEvent(eventId) {
    return queryAll({
        TableName: env_1.env.attendanceTable,
        IndexName: "EventIdIndex",
        KeyConditionExpression: "event_id = :eventId",
        ExpressionAttributeValues: {
            ":eventId": eventId
        },
        ScanIndexForward: false
    });
}
async function listAttendanceByStudent(studentId) {
    const items = await scanAll(env_1.env.attendanceTable);
    return sortByDateDescending(items.filter((item) => item.student_id === studentId), "marked_at");
}
async function getSeatCounterByEvent(eventId) {
    const response = await aws_1.dynamoClient.send(new lib_dynamodb_1.GetCommand({
        TableName: env_1.env.seatCounterTable,
        Key: { event_id: eventId }
    }));
    return response.Item ?? null;
}
async function batchGetSeatCounters(eventIds) {
    const uniqueIds = [...new Set(eventIds.filter(Boolean))];
    if (!uniqueIds.length) {
        return [];
    }
    const chunks = [];
    for (let index = 0; index < uniqueIds.length; index += 100) {
        chunks.push(uniqueIds.slice(index, index + 100));
    }
    const items = [];
    for (const chunk of chunks) {
        const response = await aws_1.dynamoClient.send(new lib_dynamodb_1.BatchGetCommand({
            RequestItems: {
                [env_1.env.seatCounterTable]: {
                    Keys: chunk.map((eventId) => ({ event_id: eventId }))
                }
            }
        }));
        items.push(...(response.Responses?.[env_1.env.seatCounterTable] ?? []));
    }
    return items;
}
async function upsertAttendance(item) {
    await aws_1.dynamoClient.send(new lib_dynamodb_1.PutCommand({
        TableName: env_1.env.attendanceTable,
        Item: item
    }));
    return item;
}
async function countEvents() {
    const items = await scanAll(env_1.env.eventsTable);
    return items.length;
}
async function countRegistrations() {
    const items = await scanAll(env_1.env.registrationsTable);
    return items.filter((item) => item.status !== "cancelled").length;
}
async function countAttendanceRecords() {
    const items = await scanAll(env_1.env.attendanceTable);
    return items.length;
}
