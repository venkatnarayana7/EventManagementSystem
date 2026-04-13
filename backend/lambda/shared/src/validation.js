"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.presignRequestSchema = exports.adminMessageSchema = exports.userApprovalSchema = exports.profileSchema = exports.attendanceSchema = exports.registrationSchema = exports.eventSchema = void 0;
const zod_1 = require("zod");
exports.eventSchema = zod_1.z.object({
    title: zod_1.z.string().min(3).max(255),
    description: zod_1.z.string().max(5_000).optional().default(""),
    eventType: zod_1.z.string().min(2).max(50),
    status: zod_1.z.enum(["draft", "pending_approval", "approved"]).optional(),
    price: zod_1.z.number().min(0).optional().default(0),
    venue: zod_1.z.string().min(2).max(255),
    eventDate: zod_1.z.string().date(),
    startTime: zod_1.z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
    endTime: zod_1.z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
    maxCapacity: zod_1.z.number().int().positive(),
    registrationDeadline: zod_1.z.string().datetime().optional(),
    posterUrl: zod_1.z.string().url().optional(),
    departmentFilter: zod_1.z.string().max(100).optional(),
    isPublic: zod_1.z.boolean().optional().default(true),
    tags: zod_1.z.array(zod_1.z.string().min(1)).optional().default([])
});
exports.registrationSchema = zod_1.z.object({
    eventId: zod_1.z.string().uuid()
});
exports.attendanceSchema = zod_1.z.object({
    eventId: zod_1.z.string().uuid(),
    studentId: zod_1.z.string().uuid(),
    method: zod_1.z.enum(["manual", "qr_code", "bulk"]).default("manual"),
    status: zod_1.z.enum(["present", "absent"]).default("present")
});
exports.profileSchema = zod_1.z.object({
    fullName: zod_1.z.string().min(2).max(255),
    department: zod_1.z.string().max(100).optional(),
    avatarUrl: zod_1.z.string().url().optional(),
    phoneNumber: zod_1.z.string().max(30).optional(),
    dateOfBirth: zod_1.z.string().max(30).optional(),
    address: zod_1.z.string().max(255).optional(),
    bio: zod_1.z.string().max(1_000).optional(),
    notificationPreferences: zod_1.z
        .object({
        newEvents: zod_1.z.boolean().optional(),
        registrationConfirmation: zod_1.z.boolean().optional(),
        seatAlerts: zod_1.z.boolean().optional(),
        attendanceUpdates: zod_1.z.boolean().optional(),
        eventReminders: zod_1.z.boolean().optional(),
        waitlistUpdates: zod_1.z.boolean().optional()
    })
        .optional()
});
exports.userApprovalSchema = zod_1.z.object({
    role: zod_1.z.enum(["admin", "teacher", "student"]),
    approvalStatus: zod_1.z.enum(["pending", "approved", "rejected"])
});
exports.adminMessageSchema = zod_1.z
    .object({
    recipientEmail: zod_1.z.string().email().optional(),
    sendToAll: zod_1.z.boolean().optional().default(false),
    subject: zod_1.z.string().min(3).max(140),
    body: zod_1.z.string().min(1).max(5000)
})
    .refine((data) => Boolean(data.sendToAll) || Boolean(data.recipientEmail), "recipientEmail is required when sendToAll is false");
exports.presignRequestSchema = zod_1.z.object({
    eventId: zod_1.z.string().uuid(),
    filename: zod_1.z.string().min(3).max(255),
    contentType: zod_1.z.enum(["image/jpeg", "image/png", "application/pdf"])
});
