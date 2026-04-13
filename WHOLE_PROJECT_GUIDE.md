# Event Management System Full Project Guide

## 1. Project Overview

This project is a multi-portal Event Management System hosted on AWS.

It currently contains:

- an Admin Portal
- a Teacher Portal
- a Student Portal
- a shared backend built with AWS Lambda and API Gateway
- shared DynamoDB tables for application data
- Cognito-based authentication
- S3 and CloudFront for frontend hosting and media delivery
- WebSocket-based realtime updates across portals

The core idea of the project is that all portals work on the same shared event system. Data created or updated in one portal is meant to appear in the other relevant portals in realtime or near-realtime.

## 2. Main Goal of the System

The system is designed to manage campus or institution events through role-based portals.

Each role has a different purpose:

- `Admin` manages the whole system, events, approvals, users, analytics, and settings
- `Teacher` manages or supports events, joins staff invites, works with attendance, and sees teacher-specific event views
- `Student` discovers events, joins them, tracks registrations, and tracks attendance

All of them use the same backend and the same shared event data.

## 3. Current Live AWS Configuration

These are the current configured live endpoints in the project:

- Frontend CloudFront URL: [https://d30luc1e1xqtn2.cloudfront.net](https://d30luc1e1xqtn2.cloudfront.net)
- REST API URL: [https://k9496zfg6j.execute-api.ap-south-1.amazonaws.com/prod/](https://k9496zfg6j.execute-api.ap-south-1.amazonaws.com/prod/)
- Realtime WebSocket URL: `wss://a7b89fbloe.execute-api.ap-south-1.amazonaws.com/prod`
- Media CDN URL: [https://d3u5timg9hm9ps.cloudfront.net](https://d3u5timg9hm9ps.cloudfront.net)
- AWS Region: `ap-south-1`

The frontend reads these values from [ems-config.js](/C:/Users/Intel/Downloads/Event%20Management%20System/ems-config.js).

## 4. Project Folder Structure

### Root-level important files

- [mainpage.html](/C:/Users/Intel/Downloads/Event%20Management%20System/mainpage.html)
- [auth-page.js](/C:/Users/Intel/Downloads/Event%20Management%20System/auth-page.js)
- [ems-config.js](/C:/Users/Intel/Downloads/Event%20Management%20System/ems-config.js)
- [ems-realtime.js](/C:/Users/Intel/Downloads/Event%20Management%20System/ems-realtime.js)
- [teacher-portal.css](/C:/Users/Intel/Downloads/Event%20Management%20System/teacher-portal.css)
- [scripts/build-frontend.mjs](/C:/Users/Intel/Downloads/Event%20Management%20System/scripts/build-frontend.mjs)

### Main folders

- [backend](/C:/Users/Intel/Downloads/Event%20Management%20System/backend)
- [infrastructure](/C:/Users/Intel/Downloads/Event%20Management%20System/infrastructure)
- [frontend](/C:/Users/Intel/Downloads/Event%20Management%20System/frontend)
- [docs](/C:/Users/Intel/Downloads/Event%20Management%20System/docs)

## 5. Frontend Architecture

This project is currently built as static HTML, CSS, and JavaScript pages, not as a React or Next.js app.

Important characteristics:

- each page is a separate `.html` file
- page behavior is handled by matching `.js` files
- shared shell logic is handled by portal shared files
- a single common CSS file powers most of the portal look and feel
- frontend files are copied into the deployable site folder by the build script

### Shared frontend files

- [teacher-portal.css](/C:/Users/Intel/Downloads/Event%20Management%20System/teacher-portal.css)
  - shared visual system for portal UI
- [ems-config.js](/C:/Users/Intel/Downloads/Event%20Management%20System/ems-config.js)
  - stores frontend API, Cognito, CloudFront, media, and websocket configuration
- [ems-realtime.js](/C:/Users/Intel/Downloads/Event%20Management%20System/ems-realtime.js)
  - opens websocket connection and listens for realtime messages

### Shared shell files

- [teacher-shared.js](/C:/Users/Intel/Downloads/Event%20Management%20System/teacher-shared.js)
- [student-shared.js](/C:/Users/Intel/Downloads/Event%20Management%20System/student-shared.js)

These files create:

- sidebar
- top bar
- profile dropdown
- notifications UI
- session handling helpers
- common API request helpers

## 6. Authentication Flow

Authentication is based on AWS Cognito.

The project uses:

- User Pool
- User Pool Client
- JWT tokens stored in frontend local storage
- role-based redirects after login

The sign-in and sign-up UI begins from:

- [mainpage.html](/C:/Users/Intel/Downloads/Event%20Management%20System/mainpage.html)
- [auth-page.js](/C:/Users/Intel/Downloads/Event%20Management%20System/auth-page.js)

### Current role behavior

- Admin users can sign in to the Admin Portal
- Teacher users sign in to the Teacher Portal
- Student users sign in to the Student Portal
- role checking is enforced in frontend and backend
- session tokens are reused across portal page loads

### Password reset

Password reset is handled through the public auth backend endpoints.

Student settings currently only exposes password reset from the page, while profile identity details are shown from the top-right profile menu.

## 7. Admin Portal

### Admin portal entry pages

- [EventAdminDashboard.html](/C:/Users/Intel/Downloads/Event%20Management%20System/EventAdminDashboard.html)
- [EventAdminEvents.html](/C:/Users/Intel/Downloads/Event%20Management%20System/EventAdminEvents.html)
- [EventAdminAttendeeInsights.html](/C:/Users/Intel/Downloads/Event%20Management%20System/EventAdminAttendeeInsights.html)
- [EventAdminSettings.html](/C:/Users/Intel/Downloads/Event%20Management%20System/EventAdminSettings.html)
- [EventAdminHelp.html](/C:/Users/Intel/Downloads/Event%20Management%20System/EventAdminHelp.html)

### Admin portal page scripts

- [dashboard-page.js](/C:/Users/Intel/Downloads/Event%20Management%20System/dashboard-page.js)
- [events-page.js](/C:/Users/Intel/Downloads/Event%20Management%20System/events-page.js)
- [attendee-insights-page.js](/C:/Users/Intel/Downloads/Event%20Management%20System/attendee-insights-page.js)
- [settings-page.js](/C:/Users/Intel/Downloads/Event%20Management%20System/settings-page.js)
- [help-page.js](/C:/Users/Intel/Downloads/Event%20Management%20System/help-page.js)

### Admin portal responsibilities

- create events
- approve or reject event submissions
- view overall dashboard metrics
- view attendee insights
- manage approval flows
- access help and system guidance
- see shared updates from other portals

### Admin dashboard purpose

The Admin Dashboard is the main control panel.

It is intended to show:

- total events
- ticket or registration activity
- upcoming events
- live updates
- event cards
- event creation entry point

### Admin events page purpose

The Events page is for detailed event browsing and management.

It is intended to show:

- active events
- past events
- draft or pending states
- event cards
- event filters and search

### Admin attendee insights purpose

This page is meant to show event analytics such as:

- total attendees
- gender distribution
- age category distribution
- top locations
- top categories

### Admin settings purpose

This area is intended for:

- user approval
- role assignment
- security settings
- password reset related actions

### Admin help purpose

This page explains the system to portal users and includes support contact information.

## 8. Teacher Portal

### Teacher portal entry pages

- [TeacherPortalDashboard.html](/C:/Users/Intel/Downloads/Event%20Management%20System/TeacherPortalDashboard.html)
- [TeacherPortalMyEvents.html](/C:/Users/Intel/Downloads/Event%20Management%20System/TeacherPortalMyEvents.html)
- [TeacherPortalBrowseEvents.html](/C:/Users/Intel/Downloads/Event%20Management%20System/TeacherPortalBrowseEvents.html)
- [TeacherPortalEventDetail.html](/C:/Users/Intel/Downloads/Event%20Management%20System/TeacherPortalEventDetail.html)
- [TeacherPortalStudents.html](/C:/Users/Intel/Downloads/Event%20Management%20System/TeacherPortalStudents.html)
- [TeacherPortalAttendance.html](/C:/Users/Intel/Downloads/Event%20Management%20System/TeacherPortalAttendance.html)
- [TeacherPortalProfile.html](/C:/Users/Intel/Downloads/Event%20Management%20System/TeacherPortalProfile.html)
- [TeacherPortalSettings.html](/C:/Users/Intel/Downloads/Event%20Management%20System/TeacherPortalSettings.html)

### Teacher portal page scripts

- [teacher-dashboard-page.js](/C:/Users/Intel/Downloads/Event%20Management%20System/teacher-dashboard-page.js)
- [teacher-my-events-page.js](/C:/Users/Intel/Downloads/Event%20Management%20System/teacher-my-events-page.js)
- [teacher-browse-events-page.js](/C:/Users/Intel/Downloads/Event%20Management%20System/teacher-browse-events-page.js)
- [teacher-event-detail-page.js](/C:/Users/Intel/Downloads/Event%20Management%20System/teacher-event-detail-page.js)
- [teacher-students-page.js](/C:/Users/Intel/Downloads/Event%20Management%20System/teacher-students-page.js)
- [teacher-attendance-page.js](/C:/Users/Intel/Downloads/Event%20Management%20System/teacher-attendance-page.js)
- [teacher-profile-page.js](/C:/Users/Intel/Downloads/Event%20Management%20System/teacher-profile-page.js)
- [teacher-settings-page.js](/C:/Users/Intel/Downloads/Event%20Management%20System/teacher-settings-page.js)

### Teacher portal responsibilities

- see teacher dashboard data
- browse shared approved events
- join staff invites
- view teacher-owned or teacher-assigned events
- manage attendance for allowed events
- see students related to event registrations
- use teacher settings and profile functionality

### Teacher dashboard purpose

The Teacher Dashboard is meant to show:

- shared live events
- staff invite opportunities
- attendance pending items
- event overview
- calendar and summary cards

### Teacher browse events purpose

This page allows teachers to:

- view shared approved events
- discover staff opportunities
- open event details
- join event staff where allowed

### Teacher attendance purpose

This page is for attendance marking on events the teacher owns or has joined as staff.

### Teacher students purpose

This page is for viewing event-related students or registrations connected to teacher-accessible events.

## 9. Student Portal

### Student portal entry pages

- [StudentPortalDashboard.html](/C:/Users/Intel/Downloads/Event%20Management%20System/StudentPortalDashboard.html)
- [StudentPortalBrowseEvents.html](/C:/Users/Intel/Downloads/Event%20Management%20System/StudentPortalBrowseEvents.html)
- [StudentPortalRegistrations.html](/C:/Users/Intel/Downloads/Event%20Management%20System/StudentPortalRegistrations.html)
- [StudentPortalAttendance.html](/C:/Users/Intel/Downloads/Event%20Management%20System/StudentPortalAttendance.html)
- [StudentPortalProfile.html](/C:/Users/Intel/Downloads/Event%20Management%20System/StudentPortalProfile.html)

### Student portal page scripts

- [student-dashboard-page.js](/C:/Users/Intel/Downloads/Event%20Management%20System/student-dashboard-page.js)
- [student-browse-events-page.js](/C:/Users/Intel/Downloads/Event%20Management%20System/student-browse-events-page.js)
- [student-registrations-page.js](/C:/Users/Intel/Downloads/Event%20Management%20System/student-registrations-page.js)
- [student-attendance-page.js](/C:/Users/Intel/Downloads/Event%20Management%20System/student-attendance-page.js)
- [student-profile-page.js](/C:/Users/Intel/Downloads/Event%20Management%20System/student-profile-page.js)

### Student portal responsibilities

- see a student dashboard
- view recommended events
- browse approved events
- join events
- get waitlisted if no seats remain
- see joined registrations
- see attendance history
- use password reset from settings
- see profile identity from the top-right profile area

### Student dashboard purpose

The Student Dashboard is meant to show:

- welcome banner
- joined and upcoming event stats
- recommended events
- live updates
- calendar

### Student browse events purpose

This page allows students to:

- search approved events
- filter by category or time
- open event details
- join events
- join waitlist when seats are full

### Student registrations purpose

This page shows:

- upcoming registrations
- past registrations
- waitlisted items
- cancelled items

### Student attendance purpose

This page shows:

- attendance records
- present or absent status
- attendance rate
- downloadable attendance-style reporting from frontend CSV export

### Student settings purpose

The page file still uses the historical `StudentPortalProfile.html` name, but it currently behaves as a Settings page.

Its current purpose is only:

- showing the registered email
- allowing password reset initiation

Profile identity details now stay in the top-right profile menu and modal.

## 10. Shared Data Model

All portals share the same application data.

Important shared data groups:

- users
- events
- registrations
- attendance
- seat counters
- OTP records
- websocket connection records

### Shared tables currently used

- `ems-users-dev`
- `ems-events-dev`
- `ems-registrations-dev`
- `ems-attendance-dev`
- `ems-seat-counter-dev`
- `ems-auth-otp-dev`
- `ems-ws-connections-dev`

## 11. How Data Moves Between Portals

### Admin to Teacher

When an admin creates or approves an event:

- the event is stored in the shared event table
- the teacher portal can fetch and display it
- websocket or refresh logic can update the teacher side

### Admin to Student

When an admin creates or approves an event:

- students can browse that event if it is approved
- seat counters and event data control whether the event can be joined

### Teacher to Admin

When a teacher joins staff, updates attendance, or interacts with shared events:

- the same shared backend updates the event or attendance state
- admin-visible pages can refresh using the same shared data source

### Student to Admin or Teacher

When a student joins or cancels a registration:

- registration records update
- seat counters update
- event capacity related numbers change
- related admin or teacher views can refresh from shared data

## 12. Realtime Layer

Realtime behavior is handled using a websocket API.

Frontend:

- [ems-realtime.js](/C:/Users/Intel/Downloads/Event%20Management%20System/ems-realtime.js)

Backend websocket handlers:

- [backend/functions/ws-connect/src/index.ts](/C:/Users/Intel/Downloads/Event%20Management%20System/backend/functions/ws-connect/src/index.ts)
- [backend/functions/ws-disconnect/src/index.ts](/C:/Users/Intel/Downloads/Event%20Management%20System/backend/functions/ws-disconnect/src/index.ts)
- [backend/functions/ws-default/src/index.ts](/C:/Users/Intel/Downloads/Event%20Management%20System/backend/functions/ws-default/src/index.ts)

Shared realtime logic:

- [backend/shared/src/realtime.ts](/C:/Users/Intel/Downloads/Event%20Management%20System/backend/shared/src/realtime.ts)

### Examples of realtime message types in the project

- `event_approved`
- `event_rejected`
- `event_submitted`
- `seat_updated`
- `new_registration`
- `registration_cancelled`
- `attendance_submitted`
- `staff_joined`

These messages are used by portal pages to refresh data when important changes happen.

## 13. Backend Architecture

The backend is Lambda-based and organized by responsibility.

### Backend functions folder

- [backend/functions/analytics-handler](/C:/Users/Intel/Downloads/Event%20Management%20System/backend/functions/analytics-handler)
- [backend/functions/attendance-handler](/C:/Users/Intel/Downloads/Event%20Management%20System/backend/functions/attendance-handler)
- [backend/functions/auth-post-confirmation](/C:/Users/Intel/Downloads/Event%20Management%20System/backend/functions/auth-post-confirmation)
- [backend/functions/events-handler](/C:/Users/Intel/Downloads/Event%20Management%20System/backend/functions/events-handler)
- [backend/functions/media-presigner](/C:/Users/Intel/Downloads/Event%20Management%20System/backend/functions/media-presigner)
- [backend/functions/notifications-handler](/C:/Users/Intel/Downloads/Event%20Management%20System/backend/functions/notifications-handler)
- [backend/functions/public-auth-handler](/C:/Users/Intel/Downloads/Event%20Management%20System/backend/functions/public-auth-handler)
- [backend/functions/registrations-handler](/C:/Users/Intel/Downloads/Event%20Management%20System/backend/functions/registrations-handler)
- [backend/functions/users-handler](/C:/Users/Intel/Downloads/Event%20Management%20System/backend/functions/users-handler)
- [backend/functions/ws-connect](/C:/Users/Intel/Downloads/Event%20Management%20System/backend/functions/ws-connect)
- [backend/functions/ws-default](/C:/Users/Intel/Downloads/Event%20Management%20System/backend/functions/ws-default)
- [backend/functions/ws-disconnect](/C:/Users/Intel/Downloads/Event%20Management%20System/backend/functions/ws-disconnect)

### What each backend handler does

#### `public-auth-handler`

Handles public authentication-related routes such as:

- request OTP
- verify OTP
- sign up
- sign in
- password reset request
- password reset confirmation

#### `users-handler`

Handles:

- current user fetch
- current user update
- approval and role-related user administration

#### `events-handler`

Handles:

- list events
- create events
- get event details
- update events
- approve events
- reject events
- staff join actions
- event registration listing per event

#### `registrations-handler`

Handles:

- student registration creation
- current user registration listing
- registration cancellation
- event-seat and waitlist related updates

#### `attendance-handler`

Handles:

- attendance listing by event
- current student attendance listing
- attendance marking

#### `analytics-handler`

Handles overall analytics or dashboard-related summary data.

#### `media-presigner`

Handles media upload presign flow for assets such as event banners or poster media.

#### `notifications-handler`

Handles event bus driven notification processing.

#### Websocket handlers

These manage websocket lifecycle:

- connect
- disconnect
- default route handling

## 14. Shared Backend Utilities

Important shared backend files include:

- [backend/shared/src/dynamo-repository.ts](/C:/Users/Intel/Downloads/Event%20Management%20System/backend/shared/src/dynamo-repository.ts)
- [backend/shared/src/serializers.ts](/C:/Users/Intel/Downloads/Event%20Management%20System/backend/shared/src/serializers.ts)
- [backend/shared/src/auth.ts](/C:/Users/Intel/Downloads/Event%20Management%20System/backend/shared/src/auth.ts)
- [backend/shared/src/validation.ts](/C:/Users/Intel/Downloads/Event%20Management%20System/backend/shared/src/validation.ts)
- [backend/shared/src/aws.ts](/C:/Users/Intel/Downloads/Event%20Management%20System/backend/shared/src/aws.ts)
- [backend/shared/src/env.ts](/C:/Users/Intel/Downloads/Event%20Management%20System/backend/shared/src/env.ts)
- [backend/shared/src/realtime.ts](/C:/Users/Intel/Downloads/Event%20Management%20System/backend/shared/src/realtime.ts)

### Their purpose

- repository file reads and writes DynamoDB data
- serializer file converts backend records into frontend-safe response objects
- auth file reads Cognito claims and enforces role permissions
- validation file validates request bodies
- aws file initializes AWS clients
- env file centralizes environment variable loading
- realtime file broadcasts websocket messages

## 15. AWS Infrastructure Architecture

Infrastructure is defined with AWS CDK.

Important stack files:

- [infrastructure/lib/stacks/auth-stack.ts](/C:/Users/Intel/Downloads/Event%20Management%20System/infrastructure/lib/stacks/auth-stack.ts)
- [infrastructure/lib/stacks/database-stack.ts](/C:/Users/Intel/Downloads/Event%20Management%20System/infrastructure/lib/stacks/database-stack.ts)
- [infrastructure/lib/stacks/api-stack.ts](/C:/Users/Intel/Downloads/Event%20Management%20System/infrastructure/lib/stacks/api-stack.ts)
- [infrastructure/lib/stacks/storage-stack.ts](/C:/Users/Intel/Downloads/Event%20Management%20System/infrastructure/lib/stacks/storage-stack.ts)
- [infrastructure/lib/stacks/notifications-stack.ts](/C:/Users/Intel/Downloads/Event%20Management%20System/infrastructure/lib/stacks/notifications-stack.ts)

### What each stack does

#### AuthStack

Creates and manages:

- Cognito User Pool
- User Pool Client
- related auth resources

#### DatabaseStack

Creates and manages:

- users table
- events table
- registrations table
- attendance table
- seat counter table
- OTP table
- websocket connections table

#### ApiStack

Creates and manages:

- REST API Gateway
- WebSocket API Gateway
- Lambda functions
- IAM permissions between Lambdas and DynamoDB
- Cognito authorizer for protected routes

#### StorageStack

Creates and manages:

- frontend hosting bucket
- CloudFront distribution for frontend
- media bucket
- media distribution domain
- bucket deployment for static frontend build

#### NotificationsStack

Creates and manages:

- EventBridge bus
- notifications routing integrations

## 16. Static Frontend Build and Deployment

The deployable frontend is generated using:

- [scripts/build-frontend.mjs](/C:/Users/Intel/Downloads/Event%20Management%20System/scripts/build-frontend.mjs)

### What the build script does

- copies root HTML pages to the frontend site folder
- renames output pages to deploy-ready names such as `dashboard.html`
- copies JS and CSS assets
- copies shared portal files
- applies cache-busting query strings to frontend asset references

The generated deployable output goes to:

- [frontend/admin/site](/C:/Users/Intel/Downloads/Event%20Management%20System/frontend/admin/site)

## 17. Main Routes and Behaviors

### Frontend portal routes

- `/index.html`
- `/dashboard.html`
- `/events.html`
- `/attendee-insights.html`
- `/settings.html`
- `/help.html`
- `/teacher-dashboard.html`
- `/teacher-my-events.html`
- `/teacher-browse-events.html`
- `/teacher-event-detail.html`
- `/teacher-students.html`
- `/teacher-attendance.html`
- `/teacher-profile.html`
- `/teacher-settings.html`
- `/student-dashboard.html`
- `/student-browse-events.html`
- `/student-registrations.html`
- `/student-attendance.html`
- `/student-profile.html`

### Important protected REST routes

- `/events`
- `/events/{id}`
- `/events/{id}/registrations`
- `/events/{id}/staff/join`
- `/events/{id}/approve`
- `/events/{id}/reject`
- `/registrations`
- `/registrations/me`
- `/registrations/{id}`
- `/attendance`
- `/attendance/me`
- `/users`
- `/users/me`
- `/users/{id}/approval`
- `/analytics/overview`
- `/media/presign`
- `/auth/request-otp`
- `/auth/verify-otp`
- `/auth/signup`
- `/auth/signin`
- `/auth/password-reset/request`
- `/auth/password-reset/confirm`

## 18. Session and Token Handling

Frontend authentication state is stored in local storage using a token bundle.

The shared frontend helpers:

- decode JWT
- check token expiry
- clear invalid sessions
- attach bearer tokens to API requests
- redirect users to the correct portal for their role

This logic is especially important because all portals are static pages that rely on frontend session restoration.

## 19. Important Project Docs Already Present

Existing documentation in the repo:

- [README.md](/C:/Users/Intel/Downloads/Event%20Management%20System/README.md)
- [docs/aws-deployment.md](/C:/Users/Intel/Downloads/Event%20Management%20System/docs/aws-deployment.md)
- [docs/frontend-integration.md](/C:/Users/Intel/Downloads/Event%20Management%20System/docs/frontend-integration.md)

There are also several planning and blueprint files in the root that were used during portal design and development.

## 20. Build Commands

From the repo root:

```bash
npm install
npm run build
npm run synth
npm run deploy
```

### Workspace-specific commands

Backend build:

```bash
npm run build --workspace backend
```

Infrastructure build:

```bash
npm run build --workspace infrastructure
```

Frontend static build:

```bash
node scripts/build-frontend.mjs
```

## 21. Current System Design Summary

This project is not three separate apps with separate databases.

It is one shared event platform with:

- multiple role-based portal interfaces
- one shared AWS backend
- one shared authentication system
- shared DynamoDB data
- shared event and registration logic
- shared realtime updates

That means:

- admins, teachers, and students are all working on the same event universe
- events are created once and then reused across portals
- registrations and attendance affect shared counts
- UI differs by role, but backend truth stays centralized

## 22. Recommended Next Development Areas

Based on the current project structure, the most natural next areas are:

- harden approval workflow for teacher and future student onboarding
- continue fixing remaining realtime edge cases between portals
- complete missing page-level error handling everywhere
- strengthen role restrictions across all portal actions
- improve media upload and banner rendering consistency
- expand help and deployment documentation
- build the future student onboarding flow more deeply if needed

## 23. Final Notes

This file is meant to explain the whole project in one place using the current codebase as the source of truth.

If more portals, routes, or major flows are added later, this file should be updated as the master overview document for the system.
