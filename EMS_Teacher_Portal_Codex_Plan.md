# EMS Teacher Portal — Complete Codex Build Plan
## Same UI as Admin Portal · Exact Colour Palette · All Pages Documented

---

## 🎯 WHAT IS THE TEACHER PORTAL

The Teacher Portal is a separate React app (`teacher.yourdomain.com`) for faculty members. It shares the **exact same design system** as the Admin Portal — same sidebar style, same card layout, same Eventopia-inspired colour palette — but has a completely different set of pages and permissions suited to a teacher's role.

### What Teachers Can Do
1. **Create events** — submit new events for admin approval
2. **Manage their own events** — edit drafts, view registration status
3. **Browse admin-created events** — and join as a Staff Coordinator (not as a participant)
4. **Manage staff team** — see which other teachers joined their event as coordinators
5. **View registered students** — full name + email visible only in teacher portal
6. **Mark attendance** — select attended students from the registered list (attended ≠ joined)
7. **View event analytics** — only for their own events
8. **Manage their profile and notification settings**

### What Teachers Cannot Do
- Approve or reject events (admin only)
- See other teachers' student lists
- Access system-wide analytics
- Manage users

---

## 🎨 DESIGN SYSTEM (Identical to Admin Portal)

```css
/* Paste same variables from admin portal index.css — no changes */
:root {
  --bg-sidebar:        #1A1A2E;
  --bg-main:           #F5F0E8;
  --bg-card:           #FFFFFF;
  --bg-card-alt:       #FAF7F2;
  --text-primary:      #1A1A2E;
  --text-secondary:    #6B7280;
  --text-muted:        #9CA3AF;
  --text-sidebar:      #FFFFFF;
  --text-sidebar-muted:#9B9BB4;
  --accent-primary:    #1A1A2E;
  --accent-green:      #4CAF82;
  --accent-red:        #EF4444;
  --accent-amber:      #F59E0B;
  --accent-blue:       #3B82F6;
  --border-light:      #E8E2D9;
  --border-card:       #F0EBE3;
  --sidebar-active-bg: rgba(255,255,255,0.12);
  --sidebar-hover-bg:  rgba(255,255,255,0.07);
  --shadow-card:       0 2px 12px rgba(26,26,46,0.06);
  --radius-card:       16px;
  --radius-input:      10px;
}
font-family: 'Sora', sans-serif;
```

---

## 📁 PROJECT STRUCTURE

```
teacher-portal/
├── src/
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Sidebar.jsx          ← teacher-specific nav items
│   │   │   ├── Header.jsx           ← same as admin
│   │   │   └── Layout.jsx
│   │   ├── ui/
│   │   │   ├── StatCard.jsx
│   │   │   ├── Badge.jsx
│   │   │   ├── Modal.jsx
│   │   │   ├── Toast.jsx
│   │   │   └── ProgressBar.jsx
│   │   ├── events/
│   │   │   ├── EventCard.jsx        ← same card as admin events page
│   │   │   ├── EventsGrid.jsx
│   │   │   ├── EventDetailModal.jsx ← teacher-specific actions
│   │   │   └── CreateEventDrawer.jsx
│   │   └── attendance/
│   │       ├── StudentRow.jsx
│   │       └── AttendanceSummary.jsx
│   ├── pages/
│   │   ├── Dashboard.jsx
│   │   ├── MyEvents.jsx
│   │   ├── BrowseEvents.jsx
│   │   ├── EventDetail.jsx          ← full page (not modal) for teacher
│   │   ├── Registrations.jsx
│   │   ├── Attendance.jsx
│   │   ├── Profile.jsx
│   │   └── Settings.jsx
│   ├── data/
│   │   └── mockData.js
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
```

---

## 🗺️ ROUTES

```
/                    → redirect to /dashboard
/dashboard           → Dashboard
/my-events           → My Events (events I created)
/my-events/create    → Create Event (drawer opens from here)
/browse-events       → Browse All Events (admin + all teachers)
/event/:id           → Full Event Detail Page
/event/:id/students  → Registered Students List
/event/:id/attendance → Attendance Marking
/profile             → Teacher Profile
/settings            → Settings
```

---

## PAGE 1 — SIDEBAR

```
CODEX PROMPT:

Build the Sidebar for the Teacher Portal. Identical structure and styling to the Admin Portal sidebar.

Dimensions: 220px wide, full height fixed, background #1A1A2E.

TOP — Logo area (padding 24px 20px):
- Rounded square brand icon + "EMS" bold white 16px
- Subtitle "Teacher Portal" in var(--text-sidebar-muted) 11px

NAVIGATION — label "Menu" muted uppercase 11px:

Nav items (height 40px, border-radius 10px, padding 0 12px, gap 10px):
1. Dashboard        → /dashboard         — LayoutDashboard icon
2. My Events        → /my-events         — CalendarDays icon
3. Browse Events    → /browse-events     — Search icon (or Compass icon)
4. Students         → /event (contextual)— Users icon
5. Attendance       → /event (contextual)— ClipboardCheck icon

GENERAL section — label "General":
6. Profile          → /profile           — UserCircle icon
7. Settings         → /settings          — Settings icon
8. Logout           → triggers logout    — LogOut icon (red on hover)

Active state: background rgba(255,255,255,0.12), white text+icon.
Inactive: text var(--text-sidebar-muted).
Use NavLink for active class detection.

BOTTOM — same "Download Our Mobile App" promo card as admin portal.
Identical markup, identical styling.

One difference from admin: no "Attendee Insights" or analytics link — teachers only see their own event stats inline.
```

---

## PAGE 2 — HEADER

```
CODEX PROMPT:

Reuse the exact Header component from the Admin Portal.
Accept props: title (string), breadcrumb (string).

Identical layout:
- Left: breadcrumb muted 11px above page title bold 20px
- Center: search bar 320px
- Right: mail icon button + bell icon button (with badge) + user profile chip

Teacher-specific: user chip shows teacher's name and email (e.g., "Rahul Sharma", "rahul@lpu.edu.in").

No changes to visual style whatsoever.
```

---

## PAGE 3 — DASHBOARD

```
CODEX PROMPT:

Build the Teacher Dashboard at /dashboard. Header: title="Dashboard" breadcrumb="Dashboard".
Padding 24px 28px, background var(--bg-main).

CSS Grid layout: left column (flex:1) + right column (380px). Gap 20px.

━━━ LEFT COLUMN ━━━

1. STAT CARDS ROW — 3 cards side by side. Same style as admin portal stat cards
   (white bg, border-radius 16px, border 1px solid var(--border-card), padding 20px, shadow).

   Card 1 — My Total Events:
   - Icon: CalendarDays in a 36px rounded square bg #F0EBE3
   - Number: "12" bold 28px
   - Trend: "↑ 2 this month" in var(--accent-green) 11px

   Card 2 — Pending Approval:
   - Icon: Clock in bg #FEF3CD
   - Number: "3" bold 28px
   - Subtext: "awaiting admin review" var(--text-muted) 11px

   Card 3 — Upcoming Events (mine):
   - Icon: CalendarCheck in bg #E8F5EE
   - Number: "5" bold 28px
   - Trend: "next: Nov 8" var(--text-muted) 11px

   Card 4 — Avg Attendance Rate (mine only):
   - Icon: UserCheck in bg #EDE9FE (purple tint)
   - Number: "74%" bold 28px
   - Trend: "↑ 6% vs last month" var(--accent-green) 11px

   Show 4 cards — use a 4-column grid for this row.

2. MY UPCOMING EVENTS LIST CARD:
   Background white, border-radius 16px, border 1px solid var(--border-card), padding 20px 24px.
   Header row: "My Upcoming Events" bold 15px left + "View All" link var(--accent-blue) 12px right → links to /my-events.

   List of 4 upcoming events. Each item (flex row, gap 12px, padding 10px 0, border-bottom var(--border-card)):
   - Poster thumbnail: 52x52px, border-radius 8px, object-fit cover
   - Content (flex column):
     - Event title bold 14px
     - Category chip (small pill, bg var(--bg-card-alt), border var(--border-card), 10px text)
     - Date row: CalendarDays icon 11px + date + divider dot + Clock icon + time (12px var(--text-muted))
     - Location: MapPin red 11px + venue text 12px var(--text-secondary)
   - Right side (flex column, align-items flex-end):
     - Status badge (Approved=green, Pending=amber, Draft=gray) — same pill style
     - "X registered" text 11px var(--text-muted) below badge
     - Registration mini bar: 80px wide, 4px height, dark fill

   Last item has no border-bottom.

3. MY EVENTS STATUS OVERVIEW CARD (below upcoming):
   Background white, border-radius 16px, padding 20px 24px.
   Header: "Events Overview" bold 15px.
   Recharts DonutChart centered, height 200px:
   - Approved: #1A1A2E
   - Pending: #F59E0B
   - Draft: #9B9BB4
   - Rejected: #EF4444
   - Completed: #4CAF82
   Legend to the right of donut: coloured dot + status label + count number.
   Below chart: "Total: 12 events" muted centered.

━━━ RIGHT COLUMN ━━━

4. STAFF COORDINATOR INVITES CARD:
   Background white, border-radius 16px, border 1px solid var(--border-card), padding 20px 24px.
   Header row: Users icon (blue) + "Staff Invites" bold 15px + count badge (orange pill "2").

   Description text 12px var(--text-muted) "You have been invited to coordinate these events as staff."

   List of 2-3 pending invites. Each invite item (padding 12px 0, border-bottom var(--border-card)):
   - Event poster thumbnail 44x44px rounded-8
   - Event title bold 13px + host teacher name 11px muted
   - Date 11px muted
   - Two buttons right: "Accept" (green filled, 30px height, border-radius 8px, 11px) + "Decline" (red outlined, same size)

   Empty state: checkmark illustration + "No pending invites" muted.

   IMPORTANT NOTE IN COMMENT: This invite system means: when a teacher creates an event, they can invite other teachers as staff coordinators. Invited teachers see it here. Accepting adds them to the event's staff list.

5. ATTENDANCE PENDING CARD:
   Background white, border-radius 16px, padding 20px 24px, margin-top 20px.
   Header: ClipboardCheck icon + "Attendance Pending" bold 15px + count badge red "3".
   Description: "These past events need attendance to be marked."

   List of events needing attendance (each item same layout as invites — thumbnail + title + date + "Mark Now" button in amber filled).
   Clicking "Mark Now" navigates to /event/:id/attendance.

6. CALENDAR CARD (same as admin):
   Background white, border-radius 16px, padding 20px 24px, margin-top 20px.
   Identical interactive calendar component from admin portal.
   Events on their date shown as small dark dots below the date number.
```

---

## PAGE 4 — MY EVENTS PAGE

```
CODEX PROMPT:

Build the My Events page at /my-events. Header: title="My Events" breadcrumb="My Events".

This page shows ALL events created by the logged-in teacher (not admin events, not other teachers' events).

TOP BAR — same layout as admin Events page top bar:
Left: "My Events" h2 + "12 events" subtitle muted.
Right (flex row, gap 10px):
- Search input (240px)
- Status filter dropdown pill: "All Status" → options: All, Draft, Pending Approval, Approved, Rejected, Completed
- Category filter dropdown pill: "All Category"
- "+ Create Event" pill button: bg #1A1A2E, white, Plus icon, "Create Event" text → opens CreateEventDrawer

TAB ROW (below top bar, margin-bottom 20px):
Pill tabs same as Events page:
- "All (12)" — active by default
- "Active (5)"
- "Pending (3)"
- "Draft (2)"
- "Completed (2)"

CARD GRID — 4 columns, exact same EventCard component from admin portal with one addition:

EventCard for teacher's own events gets a bottom action strip (shown on card hover only):
- Strip appears: slide up from bottom, height 40px, background rgba(26,26,46,0.88), border-radius 0 0 14px 14px, flex row center, gap 12px
- Action icons (white, 16px each): 
  - Eye icon → navigate to /event/:id
  - Pencil icon → open EditEventDrawer (only if Draft or Rejected)
  - Users icon → navigate to /event/:id/students
  - ClipboardCheck icon → navigate to /event/:id/attendance
  - Trash icon (red tint) → delete confirm modal (only if Draft)

For Pending events: show a "Pending Admin Review" amber banner at bottom of card body (full width, 28px height, amber bg #FEF3CD, amber text "#92400E", Clock icon, font-size 11px, font-weight 600, border-radius 0 0 14px 14px).

For Rejected events: show a "Rejected — Tap to view reason" red banner instead.

EMPTY STATE:
When no events exist for a tab, show:
- CalendarX icon 48px var(--text-muted)
- "No events found" bold 18px
- "Create your first event to get started" muted 14px
- "+ Create Event" button filled #1A1A2E

CREATE EVENT DRAWER — slides in from right (same as admin portal CreateEventDrawer, 520px wide). All fields identical. One addition: a "Invite Staff Coordinators" field at the bottom:
- Label: "Invite Staff Coordinators (optional)"
- Description 12px muted: "Invite other teachers to help manage this event"
- Teacher search input: type teacher name → shows dropdown of matching teachers from institution
- Selected teachers appear as chips: avatar (24px circle) + name + X remove
- Max 5 staff coordinators per event
```

---

## PAGE 5 — BROWSE EVENTS PAGE

```
CODEX PROMPT:

Build the Browse Events page at /browse-events. Header: title="Browse Events" breadcrumb="Browse Events".

PURPOSE: Teachers can see ALL approved events in the system (created by admins OR other teachers). They can join any of these events as a Staff Coordinator (not as a participant — they don't take up a student seat).

This page is IDENTICAL in layout to the admin Events page (same card grid, same top controls bar, same tabs, same filters, same grid/list toggle). The only differences are:

DIFFERENCE 1 — Tabs:
Instead of Active/Past/Draft, tabs are:
- "Open to Join (8)" — events actively seeking staff coordinators
- "All Events (24)" — every approved event
- "My Joined (3)" — events this teacher already joined as coordinator

DIFFERENCE 2 — EventCard action on this page:
On hover action strip (same dark overlay as My Events page), the icons are different:
- Eye icon → view event detail
- "Join as Staff" button (replaces edit/delete): text button "Join as Staff" with UserPlus icon
  - If already joined: shows "✓ Joined" chip (green) instead — no button
  - If event is own event: no join button (can't join own event as coordinator)

DIFFERENCE 3 — EventDetailModal on this page:
Instead of approve/reject/edit buttons, the right column card shows:

"Join as Staff Coordinator" section:
- Title: "Staff Coordinator Role" bold 14px
- Description 12px var(--text-secondary): "Join this event as a staff coordinator. You will help manage registrations, take attendance, and coordinate logistics."
- Current staff list: small avatars row (stacked circles, 28px each, max 4 shown + "+N more") with label "X coordinators joined"
- Big "Join as Staff Coordinator" button: full width 44px, bg #1A1A2E, white, UserPlus icon, font-weight 600
- If already joined: green success banner "✓ You are a Staff Coordinator" + "Leave Event" text link (small, red, below banner)
- If own event: blue info banner "You are the event organizer"

Staff coordinator responsibilities note box:
- Light blue bg, border-radius 10px, padding 12px 16px
- Info icon blue
- Text 12px: "As a coordinator you can: view all registered students, mark attendance, send announcements to participants."

SEARCH — header search bar filters this grid by event title.
FILTER — All Category dropdown + This Month dropdown (same as admin portal).
VIEW TOGGLE — grid/list toggle (same as admin portal).
```

---

## PAGE 6 — REGISTERED STUDENTS PAGE

```
CODEX PROMPT:

Build the Registered Students page at /event/:id/students.
Header: title="Registered Students" breadcrumb="My Events / [Event Name]".

⚠️ IMPORTANT: This page is ONLY accessible to:
  a) The teacher who created the event (host)
  b) Teachers who joined as staff coordinators for this event
All student name + email data is NEVER shown in admin portal — only here.

TOP — EVENT SUMMARY BAR:
Full-width card, bg white, border-radius 16px, padding 16px 20px, margin-bottom 20px, flex row, gap 20px, align-items center.
Left: event poster thumbnail 56x56px + event title bold 16px + category chip + date muted 12px + venue muted 12px.
Right: flex row gap 16px, each stat chip (bg var(--bg-card-alt), border var(--border-card), border-radius 10px, padding 8px 14px):
- "Total Seats: 100" (Users icon)
- "Registered: 68" (UserCheck icon, green text)
- "Waitlisted: 5" (Clock icon, amber text)
- "Cancelled: 3" (UserX icon, red text)
- "Attended: —" (ClipboardCheck icon, muted — shows count after attendance marked)
Far right: "Go to Attendance →" link button: bg #1A1A2E, white, 36px height, border-radius 10px, arrow icon.

TOP BAR (below summary):
Left: "68 Registered Students" h2 + subtitle muted.
Right: 
- Search input (by name, email, roll number) — 240px
- Status filter: "All" | "Registered" | "Waitlisted" | "Cancelled"
- "Export Excel" button (outlined, Download icon)
- "Send Email Blast" button (filled #1A1A2E, Mail icon) — opens modal to send email to all filtered students

STUDENTS TABLE CARD:
Background white, border-radius 16px, overflow hidden, border var(--border-card).

Table header (bg var(--bg-card-alt), height 44px, border-bottom var(--border-light)):
Columns: # | Student | Email | Roll No | Dept | Registered At | Status | Attendance

Column detail:
- # : row number, 40px wide, muted 12px
- Student: 36px circle avatar (gradient with initials, since no photo) + Full Name bold 13px. Hover on name → small tooltip showing full name + roll no.
- Email: email address 13px var(--text-secondary). Has a small "copy" clipboard icon that appears on row hover — clicking copies email to clipboard with a toast.
- Roll No: monospace 12px var(--text-muted)
- Dept: 12px var(--text-secondary), department chip small
- Registered At: date + time, 12px var(--text-muted), two lines
- Status badge: Registered=green pill, Waitlisted=amber, Cancelled=red
- Attendance: shows "Present ✓" (green) or "Absent ✗" (red) or "—" (em-dash, not yet marked) based on attendance data

Table rows: height 60px, hover bg var(--bg-card-alt).

BULK ACTIONS BAR — appears when rows are checkbox-selected (fixed bottom of table, animated slide up):
- White bar, padding 12px 20px, flex row, gap 10px, border-top var(--border-light)
- Left: "X students selected" bold 13px
- Right: "Send Email" button + "Export Selected" button + "Deselect All" link

PAGINATION:
"Showing 1–20 of 68 students" + page number controls — same style as admin portal table pagination.

SEND EMAIL BLAST MODAL:
500px, white card, border-radius 16px, padding 28px.
Header: "Send Email to Students" + recipient chip summary (e.g., "To: 68 Registered Students").
Form: Subject input + Message textarea (160px) + channel checkbox (Email only — no SMS in teacher portal).
Preview toggle: shows a rendered email preview box below.
Footer: Cancel + "Send Email" filled dark button.
```

---

## PAGE 7 — ATTENDANCE MARKING PAGE

```
CODEX PROMPT:

Build the Attendance Marking page at /event/:id/attendance.
Header: title="Mark Attendance" breadcrumb="My Events / [Event Name] / Attendance".

⚠️ CORE CONCEPT TO IMPLEMENT:
- "Registered Students" = students who signed up for the event (joined the waitlist or confirmed seat)
- "Attended Students" = subset of registered students who physically showed up
- These are TWO DIFFERENT lists — teacher marks who attended from the registered list
- Attendance can only be marked by: event host teacher OR staff coordinator teachers

TOP — EVENT SUMMARY BAR (same as students page, reuse component).
Add one stat chip: "Attendance Status" showing "Not Started" / "In Progress" / "Submitted" as colored badge.

TWO MODE TABS (below summary bar):
Tab 1: "Manual Mode" (ClipboardList icon) — default
Tab 2: "QR Scanner Mode" (QrCode icon)

━━━ MANUAL MODE ━━━

TOP ROW:
Left: Search input (by name or roll number, 220px)
Filter toggle tabs: "All (68)" | "Present (0)" | "Absent (0)" | "Not Marked (68)"
Right: "Mark All Present" button (green filled, 36px, UserCheck icon) + "Clear All" button (outlined, 36px)

MAIN CONTENT — two columns:

LEFT (flex:1) — Student Attendance List:
Not a table — use card-list style rows.

Each student row (padding 12px 16px, border-radius 12px, margin-bottom 8px, bg white, border 1px solid var(--border-card)):
Left: 36px circle avatar (initials gradient) + student name bold 13px + roll number 11px muted below
Center: Department chip + Registration status chip (small, to show they are indeed registered)
Right side: TWO TOGGLE BUTTONS side by side:

  "Present" button: 
  - SELECTED state: bg #D1FAE5 (light green), border 1.5px solid #16A34A, color #16A34A, font-weight 700
  - Unselected: bg var(--bg-card-alt), border var(--border-card), color var(--text-muted)
  - Width 80px, height 34px, border-radius 8px, font-size 12px
  - Check icon (16px) left of text

  "Absent" button:
  - SELECTED state: bg #FEE2E2, border 1.5px solid #EF4444, color #EF4444, font-weight 700
  - Unselected: same gray style
  - Width 80px, height 34px, border-radius 8px, font-size 12px
  - X icon (16px) left of text

  Default state: neither selected (both gray) = "Not Marked"

Row hover: bg var(--bg-card-alt), slight transition.
Rows are searchable and filterable by the top filter tabs.

RIGHT (300px fixed, sticky top 80px) — Attendance Summary Card:
Background white, border-radius 16px, border var(--border-card), padding 20px.
Title: "Attendance Summary" bold 15px.

Big circular progress ring (SVG, 120px diameter):
- Track: var(--border-light) 8px stroke
- Fill: var(--accent-green) 8px stroke, stroke-dasharray animated
- Center: attendance percentage bold 24px
Below ring: "of 68 students marked present" muted 12px centered.

Stats grid (2x2, gap 10px, margin-top 16px):
- Present: green icon + big number + "students"
- Absent: red icon + big number + "students"  
- Not Marked: gray icon + big number + "students"
- Rate: purple icon + percentage + "attendance"

SUBMIT BUTTON (full width, margin-top 20px):
"Submit Attendance" — bg #1A1A2E, white, 44px, border-radius 10px, font-weight 600, ClipboardCheck icon left.
Disabled state (gray, not clickable) if any students are "Not Marked".
Disabled message below button: "Mark all students as present or absent before submitting." 11px amber.

SUBMIT CONFIRM MODAL:
On submit button click, show confirmation modal:
- CheckCircle icon 32px green centered
- "Submit Attendance?" h3 centered
- Summary: "Present: X | Absent: Y | Total: Z" in a highlighted box
- Warning: "Once submitted, attendance cannot be edited." 12px amber with warning icon
- Cancel + "Confirm & Submit" buttons.

POST-SUBMIT STATE:
After submission, replace Submit button with:
- Green success banner: "✓ Attendance Submitted" with timestamp
- "Edit Attendance" button (outlined, amber) — allows re-editing if needed before deadline
- "Download Report" button (outlined, dark) — PDF download

━━━ QR SCANNER MODE ━━━

Full width centered layout.

Camera viewfinder box:
- 280x280px centered, border 3px dashed var(--accent-primary), border-radius 16px
- Inner placeholder: QrCode icon 64px var(--text-muted) centered
- "Scanning..." animated pulse ring around the box when "active"
- Instruction text below: "Show student's QR code to camera" 13px muted

Scanner controls:
- "Start Scanner" green button (filled, 44px, Camera icon)
- "Stop Scanner" red button (filled, shows when active)

RECENT SCANS LOG (below scanner, max 6 shown, scrollable):
Header: "Recent Scans" bold 13px + "X scanned" count chip amber.
Each scan row: avatar + student name + roll number + timestamp ("just now", "2 min ago") + green ✓ checkmark. Appears with a slide-in animation from bottom.

Right side sticky: same Attendance Summary card as manual mode, updates in real time.
```

---

## PAGE 8 — EVENT DETAIL FULL PAGE

```
CODEX PROMPT:

Build the Event Detail full page at /event/:id.
Header: title="Event Detail" breadcrumb="My Events / [Event Name]".

This is a FULL PAGE (not modal). Used when teacher clicks on one of their own events from My Events page.

LAYOUT: Single column, max-width 900px, margin 0 auto.

SECTION 1 — HERO CARD:
Background white, border-radius 20px, overflow hidden, border var(--border-card).
Image: full width, height 280px, object-fit cover.
Dark gradient overlay bottom.
On overlay: category chip + status badge + event title 24px bold white + price 18px white.

SECTION 2 — ACTION BAR (below hero, white card, border-radius 16px, padding 16px 24px, flex row, justify-space-between, align-center, border var(--border-card)):
Left: breadcrumb again + event status badge.
Right (flex row, gap 10px):
- "Edit Event" button (outlined #1A1A2E, Pencil icon) — only if Draft or Rejected
- "View Students" button (outlined #1A1A2E, Users icon) → /event/:id/students
- "Mark Attendance" button (filled #1A1A2E, ClipboardCheck icon) → /event/:id/attendance
- Three-dot "More" menu (⋮): dropdown with "Cancel Event" (red), "Duplicate Event", "Download Report"

SECTION 3 — TWO COLUMN LAYOUT (left 60%, right 40%, gap 20px):

LEFT COLUMN:

"Event Details" card (white, border-radius 16px, padding 20px 24px, border var(--border-card)):
Section label "DETAILS" uppercase muted 11px letter-spacing.
Info rows (each: icon 14px var(--text-muted) + label 12px var(--text-secondary) + value 13px bold var(--text-primary)):
- Date, Start Time – End Time, Venue, Department, Max Capacity, Registration Deadline
Divider.
"Description" section: full description text, 14px var(--text-secondary), line-height 1.65.
Divider.
"Tags" section: tag chips row.

"Staff Coordinators" card (white, border-radius 16px, padding 20px 24px, border var(--border-card), margin-top 20px):
Header: "Staff Coordinators" bold 15px + "+ Invite" outlined button (UserPlus icon, 32px height) right.
List of joined staff coordinators:
Each row: 36px avatar circle + name bold 13px + department 11px muted + "Coordinator" chip right + X remove button (only visible to host).
If no coordinators: "No staff coordinators yet. Invite teachers to help manage this event." muted.

RIGHT COLUMN (sticky):

"Registration Stats" card (white, border-radius 16px, padding 20px 24px, border var(--border-card)):
"Registration Stats" bold 15px.
Big numbers row: "68" bold 32px + "/" + "100" 20px muted — center aligned. Below: "students registered" muted 12px.
Progress bar (10px height, dark fill, border-radius 100px, margin 12px 0).
Stats grid (2x2):
- Registered: 68 green
- Waitlisted: 5 amber
- Cancelled: 3 red
- Attended: — (em-dash until attendance submitted)

"Invite Staff" section (same card, below stats, divider above):
Small text: "Share this event code with teachers to let them join as coordinators."
Event Code: monospace pill chip "EMS-2024-041" + copy icon.

"Quick Actions" card (white, border-radius 16px, padding 20px, border var(--border-card), margin-top 20px):
Four action buttons stacked (full width, height 40px, border-radius 10px, border var(--border-card), bg var(--bg-card-alt), text var(--text-primary), font-size 13px, gap 8px, icon left):
1. Users icon — "View Registered Students" → /event/:id/students
2. ClipboardCheck icon — "Mark Attendance" → /event/:id/attendance  
3. MessageSquare icon — "Send Announcement" (opens send email modal)
4. BarChart2 icon — "View Analytics" (expands inline below)

"Event Analytics" expandable section (opens when View Analytics clicked):
Animate expand. Shows:
- Recharts LineChart: registrations over days (x=day, y=count), height 160px, dark line
- "Peak registration day: Nov 2" stat below chart
- Bar mini chart: attended vs absent vs not-marked, height 80px
```

---

## PAGE 9 — PROFILE PAGE

```
CODEX PROMPT:

Build the Teacher Profile page at /profile.
Header: title="My Profile" breadcrumb="Profile".

TWO COLUMN LAYOUT (left 35%, right 65%, gap 24px):

LEFT COLUMN — Profile Summary Card:
Background white, border-radius 16px, border var(--border-card), padding 24px, text-align center.

Avatar area:
- 96px circle, gradient background (indigo-to-blue) with white initials inside, font-size 36px bold
- Camera icon overlay button (36px circle, white bg, bottom-right of avatar, shadow, position absolute, CameraIcon 14px)
- Clicking opens file picker for avatar upload

Below avatar:
- Teacher full name bold 20px
- "Faculty" chip: bg #EDE9FE, color #5B21B6, border-radius 100px, 11px, padding 4px 14px
- Department text muted 13px
- Employee ID: "EMP-2024-0142" mono 12px muted
- Email 12px var(--text-secondary) with Mail icon left

Divider.

Stats row (3 items in a mini grid, centered):
- Events Created: number bold 20px + "Events" label 11px muted
- Students Reached: number bold 20px + "Students" label
- Avg Rating: "4.8 ★" bold 20px + "Rating" label

Divider.

"Change Password" link button: outlined, full width, 36px, Lock icon, border-radius 10px.

RIGHT COLUMN — Editable Profile Form:
Background white, border-radius 16px, border var(--border-card), padding 24px.

Header row: "Personal Information" bold 16px + "Edit Profile" button top-right (Pencil icon, outlined, 36px, border-radius 10px). Clicking toggles edit mode.

In VIEW mode (default): fields are read-only, displayed as label+value rows.
In EDIT mode: fields become inputs (same input style as admin portal forms).

Fields:
- Full Name (text input / display)
- Employee ID (read-only always, gray)
- Department (dropdown / display)
- Email (read-only always — from Cognito)
- Phone Number (text input / display, optional)
- Date of Birth (date picker / display, optional)
- Specialization / Subject Area (text input / display)
- Bio (textarea 80px / display) — short bio shown on event cards as organizer

In edit mode: "Save Changes" (filled #1A1A2E) + "Cancel" buttons appear at bottom.

BELOW THE FORM — "Notification Preferences" card:
Background white, border-radius 16px, padding 20px 24px, border var(--border-card).
Title: "Notification Preferences" bold 15px.

Toggle rows (each: label + description below + toggle right):
1. "Event Registration Alerts" — "Get notified when students register for your events"
2. "Staff Invite Notifications" — "Receive notifications when invited to coordinate events"
3. "Attendance Reminders" — "Remind me to mark attendance after event ends"
4. "Event Approval Updates" — "Notify when admin approves or rejects my events"
5. "Weekly Summary Email" — "Receive a weekly digest of event performance"

Toggle style: 44x24px, ON = #1A1A2E bg, OFF = #D1D5DB, white circle thumb.
"Save Preferences" button: filled #1A1A2E, 40px, full width, margin-top 16px.
```

---

## PAGE 10 — SETTINGS PAGE

```
CODEX PROMPT:

Build the Settings page at /settings.
Header: title="Settings" breadcrumb="Settings".

IDENTICAL structure to Admin Portal Settings page:
TWO COLUMN LAYOUT — left 220px sub-nav, right flex:1 content, gap 24px.

LEFT SUB-NAV (white card, border-radius 16px, padding 8px, border var(--border-card)):
Items (height 40px, border-radius 8px, padding 0 14px, gap 10px, icon + label):
1. General         → Settings icon
2. Notifications   → Bell icon
3. Privacy         → Shield icon
4. Appearance      → Palette icon

Active: bg #1A1A2E, white. Others: var(--text-secondary), hover bg var(--bg-card-alt).
Controlled by useState tab switching.

RIGHT CONTENT (white card, border-radius 16px, padding 28px, border var(--border-card)):

━━━ GENERAL TAB ━━━
Title: "General Settings" bold 18px + subtitle "Manage your account and portal preferences." muted 13px.
Divider.
Fields (same form style as admin portal, labels + inputs):
- Display Name (text input)
- Language (dropdown: English, Hindi, Tamil — English selected)
- Timezone (dropdown: Asia/Kolkata)
- Date Format (dropdown: DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD)
- "Show my name on public event listings" — toggle switch
Save Changes button right-aligned.

━━━ NOTIFICATIONS TAB ━━━
Title: "Notification Settings".
"Email Notifications" section heading (12px uppercase muted).
Same toggle rows as Profile page notification preferences (mirrored here too).
"In-App Notifications" section heading.
Toggles:
- Show notification bell badge
- Sound for new notifications (toggle)
- Desktop notifications (toggle + "Allow" button if permission not granted)

━━━ PRIVACY TAB ━━━
Title: "Privacy Settings".
Toggles:
- "Show my profile to other teachers" (default ON)
- "Allow admins to see my event drafts" (default OFF)
- "Share attendance data with institution analytics" (default ON)

"Download My Data" section: description + "Request Data Export" outlined button.
"Delete Account" danger zone: red dashed border box + "Delete My Account" red button + warning text.

━━━ APPEARANCE TAB ━━━
Title: "Appearance".
Theme selector (two cards side by side):
- Light: white card, light gray mockup bars, "Light" label below, border on selected
- Dark (coming soon): dark card, "Dark" label, "Coming Soon" amber chip overlay, disabled
Density selector (three options):
- Comfortable (default) — more spacing
- Compact — tighter spacing
(Radio style selection, same as role cards in admin portal)
"Apply" button right aligned.
```

---

## 🧩 COMPONENT REUSE PLAN

These components are built ONCE and used across multiple pages:

| Component | Used In |
|-----------|---------|
| `EventCard.jsx` | My Events, Browse Events |
| `EventsGrid.jsx` | My Events, Browse Events |
| `CreateEventDrawer.jsx` | My Events (create), Event Detail (duplicate) |
| `EventSummaryBar.jsx` | Students Page, Attendance Page |
| `AttendanceSummaryCard.jsx` | Attendance (both modes) |
| `StudentRow.jsx` | Students table + Attendance list |
| `CalendarWidget.jsx` | Dashboard (reused from admin) |
| `StatCard.jsx` | Dashboard |
| `Toast.jsx` | All pages |
| `SendEmailModal.jsx` | Students Page, Event Detail |

---

## 🔄 DATA FLOW EXPLANATION FOR CODEX

```
mockData.js exports:

mockEvents[]         → events created by THIS teacher (for My Events)
allEvents[]          → ALL approved events in system (for Browse Events)
myStudents{}         → map of event_id → students[] (for Students Page)
                       each student: { id, name, email, rollNo, dept, registeredAt, status }
myAttendance{}       → map of event_id → attendance[] (marks after submission)
                       each mark: { studentId, status: 'present'|'absent' }
staffInvites[]       → pending invites for this teacher to join as coordinator
pendingAttendance[]  → event IDs where attendance not yet marked

KEY RULE: myStudents and myAttendance are NEVER exported to admin portal mockData.
They exist only in teacher portal's mockData.js.
```

---

## 📋 MOCK DATA NEEDED

```javascript
// teacher portal: src/data/mockData.js

export const teacherProfile = {
  id: 'T001',
  name: 'Rahul Sharma',
  email: 'rahul.sharma@lpu.edu.in',
  department: 'Computer Science Engineering',
  empId: 'EMP-2024-0142',
  specialization: 'Machine Learning & AI',
  bio: 'Assistant Professor with 6 years experience in AI and Data Science.',
  avatar: null  // use initials
};

export const myEvents = [
  // 5 approved, 3 pending, 2 draft, 2 completed — total 12
  // same shape as admin mockEvents
];

export const allEvents = [
  // 24 events — mix of admin-created and teacher-created
  // teacher's own events are included but show "You created this" badge
];

export const myStudents = {
  'event-id-1': [
    { id: 'S001', name: 'Priya Patel', email: 'priya.patel@lpu.edu.in', rollNo: '12009876', dept: 'CSE', registeredAt: '2024-11-01 10:23', status: 'registered' },
    { id: 'S002', name: 'Arjun Singh', email: 'arjun.singh@lpu.edu.in', rollNo: '12009877', dept: 'ECE', registeredAt: '2024-11-01 11:05', status: 'registered' },
    // ... 68 students total for event 1
  ],
  'event-id-2': [ /* ... */ ]
};

export const attendanceData = {
  'event-id-1': {
    status: 'submitted',  // 'not_started' | 'in_progress' | 'submitted'
    submittedAt: '2024-11-08 07:00 PM',
    marks: [
      { studentId: 'S001', status: 'present' },
      { studentId: 'S002', status: 'absent' },
    ]
  }
};

export const staffInvites = [
  { id: 'INV001', eventId: 'EV010', eventTitle: 'Tech Summit 2025', hostName: 'Dr. Aisha Kumar', date: 'Dec 15, 2025', status: 'pending' }
];

export const pendingAttendanceEvents = ['event-id-3', 'event-id-4'];
```

---

## 🔢 CODEX BUILD ORDER

Run these prompts in this exact sequence:

1. **Mock Data** — create src/data/mockData.js first
2. **Project Bootstrap** — Vite + React + same packages as admin + same index.css
3. **Sidebar** — teacher-specific nav items
4. **Header** — copy from admin, no changes
5. **Dashboard** — most complex page, sets the visual tone
6. **EventCard + EventsGrid** — reusable, needed by My Events and Browse Events
7. **My Events Page** — uses EventCard + CreateEventDrawer
8. **Browse Events Page** — uses same grid, different tab logic + join action
9. **Event Detail Full Page** — rich detail with stats + staff management
10. **Registered Students Page** — table with private student data
11. **Attendance Marking Page** — most complex interaction
12. **Profile Page**
13. **Settings Page**
14. **Final wiring** — routing, page transitions, toast notifications, responsive

---

## 📌 BETWEEN EVERY CODEX PROMPT, ADD THIS LINE

> "Maintain the exact same colour palette from index.css CSS variables. All cards use bg var(--bg-card) white. Page background is var(--bg-main) #F5F0E8 warm cream. Sidebar is var(--bg-sidebar) #1A1A2E dark navy. Do not introduce any new colours. Font is Sora throughout."

---

## 🎨 COLOUR CHEATSHEET

| Token | Hex | Usage |
|-------|-----|-------|
| `--bg-sidebar` | `#1A1A2E` | Sidebar |
| `--bg-main` | `#F5F0E8` | Page background |
| `--bg-card` | `#FFFFFF` | All cards |
| `--bg-card-alt` | `#FAF7F2` | Hover, alt rows |
| `--text-primary` | `#1A1A2E` | Headings |
| `--text-secondary` | `#6B7280` | Body text |
| `--text-muted` | `#9CA3AF` | Hints, timestamps |
| `--accent-green` | `#4CAF82` | Present, approved |
| `--accent-red` | `#EF4444` | Absent, rejected |
| `--accent-amber` | `#F59E0B` | Pending, warning |
| `--accent-blue` | `#3B82F6` | Links, info |
| `--border-light` | `#E8E2D9` | All borders |
| `--border-card` | `#F0EBE3` | Card borders |

---

## ✅ TEACHER PORTAL FEATURE CHECKLIST

- [x] Login (shared with admin auth, Cognito group = Teachers)
- [x] Dashboard with 4 KPI cards, upcoming events, staff invites, attendance pending, calendar
- [x] My Events — card grid with hover actions, status tabs, create drawer
- [x] Browse Events — all system events, join as staff coordinator
- [x] Event Detail — full page with stats, staff management, quick actions
- [x] Registered Students — private student name+email table (teacher-only)
- [x] Attendance Marking — present/absent toggle per student + QR scanner mode
- [x] Profile — editable profile + notification preferences
- [x] Settings — general, notifications, privacy, appearance tabs
- [x] Toast notifications across all actions
- [x] Responsive sidebar drawer on mobile
- [x] Page transitions (same fade-in as admin portal)
- [x] Consistent Eventopia-inspired UI throughout
