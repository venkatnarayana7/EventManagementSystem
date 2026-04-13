# Frontend Integration Notes

These backend responses are shaped to support the portal behavior discussed during backend-first development.

## Portal bootstrap

Use `GET /users/me` after login. The response includes:

- `fullName`
- `avatarUrl`
- `role`
- `portal.layout`
- `portal.defaultRoute`
- `portal.tabs`

This is enough for a root router to choose the correct layout:

- Admin -> `AdminLayout` with `Dashboard`, `Events`, `Approvals`
- Teacher -> `TeacherLayout` with `My Events`, `Attendance`, `Feedback`
- Student -> `StudentLayout` with `Discover`, `My Registrations`

## Approval loop

- Teacher creates an event with `POST /events`
- Teacher-created events are stored as `pending_approval`
- Admin loads approvals with `GET /events?status=pending_approval`
- Admin approves with `PUT /events/:id/approve`
- Approved events become visible to students through `GET /events`

## Student registration flow

- Student loads Discover from `GET /events`
- Student loads Event Detail from `GET /events/:id`
- Student registers with `POST /registrations`
- Student-specific event responses include `myRegistrationStatus` and `myPortalBadge`
- Admin or teacher can load the event’s registered students with `GET /events/:id/registrations`

## Badge behavior

Portal-friendly badges are returned as:

- `Pending` for active registrations before attendance
- `Attended` after teacher marks attendance
- `Cancelled` after registration cancellation
- `Waitlisted` when the event is full
