# Eventopia — Codex Build Plan
**Attendee Insights Portal · Admin Dashboard**

---

## Colour Palette (exact, no deviations)

| Role | Hex |
|---|---|
| Sidebar background | `#1A1A1A` |
| Page background | `#F5F0E8` |
| Card background | `#FFFFFF` |
| Card border | `#EBE5D7` |
| Primary text | `#3A3631` |
| Muted text | `#9B9589` |
| Chart bars / dark fills | `#1A1A1A` |
| Donut inactive segment | `#D0C9BB` |

---

## Tech Stack

| Layer | Choice |
|---|---|
| Frontend | React + Vite |
| Charts | Recharts |
| Styling | Tailwind CSS (extend theme with above colours) |
| Routing | React Router v6 |
| Data | Mock JSON (swap to REST / Supabase later) |
| State | React Context |

---

## Layout Structure

Fixed sidebar + scrollable main content area.

```jsx
<div className="flex h-screen">
  <Sidebar />              {/* w-56, bg #1A1A1A, fixed */}
  <main className="flex-1 overflow-y-auto bg-[#F5F0E8]">
    <TopBar />             {/* breadcrumb + search + user */}
    <PageContent />        {/* dashboard / events / insights */}
  </main>
</div>
```

---

## Sidebar Specification

- Logo: "Eventopia" with icon, top-left, white text
- Nav section **Menu**: Dashboard, Events, Attendee Insights
- Nav section **General**: Settings, Help, Logout
- Active nav item: white text + subtle left accent bar
- Bottom: "Download Our Mobile App" promo card — dark card, white text, CTA button

---

## TopBar Specification

- Breadcrumb: `Dashboard / Event / Food Exhibition`
- Search bar: rounded input, centered
- Right-aligned: notification bell icon, email icon, user avatar + name + email

---

## Dashboard Widgets

### Row 1 — Left Column

| Widget | Details |
|---|---|
| **Stat card** | "19,000" large bold · "Total Number of Attendees" label · "For this month" subtitle |
| **Gender donut** | PieChart · 75% male `#1A1A1A` · 25% female `#D0C9BB` · hollow centre · pointer labels · legend |
| **Age donut** | PieChart · 5 greyscale slices: 18-23 `#9B9589`, Below 18 `#1A1A1A`, 24-30 `#C2BBB0`, 31-35 `#D0C9BB`, Above 35 `#E5E0D8` · right-aligned legend |

### Row 1 — Right Column (full height)

| Widget | Details |
|---|---|
| **Top locations bar** | BarChart · dark bars `#1A1A1A` · no gridlines · y-axis 500–2500 |

**Data:**

| City | Value |
|---|---|
| Colombo | 2500 |
| Kandy | 2350 |
| Badulla | 1900 |
| Nuwara Eliya | 1750 |
| Maharagama | 1400 |
| Dehiwala | 1100 |
| Gampaha | 900 |

### Row 2 — Full Width

| Widget | Details |
|---|---|
| **Top category line** | LineChart · 5 points · line `#1A1A1A` · white-fill dots with dark border · no area fill · smooth curve |

**Categories:** Outdoor & Adventure, Music, Health & Fitness, Fashion, Food & Culinary

---

## Card Styling

- Background: `#FFFFFF`
- Border: `1px solid #EBE5D7`
- Border radius: `16px`
- Padding: `20px`
- No box shadows — flat design only

---

## Chart Configuration

- **Bar chart:** No `<CartesianGrid />`, minimal axes, tooltip on hover only
- **Donut charts:** `strokeWidth={20}`, `innerRadius={60}`, `outerRadius={90}`
- **Line chart:** No fill under line, `dot={{ fill: '#fff', stroke: '#1A1A1A', strokeWidth: 2 }}`

---

## Typography

- Font: `DM Sans` (Google Fonts) or system sans-serif fallback
- Card titles: `14px`, `font-weight: 500`, `#3A3631`
- Section headings: `20px+`, `font-weight: 600`
- Muted labels: `12–13px`, `#9B9589`

---

## Files to Generate

```
/src
  /components
    Sidebar.jsx
    TopBar.jsx
    StatCard.jsx
    GenderDonut.jsx
    AgeDonut.jsx
    TopLocationsBar.jsx
    TopCategoryLine.jsx
  /pages
    Dashboard.jsx
  /data
    mockData.js
  App.jsx
tailwind.config.js
package.json
```

---

## Codex Prompt (paste directly)

```
Build an Eventopia Admin Dashboard — Attendee Insights Portal.

COLOUR PALETTE (exact, no deviations):
  Sidebar bg:       #1A1A1A
  Page bg:          #F5F0E8
  Card bg:          #FFFFFF
  Card border:      #EBE5D7
  Primary text:     #3A3631
  Muted text:       #9B9589
  Chart bars/dark:  #1A1A1A
  Donut inactive:   #D0C9BB

TECH STACK:
  React + Vite, Recharts, Tailwind CSS (extend theme with above colours),
  React Router v6, no external UI lib.

LAYOUT (fixed sidebar + scrollable main):
  Sidebar: w-56, bg #1A1A1A, fixed left, full height.
    - Logo: "Eventopia" with icon, top-left, white text.
    - Nav sections: "Menu" (Dashboard, Events, Attendee Insights)
                    "General" (Settings, Help, Logout)
    - Active nav item: white text, subtle left accent bar.
    - Bottom: "Download Our Mobile App" promo card (dark card, white text, CTA button).
  TopBar: breadcrumb (Dashboard / Event / Food Exhibition), search bar (rounded),
          notification bell, email icon, user avatar + name right-aligned.
  Page title: "Food Exhibition" large, below topbar.

DASHBOARD GRID (matching screenshot layout):
  Row 1 (left col):
    - StatCard: "19,000" large bold, "Total Number of Attendees" label, "For this month" subtitle.
    - GenderDonut: Recharts PieChart, 75% male (#1A1A1A), 25% female (#D0C9BB),
      inner hollow, labels with pointer lines, legend (25% / 75%).
    - AgeDonut: Recharts PieChart, 5 slices in greyscale:
        18-23 (#9B9589), Below 18 (#1A1A1A), 24-30 (#C2BBB0),
        31-35 (#D0C9BB), Above 35 (#E5E0D8). Legend right-aligned.
  Row 1 (right col, spans full height):
    - TopLocationsBar: Recharts BarChart, dark bars (#1A1A1A),
      7 cities: Colombo 2500, Kandy 2350, Badulla 1900, Nuwara Eliya 1750,
      Maharagama 1400, Dehiwala 1100, Gampaha 900.
      No gridlines, x-axis city names, y-axis 500-2500.
  Row 2 (full width):
    - TopCategoryLine: Recharts LineChart, 5 points connected by line (#1A1A1A),
      dot markers (white fill, dark border),
      categories: Outdoor & Adventure, Music, Health & Fitness, Fashion, Food & Culinary.
      No fill under line. Smooth curve.

TYPOGRAPHY:
  Use Google Font "DM Sans".
  Card titles: 14px, font-weight 500, #3A3631.
  Section headings: 20px+, font-weight 600.
  Muted labels: 12-13px, #9B9589.

CARDS:
  All charts live in white cards (bg #FFF, border 1px #EBE5D7, border-radius 16px, padding 20px).
  No box shadows. Clean flat design.

CHARTS:
  No grid lines on bar chart. Minimal axes. No tooltip unless hovering.
  Donut charts: strokeWidth 20, innerRadius 60, outerRadius 90.

DELIVER:
  - /src/components/Sidebar.jsx
  - /src/components/TopBar.jsx
  - /src/components/StatCard.jsx
  - /src/components/GenderDonut.jsx
  - /src/components/AgeDonut.jsx
  - /src/components/TopLocationsBar.jsx
  - /src/components/TopCategoryLine.jsx
  - /src/pages/Dashboard.jsx
  - /src/App.jsx (routing setup)
  - /src/data/mockData.js (all chart data)
  - tailwind.config.js (with custom colours)
  - package.json dependencies

Make it pixel-accurate to the reference screenshot. No placeholder or lorem ipsum.
```

---

## Recommended Build Order

1. **Shell layout** — `App.jsx` + `Sidebar` + `TopBar`. Get the two-column frame right first.
2. **mockData.js** — all chart values, city names, category names in one place.
3. **StatCard** — simple, no deps. Confirms palette is wired correctly.
4. **Donut charts** — gender + age. Confirms Recharts is installed and rendering.
5. **Bar chart** — top locations. Most prominent visual, full-height right column.
6. **Line chart** — top categories. Bottom row, full width, last piece.

---

## Codex Tips

- If Recharts donut ring looks thin, tell Codex: *"increase outerRadius to 100 and innerRadius to 72, strokeWidth stays at 20"*
- For bar chart gridlines, tell Codex: *"omit CartesianGrid entirely"* or add `<CartesianGrid opacity={0} />`
- Tailwind custom colours go in `tailwind.config.js` under `theme.extend.colors`
- Import DM Sans in `index.html` via Google Fonts link tag
