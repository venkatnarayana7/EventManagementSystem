# 🎯 Event Management System — Complete Project Blueprint

> **Project Type:** Full-Stack Web Application  
> **Portals:** Admin · Teacher · Student  
> **Backend:** AWS (fully cloud-native)  
> **Auth:** AWS Cognito  
> **Status:** Planning Phase

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [System Architecture](#2-system-architecture)
3. [AWS Infrastructure Design](#3-aws-infrastructure-design)
4. [Authentication & Authorization](#4-authentication--authorization)
5. [Database Design](#5-database-design)
6. [Backend API Design](#6-backend-api-design)
7. [Frontend Architecture](#7-frontend-architecture)
8. [Portal Breakdown](#8-portal-breakdown)
   - 8.1 [Admin Portal](#81-admin-portal)
   - 8.2 [Teacher Portal](#82-teacher-portal)
   - 8.3 [Student Portal](#83-student-portal)
9. [File & Media Handling](#9-file--media-handling)
10. [Notifications System](#10-notifications-system)
11. [CI/CD Pipeline](#11-cicd-pipeline)
12. [Security Checklist](#12-security-checklist)
13. [Tech Stack Summary](#13-tech-stack-summary)
14. [Project Folder Structure](#14-project-folder-structure)
15. [Development Phases & Milestones](#15-development-phases--milestones)
16. [Estimated AWS Cost Breakdown](#16-estimated-aws-cost-breakdown)

---

## 1. Project Overview

The **Event Management System (EMS)** is a multi-portal web application designed for educational institutions. It handles the complete lifecycle of events — from creation and approval to registration, attendance, and post-event reporting.

### Key Goals

- Centralized event creation and management by admins and teachers
- Student self-registration with real-time seat availability
- Role-based access control across three portals
- Fully serverless/managed AWS backend — no servers to maintain
- Email and push notifications at every event lifecycle stage
- Analytics dashboard for admins

### Portals at a Glance

| Portal | Primary Users | Core Purpose |
|--------|--------------|-------------|
| Admin Portal | College admins, HODs | Approve events, manage users, view analytics |
| Teacher Portal | Faculty | Create events, manage registrations, mark attendance |
| Student Portal | Students | Browse, register, and track events |

---

## 2. System Architecture

### High-Level Architecture Diagram (Text Representation)

```
┌──────────────────────────────────────────────────────────────┐
│                        CLIENTS                               │
│   [Admin Browser]   [Teacher Browser]   [Student Browser]    │
└────────────┬─────────────────┬─────────────────┬─────────────┘
             │                 │                 │
             ▼                 ▼                 ▼
┌──────────────────────────────────────────────────────────────┐
│              AWS CloudFront (CDN + HTTPS)                     │
│         Static assets served from S3 buckets                 │
└─────────────────────────┬────────────────────────────────────┘
                          │
             ┌────────────▼────────────┐
             │   AWS Cognito           │
             │  User Pools + Identity  │
             │  Pools (Auth Layer)     │
             └────────────┬────────────┘
                          │ JWT Tokens
             ┌────────────▼────────────┐
             │   API Gateway (REST)    │
             │   + JWT Authorizer      │
             └────────────┬────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        ▼                 ▼                 ▼
  [Lambda Fn]       [Lambda Fn]       [Lambda Fn]
  Events CRUD       Users CRUD        Registrations
        │                 │                 │
        └─────────────────┼─────────────────┘
                          │
             ┌────────────▼────────────┐
             │     Amazon RDS          │
             │  (PostgreSQL via        │
             │   Aurora Serverless v2) │
             └─────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        ▼                 ▼                 ▼
   [S3 Bucket]     [DynamoDB]        [SES / SNS]
  Media/Posters    Sessions/Cache    Notifications
```

### Architecture Principles

- **Serverless First** — Lambda + API Gateway eliminates server management
- **Separation of Concerns** — Each Lambda handles one domain (events, users, registrations, attendance)
- **Stateless APIs** — All state lives in DB; Lambda functions are pure handlers
- **CDN Edge** — CloudFront caches static assets globally; API responses cached where safe
- **Least Privilege IAM** — Every Lambda has its own IAM role with minimal permissions

---

## 3. AWS Infrastructure Design

### Services Used

| AWS Service | Purpose | Tier/Config |
|------------|---------|-------------|
| **Cognito User Pools** | Authentication, user groups | 1 pool, 3 groups |
| **Cognito Identity Pools** | Federated AWS resource access | Linked to User Pool |
| **API Gateway (REST)** | HTTP API layer | Regional endpoint |
| **Lambda** | Backend business logic | Node.js 20.x / Python 3.12 |
| **Aurora Serverless v2** | PostgreSQL relational DB | Min 0.5 ACU, Max 4 ACU |
| **S3** | Static hosting + media storage | 3 buckets |
| **CloudFront** | CDN, HTTPS, caching | Price class 100 |
| **SES** | Transactional email | Verified domain |
| **SNS** | Push/SMS notifications | Topics per event |
| **DynamoDB** | Real-time seat counter cache | On-demand |
| **EventBridge** | Scheduled jobs (reminders) | Rules with cron |
| **Secrets Manager** | DB credentials, API keys | Auto-rotation |
| **CloudWatch** | Logging, monitoring, alarms | Log groups per Lambda |
| **IAM** | Roles, policies | Per-Lambda least privilege |
| **Route 53** | Custom domain DNS | Hosted zone |
| **ACM** | SSL/TLS certificates | Wildcard cert |
| **WAF** | Web Application Firewall | CloudFront + API GW |

### S3 Bucket Strategy

```
ems-frontend-admin/          → Admin React app (static)
ems-frontend-teacher/        → Teacher React app (static)
ems-frontend-student/        → Student React app (static)
ems-media-uploads/           → Event posters, attachments
  └── events/{event_id}/
      ├── poster.jpg
      └── attachments/
```

### Lambda Function List

| Function Name | Trigger | Responsibility |
|--------------|---------|---------------|
| `ems-auth-postConfirmation` | Cognito trigger | Assign group after signup |
| `ems-events-handler` | API Gateway | CRUD for events |
| `ems-users-handler` | API Gateway | CRUD for users |
| `ems-registrations-handler` | API Gateway | Register/unregister students |
| `ems-attendance-handler` | API Gateway | Mark, fetch attendance |
| `ems-notifications-handler` | EventBridge / SNS | Send emails & push |
| `ems-analytics-handler` | API Gateway | Reports, dashboards |
| `ems-media-presigner` | API Gateway | Generate S3 presigned URLs |

---

## 4. Authentication & Authorization

### AWS Cognito Setup

#### User Pool Configuration

```
Pool Name: ems-user-pool

Sign-in options:
  - Email (primary)
  - Username (optional)

Password policy:
  - Min 8 characters
  - Requires uppercase, number, symbol

MFA: Optional (TOTP via Authenticator app)

User Groups:
  - "Admins"    → Full access
  - "Teachers"  → Event creation access
  - "Students"  → Registration access

Attributes (custom):
  - custom:role       → admin | teacher | student
  - custom:department → department name
  - custom:rollNo     → for students
  - custom:empId      → for teachers
```

#### Authentication Flow

```
1. User submits email + password on login page
2. Cognito returns: AccessToken, IdToken, RefreshToken
3. Frontend stores tokens in memory (NOT localStorage)
   → Use httpOnly cookie or in-memory for XSS protection
4. Every API call includes: Authorization: Bearer <IdToken>
5. API Gateway Lambda Authorizer decodes JWT
6. Extracts custom:role claim → enforces route-level access
7. RefreshToken used silently to renew AccessToken every 60 min
```

#### API Gateway Authorization

```javascript
// Lambda Authorizer pseudo-code
exports.handler = async (event) => {
  const token = event.authorizationToken.replace("Bearer ", "");
  const decoded = await verifyJWT(token, COGNITO_JWKS_URL);
  const role = decoded["custom:role"];

  return generatePolicy(decoded.sub, "Allow", event.methodArn, { role });
};
```

#### Route-Level RBAC

| API Route | Admin | Teacher | Student |
|-----------|-------|---------|---------|
| `POST /events` | ✅ | ✅ | ❌ |
| `DELETE /events/:id` | ✅ | ❌ | ❌ |
| `PUT /events/:id/approve` | ✅ | ❌ | ❌ |
| `POST /registrations` | ❌ | ❌ | ✅ |
| `GET /analytics` | ✅ | ❌ | ❌ |
| `POST /attendance` | ❌ | ✅ | ❌ |
| `GET /events` | ✅ | ✅ | ✅ |

---

## 5. Database Design

### Primary DB: Aurora Serverless v2 (PostgreSQL)

All relational data lives here. Aurora Serverless scales to zero when idle — perfect for a college system with non-continuous load.

---

### Table: `users`

```sql
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cognito_sub   VARCHAR(255) UNIQUE NOT NULL,  -- Cognito user ID
  email         VARCHAR(255) UNIQUE NOT NULL,
  full_name     VARCHAR(255) NOT NULL,
  role          VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'teacher', 'student')),
  department    VARCHAR(100),
  roll_no       VARCHAR(50),   -- Students only
  emp_id        VARCHAR(50),   -- Teachers only
  avatar_url    TEXT,
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
```

---

### Table: `events`

```sql
CREATE TABLE events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           VARCHAR(255) NOT NULL,
  description     TEXT,
  event_type      VARCHAR(50) NOT NULL,  -- seminar, workshop, cultural, sports, etc.
  status          VARCHAR(20) NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft', 'pending_approval', 'approved', 'rejected', 'cancelled', 'completed')),
  created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_by     UUID REFERENCES users(id) ON DELETE SET NULL,
  venue           VARCHAR(255),
  event_date      DATE NOT NULL,
  start_time      TIME NOT NULL,
  end_time        TIME NOT NULL,
  max_capacity    INTEGER,
  current_count   INTEGER DEFAULT 0,
  registration_deadline TIMESTAMPTZ,
  poster_url      TEXT,
  is_public       BOOLEAN DEFAULT TRUE,
  department_filter VARCHAR(100),  -- NULL = open to all
  tags            TEXT[],
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
```

---

### Table: `registrations`

```sql
CREATE TABLE registrations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id        UUID REFERENCES events(id) ON DELETE CASCADE,
  student_id      UUID REFERENCES users(id) ON DELETE CASCADE,
  status          VARCHAR(20) DEFAULT 'registered'
                  CHECK (status IN ('registered', 'waitlisted', 'cancelled', 'attended')),
  registered_at   TIMESTAMPTZ DEFAULT NOW(),
  cancelled_at    TIMESTAMPTZ,
  UNIQUE(event_id, student_id)
);
```

---

### Table: `attendance`

```sql
CREATE TABLE attendance (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id        UUID REFERENCES events(id) ON DELETE CASCADE,
  student_id      UUID REFERENCES users(id) ON DELETE CASCADE,
  marked_by       UUID REFERENCES users(id),  -- Teacher who marked it
  marked_at       TIMESTAMPTZ DEFAULT NOW(),
  method          VARCHAR(20) DEFAULT 'manual'
                  CHECK (method IN ('manual', 'qr_code', 'bulk')),
  UNIQUE(event_id, student_id)
);
```

---

### Table: `notifications_log`

```sql
CREATE TABLE notifications_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
  event_id        UUID REFERENCES events(id) ON DELETE SET NULL,
  type            VARCHAR(50),  -- event_approved, reminder_24h, registration_confirm, etc.
  channel         VARCHAR(20),  -- email | push | sms
  status          VARCHAR(20) DEFAULT 'sent',
  sent_at         TIMESTAMPTZ DEFAULT NOW()
);
```

---

### Table: `event_feedback`

```sql
CREATE TABLE event_feedback (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id        UUID REFERENCES events(id) ON DELETE CASCADE,
  student_id      UUID REFERENCES users(id) ON DELETE CASCADE,
  rating          INTEGER CHECK (rating BETWEEN 1 AND 5),
  comment         TEXT,
  submitted_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, student_id)
);
```

---

### DynamoDB Table: `seat_counter`

Used for atomic real-time seat counts to prevent race conditions during concurrent registrations.

```
Table: ems-seat-counter
Partition Key: event_id (String)

Item:
{
  event_id: "uuid",
  current_count: 42,     ← Atomic counter via DynamoDB UpdateItem
  max_capacity: 100,
  waitlist_count: 5,
  last_updated: "ISO8601"
}
```

Why DynamoDB here? Aurora handles the persistent record, but DynamoDB with atomic `ADD` operations prevents over-booking when 50 students click "Register" simultaneously.

---

## 6. Backend API Design

### Base URL

```
https://api.yourdomain.com/v1
```

---

### Auth Endpoints (Handled by Cognito + API Gateway)

```
POST   /auth/signup          → Create account (routes to Cognito)
POST   /auth/login           → Returns JWT tokens
POST   /auth/refresh         → Refresh access token
POST   /auth/logout          → Revoke tokens
POST   /auth/forgot-password → Send reset email
POST   /auth/confirm-reset   → Confirm new password
```

---

### Events API

```
GET    /events                   → List all events (with filters: status, type, date, dept)
POST   /events                   → Create event (Teacher/Admin)
GET    /events/:id               → Get single event detail
PUT    /events/:id               → Update event (Owner or Admin)
DELETE /events/:id               → Delete event (Admin only)
PUT    /events/:id/approve       → Approve event (Admin only)
PUT    /events/:id/reject        → Reject event (Admin only)
GET    /events/:id/registrations → List registered students
GET    /events/:id/attendance    → Get attendance report
POST   /events/:id/feedback      → Submit feedback (Student, post-event)
GET    /events/:id/analytics     → Event-specific analytics (Teacher/Admin)
```

---

### Registrations API

```
POST   /registrations            → Register student for event
DELETE /registrations/:id        → Cancel registration
GET    /registrations/me         → My registrations (Student)
GET    /registrations?event_id=  → All registrations for event (Teacher/Admin)
```

---

### Attendance API

```
POST   /attendance               → Mark attendance (Teacher)
POST   /attendance/bulk          → Bulk mark via CSV upload
GET    /attendance?event_id=     → Get attendance list
GET    /attendance/me            → Student's own attendance history
```

---

### Users API

```
GET    /users                    → List all users (Admin)
GET    /users/:id                → Get user profile
PUT    /users/:id                → Update profile
DELETE /users/:id                → Deactivate user (Admin)
GET    /users/me                 → Own profile
PUT    /users/me                 → Update own profile
```

---

### Analytics API

```
GET    /analytics/overview       → Total events, registrations, attendance rate
GET    /analytics/events         → Events by type, month, department
GET    /analytics/users          → User growth, active users
GET    /analytics/top-events     → Most registered events
```

---

### Media API

```
POST   /media/presign            → Get presigned S3 upload URL
DELETE /media/:key               → Delete media file (Admin)
```

---

### Sample Lambda Handler (Node.js)

```javascript
// events-handler/index.js
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DB_URL });

exports.handler = async (event) => {
  const { httpMethod, path, body, requestContext } = event;
  const role = requestContext.authorizer.role;
  const userId = requestContext.authorizer.principalId;

  try {
    if (httpMethod === 'GET' && path === '/events') {
      const { rows } = await pool.query(
        `SELECT * FROM events WHERE status = 'approved' ORDER BY event_date ASC`
      );
      return respond(200, rows);
    }

    if (httpMethod === 'POST' && path === '/events') {
      if (!['admin', 'teacher'].includes(role)) return respond(403, { error: 'Forbidden' });
      const data = JSON.parse(body);
      const { rows } = await pool.query(
        `INSERT INTO events (title, description, event_type, venue, event_date, start_time, end_time, max_capacity, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
        [data.title, data.description, data.event_type, data.venue,
         data.event_date, data.start_time, data.end_time, data.max_capacity, userId]
      );
      return respond(201, rows[0]);
    }
    // ... more routes
  } catch (err) {
    console.error(err);
    return respond(500, { error: 'Internal Server Error' });
  }
};

const respond = (statusCode, body) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  body: JSON.stringify(body)
});
```

---

## 7. Frontend Architecture

### Framework: React 18 + Vite

Each portal is a **separate React application** deployed to its own S3 bucket + CloudFront distribution. This gives clean separation of code, deployments, and access.

```
Portals:
  admin.yourdomain.com   → Admin React App
  teacher.yourdomain.com → Teacher React App
  student.yourdomain.com → Student React App
```

### Shared Libraries (Monorepo via Turborepo)

```
packages/
  ui/           → Shared component library (buttons, modals, cards)
  auth/         → Shared Cognito auth hooks (useAuth, useUser)
  api/          → Shared API client (Axios instance with token injection)
  types/        → Shared TypeScript types
```

### Frontend Tech Stack

| Tool | Purpose |
|------|---------|
| React 18 | UI framework |
| TypeScript | Type safety |
| Vite | Build tool (fast HMR) |
| React Router v6 | Client-side routing |
| TanStack Query | Server state, caching, pagination |
| Zustand | Global UI state |
| Tailwind CSS | Utility-first styling |
| shadcn/ui | Pre-built accessible components |
| AWS Amplify JS v6 | Cognito auth integration |
| Axios | HTTP client |
| React Hook Form + Zod | Form handling + validation |
| Recharts | Analytics charts |
| React Hot Toast | Notifications/toasts |
| date-fns | Date manipulation |

### State Management Strategy

```
Server State  → TanStack Query (events list, user data, registrations)
Auth State    → Zustand store + Amplify session
UI State      → Local useState (modals, form steps)
Global UI     → Zustand (sidebar open, theme)
```

### Cognito Integration (AWS Amplify v6)

```typescript
// lib/amplify.ts
import { Amplify } from 'aws-amplify';

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID,
      userPoolClientId: import.meta.env.VITE_COGNITO_CLIENT_ID,
      loginWith: { email: true }
    }
  }
});

// hooks/useAuth.ts
import { signIn, signOut, getCurrentUser, fetchAuthSession } from 'aws-amplify/auth';

export function useAuth() {
  const getToken = async () => {
    const session = await fetchAuthSession();
    return session.tokens?.idToken?.toString();
  };
  return { signIn, signOut, getCurrentUser, getToken };
}

// api/client.ts — auto-inject token into every request
axiosInstance.interceptors.request.use(async (config) => {
  const session = await fetchAuthSession();
  const token = session.tokens?.idToken?.toString();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
```

---

## 8. Portal Breakdown

---

### 8.1 Admin Portal

**URL:** `admin.yourdomain.com`

The admin portal is the control center. Admins can see everything and control the system.

#### Pages & Features

**Dashboard**
- Total events (this month, this year)
- Total registered students, pending approvals
- Attendance rate across events
- Quick charts: Events by type (pie), Registrations over time (line)
- Recent activity feed

**Event Management**
- Table of ALL events with filters: status, type, department, date range
- Approve / Reject pending events with optional rejection reason
- Edit any event (override teacher's inputs)
- Cancel event + auto-notify all registered students
- View event registrations list with export to CSV

**User Management**
- Table of all users with filters: role, department, active/inactive
- View user profile
- Activate / Deactivate accounts
- Manually assign users to Cognito groups (promote teacher → admin)
- Bulk import students via CSV upload

**Analytics & Reports**
- Events breakdown by department, type, month
- Top 10 events by registrations
- Teacher-wise event count
- Export reports as PDF / CSV

**Notifications**
- Send broadcast announcement to all students / teachers / specific department
- Notification history log

**Settings**
- System settings: institution name, logo, academic year
- Email template configuration
- Event type categories management

---

### 8.2 Teacher Portal

**URL:** `teacher.yourdomain.com`

Teachers create and manage their own events. They cannot see other teachers' private drafts or system-wide analytics.

#### Pages & Features

**Dashboard**
- My upcoming events
- Pending approval events
- Total registrations for my events
- Quick stats: events hosted, avg attendance rate

**My Events**
- List of events I created
- Status badges: Draft / Pending / Approved / Rejected / Completed
- Create New Event button
- Edit / Delete draft events
- View rejection reason if rejected

**Create / Edit Event Form**
- Title, Description (rich text editor)
- Event Type selector
- Date, Start Time, End Time pickers
- Venue input
- Department Filter (all / specific department)
- Max Capacity
- Registration Deadline
- Poster image upload (→ S3 presigned URL)
- Tags
- Submit for Approval button

**Registrations**
- View all students registered for my events
- Export to Excel
- Download QR code list (for QR-based attendance)

**Attendance**
- Select event → see registered students list
- Mark present / absent per student (checkbox)
- Bulk mark all as present
- QR code scanner mode (camera-based check-in)
- View attendance summary: present count, absent count, %

**Feedback**
- View student feedback and ratings for my events

---

### 8.3 Student Portal

**URL:** `student.yourdomain.com`

Students browse, register, and track their own event activity.

#### Pages & Features

**Home / Discover Events**
- Card grid of upcoming approved events
- Filters: type, date, department, available seats
- Search bar
- Each card shows: poster, title, date, venue, seats left, registration deadline

**Event Detail Page**
- Full event info
- Organizer (teacher name)
- Seat availability (real-time from DynamoDB)
- Register button (disabled if deadline passed / full / already registered)
- Waitlist join if full
- Share event button

**My Registrations**
- List of events I registered for
- Status: Upcoming / Attended / Cancelled
- Cancel registration (if before deadline)
- Download registration confirmation (PDF)

**My Attendance**
- History of events attended with dates
- Attendance percentage summary

**Feedback**
- After event ends, submit rating + comment for attended events

**Profile**
- Update name, avatar, department, contact
- View roll number, email (read-only from Cognito)

---

## 9. File & Media Handling

### Upload Flow (Presigned URL Pattern)

This pattern keeps large files out of Lambda and API Gateway — files go directly from browser to S3.

```
1. Frontend requests presigned URL:
   POST /media/presign
   { filename: "poster.jpg", contentType: "image/jpeg", eventId: "uuid" }

2. Lambda generates presigned URL:
   const url = s3.getSignedUrlPromise('putObject', {
     Bucket: 'ems-media-uploads',
     Key: `events/${eventId}/poster.jpg`,
     Expires: 300,  // 5 minutes
     ContentType: 'image/jpeg',
     ACL: 'public-read'
   });

3. Frontend uploads directly to S3 using presigned URL (no backend involved)
   PUT <presigned_url> [binary file data]

4. Frontend saves the final S3 URL to event record via API:
   PUT /events/:id { poster_url: "https://cdn.yourdomain.com/events/uuid/poster.jpg" }
```

### CloudFront for Media

All media is served via CloudFront, not raw S3 URLs. This gives:
- HTTPS on custom domain
- CDN caching
- Better performance globally
- Signed URLs for private attachments if needed

---

## 10. Notifications System

### Email via SES

```
Triggers:
  - Student registers → Confirmation email with event details
  - Event approved    → Teacher + registered students notified
  - Event rejected    → Teacher notified with reason
  - 24h before event  → Reminder email to all registered students
  - Event cancelled   → All registered students notified immediately
  - Post-event        → Feedback request email (1 hour after end_time)
```

### EventBridge for Scheduled Notifications

```javascript
// EventBridge Rule: fires 24 hours before each event
// Cron is set dynamically when event is approved

// Lambda: ems-notifications-handler
exports.handler = async (event) => {
  const { eventId, type } = event.detail;
  const registrations = await getRegistrations(eventId);
  const emailPromises = registrations.map(r =>
    ses.sendTemplatedEmail({
      Source: 'noreply@yourdomain.com',
      Destination: { ToAddresses: [r.email] },
      Template: `ems-${type}-template`,
      TemplateData: JSON.stringify({ name: r.full_name, event: r.event_title })
    }).promise()
  );
  await Promise.allSettled(emailPromises);
};
```

### In-App Notifications

Store notifications in `notifications_log` table and display in a bell icon dropdown in each portal. Mark as read on click.

---

## 11. CI/CD Pipeline

### GitHub Actions Workflow

```yaml
# .github/workflows/deploy.yml
name: Deploy EMS

on:
  push:
    branches: [main]

jobs:
  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ap-south-1
      - name: Deploy Lambda functions
        run: |
          cd backend
          npm install
          zip -r function.zip .
          aws lambda update-function-code \
            --function-name ems-events-handler \
            --zip-file fileb://function.zip

  deploy-frontend-student:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build Student Portal
        run: |
          cd frontend/student
          npm install && npm run build
      - name: Deploy to S3
        run: |
          aws s3 sync dist/ s3://ems-frontend-student --delete
      - name: Invalidate CloudFront
        run: |
          aws cloudfront create-invalidation \
            --distribution-id ${{ secrets.CF_DIST_STUDENT }} \
            --paths "/*"
```

### Infrastructure as Code (IaC): AWS CDK

Use AWS CDK (TypeScript) to define all infrastructure as code. This means the entire AWS setup is reproducible, version-controlled, and deployable with one command.

```bash
cdk bootstrap
cdk deploy --all
```

Key CDK stacks:
- `AuthStack` → Cognito User Pool, Identity Pool, groups
- `DatabaseStack` → Aurora cluster, security groups, Secrets Manager
- `ApiStack` → API Gateway, Lambda functions, IAM roles
- `StorageStack` → S3 buckets, CloudFront distributions
- `NotificationsStack` → SES, SNS, EventBridge rules

---

## 12. Security Checklist

### Authentication & Access
- [x] JWT verified on every API call via Lambda Authorizer
- [x] Tokens stored in memory only (no localStorage)
- [x] Refresh tokens stored in httpOnly cookies
- [x] Cognito group claim validates role server-side
- [x] MFA optional (TOTP) for admin accounts

### API Security
- [x] WAF enabled on CloudFront + API Gateway
- [x] Rate limiting on API Gateway (1000 req/s soft limit)
- [x] CORS configured: only allow known frontend origins
- [x] Input validation at Lambda level (Zod or Joi)
- [x] SQL injection prevented via parameterized queries only
- [x] File upload: MIME type + size validation before presign

### Data Security
- [x] DB credentials in Secrets Manager, auto-rotated every 30 days
- [x] Aurora in private VPC subnet (no public access)
- [x] S3 buckets: public-read only for media bucket, all others private
- [x] S3 versioning enabled on media bucket
- [x] CloudWatch alarms on error rate spike, unauthorized access
- [x] All data in transit: TLS 1.2+
- [x] All data at rest: AES-256 (AWS KMS)

### OWASP Top 10 Coverage
- [x] Injection → Parameterized queries
- [x] Broken Auth → Cognito + JWT
- [x] XSS → CSP headers via CloudFront
- [x] IDOR → User ID from JWT, not request body
- [x] Security Misconfiguration → CDK enforces consistent config
- [x] Sensitive Data Exposure → No PII in logs, Secrets Manager

---

## 13. Tech Stack Summary

### Backend
| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 20.x (Lambda) |
| Auth | AWS Cognito |
| API | AWS API Gateway (REST) |
| DB (relational) | Aurora Serverless v2 (PostgreSQL) |
| DB (cache/atomic) | DynamoDB |
| Object Storage | Amazon S3 |
| CDN | Amazon CloudFront |
| Email | Amazon SES |
| Notifications | Amazon SNS |
| Scheduler | Amazon EventBridge |
| Secrets | AWS Secrets Manager |
| Monitoring | Amazon CloudWatch |
| IaC | AWS CDK (TypeScript) |

### Frontend
| Layer | Technology |
|-------|-----------|
| Framework | React 18 + TypeScript |
| Build | Vite |
| Routing | React Router v6 |
| State (server) | TanStack Query v5 |
| State (client) | Zustand |
| Styling | Tailwind CSS |
| Components | shadcn/ui |
| Forms | React Hook Form + Zod |
| Auth SDK | AWS Amplify v6 |
| Charts | Recharts |
| HTTP | Axios |

### DevOps
| Layer | Technology |
|-------|-----------|
| Source Control | GitHub |
| CI/CD | GitHub Actions |
| IaC | AWS CDK |
| Package Manager | pnpm + Turborepo (monorepo) |

---

## 14. Project Folder Structure

```
event-management-system/
│
├── apps/
│   ├── admin/                    # Admin portal React app
│   │   ├── src/
│   │   │   ├── pages/
│   │   │   │   ├── Dashboard.tsx
│   │   │   │   ├── Events/
│   │   │   │   ├── Users/
│   │   │   │   ├── Analytics/
│   │   │   │   └── Settings/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   └── main.tsx
│   │   └── vite.config.ts
│   │
│   ├── teacher/                  # Teacher portal React app
│   │   └── src/
│   │       ├── pages/
│   │       │   ├── Dashboard.tsx
│   │       │   ├── MyEvents/
│   │       │   ├── CreateEvent/
│   │       │   ├── Attendance/
│   │       │   └── Feedback/
│   │       └── main.tsx
│   │
│   └── student/                  # Student portal React app
│       └── src/
│           ├── pages/
│           │   ├── Home.tsx
│           │   ├── EventDetail/
│           │   ├── MyRegistrations/
│           │   ├── MyAttendance/
│           │   └── Profile/
│           └── main.tsx
│
├── packages/
│   ├── ui/                       # Shared component library
│   │   └── src/
│   │       ├── Button.tsx
│   │       ├── Modal.tsx
│   │       ├── EventCard.tsx
│   │       └── index.ts
│   ├── auth/                     # Shared Cognito auth hooks
│   │   └── src/
│   │       ├── useAuth.ts
│   │       └── amplify.ts
│   ├── api/                      # Shared API client
│   │   └── src/
│   │       ├── client.ts
│   │       ├── events.ts
│   │       ├── users.ts
│   │       └── registrations.ts
│   └── types/                    # Shared TypeScript types
│       └── src/
│           └── index.ts
│
├── backend/
│   ├── functions/
│   │   ├── events-handler/
│   │   │   ├── index.js
│   │   │   ├── routes.js
│   │   │   └── validators.js
│   │   ├── users-handler/
│   │   ├── registrations-handler/
│   │   ├── attendance-handler/
│   │   ├── analytics-handler/
│   │   ├── notifications-handler/
│   │   ├── media-presigner/
│   │   └── auth-postConfirmation/
│   ├── db/
│   │   ├── migrations/           # SQL migration files
│   │   └── seeds/                # Dev seed data
│   └── shared/
│       ├── db.js                 # DB connection pool
│       ├── response.js           # Standard response builder
│       └── auth.js               # JWT utilities
│
├── infrastructure/               # AWS CDK project
│   ├── bin/
│   │   └── app.ts
│   ├── lib/
│   │   ├── auth-stack.ts
│   │   ├── database-stack.ts
│   │   ├── api-stack.ts
│   │   ├── storage-stack.ts
│   │   └── notifications-stack.ts
│   └── cdk.json
│
├── .github/
│   └── workflows/
│       ├── deploy.yml
│       └── pr-checks.yml
│
├── turbo.json
├── pnpm-workspace.yaml
└── README.md
```

---

## 15. Development Phases & Milestones

### Phase 1 — Foundation (Week 1–2)
- [ ] AWS account setup, IAM users, billing alerts
- [ ] CDK project init, deploy AuthStack (Cognito)
- [ ] DatabaseStack: Aurora cluster, security group, VPC
- [ ] StorageStack: S3 buckets, CloudFront distributions
- [ ] Basic Lambda boilerplate + API Gateway
- [ ] Domain + ACM cert setup

### Phase 2 — Auth & Users (Week 3)
- [ ] Cognito User Pool groups: Admins, Teachers, Students
- [ ] Lambda Authorizer implementation
- [ ] User registration / login flow (all 3 portals)
- [ ] Role-based routing guard in React
- [ ] Profile page (view + edit)
- [ ] Post-confirmation Lambda: auto-assign group

### Phase 3 — Events Core (Week 4–5)
- [ ] Events CRUD API (Lambda)
- [ ] Admin: event list + approve/reject UI
- [ ] Teacher: create event form + my events page
- [ ] Student: browse events + event detail page
- [ ] S3 presigned URL for poster upload
- [ ] DynamoDB seat counter integration

### Phase 4 — Registrations & Attendance (Week 6)
- [ ] Registration API + student register/cancel flow
- [ ] Real-time seat count display (polling every 30s)
- [ ] Teacher: attendance marking UI (manual)
- [ ] QR code generation per student registration
- [ ] QR scanner for teacher attendance marking

### Phase 5 — Notifications (Week 7)
- [ ] SES domain verification + email templates
- [ ] Registration confirmation email
- [ ] Event approval / rejection email
- [ ] EventBridge rule: 24h reminder
- [ ] In-app notification bell component
- [ ] Post-event feedback request email

### Phase 6 — Analytics & Reports (Week 8)
- [ ] Admin analytics dashboard (Recharts)
- [ ] Teacher: event-specific report
- [ ] CSV export for registrations
- [ ] Feedback collection + display

### Phase 7 — Polish & Launch (Week 9–10)
- [ ] WAF configuration
- [ ] CloudWatch alarms + dashboards
- [ ] Load testing (simulate 500 concurrent registrations)
- [ ] Mobile responsiveness pass
- [ ] Accessibility (ARIA, keyboard nav)
- [ ] Final CDK deploy to production environment
- [ ] DNS cutover + go-live

---

## 16. Estimated AWS Cost Breakdown

> Estimates based on moderate load: 500 students, 50 teachers, 5 admins, ~20 events/month

| Service | Estimated Cost/Month |
|---------|---------------------|
| Aurora Serverless v2 (0.5–2 ACU avg) | ~$15–30 |
| Lambda (1M requests, 256MB) | ~$0.50 |
| API Gateway (1M calls) | ~$3.50 |
| S3 (10 GB storage + transfers) | ~$1–3 |
| CloudFront (10 GB transfer) | ~$1 |
| Cognito (up to 50K MAU free) | $0 |
| SES (1000 emails/month) | ~$0.10 |
| DynamoDB (on-demand, light) | ~$1 |
| Secrets Manager (3 secrets) | ~$1.20 |
| CloudWatch (basic) | ~$1–3 |
| Route 53 (1 hosted zone) | ~$0.50 |
| **Total Estimated** | **~$25–45/month** |

> AWS Free Tier will cover most of this for the first 12 months during development.

---

## Final Notes

### Recommended IDE Setup
- VS Code with ESLint, Prettier, Tailwind IntelliSense, AWS Toolkit extensions
- Postman / Hoppscotch for API testing

### Local Development
- Use **LocalStack** to emulate AWS services locally (S3, DynamoDB, SQS)
- Use **Docker Compose** with a local PostgreSQL container for DB
- Use **AWS SAM CLI** for local Lambda testing

### Naming Convention
- Lambdas: `ems-{domain}-handler`
- S3 buckets: `ems-{purpose}-{env}` (e.g., `ems-media-uploads-prod`)
- DynamoDB: `ems-{table}-{env}`
- Cognito: `ems-user-pool-{env}`
- CloudFront: `ems-cdn-{portal}-{env}`

---

*Document Version: 1.0 | Prepared for: Event Management System — EMS*  
*Stack: AWS · React · PostgreSQL · Cognito · Lambda*
