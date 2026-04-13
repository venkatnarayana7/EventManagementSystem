import { z } from "zod";

export const eventSchema = z.object({
  title: z.string().min(3).max(255),
  description: z.string().max(5_000).optional().default(""),
  eventType: z.string().min(2).max(50),
  status: z.enum(["draft", "pending_approval", "approved"]).optional(),
  price: z.number().min(0).optional().default(0),
  venue: z.string().min(2).max(255),
  eventDate: z.string().date(),
  startTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
  endTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
  maxCapacity: z.number().int().positive(),
  registrationDeadline: z.string().datetime().optional(),
  posterUrl: z.string().url().optional(),
  departmentFilter: z.string().max(100).optional(),
  isPublic: z.boolean().optional().default(true),
  tags: z.array(z.string().min(1)).optional().default([])
});

export const registrationSchema = z.object({
  eventId: z.string().uuid()
});

export const attendanceSchema = z.object({
  eventId: z.string().uuid(),
  studentId: z.string().uuid(),
  method: z.enum(["manual", "qr_code", "bulk"]).default("manual"),
  status: z.enum(["present", "absent"]).default("present")
});

export const profileSchema = z.object({
  fullName: z.string().min(2).max(255),
  department: z.string().max(100).optional(),
  avatarUrl: z.string().url().optional(),
  phoneNumber: z.string().max(30).optional(),
  dateOfBirth: z.string().max(30).optional(),
  address: z.string().max(255).optional(),
  bio: z.string().max(1_000).optional(),
  notificationPreferences: z
    .object({
      newEvents: z.boolean().optional(),
      registrationConfirmation: z.boolean().optional(),
      seatAlerts: z.boolean().optional(),
      attendanceUpdates: z.boolean().optional(),
      eventReminders: z.boolean().optional(),
      waitlistUpdates: z.boolean().optional()
    })
    .optional()
});

export const userApprovalSchema = z.object({
  role: z.enum(["admin", "teacher", "student"]),
  approvalStatus: z.enum(["pending", "approved", "rejected"])
});

export const adminMessageSchema = z
  .object({
    recipientEmail: z.string().email().optional(),
    sendToAll: z.boolean().optional().default(false),
    subject: z.string().min(3).max(140),
    body: z.string().min(1).max(5000)
  })
  .refine(
    (data) => Boolean(data.sendToAll) || Boolean(data.recipientEmail),
    "recipientEmail is required when sendToAll is false"
  );

export const presignRequestSchema = z.object({
  eventId: z.string().uuid(),
  filename: z.string().min(3).max(255),
  contentType: z.enum(["image/jpeg", "image/png", "application/pdf"])
});
