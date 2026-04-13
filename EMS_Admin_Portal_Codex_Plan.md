# EMS Admin Portal — Complete Codex Build Plan
## Inspired by Eventopia UI · Exact Colour Palette · Multi-Page React App

---

## 🎨 DESIGN SYSTEM (Reference this in EVERY prompt)

### Colour Palette (Exact — match the screenshot)

```css
:root {
  /* Backgrounds */
  --bg-sidebar:       #1A1A2E;   /* dark navy/near-black sidebar */
  --bg-main:          #F5F0E8;   /* warm off-white/cream main area */
  --bg-card:          #FFFFFF;   /* white cards */
  --bg-card-alt:      #FAF7F2;   /* slightly warm white for alt cards */

  /* Text */
  --text-primary:     #1A1A2E;   /* dark navy — headings */
  --text-secondary:   #6B7280;   /* medium gray — subtext, labels */
  --text-muted:       #9CA3AF;   /* light gray — timestamps, hints */
  --text-sidebar:     #FFFFFF;   /* white text on sidebar */
  --text-sidebar-muted: #9B9BB4; /* muted text on sidebar */

  /* Accent */
  --accent-primary:   #1A1A2E;   /* dark navy — primary buttons, active states */
  --accent-green:     #4CAF82;   /* green — positive trends */
  --accent-red:       #EF4444;   /* red — negative trends, danger */
  --accent-amber:     #F59E0B;   /* amber — warnings, pending */
  --accent-blue:      #3B82F6;   /* blue — info, links */

  /* Borders */
  --border-light:     #E8E2D9;   /* warm light border */
  --border-card:      #F0EBE3;   /* subtle card border */

  /* Sidebar specific */
  --sidebar-active-bg: rgba(255,255,255,0.12);
  --sidebar-hover-bg:  rgba(255,255,255,0.07);

  /* Chart colours (match Eventopia) */
  --chart-bar:        #1A1A2E;   /* dark bars */
  --chart-line:       #E8E2D9;   /* light line over bars */
  --chart-donut-1:    #1A1A2E;   /* Students — black */
  --chart-donut-2:    #9B9BB4;   /* General — gray */
  --chart-donut-3:    #E8E2D9;   /* VIP — cream */

  /* Shadows */
  --shadow-card:      0 2px 12px rgba(26,26,46,0.06);
  --shadow-sidebar:   4px 0 24px rgba(26,26,46,0.15);
}
```

### Typography

```css
/* Font stack */
font-family: 'Sora', 'DM Sans', sans-serif;

/* Sizes */
--font-xs:   11px;
--font-sm:   12px;
--font-base: 14px;
--font-md:   15px;
--font-lg:   18px;
--font-xl:   22px;
--font-2xl:  28px;

/* Weights */
--fw-regular: 400;
--fw-medium:  500;
--fw-semibold: 600;
--fw-bold:    700;
```

### Layout

```
Sidebar width:      220px (fixed, dark)
Header height:      64px (white/cream, top of main area)
Main content:       calc(100vw - 220px), background var(--bg-main)
Card border-radius: 16px
Input border-radius: 10px
Button border-radius: 10px
Card padding:       20px 24px
Section gap:        20px
```

---

## 📁 PROJECT STRUCTURE TO TELL CODEX

```
src/
├── components/
│   ├── layout/
│   │   ├── Sidebar.jsx
│   │   ├── Header.jsx
│   │   └── Layout.jsx
│   ├── ui/
│   │   ├── StatCard.jsx
│   │   ├── EventCard.jsx
│   │   ├── Badge.jsx
│   │   ├── Modal.jsx
│   │   ├── Table.jsx
│   │   └── Calendar.jsx
│   └── charts/
│       ├── BarLineChart.jsx
│       └── DonutChart.jsx
├── pages/
│   ├── Dashboard.jsx
│   ├── Events.jsx
│   ├── EventApproval.jsx
│   ├── Users.jsx
│   ├── Analytics.jsx
│   ├── Notifications.jsx
│   └── Settings.jsx
├── App.jsx
├── main.jsx
└── index.css
```

---

## PROMPT 1 — PROJECT BOOTSTRAP + DESIGN SYSTEM

```
Create a React + Vite project for an Event Management System Admin Portal called "EMS".

Install these packages:
- react-router-dom (routing)
- recharts (charts)
- lucide-react (icons)
- @fontsource/sora (typography)

Set up src/index.css with this exact CSS variables design system:

:root {
  --bg-sidebar: #1A1A2E;
  --bg-main: #F5F0E8;
  --bg-card: #FFFFFF;
  --bg-card-alt: #FAF7F2;
  --text-primary: #1A1A2E;
  --text-secondary: #6B7280;
  --text-muted: #9CA3AF;
  --text-sidebar: #FFFFFF;
  --text-sidebar-muted: #9B9BB4;
  --accent-primary: #1A1A2E;
  --accent-green: #4CAF82;
  --accent-red: #EF4444;
  --accent-amber: #F59E0B;
  --accent-blue: #3B82F6;
  --border-light: #E8E2D9;
  --border-card: #F0EBE3;
  --sidebar-active-bg: rgba(255,255,255,0.12);
  --sidebar-hover-bg: rgba(255,255,255,0.07);
  --shadow-card: 0 2px 12px rgba(26,26,46,0.06);
  --font-base: 14px;
  --radius-card: 16px;
  --radius-input: 10px;
}

* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Sora', sans-serif; background: var(--bg-main); color: var(--text-primary); font-size: var(--font-base); }

Set up React Router with routes for: /dashboard, /events, /events/approval, /users, /analytics, /notifications, /settings.
Create a Layout component that wraps all pages with Sidebar + Header. All routes render inside the Layout.
```

---

## PROMPT 2 — SIDEBAR COMPONENT

```
Build a Sidebar component for the EMS Admin Portal. Exact specs:

Dimensions: 220px wide, full viewport height, fixed position left, background var(--bg-sidebar) (#1A1A2E dark navy).

TOP SECTION — Logo area (padding 24px 20px):
- A small rounded square logo icon (dark bg with a white "G"-like brand mark similar to the Eventopia "G" logo) 16x16px, placed in a circle/rounded container
- "EMS" text next to it in white, font-weight 700, font-size 16px
- Subtitle: "Event Manager" in var(--text-sidebar-muted), font-size 11px, below the logo+name row

NAVIGATION SECTION — label "Menu" in var(--text-sidebar-muted), font-size 11px, font-weight 600, uppercase, letter-spacing 0.08em, margin 24px 20px 8px:

Nav items (each 40px height, margin 2px 0, border-radius 10px, padding 0 12px):
1. Dashboard — LayoutDashboard icon from lucide-react
2. Events — CalendarDays icon
3. Attendee Insights — BarChart2 icon

Each nav item: icon (18px, left), label text (14px, font-weight 500). 
Active state: background var(--sidebar-active-bg), text white, icon white.
Inactive state: text var(--text-sidebar-muted), icon same.
Hover state: background var(--sidebar-hover-bg).
Use NavLink from react-router-dom to auto-apply active class.

GENERAL SECTION — same label style "General", items:
4. Settings — Settings icon → /settings
5. Help — HelpCircle icon → /help  
6. Logout — LogOut icon → /logout (red color on hover)

BOTTOM SECTION — Download App promo card (margin 16px, padding 16px, background rgba(255,255,255,0.08), border-radius 12px):
- Small "G" brand icon top left with "Download Our Mobile App" text bold white 12px
- Two small play/download icon chips below
- Description text: "Get another easy way" in muted, 11px
- "Download Now" button: full width, background rgba(255,255,255,0.15), white text, 10px border-radius, 8px padding, 12px font-size

Overall sidebar: no scrollbar visible, use flex column with justify-space-between.
```

---

## PROMPT 3 — HEADER COMPONENT

```
Build a Header component for the EMS Admin Portal. Exact specs:

Dimensions: full width of main area (calc(100vw - 220px)), height 64px, background var(--bg-card) white, border-bottom 1px solid var(--border-light). Sticky top.
Padding: 0 28px. Display flex, align-items center, justify-content space-between.

LEFT SECTION:
- Breadcrumb line above title: "Dashboard" text in var(--text-muted), font-size 11px (this updates per page)
- Page title: "Dashboard" in var(--text-primary), font-size 20px, font-weight 700 (updates per page)
- These are stacked vertically in a div, gap 1px

CENTER SECTION:
- Search bar: width 320px, height 38px, background var(--bg-card-alt), border 1px solid var(--border-light), border-radius var(--radius-input)
- Inside: Search icon (lucide, 15px, var(--text-muted)) on left with padding-left 12px, input field (no border, bg transparent, font-size 13px, color var(--text-primary), placeholder "Search..." in muted), padding-right 12px
- Subtle focus ring: border-color var(--accent-blue) on focus

RIGHT SECTION (flex row, gap 12px, align-items center):
- Mail icon button: 38x38px, background var(--bg-card-alt), border 1px solid var(--border-light), border-radius 10px, Mail icon from lucide, 17px, var(--text-secondary). Hover: bg var(--border-light).
- Bell icon button: same style, Bell icon. Has a red notification dot (8px circle, #EF4444, top-right of button, position absolute).
- User profile chip: height 38px, background var(--bg-card-alt), border 1px solid var(--border-light), border-radius 10px, padding 0 12px 0 6px, flex row, gap 8px, align-items center:
  - Avatar: 28px circle, real user photo or gradient placeholder with initials "SD"
  - Name: "Shareef Deen" in var(--text-primary), font-size 13px, font-weight 600
  - Email: "shareef20@gmail.com" in var(--text-muted), font-size 11px
  - ChevronDown icon 14px

Accept a `title` and `breadcrumb` prop so each page can set its own title.
```

---

## PROMPT 4 — DASHBOARD PAGE

```
Build the Dashboard page for the EMS Admin Portal. This is the main page at /dashboard. Use the Layout (Sidebar + Header). Header title="Dashboard" breadcrumb="Dashboard".

The main content area has padding 24px 28px, background var(--bg-main).

LAYOUT: CSS Grid. Two columns: left (flex:1) and right (380px fixed). Gap 20px.

LEFT COLUMN (top to bottom):

1. STAT CARDS ROW — three cards side by side, each equal width, height 100px, background var(--bg-card), border-radius var(--radius-card), border 1px solid var(--border-card), padding 20px, box-shadow var(--shadow-card):
   Card 1 — Total Events:
   - Top row: icon in a 36px rounded square (background #F0EBE3, CalendarDays icon var(--text-primary) 18px), title "Total Events" var(--text-secondary) 12px
   - Big number "21" var(--text-primary) 28px font-weight 700
   - Trend chip: "↓ 9%" in var(--accent-red) + " vs last month" in var(--text-muted) 11px
   Card 2 — Tickets Sold:
   - Ticket icon background #E8F5EE
   - Number "94", trend "↑ 1%" in var(--accent-green)
   Card 3 — Upcoming Events:
   - Calendar/Clock icon background #FEF3CD
   - Number "19", trend "↓ 7%" in var(--accent-red)

2. REVENUE BREAKDOWN CHART CARD — background var(--bg-card), border-radius var(--radius-card), padding 20px 24px, border 1px solid var(--border-card):
   - Header row: "Revenue Breakdown" bold 15px left, "see details" link var(--accent-blue) 12px right
   - Chart: Recharts ComposedChart, height 220px. X axis: Jan through Dec labels, 11px var(--text-muted). Y axis: $50k, $100k, $150k, $200k labels. No grid lines visible or very faint.
   - Bar series: fill var(--chart-bar) = #1A1A2E, bar width ~24px, border-radius top 4px
   - Line series: stroke #C8C0B4 (cream/warm gray), strokeWidth 2, dot: false, smooth curve overlay on top of bars
   - No legend needed. Tooltip styled: white bg, dark text, border var(--border-card), border-radius 8px

3. UPCOMING EVENTS SECTION — header row: "Upcoming Events" bold 15px left, "More" link var(--accent-blue) 12px right. Below: two columns side by side:
   Left (event cards, flex column, gap 10px):
   Card style — border-radius 12px, overflow hidden, position relative, height 90px:
   - Background image (dark overlay on top of photo)
   - "About" chip top right: white bg, dark text, 10px font, border-radius 6px, padding 3px 8px
   - Bottom overlay (gradient dark): event title white bold 13px, date row (calendar icon 10px + date text 11px), location (pin icon + location text 11px), price chip (e.g., "$10/ticket" white small chip)
   Two event cards:
   - "Food Exhibition" — Nov 8, 9:00 PM, Kandy, $10/ticket
   - "AI Make us Better" — Nov 8, 9:00 AM, Colombo St, $20/ticket

   Right (Map): border-radius 12px, overflow hidden, height 190px. Show a static map image placeholder (gray-green map background with location pin). Caption: "Food Exhibition" marker on map. Use a placeholder div styled as a map with: background: linear-gradient(135deg, #c8d8a8 0%, #a8c890 50%, #88b878 100%), an SVG pin icon in center.

RIGHT COLUMN (top to bottom):

1. TICKET SUMMARY CARD — background var(--bg-card), border-radius var(--radius-card), padding 20px 24px, border 1px solid var(--border-card):
   - Title "Ticket Summary" bold 15px
   - Recharts DonutChart centered, height 200px, inner radius 55, outer radius 85:
     - Students: 50% → #1A1A2E
     - General: 30% → #9B9BB4  
     - VIP: 20% → #E8E2D9
   - Labels outside the chart: "50%" top-right, "30%" bottom, "20%" top-left connected with thin lines (leader lines)
   - Legend below chart: three rows with colored dot (10px circle), label, right-aligned nothing
   - Stats grid below legend (3 rows):
     Row 1: ticket icon + "Total Ticket Sold" + "1800" bold right
     Row 2: money icon + "Total Revenue" + "$5,480" bold right
     Row 3: chart icon + "Conversation Rate" + "10%" bold right
     Each row: height 36px, border-top 1px solid var(--border-card), font-size 12px

2. CALENDAR CARD — background var(--bg-card), border-radius var(--radius-card), padding 20px 24px, border 1px solid var(--border-card):
   - Header row: "October 29, 2025" bold 13px left, prev/next arrow buttons (ChevronLeft, ChevronRight from lucide, 16px, circular 28px buttons, bg var(--bg-card-alt), border var(--border-card)) right
   - "Today" label var(--text-muted) 12px below date
   - Calendar grid: 7 columns (Sun Mon Tue Wed Thu Fri Sat)
     - Day headers: 3-letter abbreviated, var(--text-muted) 11px, font-weight 600
     - Day cells: 32x32px, centered, 13px font, var(--text-primary)
     - Today (29): filled circle background var(--accent-primary) = #1A1A2E, white text, font-weight 700
     - Hover state on days: background var(--bg-card-alt), border-radius 50%
     - Days outside current month (grayed out): var(--text-muted)
   - Full interactive calendar — clicking prev/next changes month, state managed with useState
```

---

## PROMPT 5 — EVENTS LIST PAGE

```
Build the Events page for the EMS Admin Portal at route /events. Header title="Events" breadcrumb="Events".

Main content padding 24px 28px.

TOP BAR — flex row, justify-content space-between, margin-bottom 20px:
Left: "All Events" h2, 20px bold, var(--text-primary). Below it: "156 events total" in var(--text-muted) 12px.
Right: flex row gap 10px:
- Search input (240px, same style as header search bar)
- Filter dropdown "Status: All" (select-style, height 38px, border var(--border-light), border-radius var(--radius-input), background var(--bg-card), font-size 13px, padding 0 12px, ChevronDown icon)
- Filter dropdown "Type: All" — same style
- Filter dropdown "Department: All" — same style
- "Export CSV" button: height 38px, background var(--bg-card), border 1px solid var(--border-light), border-radius var(--radius-input), font-size 13px, padding 0 16px, Download icon left, var(--text-primary)
- "Create Event" button: height 38px, background var(--accent-primary) = #1A1A2E, color white, border-radius var(--radius-input), font-size 13px, font-weight 600, padding 0 16px, Plus icon left

EVENTS TABLE CARD — background var(--bg-card), border-radius var(--radius-card), border 1px solid var(--border-card), overflow hidden:

Table header row: background var(--bg-card-alt), height 44px, border-bottom 1px solid var(--border-light). Font 11px, font-weight 600, var(--text-secondary), uppercase, letter-spacing 0.06em.
Columns: ☐ | Event | Type | Created By | Date | Capacity | Status | Actions

Table rows: height 68px, border-bottom 1px solid var(--border-card), hover background var(--bg-card-alt). Font-size 13px.

Row data:
- Checkbox column: 20px checkbox, styled with accent colour when checked
- Event column: poster thumbnail (40x40px, border-radius 8px, object-fit cover) + event name bold 13px + department chip (small, var(--bg-card-alt) background, 10px text)
- Type column: small chip badge — background tint + dark text, border-radius 6px, padding 3px 10px, 11px font. Workshop=blue tint, Seminar=purple tint, Cultural=amber tint
- Created By: avatar 24px circle + name 13px
- Date: "Nov 8, 2024" 13px + "9:00 PM" in var(--text-muted) 11px below
- Capacity: "42/100" with a thin progress bar below (6px height, border-radius 3px, background var(--border-light), fill var(--accent-primary))
- Status badge: pill shape, 24px height, 11px font, font-weight 600:
  - Pending Approval: background #FEF3CD, color #92400E
  - Approved: background #D1FAE5, color #065F46
  - Rejected: background #FEE2E2, color #991B1B
  - Draft: background #F3F4F6, color #374151
  - Completed: background #DBEAFE, color #1E40AF
- Actions column: icon buttons, 30x30px each, border-radius 8px, background var(--bg-card-alt), gap 6px:
  - Eye icon (view) — hover blue
  - Pencil icon (edit) — hover amber
  - CheckCircle icon (approve, only for pending) — hover green
  - XCircle icon (reject, only for pending) — hover red
  - Trash icon (delete, only for draft) — hover red

PAGINATION ROW — padding 16px 20px, border-top 1px solid var(--border-light), flex row justify-between:
Left: "Showing 1–20 of 156 events" var(--text-muted) 13px
Right: page buttons — prev/next arrows + page number chips (32x32px, border-radius 8px). Active page: background var(--accent-primary), white text. Others: background var(--bg-card-alt), var(--text-primary) on hover.

Populate with 8-10 realistic mock event rows.
```

---

## PROMPT 6 — EVENT APPROVAL PAGE

```
Build the Event Approval page for the EMS Admin Portal at /events/approval. Header title="Event Approvals" breadcrumb="Events / Approvals".

This page focuses exclusively on events pending admin approval. Split layout.

TOP SUMMARY BAR — 3 stat chips in a row, each: background var(--bg-card), border-radius 10px, padding 10px 18px, border 1px solid var(--border-card), font-size 13px:
- "⏳ Pending Review: 8" — amber dot
- "✅ Approved Today: 3" — green dot  
- "❌ Rejected Today: 1" — red dot

MAIN LAYOUT — two columns, gap 20px:

LEFT COLUMN (flex: 1) — Pending Events List:
Card: background var(--bg-card), border-radius var(--radius-card), border 1px solid var(--border-card).
Card header: padding 16px 20px, border-bottom 1px solid var(--border-light): "Pending Approvals" bold 15px + count badge (orange pill "8").
List items — each item is a row, padding 16px 20px, border-bottom 1px solid var(--border-card), cursor pointer, hover background var(--bg-card-alt). Selected item: left border 3px solid var(--accent-primary), background var(--bg-card-alt).

Each list item layout (flex row, gap 12px):
- Poster thumbnail: 52x52px, border-radius 8px, object-fit cover
- Content (flex column):
  - Event title bold 14px var(--text-primary)
  - Teacher name var(--text-secondary) 12px + department chip small
  - Date row: calendar icon 11px + date text 12px var(--text-muted)
- Right side: Submitted time "2h ago" var(--text-muted) 11px

RIGHT COLUMN (420px fixed) — Event Detail & Approval Panel:
Card: background var(--bg-card), border-radius var(--radius-card), border 1px solid var(--border-card). Sticky.

When an event is selected from the left list, show:

POSTER SECTION: full width image, height 180px, border-radius 12px 12px 0 0, object-fit cover, dark overlay gradient bottom. On overlay: type chip, title bold white 18px, date white 13px.

DETAIL SECTION (padding 20px):
"Event Details" heading 13px uppercase var(--text-secondary) letter-spacing 0.08em, margin-bottom 12px.

Info grid (2 columns, gap 8px):
Each detail item: label (11px uppercase var(--text-muted)) on top, value (13px bold var(--text-primary)) below. Items: Organizer, Department, Date & Time, Venue, Max Capacity, Registration Deadline.

Divider line.

"Description" heading same style.
Description text: 13px var(--text-secondary) line-height 1.6, max 4 lines, "Show more" link if overflow.

Tags row: chip badges for event tags.

TEACHER INFO ROW — flex row, gap 10px, padding 12px, background var(--bg-card-alt), border-radius 10px, margin 12px 0:
Teacher avatar 36px circle + name bold 13px + department 11px muted + "View Profile" link blue 11px right.

APPROVAL ACTIONS — two full-width buttons stacked, gap 8px:
1. "✓ Approve Event" button: height 44px, background var(--accent-primary) = #1A1A2E, white, font-weight 600, border-radius var(--radius-input), full width. Hover: background #2D2D4A.
2. "✕ Reject Event" button: height 44px, background white, border 1.5px solid var(--accent-red), color var(--accent-red), font-weight 600, border-radius var(--radius-input), full width. Hover: background #FEF2F2.

REJECT MODAL — appears when Reject is clicked. Overlay (rgba(0,0,0,0.4) backdrop, blur 4px). Modal card 440px wide, centered, background var(--bg-card), border-radius 16px, padding 28px:
- XCircle icon 32px var(--accent-red) centered top
- "Reject Event" h3 centered 18px bold
- Event name in muted text centered 13px
- "Rejection Reason *" label 12px font-weight 600
- Textarea: 100% width, 100px height, border 1px solid var(--border-light), border-radius var(--radius-input), padding 10px 12px, font-size 13px, resize vertical. Focus: border var(--accent-primary).
- Character count "0/300" right aligned 11px muted
- Note text: "This reason will be emailed to the teacher." 11px var(--text-muted)
- Two buttons row: "Cancel" (outlined, var(--text-secondary)) + "Submit Rejection" (filled var(--accent-red), white). Both height 40px, border-radius var(--radius-input), font-weight 600.

APPROVE SUCCESS state — after approve: replace action buttons with a green success banner "Event Approved ✓" + move item out of left list.
```

---

## PROMPT 7 — USER MANAGEMENT PAGE

```
Build the User Management page for the EMS Admin Portal at /users. Header title="User Management" breadcrumb="Users".

Main content padding 24px 28px.

TOP BAR — same pattern as events page:
Left: "User Management" h2 + "604 users registered" subtitle.
Right: Search input + "Role" filter dropdown + "Department" filter dropdown + "Status" filter + "Bulk Import CSV" outlined button + "Add User" filled button (var(--accent-primary)).

TAB BAR — below top bar, margin-bottom 20px. Four tabs: All Users | Admins | Teachers | Students. Tab style: height 36px, padding 0 18px, border-radius 8px, font-size 13px font-weight 500. Active tab: background var(--accent-primary) #1A1A2E, white. Inactive: background var(--bg-card), var(--text-secondary), border 1px solid var(--border-card). Show count badge pill on each tab.

USERS TABLE CARD — same card style as events page. Columns:
☐ | User | Role | Department | ID | Status | Joined | Actions

Row data (8-10 mock rows):
- User column: 36px circle avatar (gradient with initials) + name bold 13px + email var(--text-muted) 11px below name
- Role badge:
  - Admin: background #EDE9FE color #5B21B6
  - Teacher: background #DBEAFE color #1E40AF
  - Student: background #D1FAE5 color #065F46
- Department: 13px var(--text-secondary)
- ID: Roll No or Emp ID, mono font 12px var(--text-muted)
- Status: toggle switch component — ON (green #4CAF82 background, white circle), OFF (gray #D1D5DB). Clicking toggles active/inactive.
- Joined: date 12px var(--text-muted)
- Actions: Eye icon (view), Pencil (edit), UserX icon (deactivate) — same style as events actions

ADD USER MODAL — appears when "Add User" clicked. 500px wide, padding 28px:
Title "Add New User" bold 18px + X close button top right.
Form fields (stacked, gap 14px, label 12px fw-600 + input below):
- Full Name (text input, full width)
- Email (email input)
- Role (3 radio cards side by side: Admin | Teacher | Student — each a small card 30% width, centered, icon on top, label below, selected: border var(--accent-primary) 1.5px, background #F8F7FF)
- Department (dropdown)
- Roll No / Emp ID (shows/hides based on role selection, conditional label)
- "Send Invite Email" toggle switch — default ON, label "Send Cognito invitation email to user"
Form footer: Cancel + "Create User" buttons.

USER DETAIL SIDE PANEL — slides in from right (320px) on row click. Background var(--bg-card), border-left 1px solid var(--border-light), padding 24px. X button top right to close.
Content: large avatar 72px, name bold 18px, role badge, department, email muted. Stats row (Events Registered / Events Attended / Feedback Given) for students, (Events Created / Avg Attendance) for teachers. Below: scrollable mini list of recent activity. "Edit Profile" and "Deactivate" buttons at bottom.
```

---

## PROMPT 8 — ANALYTICS PAGE

```
Build the Analytics page for the EMS Admin Portal at /analytics. Header title="Analytics & Reports" breadcrumb="Analytics".

Top bar: "Analytics & Reports" h2 left. Right: Date range selector tabs (This Month | Last 3 Months | Last 6 Months | This Year | Custom) as pill tabs — same style as user page tabs but smaller. Then "Export PDF" and "Export CSV" buttons with download icons.

SECTION 1 — KPI Cards: 4 cards in a row (same style as dashboard stat cards):
- Total Events Hosted: 156 events (↑12% vs last period) — CalendarCheck icon
- Total Registrations: 3,847 students (↑8%) — Users icon
- Avg Attendance Rate: 72% (↓3%) — UserCheck icon
- Most Active Dept: "Computer Science" (48 events) — Trophy icon

SECTION 2 — Two charts side by side:
Left (55%): "Events by Month" — Recharts BarChart. Grouped bars per month (3 bars per month: Seminar=#1A1A2E, Workshop=#9B9BB4, Cultural=#E8C87A). X axis: months. Y axis: count 0-20. Legend below chart as colored dot + label chips. Height 260px. Card wrapper: bg var(--bg-card), border-radius var(--radius-card), padding 20px 24px, header row with title and legend.

Right (45%): "Top 5 Most Registered Events" — Recharts HorizontalBarChart. Each bar: event name on Y axis (12px), count as bar (fill var(--chart-bar)), count label at bar end (bold 12px). Height 260px. Same card wrapper.

SECTION 3 — Two charts side by side:
Left (50%): "Attendance Rate Trend" — Recharts LineChart. Line: stroke #1A1A2E, strokeWidth 2.5, dot: filled circle 4px. A dashed horizontal reference line at 70% labeled "Target" in var(--accent-amber). Height 220px.

Right (50%): "Events by Department" — Recharts PieChart donut (not labeled outside like dashboard, use inner legend instead). Segments: 5 departments, colours: #1A1A2E, #4B5563, #9B9BB4, #E8C87A, #E8E2D9. Custom legend: coloured square + dept name + percentage in a 2-col grid below. Height 220px.

SECTION 4 — "Teacher Performance Table" card: full width. Same table style as events page. Columns: Teacher | Department | Events Created | Total Registrations | Avg Attendance Rate | Last Event. Sort icon on column headers.

SECTION 5 — "Feedback Summary" card: full width. Columns: Event Name | Avg Rating (star display using filled/half/empty star icons, yellow) | Total Responses | Top Comment (italic, truncated 60 chars, var(--text-secondary)).
```

---

## PROMPT 9 — NOTIFICATIONS PAGE

```
Build the Notifications page for the EMS Admin Portal at /notifications. Header title="Notifications" breadcrumb="Notifications".

TWO COLUMN LAYOUT (left 55%, right 45%, gap 20px):

LEFT COLUMN:

1. SEND BROADCAST CARD — background var(--bg-card), border-radius var(--radius-card), border 1.5px solid var(--accent-blue), padding 24px:
Title row: Send icon (Megaphone from lucide) in a 36px blue tinted circle + "Send Broadcast Announcement" bold 15px.
Form (gap 14px):
- Title: text input, full width, height 40px
- Message: textarea 120px, resize vertical, full width. Below: character counter right aligned.
- Send To: four radio option cards in 2x2 grid. Each card: 48% width, padding 10px 14px, border-radius 10px, border 1px solid var(--border-card), cursor pointer. Label: icon (Users/GraduationCap/BookOpen/Building2) + text. Selected: border var(--accent-primary) 1.5px, background #F8F7FF.
  - All Users
  - All Students  
  - All Teachers
  - Specific Department (selecting this reveals a multi-select department dropdown below the grid)
- Channels: checkbox row: "📧 Email" checkbox + "🔔 In-App" checkbox (both checked by default). Checkbox style: 16px, accent-color var(--accent-primary).
- Schedule: toggle "Schedule for Later" — OFF by default. When toggled ON, a datetime-picker input slides in below with animation.
- Footer buttons: "Preview" outlined + "Send Announcement" filled var(--accent-primary) 44px height.

2. NOTIFICATION HISTORY CARD — background var(--bg-card), border-radius var(--radius-card), border 1px solid var(--border-card), margin-top 20px:
Header: "Notification History" bold 15px + filter row (Channel dropdown + Status dropdown).
Table (no outer border, rows only): columns: Title | Recipients | Channel chips | Sent At | Status | Actions.
Status badges: Sent=green, Scheduled=amber, Failed=red.
Channel chips: small "Email" chip blue, "In-App" chip purple.
Actions: Eye icon (view), RefreshCw icon (resend), Trash (delete).

RIGHT COLUMN:

IN-APP NOTIFICATIONS PANEL — background var(--bg-card), border-radius var(--radius-card), border 1px solid var(--border-card), sticky top 80px:
Header: Bell icon + "Recent Notifications" bold 15px + "Mark All as Read" blue link 12px right.
List items (each 64px, padding 12px 16px, border-bottom 1px solid var(--border-card)):
- Left: 36px circle icon with color-coded background:
  - Event approved: green bg, CheckCircle white icon
  - New registration: blue bg, UserPlus white icon
  - Event reminder: amber bg, Clock white icon
  - Cancelled: red bg, XCircle white icon
- Center text: notification title bold 13px + description 12px var(--text-secondary) one line
- Right: timestamp 11px var(--text-muted)
- Unread items: background #FAFBFF, left border 3px solid var(--accent-blue)
Show 6-8 mock notifications. "View All" button at bottom center.
```

---

## PROMPT 10 — SETTINGS PAGE

```
Build the Settings page for the EMS Admin Portal at /settings. Header title="Settings" breadcrumb="Settings".

TWO COLUMN LAYOUT (left 220px sub-nav, right flex:1 content, gap 24px):

LEFT — Settings Sub-Navigation:
Card: background var(--bg-card), border-radius var(--radius-card), border 1px solid var(--border-card), padding 8px.
Nav items (height 40px, border-radius 8px, padding 0 14px, gap 10px, flex row align-center):
- General (Settings icon)
- Event Categories (Tag icon)  
- Email Templates (Mail icon)
- Security (Shield icon)
Active: bg var(--accent-primary) #1A1A2E, white text. Others: var(--text-secondary) hover bg var(--bg-card-alt).
Use useState to manage active tab (not React Router — same page tab switching).

RIGHT — Settings Content Card: background var(--bg-card), border-radius var(--radius-card), border 1px solid var(--border-card), padding 28px.

GENERAL TAB:
Title: "General Settings" 18px bold + subtitle "Configure your institution's basic settings" 13px muted.
Divider. Form (gap 20px):
- Institution Name: text input + current value "LPU Event Management System"
- Institution Logo: upload area (dashed border, border-radius 10px, 120px height, center-aligned: image-icon + "Click to upload or drag & drop" + "PNG, JPG up to 2MB" muted). If image uploaded, show preview 60x60 with X remove button.
- Academic Year: select dropdown "2024-25"
- Default Registration Deadline: number input + "days before event" suffix label
- Max Capacity Default: number input  
- Timezone: select dropdown (Asia/Kolkata selected)
Save Changes button bottom right: filled var(--accent-primary), 44px, 140px wide.

EVENT CATEGORIES TAB:
Title "Event Categories" + subtitle.
Current tags — flex wrap: each category as a chip (background var(--bg-card-alt), border 1px solid var(--border-card), border-radius 8px, padding 6px 12px, font-size 13px, X button right side in var(--text-muted)). Categories: Seminar, Workshop, Cultural, Sports, Hackathon, Others.
Below: input row: text input 240px + "Add Category" blue button side by side.
Info text: "Drag categories to reorder" with drag icon, var(--text-muted) 12px.

EMAIL TEMPLATES TAB:
Title "Email Templates".
Template selector dropdown full width: options: Registration Confirmation | Event Approval | Event Rejection | 24h Reminder | Event Cancelled | Feedback Request.
Below: two input fields: Subject line (text input, full width) + Body (textarea 200px, monospace font 12px, supports {variable} syntax). 
Variables hint box: light blue background, border-radius 8px, padding 12px 16px: "Available variables:" then chips: {student_name}, {event_title}, {event_date}, {venue}, {teacher_name}, {organizer} — click a chip to insert at cursor.
Footer: "Reset to Default" red text link left + "Save Template" button right.

SECURITY TAB:
Title "Security Settings".
Section: "Access Control" — toggle switches with label + description:
- "Require MFA for Admins" — "Enforce TOTP authenticator for all admin accounts"
- "Email Verification Required" — "Students must verify email before accessing portal"
- "Student Self-Registration" — "Allow students to create accounts independently"
Each toggle: label bold 13px left, description 12px muted below, toggle switch right. Toggle style: 44x24px, border-radius 12px, ON=var(--accent-primary) bg, OFF=var(--border-light) bg, white circle slides.
Divider.
Section: "Session" — Session Timeout (number input + "minutes" label) row.
Divider.
Danger Zone — red dashed border box, padding 16px, border-radius 10px:
"Reset All User Sessions" label bold var(--accent-red) + description 12px var(--text-secondary). Button: "Reset Sessions" — red outlined, 40px.
```

---

## PROMPT 11 — FINAL WIRING + POLISH

```
Final wiring and polish pass for the complete EMS Admin Portal React app.

1. ROUTING — Ensure React Router v6 routes work correctly:
   / → redirect to /dashboard
   /dashboard → Dashboard page
   /events → Events List page
   /events/approval → Event Approval page
   /users → User Management page
   /analytics → Analytics page
   /notifications → Notifications page
   /settings → Settings page
   All routes wrapped in Layout (Sidebar + Header).

2. ACTIVE SIDEBAR LINKS — Sidebar uses NavLink. Ensure /events and /events/approval both highlight the "Events" nav item (use startsWith match).

3. HEADER PAGE TITLES — Each page passes its title/breadcrumb as context or props to Header. Dashboard → "Dashboard", Events → "Events", etc.

4. MOCK DATA — Create a src/data/mockData.js file with:
   - 15 mock events (mix of statuses: pending, approved, rejected, draft, completed)
   - 20 mock users (mix of roles)
   - Monthly revenue data for charts (Jan-Dec)
   - Notification history items (8 items)
   - Attendance trend data (12 months)

5. RESPONSIVE SIDEBAR — add a hamburger menu button (☰) in header on screens < 1024px. Sidebar slides in as an overlay drawer with backdrop click to close. State managed in Layout.

6. SCROLL BEHAVIOUR — Main content area: overflow-y auto, height calc(100vh - 64px). Sidebar: overflow-y auto with custom scrollbar (width 4px, color var(--border-light)).

7. PAGE TRANSITIONS — add a simple fade-in animation on route change:
   @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
   Apply to each page root div: animation: fadeIn 0.25s ease-out.

8. EMPTY STATES — Each table/list should handle empty state gracefully:
   Centered illustration (use a simple SVG or emoji), bold message, subtitle muted text, optional CTA button.

9. BUTTON HOVER STATES — ensure all buttons have proper hover:
   Primary (#1A1A2E): hover → #2D2D4A
   Red: hover → darken 8%
   Outlined: hover → background var(--bg-card-alt)

10. FONT IMPORT — In index.html add:
    <link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700&display=swap" rel="stylesheet">

Verify the entire app compiles and runs without errors. All pages should be navigable via sidebar. The colour palette var(--bg-main) = #F5F0E8 warm cream should be consistent throughout.
```

---

## 🧩 QUICK REFERENCE — HOW TO USE THESE PROMPTS IN CODEX

1. **Start fresh** — open Codex, new project
2. **Run Prompt 1** — project setup + design system (this is the foundation)
3. **Run Prompt 2** — Sidebar
4. **Run Prompt 3** — Header
5. **Run Prompt 4** — Dashboard (test the app renders correctly after this)
6. **Run Prompt 5** — Events List
7. **Run Prompt 6** — Event Approval (most important page)
8. **Run Prompt 7** — User Management
9. **Run Prompt 8** — Analytics
10. **Run Prompt 9** — Notifications
11. **Run Prompt 10** — Settings
12. **Run Prompt 11** — Final wiring + polish

**Between prompts**, always say: *"Maintain the exact colour palette from index.css CSS variables. Do not introduce new colours."*

---

## 🎨 COLOUR CHEATSHEET (print and keep)

| Token | Hex | Usage |
|-------|-----|-------|
| `--bg-sidebar` | `#1A1A2E` | Sidebar background |
| `--bg-main` | `#F5F0E8` | Main area warm cream |
| `--bg-card` | `#FFFFFF` | All cards |
| `--bg-card-alt` | `#FAF7F2` | Hover states, alt rows |
| `--text-primary` | `#1A1A2E` | Headings, bold text |
| `--text-secondary` | `#6B7280` | Labels, body |
| `--text-muted` | `#9CA3AF` | Hints, timestamps |
| `--border-light` | `#E8E2D9` | All borders |
| `--accent-green` | `#4CAF82` | Positive, approved |
| `--accent-red` | `#EF4444` | Danger, rejected |
| `--accent-amber` | `#F59E0B` | Warning, pending |
| `--accent-blue` | `#3B82F6` | Links, info |
| `--chart-bar` | `#1A1A2E` | Chart bars |
| `--chart-donut-1` | `#1A1A2E` | Students segment |
| `--chart-donut-2` | `#9B9BB4` | General segment |
| `--chart-donut-3` | `#E8E2D9` | VIP segment |
