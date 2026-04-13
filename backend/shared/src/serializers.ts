import { getPortalConfig } from "./portal-config";
import type { AppRole } from "./auth";

function buildProfileId(userId: string, role: AppRole) {
  const rolePrefix =
    role === "admin"
      ? "ADM"
      : role === "teacher"
        ? "TCH"
        : "STD";
  const compactId = String(userId || "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase()
    .slice(0, 10);

  return `EMS-${rolePrefix}-${compactId || "USER"}`;
}

export function serializeUser(user: {
  id: string;
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
  created_at?: string | null;
}) {
  const portal = getPortalConfig(user.role);

  return {
    id: user.id,
    profileId: buildProfileId(user.id, user.role),
    email: user.email,
    fullName: user.full_name,
    role: user.role,
    approvalStatus: user.approval_status ?? "approved",
    department: user.department,
    rollNo: user.roll_no ?? null,
    empId: user.emp_id ?? null,
    phoneNumber: user.phone_number ?? null,
    dateOfBirth: user.date_of_birth ?? null,
    address: user.address ?? null,
    bio: user.bio ?? null,
    notificationPreferences: {
      newEvents: user.notification_preferences?.new_events ?? true,
      registrationConfirmation: user.notification_preferences?.registration_confirmation ?? true,
      seatAlerts: user.notification_preferences?.seat_alerts ?? true,
      attendanceUpdates: user.notification_preferences?.attendance_updates ?? true,
      eventReminders: user.notification_preferences?.event_reminders ?? true,
      waitlistUpdates: user.notification_preferences?.waitlist_updates ?? true
    },
    avatarUrl: user.avatar_url ?? null,
    createdAt: user.created_at ?? null,
    portal
  };
}

export function serializeEvent(event: Record<string, unknown>) {
  const myRegistrationStatus = event.my_registration_status;
  const assignedStaff = Array.isArray(event.assigned_staff) ? event.assigned_staff : [];
  const myPortalBadge =
    myRegistrationStatus === "attended"
      ? "Attended"
      : myRegistrationStatus === "cancelled"
        ? "Cancelled"
        : myRegistrationStatus === "waitlisted"
          ? "Waitlisted"
          : myRegistrationStatus
            ? "Pending"
            : null;

  return {
    id: event.id,
    createdBy: event.created_by ?? null,
    approvedBy: event.approved_by ?? null,
    title: event.title,
    description: event.description,
    eventType: event.event_type,
    status: event.status,
    price: event.price ?? 0,
    venue: event.venue,
    eventDate: event.event_date,
    startTime: event.start_time,
    endTime: event.end_time,
    maxCapacity: event.max_capacity,
    currentCount: event.current_count,
    registrationDeadline: event.registration_deadline,
    posterUrl: event.poster_url,
    isPublic: event.is_public,
    departmentFilter: event.department_filter,
    tags: event.tags,
    assignedStaff,
    assignedStaffCount: assignedStaff.length,
    seatsRemaining:
      Math.max(0, Number(event.max_capacity ?? 0) - Number(event.current_count ?? 0)),
    waitlistCount: Number(event.waitlist_count ?? 0),
    rejectionReason: event.rejection_reason ?? null,
    organizerName: event.organizer_name ?? null,
    myRegistrationStatus: myRegistrationStatus ?? null,
    myPortalBadge
  };
}

export function serializeRegistration(registration: Record<string, unknown>) {
  const status = String(registration.status ?? "");
  const portalBadge =
    status === "attended"
      ? "Attended"
      : status === "cancelled"
        ? "Cancelled"
        : status === "waitlisted"
          ? "Waitlisted"
          : "Pending";

  return {
    id: registration.id,
    eventId: registration.event_id,
    studentId: registration.student_id,
    studentName: registration.student_name ?? null,
    studentEmail: registration.student_email ?? null,
    studentRollNo: registration.student_roll_no ?? null,
    studentDepartment: registration.student_department ?? null,
    title: registration.title ?? null,
    venue: registration.venue ?? null,
    eventDate: registration.event_date ?? null,
    eventType: registration.event_type ?? null,
    startTime: registration.start_time ?? null,
    endTime: registration.end_time ?? null,
    price: registration.price ?? 0,
    posterUrl: registration.poster_url ?? null,
    organizerName: registration.organizer_name ?? null,
    maxCapacity: registration.max_capacity ?? 0,
    currentCount: registration.current_count ?? 0,
    waitlistCount: registration.waitlist_count ?? 0,
    waitlistPosition: registration.waitlist_position ?? null,
    attendanceStatus: registration.attendance_status ?? null,
    markedAt: registration.marked_at ?? null,
    markedBy: registration.marked_by ?? null,
    status,
    portalBadge,
    registeredAt: registration.registered_at,
    cancelledAt: registration.cancelled_at ?? null
  };
}

export function serializeMessage(message: {
  id: string;
  recipient_user_id: string;
  recipient_email: string;
  target_scope: string;
  subject: string;
  body: string;
  sent_by_user_id: string;
  sent_by_email: string;
  created_at: string;
}) {
  return {
    id: message.id,
    recipientUserId: message.recipient_user_id,
    recipientEmail: message.recipient_email,
    targetScope: message.target_scope,
    subject: message.subject,
    body: message.body,
    sentByUserId: message.sent_by_user_id,
    sentByEmail: message.sent_by_email,
    createdAt: message.created_at
  };
}
