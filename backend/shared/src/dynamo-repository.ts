import { randomUUID } from "node:crypto";
import {
  BatchGetCommand,
  DeleteCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
  ScanCommand,
  UpdateCommand
} from "@aws-sdk/lib-dynamodb";
import { dynamoClient } from "./aws";
import { env } from "./env";
import type { AppRole, AuthContext } from "./auth";

export interface AppUserRecord {
  id: string;
  cognito_sub: string;
  email: string;
  full_name: string;
  role: AppRole;
  approval_status?: "pending" | "approved" | "rejected";
  department: string | null;
  roll_no?: string | null;
  emp_id?: string | null;
  phone_number?: string | null;
  date_of_birth?: string | null;
  address?: string | null;
  bio?: string | null;
  notification_preferences?: {
    new_events?: boolean;
    registration_confirmation?: boolean;
    seat_alerts?: boolean;
    attendance_updates?: boolean;
    event_reminders?: boolean;
    waitlist_updates?: boolean;
  } | null;
  avatar_url?: string | null;
  is_active?: boolean;
  created_at: string;
  updated_at: string;
}

export interface EventRecord {
  id: string;
  title: string;
  description: string;
  event_type: string;
  status: "draft" | "pending_approval" | "approved" | "rejected" | "cancelled" | "completed";
  price: number;
  created_by: string;
  approved_by: string | null;
  venue: string;
  event_date: string;
  start_time: string;
  end_time: string;
  max_capacity: number;
  current_count: number;
  registration_deadline: string | null;
  poster_url: string | null;
  is_public: boolean;
  department_filter: string | null;
  tags: string[];
  staff_assignments?: Array<{
    user_id: string;
    joined_at: string;
  }>;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface RegistrationRecord {
  id: string;
  event_id: string;
  student_id: string;
  status: "registered" | "waitlisted" | "cancelled" | "attended";
  registered_at: string;
  cancelled_at: string | null;
}

export interface AttendanceRecord {
  id: string;
  event_id: string;
  student_id: string;
  marked_by: string;
  marked_at: string;
  method: "manual" | "qr_code" | "bulk";
  status?: "present" | "absent";
}

export interface SeatCounterRecord {
  event_id: string;
  current_count: number;
  max_capacity: number;
  waitlist_count: number;
  last_updated: string;
}

export interface MessageRecord {
  id: string;
  recipient_user_id: string;
  recipient_email: string;
  target_scope: "user" | "all";
  subject: string;
  body: string;
  sent_by_user_id: string;
  sent_by_email: string;
  created_at: string;
}

function nowIso() {
  return new Date().toISOString();
}

async function scanAll<T>(tableName: string): Promise<T[]> {
  const items: T[] = [];
  let lastEvaluatedKey: Record<string, unknown> | undefined;

  do {
    const response = await dynamoClient.send(
      new ScanCommand({
        TableName: tableName,
        ExclusiveStartKey: lastEvaluatedKey
      })
    );

    items.push(...((response.Items as T[] | undefined) ?? []));
    lastEvaluatedKey = response.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  return items;
}

async function queryAll<T>(input: ConstructorParameters<typeof QueryCommand>[0]): Promise<T[]> {
  const items: T[] = [];
  let lastEvaluatedKey: Record<string, unknown> | undefined;

  do {
    const response = await dynamoClient.send(
      new QueryCommand({
        ...input,
        ExclusiveStartKey: lastEvaluatedKey
      })
    );

    items.push(...((response.Items as T[] | undefined) ?? []));
    lastEvaluatedKey = response.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  return items;
}

async function batchGetByIds<T>(tableName: string, ids: string[]): Promise<T[]> {
  if (!ids.length) {
    return [];
  }

  const chunks: string[][] = [];
  for (let index = 0; index < ids.length; index += 100) {
    chunks.push(ids.slice(index, index + 100));
  }

  const items: T[] = [];

  for (const chunk of chunks) {
    const response = await dynamoClient.send(
      new BatchGetCommand({
        RequestItems: {
          [tableName]: {
            Keys: chunk.map((id) => ({ id }))
          }
        }
      })
    );

    items.push(...((response.Responses?.[tableName] as T[] | undefined) ?? []));
  }

  return items;
}

function sortByDateDescending<T>(items: T[], field: keyof T) {
  return [...items].sort((left, right) =>
    String(right[field] ?? "").localeCompare(String(left[field] ?? ""))
  );
}

function sortByEventSchedule(items: EventRecord[]) {
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

export function buildRegistrationId(eventId: string, studentId: string) {
  return `${eventId}#${studentId}`;
}

export function buildAttendanceId(eventId: string, studentId: string) {
  return `${eventId}#${studentId}`;
}

export async function getUserById(userId: string): Promise<AppUserRecord> {
  const response = await dynamoClient.send(
    new GetCommand({
      TableName: env.usersTable,
      Key: { id: userId }
    })
  );

  if (!response.Item) {
    throw new Error("Authenticated user does not exist in DynamoDB");
  }

  return response.Item as AppUserRecord;
}

export async function getUserByCognitoSub(cognitoSub: string): Promise<AppUserRecord> {
  return getUserById(cognitoSub);
}

export async function ensureUserFromAuthContext(auth: AuthContext): Promise<AppUserRecord> {
  const response = await dynamoClient.send(
    new GetCommand({
      TableName: env.usersTable,
      Key: { id: auth.userId }
    })
  );

  if (response.Item) {
    return response.Item as AppUserRecord;
  }

  if (auth.email) {
    const existingByEmail = await findUserByEmail(auth.email);
    if (existingByEmail) {
      const migrated: AppUserRecord = {
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

      await dynamoClient.send(
        new PutCommand({
          TableName: env.usersTable,
          Item: migrated
        })
      );

      if (existingByEmail.id !== auth.userId) {
        await dynamoClient.send(
          new DeleteCommand({
            TableName: env.usersTable,
            Key: { id: existingByEmail.id }
          })
        );
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

export async function batchGetUsers(userIds: string[]) {
  return batchGetByIds<AppUserRecord>(env.usersTable, [...new Set(userIds)]);
}

export async function listUsers() {
  const items = await scanAll<AppUserRecord>(env.usersTable);
  return sortByDateDescending(items, "created_at");
}

export async function findUserByEmail(email: string) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const items = await scanAll<AppUserRecord>(env.usersTable);
  return items.find((item) => String(item.email || "").trim().toLowerCase() === normalizedEmail) ?? null;
}

export async function putUserFromCognito(input: {
  cognitoSub: string;
  email: string;
  fullName: string;
  role: AppRole;
  approvalStatus?: "pending" | "approved" | "rejected";
  department?: string | null;
  rollNo?: string | null;
  empId?: string | null;
}) {
  const timestamp = nowIso();
  const existing = await dynamoClient.send(
    new GetCommand({
      TableName: env.usersTable,
      Key: { id: input.cognitoSub }
    })
  );

  const item: AppUserRecord = {
    id: input.cognitoSub,
    cognito_sub: input.cognitoSub,
    email: input.email,
    full_name: input.fullName,
    role: input.role,
    approval_status:
      input.approvalStatus ??
      ((existing.Item?.approval_status as AppUserRecord["approval_status"] | undefined) ??
        (input.role === "admin" ? "approved" : "pending")),
    department: input.department ?? null,
    roll_no: input.rollNo ?? null,
    emp_id: input.empId ?? null,
    phone_number: (existing.Item?.phone_number as string | null | undefined) ?? null,
    date_of_birth: (existing.Item?.date_of_birth as string | null | undefined) ?? null,
    address: (existing.Item?.address as string | null | undefined) ?? null,
    bio: (existing.Item?.bio as string | null | undefined) ?? null,
    notification_preferences:
      (existing.Item?.notification_preferences as AppUserRecord["notification_preferences"] | undefined) ?? null,
    avatar_url: (existing.Item?.avatar_url as string | null | undefined) ?? null,
    is_active: true,
    created_at: (existing.Item?.created_at as string | undefined) ?? timestamp,
    updated_at: timestamp
  };

  await dynamoClient.send(
    new PutCommand({
      TableName: env.usersTable,
      Item: item
    })
  );

  return item;
}

export async function updateUserProfile(
  userId: string,
  updates: {
    fullName: string;
    department?: string | null;
    avatarUrl?: string | null;
    phoneNumber?: string | null;
    dateOfBirth?: string | null;
    address?: string | null;
    bio?: string | null;
    notificationPreferences?: AppUserRecord["notification_preferences"];
  }
) {
  const user = await getUserById(userId);
  const item: AppUserRecord = {
    ...user,
    full_name: updates.fullName,
    department: updates.department !== undefined ? updates.department : user.department ?? null,
    avatar_url: updates.avatarUrl !== undefined ? updates.avatarUrl : user.avatar_url ?? null,
    phone_number: updates.phoneNumber !== undefined ? updates.phoneNumber : user.phone_number ?? null,
    date_of_birth: updates.dateOfBirth !== undefined ? updates.dateOfBirth : user.date_of_birth ?? null,
    address: updates.address !== undefined ? updates.address : user.address ?? null,
    bio: updates.bio !== undefined ? updates.bio : user.bio ?? null,
    notification_preferences:
      updates.notificationPreferences !== undefined
        ? updates.notificationPreferences
        : user.notification_preferences ?? null,
    updated_at: nowIso()
  };

  await dynamoClient.send(
    new PutCommand({
      TableName: env.usersTable,
      Item: item
    })
  );

  return item;
}

export async function updateUserApproval(
  userId: string,
  updates: {
    role: AppRole;
    approvalStatus: "pending" | "approved" | "rejected";
  }
) {
  const user = await getUserById(userId);
  const item: AppUserRecord = {
    ...user,
    role: updates.role,
    approval_status: updates.approvalStatus,
    updated_at: nowIso()
  };

  await dynamoClient.send(
    new PutCommand({
      TableName: env.usersTable,
      Item: item
    })
  );

  return item;
}

export async function listMessagesByRecipient(recipientUserId: string) {
  return queryAll<MessageRecord>({
    TableName: env.messagesTable,
    IndexName: "RecipientIndex",
    KeyConditionExpression: "recipient_user_id = :recipientUserId",
    ExpressionAttributeValues: {
      ":recipientUserId": recipientUserId
    },
    ScanIndexForward: false
  });
}

export async function createMessages(
  recipients: Array<{ userId: string; email: string }>,
  input: {
    targetScope: "user" | "all";
    subject: string;
    body: string;
    sentByUserId: string;
    sentByEmail: string;
  }
) {
  const timestamp = nowIso();
  const items: MessageRecord[] = [];

  for (const recipient of recipients) {
    const item: MessageRecord = {
      id: randomUUID(),
      recipient_user_id: recipient.userId,
      recipient_email: recipient.email,
      target_scope: input.targetScope,
      subject: input.subject,
      body: input.body,
      sent_by_user_id: input.sentByUserId,
      sent_by_email: input.sentByEmail,
      created_at: timestamp
    };

    await dynamoClient.send(
      new PutCommand({
        TableName: env.messagesTable,
        Item: item
      })
    );

    items.push(item);
  }

  return items;
}

export async function getEventById(eventId: string) {
  const response = await dynamoClient.send(
    new GetCommand({
      TableName: env.eventsTable,
      Key: { id: eventId }
    })
  );

  return (response.Item as EventRecord | undefined) ?? null;
}

export async function batchGetEvents(eventIds: string[]) {
  return batchGetByIds<EventRecord>(env.eventsTable, [...new Set(eventIds)]);
}

export async function listEvents() {
  const items = await scanAll<EventRecord>(env.eventsTable);
  return sortByEventSchedule(items);
}

export async function createEvent(
  input: Omit<EventRecord, "id" | "created_at" | "updated_at">
) {
  const timestamp = nowIso();
  const item: EventRecord = {
    ...input,
    id: randomUUID(),
    created_at: timestamp,
    updated_at: timestamp
  };

  await dynamoClient.send(
    new PutCommand({
      TableName: env.eventsTable,
      Item: item
    })
  );

  return item;
}

export async function saveEvent(event: EventRecord) {
  const item: EventRecord = {
    ...event,
    updated_at: nowIso()
  };

  await dynamoClient.send(
    new PutCommand({
      TableName: env.eventsTable,
      Item: item
    })
  );

  return item;
}

export async function adjustEventCurrentCount(eventId: string, delta: number) {
  await dynamoClient.send(
    new UpdateCommand({
      TableName: env.eventsTable,
      Key: { id: eventId },
      UpdateExpression: "SET current_count = if_not_exists(current_count, :zero) + :delta, updated_at = :updatedAt",
      ExpressionAttributeValues: {
        ":delta": delta,
        ":zero": 0,
        ":updatedAt": nowIso()
      }
    })
  );
}

export async function listRegistrationsByStudent(studentId: string) {
  return queryAll<RegistrationRecord>({
    TableName: env.registrationsTable,
    IndexName: "StudentIdIndex",
    KeyConditionExpression: "student_id = :studentId",
    ExpressionAttributeValues: {
      ":studentId": studentId
    },
    ScanIndexForward: false
  });
}

export async function listRegistrationsByEvent(eventId: string) {
  return queryAll<RegistrationRecord>({
    TableName: env.registrationsTable,
    IndexName: "EventIdIndex",
    KeyConditionExpression: "event_id = :eventId",
    ExpressionAttributeValues: {
      ":eventId": eventId
    },
    ScanIndexForward: true
  });
}

export async function getRegistrationById(registrationId: string) {
  const response = await dynamoClient.send(
    new GetCommand({
      TableName: env.registrationsTable,
      Key: { id: registrationId }
    })
  );

  return (response.Item as RegistrationRecord | undefined) ?? null;
}

export async function putRegistration(item: RegistrationRecord, conditionExpression?: string) {
  await dynamoClient.send(
    new PutCommand({
      TableName: env.registrationsTable,
      Item: item,
      ConditionExpression: conditionExpression
    })
  );

  return item;
}

export async function saveRegistration(item: RegistrationRecord) {
  await dynamoClient.send(
    new PutCommand({
      TableName: env.registrationsTable,
      Item: item
    })
  );

  return item;
}

export async function listAttendanceByEvent(eventId: string) {
  return queryAll<AttendanceRecord>({
    TableName: env.attendanceTable,
    IndexName: "EventIdIndex",
    KeyConditionExpression: "event_id = :eventId",
    ExpressionAttributeValues: {
      ":eventId": eventId
    },
    ScanIndexForward: false
  });
}

export async function listAttendanceByStudent(studentId: string) {
  const items = await scanAll<AttendanceRecord>(env.attendanceTable);
  return sortByDateDescending(
    items.filter((item) => item.student_id === studentId),
    "marked_at"
  );
}

export async function getSeatCounterByEvent(eventId: string) {
  const response = await dynamoClient.send(
    new GetCommand({
      TableName: env.seatCounterTable,
      Key: { event_id: eventId }
    })
  );

  return (response.Item as SeatCounterRecord | undefined) ?? null;
}

export async function batchGetSeatCounters(eventIds: string[]) {
  const uniqueIds = [...new Set(eventIds.filter(Boolean))];
  if (!uniqueIds.length) {
    return [];
  }

  const chunks: string[][] = [];
  for (let index = 0; index < uniqueIds.length; index += 100) {
    chunks.push(uniqueIds.slice(index, index + 100));
  }

  const items: SeatCounterRecord[] = [];

  for (const chunk of chunks) {
    const response = await dynamoClient.send(
      new BatchGetCommand({
        RequestItems: {
          [env.seatCounterTable]: {
            Keys: chunk.map((eventId) => ({ event_id: eventId }))
          }
        }
      })
    );

    items.push(...((response.Responses?.[env.seatCounterTable] as SeatCounterRecord[] | undefined) ?? []));
  }

  return items;
}

export async function upsertAttendance(item: AttendanceRecord) {
  await dynamoClient.send(
    new PutCommand({
      TableName: env.attendanceTable,
      Item: item
    })
  );

  return item;
}

export async function countEvents() {
  const items = await scanAll<EventRecord>(env.eventsTable);
  return items.length;
}

export async function countRegistrations() {
  const items = await scanAll<RegistrationRecord>(env.registrationsTable);
  return items.filter((item) => item.status !== "cancelled").length;
}

export async function countAttendanceRecords() {
  const items = await scanAll<AttendanceRecord>(env.attendanceTable);
  return items.length;
}
