# EMS Admin Portal — Events Tab (Card Grid View)
## Codex Prompt Plan · Exact Eventopia Match · Same Colour Palette

> This document continues the EMS Admin Portal Codex plan.
> All CSS variables, fonts, sidebar, and header are already built from the previous plan.
> These prompts build the `/events` route to match the Eventopia Events screenshot exactly.

---

## WHAT THIS PAGE IS

The Events tab is the main event browsing/management page. It replaces the plain table design with a **card grid layout** — full-bleed event photo cards with category chip, status badge, title, price, date, time, location, and a registration progress bar. It has 3 status tabs (Active / Past / Draft) and filter/view controls at the top.

---

## PROMPT 1 — EVENTS PAGE MAIN STRUCTURE

```
Replace the existing /events page in the EMS Admin Portal React app.

The new Events page uses the same Layout (Sidebar + Header). Header props: title="Event" breadcrumb="Dashboard / Event".

Main content area: padding 20px 24px, background var(--bg-main) = #F5F0E8.

The page has THREE sections stacked vertically:
1. Top controls bar (tabs + filters)
2. Events card grid
3. Pagination (optional, load more style)

Do NOT use a table. This page is entirely card-grid based — matching the Eventopia Events screenshot exactly.

STATE MANAGEMENT (useState):
- activeTab: 'active' | 'past' | 'draft' — default 'active'
- activeCategory: string — default 'All Category'
- activePeriod: string — default 'This Month'
- viewMode: 'grid' | 'list' — default 'grid'
- searchQuery: string
- events: array (from mock data, filtered by tab + category)

Import mock events data from src/data/mockData.js.
Filter events displayed based on activeTab and activeCategory.

Overall structure JSX:
<div className="events-page">
  <TopControlsBar />
  <EventsGrid />          {/* or EventsList depending on viewMode */}
</div>
```

---

## PROMPT 2 — TOP CONTROLS BAR

```
Build the TopControlsBar component for the Events page. It is a single flex row, justify-content space-between, align-items center, margin-bottom 20px. NO card wrapper — it sits directly on the cream background.

LEFT SIDE — Status Tabs (flex row, gap 8px):

Three tab pills. Each pill: height 36px, border-radius 100px (fully rounded), padding 0 16px, font-size 13px, font-weight 600, cursor pointer, transition all 0.2s.

Tab 1 — "Active" with count:
- ACTIVE STATE (default): background #1A1A2E (var(--accent-primary)), color white
- Count badge inline in the pill text: "Active (10)" — the number is inside the pill label itself, not a separate badge
- Exact text style: "Active" normal weight + "(10)" same weight, space between

Tab 2 — "Past" with count:
- INACTIVE STATE: background var(--bg-card) = white, color var(--text-secondary) = #6B7280, border 1px solid var(--border-light) = #E8E2D9
- Text: "Past (19)"

Tab 3 — "Draft" with count:
- INACTIVE STATE: same as Past tab
- Text: "Draft (7)"

Clicking a tab: sets activeTab state, updates which events show in grid. Active tab gets dark fill, inactive tabs get white with border.

RIGHT SIDE — Filter Controls (flex row, gap 10px, align-items center):

Control 1 — Filter icon button:
- 36x36px square, border-radius 10px, background var(--bg-card), border 1px solid var(--border-light)
- SlidersHorizontal icon from lucide-react, 16px, var(--text-secondary)
- Hover: background var(--border-light)

Control 2 — "All Category" dropdown pill:
- Height 36px, border-radius 100px, background var(--bg-card), border 1px solid var(--border-light), padding 0 14px, gap 6px
- Text "All Category" 13px var(--text-primary) font-weight 500
- ChevronDown icon 14px var(--text-muted) right side
- Clicking opens a dropdown menu below with options: All Category, Food & Culinary, Technology, Fashion, Music, Outdoor & Adventure, Health & Fitness. Each option 36px height, padding 0 16px, hover bg var(--bg-card-alt), font-size 13px. Selected option shows checkmark right.
- Dropdown: background white, border-radius 12px, border 1px solid var(--border-light), box-shadow 0 8px 24px rgba(0,0,0,0.10), position absolute, z-index 100, min-width 180px.

Control 3 — "This Month" date period pill:
- Same pill style as category dropdown
- CalendarDays icon 14px left inside pill, then "This Month" text, then ChevronDown
- Dropdown options: Today, This Week, This Month, Last 3 Months, This Year

Control 4 — Grid view toggle button:
- 36x36px, border-radius 10px, background var(--bg-card), border 1px solid var(--border-light)
- LayoutGrid icon from lucide-react, 16px
- ACTIVE (grid mode): background var(--accent-primary) = #1A1A2E, icon white
- Hover: background var(--border-light)
- Clicking sets viewMode = 'grid'

Control 5 — List view toggle button:
- Same size and style as grid button
- AlignJustify icon (or List icon) from lucide-react
- ACTIVE when viewMode = 'list': background #1A1A2E, icon white
- Clicking sets viewMode = 'list'

All dropdowns close when clicking outside (useEffect + document click listener).
```

---

## PROMPT 3 — EVENT CARD COMPONENT

```
Build the EventCard component for the Events page. This is the most detailed component — match the Eventopia screenshot exactly.

Props: event (object with all event fields), onClick (function)

CARD DIMENSIONS & STYLE:
- Width: auto (fills grid column, 4 per row)
- Background: var(--bg-card) = white
- Border-radius: 16px
- Border: 1px solid var(--border-card) = #F0EBE3
- Box-shadow: var(--shadow-card) = 0 2px 12px rgba(26,26,46,0.06)
- Overflow: hidden
- Cursor: pointer
- Transition: transform 0.2s, box-shadow 0.2s
- Hover: transform translateY(-3px), box-shadow 0 8px 24px rgba(26,26,46,0.12)

SECTION 1 — IMAGE AREA (top of card):
- Height: 175px
- Position: relative
- overflow: hidden

Image element:
- Width 100%, height 100%, object-fit cover
- Use realistic placeholder images from https://picsum.photos/400/200?random={id} if no real image

TOP-LEFT CHIP — Category badge:
- Position: absolute, top 10px, left 10px
- Background: rgba(0,0,0,0.55) with backdrop-filter blur(4px)
- Color: white
- Font-size: 10px, font-weight 600
- Padding: 4px 10px, border-radius: 100px
- Text examples: "Food & Culinary", "Technology", "Fashion", "Outdoor & Adventure", "Music", "Health & Fitness"

TOP-RIGHT CHIP — Status badge:
- Position: absolute, top 10px, right 10px
- Active status: background rgba(255,255,255,0.90), color #16A34A (green), font-weight 700, font-size 10px, padding 4px 10px, border-radius 100px
- A small filled green circle dot (6px) before the text "• Active"
- Past status: same style but gray text "#6B7280" and dot color gray, text "• Past"
- Draft status: amber text "#D97706" and dot amber, text "• Draft"
- Pending: amber, "• Pending"

SECTION 2 — CARD BODY (padding 14px 16px 16px):

ROW 1 — Title + Price (flex row, justify-content space-between, align-items flex-start, margin-bottom 10px):
- Title: font-size 15px, font-weight 700, color var(--text-primary) = #1A1A2E, line-height 1.3, max 2 lines (overflow ellipsis with -webkit-line-clamp 2)
- Price: font-size 15px, font-weight 700, color var(--text-primary), white-space nowrap, margin-left 8px
  - Free events: show "Free" in var(--accent-green) = #4CAF82
  - Paid events: show "$10", "$20", "$60" etc in var(--text-primary)
  - Both title and price on same baseline row

ROW 2 — Date (flex row, align-items center, gap 6px, margin-bottom 6px):
- CalendarDays icon from lucide-react: 13px, color var(--text-muted) = #9CA3AF
- Date text: "November 2, 2025" — font-size 12px, color var(--text-secondary) = #6B7280

ROW 3 — Time (flex row, align-items center, gap 6px, margin-bottom 6px):
- Clock icon from lucide-react: 13px, color var(--text-muted)
- Time text: "3:00 PM" — font-size 12px, color var(--text-secondary)

ROW 4 — Location (flex row, align-items center, gap 6px, margin-bottom 14px):
- MapPin icon from lucide-react: 13px, color #EF4444 (red pin, matching Eventopia)
- Location text: "Kandy, Digana Main Hall" — font-size 12px, color var(--text-secondary), white-space nowrap, overflow hidden, text-overflow ellipsis

ROW 5 — Registration Progress Bar:
- Full width, height 6px, background var(--border-light) = #E8E2D9, border-radius 100px
- Fill bar: width = registration percentage (e.g., 55%), background var(--text-primary) = #1A1A2E, border-radius 100px
- Below bar: flex row, justify-content space-between:
  - Left: empty (no label in Eventopia screenshot)
  - Right: percentage text "55%" font-size 11px, font-weight 600, color var(--text-primary)

That's all — no action buttons visible on the card. Clicking the card opens EventDetailModal (built in next prompt).
```

---

## PROMPT 4 — EVENTS GRID LAYOUT

```
Build the EventsGrid component that renders EventCard components in a responsive grid.

Grid style:
- display: grid
- grid-template-columns: repeat(4, 1fr)   ← exactly 4 columns matching the screenshot
- gap: 20px
- width: 100%

Responsive breakpoints:
- Below 1400px: 3 columns
- Below 1024px: 2 columns
- Below 640px: 1 column

The grid renders filteredEvents array (filtered by activeTab + activeCategory from parent state).

EMPTY STATE — when filteredEvents.length === 0:
- Center-aligned, padding 60px 0
- CalendarX icon from lucide-react, 48px, var(--text-muted), margin-bottom 16px
- "No events found" text, 18px bold, var(--text-primary)
- "Try adjusting your filters or create a new event" — 14px var(--text-muted), margin-bottom 20px
- "Create Event" button: filled var(--accent-primary), height 40px, padding 0 20px, border-radius 10px

LOADING STATE — show a skeleton grid (4 columns, 8 cards):
Each skeleton card: same dimensions as EventCard, background var(--bg-card), border-radius 16px, overflow hidden.
- Image placeholder: height 175px, background linear-gradient(90deg, #F0EBE3 25%, #E8E2D9 50%, #F0EBE3 75%), background-size 200% 100%, animation shimmer 1.5s infinite
- Body: padding 14px 16px, three skeleton lines (height 12px, border-radius 6px, same shimmer animation, widths 80%, 60%, 90%, gap 8px between)

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

Simulate loading: useState isLoading = true for 800ms on mount, then set false.
```

---

## PROMPT 5 — EVENT DETAIL MODAL

```
Build the EventDetailModal component. Opens when an EventCard is clicked.

OVERLAY: position fixed, inset 0, background rgba(0,0,0,0.45), backdrop-filter blur(6px), z-index 200, flex center.
Clicking overlay (not modal) closes it.

MODAL CARD:
- Width: 780px, max-width: calc(100vw - 40px)
- Max-height: 90vh, overflow-y: auto
- Background: var(--bg-card) = white
- Border-radius: 20px
- Box-shadow: 0 24px 64px rgba(26,26,46,0.20)
- Position: relative
- Animation: scale from 0.95 + opacity 0 to 1 + opacity 1, duration 0.2s ease-out

CLOSE BUTTON:
- Position absolute, top 16px, right 16px
- 34x34px circle, background rgba(0,0,0,0.06), hover rgba(0,0,0,0.12)
- X icon (lucide X), 16px, var(--text-secondary)
- z-index 10

SECTION 1 — Hero Image:
- Width 100%, height 260px, object-fit cover, border-radius 20px 20px 0 0
- Dark gradient overlay bottom: linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 60%)
- On overlay bottom-left:
  - Category chip: same style as card (blur bg, white text, pill)
  - Event title: font-size 24px, font-weight 700, color white, margin-bottom 4px
  - Price: font-size 18px, color white, font-weight 600 (or "Free" in light green)
- Status badge top-right (same as card)

SECTION 2 — Details Body (padding 24px 28px):

TWO COLUMN LAYOUT (left 55%, right 45%, gap 24px):

LEFT COLUMN:
"About this Event" heading: 13px uppercase, var(--text-secondary), letter-spacing 0.08em, font-weight 600, margin-bottom 10px
Description text: 14px, var(--text-secondary), line-height 1.65, min 3-4 sentences mock text.
Tags row: small chip badges, background var(--bg-card-alt), border var(--border-card), border-radius 6px, padding 4px 10px, font-size 11px.

"Event Schedule" heading same style:
Timeline list (3-4 items): left colored dot (8px, var(--accent-primary)) + connecting line + time text muted + activity label.

"Organizer" heading same style:
Teacher info row: avatar 40px + name bold 14px + department 12px muted + "View Profile" link blue 12px.

RIGHT COLUMN (sticky top 24px):
Registration Card: background var(--bg-card-alt), border 1px solid var(--border-card), border-radius 14px, padding 20px.

"Seats Available" row: large number "42" bold 28px + "/100" muted 16px on same line, margin-bottom 4px. Progress bar below (8px height, same dark fill style).

Info grid (2 columns, gap 12px, margin 16px 0):
Each item: small icon (14px var(--text-muted)) + label 11px muted + value 13px bold. Items: Date, Time, Venue (2 col span), Department, Registration Deadline.

Divider.

Action buttons (stacked, gap 8px, full width):
1. "Approve Event" button (if status is pending): height 44px, background #1A1A2E, white, font-weight 600, border-radius 10px, CheckCircle icon left
2. "Reject Event" button (if pending): height 44px, white bg, border 1.5px solid #EF4444, red text, XCircle icon left
3. "Edit Event" button (if draft/approved): height 44px, background #1A1A2E, white, Pencil icon left
4. "View Registrations" button (if approved): height 44px, outlined border #1A1A2E, dark text, Users icon left

If already approved: show green banner "✓ Event is Approved" instead of approve button.

Below action buttons: "Created by [Teacher Name]" + "Submitted [date]" in muted 12px.
```

---

## PROMPT 6 — LIST VIEW MODE

```
Build the EventsList component — the list view when viewMode = 'list' is selected (AlignJustify button active).

List view renders the same events data as the grid but in a compact horizontal row format.

LIST CARD STYLE:
- Background: var(--bg-card)
- Border-radius: 14px
- Border: 1px solid var(--border-card)
- Margin-bottom: 10px
- Padding: 14px 18px
- Display: flex, flex-direction: row, align-items: center, gap: 16px
- Cursor: pointer
- Hover: background var(--bg-card-alt), transform translateX(3px), transition 0.2s

LEFT — Thumbnail:
- 72x72px, border-radius 10px, object-fit cover, flex-shrink 0

CENTER-LEFT — Event Info (flex: 1):
Top row: Event title bold 14px + category chip (small, blur-dark style like the card, but adapted: background #F0EBE3, dark text, border-radius 6px, padding 3px 10px, 10px font) + status chip (same pill as card but smaller)
Bottom row: CalendarDays 12px muted icon + date 12px var(--text-secondary) + divider dot + Clock icon + time + divider dot + MapPin icon (red) + location. All inline flex row, gap 6px, align-items center.

CENTER-RIGHT — Progress section (width 180px, flex-shrink 0):
"Registrations" label 11px muted above
Progress bar: height 6px, same dark fill style, border-radius 100px, margin 4px 0
"42/100 registered" text 11px var(--text-secondary) below

RIGHT — Price + Actions (flex column, align-items flex-end, gap 8px, flex-shrink 0):
Price: "$10" bold 16px var(--text-primary) (or "Free" in var(--accent-green))
Action buttons row (flex row, gap 6px):
- Eye button: 30x30px, bg var(--bg-card-alt), border var(--border-card), border-radius 8px, Eye icon 14px
- Pencil button: same style, Pencil icon
- If pending: CheckCircle button (green tint on hover) + XCircle button (red tint on hover)

Separator between list items is just the margin-bottom (no full-width hr line).
```

---

## PROMPT 7 — CREATE EVENT MODAL / DRAWER

```
Build the CreateEventModal that opens when a "Create Event" button is clicked (button can be added to the top right of the events page alongside the filter controls — a "+ Create Event" pill button: height 36px, border-radius 100px, background var(--accent-primary) = #1A1A2E, white text, Plus icon left, font-size 13px, font-weight 600, padding 0 16px).

MODAL STYLE:
- Slides in from the RIGHT as a drawer (not center modal)
- Width: 520px
- Height: 100vh
- Position fixed, top 0, right 0
- Background: var(--bg-card)
- Box-shadow: -8px 0 40px rgba(26,26,46,0.15)
- z-index: 200
- Overflow-y: auto
- Animation: slide in from right (translateX 100% → 0), duration 0.25s ease-out

BACKDROP: position fixed, inset 0, background rgba(0,0,0,0.35), z-index 199. Click closes drawer.

DRAWER HEADER (padding 20px 24px, border-bottom 1px solid var(--border-light), flex row justify-between align-center sticky top 0 bg var(--bg-card)):
- Left: "Create New Event" bold 18px var(--text-primary)
- Right: X button (32x32px circle, bg var(--bg-card-alt), X icon 16px)

DRAWER BODY (padding 24px, flex column, gap 20px):

Each form field: label (12px, font-weight 600, var(--text-primary), margin-bottom 6px) + input below.

Input styles (all consistent):
- Height 42px (textareas taller)
- Background var(--bg-card-alt) = #FAF7F2
- Border: 1px solid var(--border-light) = #E8E2D9
- Border-radius: var(--radius-input) = 10px
- Padding: 0 14px
- Font-size: 13px
- Color: var(--text-primary)
- Focus: border-color var(--accent-primary) = #1A1A2E, outline none, box-shadow 0 0 0 3px rgba(26,26,46,0.08)

FIELD 1 — Event Title: text input, placeholder "Enter event title..."

FIELD 2 — Event Category: custom select dropdown (not native select, custom-built):
Display: 42px height, flex row, space-between, show selected value + ChevronDown. Dropdown with: Food & Culinary, Technology, Fashion, Music, Outdoor & Adventure, Health & Fitness, Sports, Workshop, Seminar. Each option has a colored dot left.

FIELD 3 — Price:
Flex row, gap 10px:
Left: "Free Event" toggle switch (label + switch, 44x24px, ON = green bg, OFF = gray). 
Right: text input for price amount "$" prefix inside input (position relative: "$" span absolute left 12px, input padding-left 26px). Disabled (grayed out) when Free toggle is ON.

FIELD 4 — Date & Time (flex row, gap 10px):
Date: date input (width 55%)
Time: time input (width 45%)

FIELD 5 — End Time: time input, full width

FIELD 6 — Venue / Location: text input, MapPin icon inside right side of input (position absolute right 12px, var(--text-muted)).

FIELD 7 — Department: same custom dropdown as category. Options: All Departments, CSE, ECE, MBA, Civil, Mechanical, etc.

FIELD 8 — Max Capacity: number input, Users icon right inside input

FIELD 9 — Registration Deadline: datetime-local input

FIELD 10 — Description: textarea, height 110px, padding 12px 14px, resize vertical

FIELD 11 — Tags: chip-input component. Text input at bottom, pressing Enter adds a chip tag above input. Chips: background var(--bg-card), border var(--border-card), border-radius 6px, padding 4px 10px, font-size 12px, X remove button. Max 6 tags.

FIELD 12 — Cover Image Upload:
Dashed border area: border 2px dashed var(--border-light), border-radius 12px, height 120px, flex center column, gap 6px, cursor pointer, hover border-color var(--accent-primary).
Center: Upload icon (ImagePlus from lucide, 28px var(--text-muted)) + "Upload event poster" bold 13px + "JPG, PNG up to 5MB" muted 11px.
After file selected: show small thumbnail preview (80x80px) + filename + X remove.

DRAWER FOOTER (padding 16px 24px, border-top 1px solid var(--border-light), flex row, gap 10px, justify-content flex-end, sticky bottom 0, bg var(--bg-card)):
- "Cancel" button: height 40px, outlined, var(--text-secondary), padding 0 20px, border-radius 10px
- "Save as Draft" button: height 40px, background var(--bg-card-alt), border 1px solid var(--border-light), var(--text-primary), padding 0 20px, border-radius 10px
- "Submit for Approval" button: height 40px, background var(--accent-primary) = #1A1A2E, white, font-weight 600, padding 0 20px, border-radius 10px

All three buttons: font-size 13px.
```

---

## PROMPT 8 — MOCK DATA FOR EVENTS

```
Create or update src/data/mockData.js to include the events array used on the Events page.

Each event object shape:
{
  id: string (uuid-like),
  title: string,
  category: string,
  status: 'active' | 'past' | 'draft' | 'pending',
  price: number | 0,   // 0 = Free
  date: string,        // "November 2, 2025"
  time: string,        // "3:00 PM"
  endTime: string,     // "6:00 PM"
  location: string,    // "Kandy, Digana Main Hall"
  venue: string,       // full venue name
  department: string,
  maxCapacity: number,
  registeredCount: number,
  registrationPercentage: number,  // pre-calculated (registeredCount/maxCapacity)*100
  image: string,       // picsum URL: `https://picsum.photos/seed/${id}/400/200`
  description: string, // 2-3 sentences
  tags: string[],
  createdBy: { name: string, department: string, avatar: string },
  registrationDeadline: string,
  submittedAt: string,
}

Include exactly these 8 events matching the screenshot (add realistic mock data for all fields):

1. Food Exhibition — Food & Culinary — Active — $10 — Nov 2, 2025 — 3:00 PM — Kandy, Digana Main Hall — 55% capacity
2. AI Make us Better — Technology — Active — $20 — Nov 6, 2025 — 9:00 AM — Colombo 03, Jubilee Hall — 68%
3. Fashion Empire — Fashion — Active — $5 — Nov 27, 2025 — 10:00 AM — Dehiwala, Hill's Hall — 96%
4. How to Camp — Outdoor & Adventure — Active — $60 — Dec 10, 2025 — 4:30 PM — Badulla, Narangala Mountain — 99%
5. Hip Hop Thugs — Music — Active — $90 — Dec 31, 2025 — 6:00 PM — Colombo 1, Galle Face — 87%
6. Balanced Diet — Health & Fitness — Active — $6 — Jan 5, 2026 — 8:00 AM — Nuwara Eliya, Main Hall — 34%
7. Code with Us — Technology — Active — Free — Jan 30, 2026 — 9:00 AM — Colombo 6, BMICH Main Hall — 72%
8. Adventure Hiking — Outdoor & Adventure — Active — $100 — Feb 14, 2026 — 6:00 AM — Kandy, Pidrutalagala Mountain — 94%

Also add 6 more events with status 'past' and 4 with status 'draft' for tab switching to work.

Past events: use realistic names like "Python Bootcamp", "Cultural Night 2025", "Leadership Summit", "Photography Walk", "Startup Pitch Day", "Art Exhibition".

Draft events: "Annual Sports Meet 2026", "International Food Fest", "Robotics Workshop", "Green Campus Drive".

Export as: export const mockEvents = [...];
Also export: export const getEventsByStatus = (status) => mockEvents.filter(e => e.status === status);
export const getEventsByCategory = (events, category) => category === 'All Category' ? events : events.filter(e => e.category === category);
```

---

## PROMPT 9 — WIRING EVERYTHING TOGETHER

```
Wire the complete Events page together. Update src/pages/Events.jsx:

Import: useState, useEffect, mockEvents, getEventsByStatus, getEventsByCategory, EventCard, EventsList (list view), TopControlsBar, EventDetailModal, CreateEventModal.

State:
- activeTab: 'active'
- activeCategory: 'All Category'
- activePeriod: 'This Month'
- viewMode: 'grid'
- selectedEvent: null (for detail modal)
- showCreateModal: false
- isLoading: true (set false after 800ms useEffect)
- searchQuery: ''

Computed:
const filteredEvents = useMemo(() => {
  let events = getEventsByStatus(activeTab);
  events = getEventsByCategory(events, activeCategory);
  if (searchQuery) events = events.filter(e => e.title.toLowerCase().includes(searchQuery.toLowerCase()));
  return events;
}, [activeTab, activeCategory, searchQuery]);

Count for tabs:
const tabCounts = useMemo(() => ({
  active: getEventsByStatus('active').length,
  past: getEventsByStatus('past').length,
  draft: getEventsByStatus('draft').length,
}), []);

JSX structure:
<div style={{ padding: '20px 24px' }}>
  <TopControlsBar
    activeTab={activeTab}
    setActiveTab={setActiveTab}
    activeCategory={activeCategory}
    setActiveCategory={setActiveCategory}
    activePeriod={activePeriod}
    setActivePeriod={setActivePeriod}
    viewMode={viewMode}
    setViewMode={setViewMode}
    tabCounts={tabCounts}
    onCreateEvent={() => setShowCreateModal(true)}
  />
  
  {isLoading ? <SkeletonGrid /> : (
    viewMode === 'grid'
      ? <EventsGrid events={filteredEvents} onCardClick={setSelectedEvent} />
      : <EventsList events={filteredEvents} onRowClick={setSelectedEvent} />
  )}

  {selectedEvent && (
    <EventDetailModal
      event={selectedEvent}
      onClose={() => setSelectedEvent(null)}
    />
  )}

  {showCreateModal && (
    <CreateEventModal
      onClose={() => setShowCreateModal(false)}
      onSave={(newEvent) => {
        // add to mock data or state
        setShowCreateModal(false);
      }}
    />
  )}
</div>

Also: add a "+ Create Event" button to the right side of TopControlsBar (after the list/grid toggle buttons), separated by a small divider line:
- Style: height 36px, border-radius 100px, background #1A1A2E, color white, font-size 13px, font-weight 600, padding 0 16px, gap 6px
- Plus icon from lucide left inside button
- Text "Create Event"
- onClick: triggers onCreateEvent prop

Ensure sidebar "Events" nav item stays highlighted (active) on this page.
Make sure the Header shows breadcrumb="Dashboard / Event" and title="Event".
```

---

## PROMPT 10 — POLISH PASS FOR EVENTS PAGE

```
Polish pass for the Events page of the EMS Admin Portal.

1. CARD HOVER ANIMATION — ensure EventCard hover is smooth:
   transition: transform 0.2s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.2s ease
   hover: translateY(-4px), stronger shadow

2. PROGRESS BAR ANIMATION — on page load / tab switch, animate all progress bars from 0% to their target width:
   CSS transition on the fill bar: width 0.6s ease-out
   Use useEffect with a small delay after isLoading = false to trigger

3. TAB SWITCHING ANIMATION — when switching tabs (Active/Past/Draft):
   The card grid should fade out (opacity 0, 150ms) then fade in (opacity 1, 200ms) with the new cards

4. CATEGORY CHIP COLOURS — each category gets a distinct tinted chip colour (still readable on the card image):
   Food & Culinary:      rgba(0,0,0,0.55) — default dark glass
   Technology:           rgba(15,40,80,0.65) — dark blue glass
   Fashion:              rgba(80,20,60,0.60) — dark purple glass
   Music:                rgba(60,0,80,0.65) — dark violet glass
   Outdoor & Adventure:  rgba(20,50,20,0.60) — dark green glass
   Health & Fitness:     rgba(0,60,40,0.60) — dark teal glass
   All use: backdrop-filter blur(4px), white text

5. STATUS BADGE PULSE — "Active" status badges get a subtle pulse animation on the green dot:
   @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.5 } }
   Apply to the green dot only: animation: pulse 2s infinite

6. SEARCH INTEGRATION — the header search bar (already built) should filter the events grid when typing:
   In Layout/Header, lift the search query state up or use a global Zustand store.
   Events page subscribes and filters. Alternatively, add a local search input inside TopControlsBar if header state is too complex.

7. SCROLL BEHAVIOUR — if events overflow the viewport height, the grid scrolls naturally. Add a subtle scroll-to-top behaviour when switching tabs (window.scrollTo({top:0, behavior:'smooth'})).

8. MOBILE RESPONSIVE — on screens below 768px:
   - TopControlsBar wraps to two rows (tabs row + filters row)
   - Grid switches to 1 column
   - EventDetail modal becomes full screen (width 100vw, height 100vh, border-radius 0)
   - Create drawer width 100vw

9. EMPTY STATE ILLUSTRATIONS — use inline SVG for the empty state (no external images):
   Simple calendar with X mark, drawn with SVG path, var(--text-muted) color, 64x64px.

10. TOAST NOTIFICATION — when an event is approved or rejected from EventDetailModal:
    Show a toast notification (bottom-right corner, fixed position):
    - Approve: green bg, white text "Event approved successfully ✓", Check icon, auto-dismiss 3s
    - Reject: red bg, white text "Event rejected", XCircle icon, auto-dismiss 3s
    Toast card: padding 12px 18px, border-radius 10px, box-shadow 0 4px 16px rgba(0,0,0,0.15), font-size 13px, font-weight 500
    Slide in from bottom (translateY 100% → 0), slide out on dismiss.
```

---

## 🗂 COMPLETE FILE LIST FOR THIS FEATURE

```
src/
├── pages/
│   └── Events.jsx                    ← main page, wires everything
├── components/
│   └── events/
│       ├── TopControlsBar.jsx        ← tabs + filter controls
│       ├── EventCard.jsx             ← individual card (grid mode)
│       ├── EventsGrid.jsx            ← 4-col grid wrapper
│       ├── EventsList.jsx            ← list view rows
│       ├── EventDetailModal.jsx      ← click-to-open detail modal
│       ├── CreateEventModal.jsx      ← right-side drawer form
│       └── SkeletonGrid.jsx          ← loading skeleton
├── data/
│   └── mockData.js                   ← updated with full events array
└── components/ui/
    └── Toast.jsx                     ← approve/reject toast
```

---

## 🔢 ORDER TO RUN IN CODEX

1. **Prompt 8** — Mock data first (foundation everything else depends on)
2. **Prompt 1** — Page structure + state
3. **Prompt 2** — TopControlsBar (tabs + filters)
4. **Prompt 3** — EventCard component (most detailed)
5. **Prompt 4** — EventsGrid wrapper + skeleton
6. **Prompt 5** — EventDetailModal
7. **Prompt 6** — EventsList (list view mode)
8. **Prompt 7** — CreateEventModal drawer
9. **Prompt 9** — Wire everything together
10. **Prompt 10** — Polish pass

---

## 🎨 COLOUR REMINDER (same palette, no new colours)

| What | Value |
|------|-------|
| Card background | `#FFFFFF` |
| Page background | `#F5F0E8` (warm cream) |
| Sidebar | `#1A1A2E` |
| Active tab pill | `#1A1A2E` (white text) |
| Inactive tab pill | `#FFFFFF` (border #E8E2D9) |
| Progress bar fill | `#1A1A2E` |
| Progress bar bg | `#E8E2D9` |
| Price text | `#1A1A2E` |
| "Free" price | `#4CAF82` |
| Location pin | `#EF4444` (red) |
| Active status dot | `#16A34A` (green) |
| Card border | `#F0EBE3` |
| Category chip bg | `rgba(0,0,0,0.55)` + blur |
| Status chip bg | `rgba(255,255,255,0.90)` |
| Filter pill bg | `#FFFFFF` |
| Create button | `#1A1A2E` (white text) |

---

## 📌 KEY DESIGN NOTES FOR CODEX

- **No action buttons visible on the card itself** — clicking the entire card opens the modal
- **4 cards per row exactly** — matching the screenshot grid precisely
- **Image is top 175px of card, body below** — clean separation
- **Category chip top-LEFT of image, status chip top-RIGHT** — both absolute positioned
- **Progress bar sits at very bottom of card body** — no extra padding below it
- **Price is right-aligned to the title** — same row, flex space-between
- **Tabs are pill-shaped with full border-radius** — not underline tabs
- **Filter controls are also pill-shaped** — consistent with tab styling
- **Grid/List toggle buttons are square (not pill)** — the two toggle buttons on the right
