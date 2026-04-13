# Teacher Portal — API Loading Fix Plan
## Exact Prompts to Paste into Codex · Fix All 6 Root Causes

---

## 🔴 THE CORE PROBLEM IN ONE SENTENCE

The teacher dashboard makes **multiple API calls in a chain**, and if ANY single one fails, the entire page crashes into a generic "Request failed" banner — hiding the real error and blocking even the shared admin events from showing.

---

## FIX STRATEGY OVERVIEW

| # | Problem | Fix |
|---|---------|-----|
| 1 | Chain of API calls — one failure kills all | Make every call independent with its own try/catch |
| 2 | Teacher token rejected on some routes | Normalise Cognito group claim checking in auth middleware |
| 3 | `mine=true` matching fails on user ID mismatch | Use `cognito_sub` as fallback match in event ownership |
| 4 | Attendance summary fans out uncontrolled | Wrap in isolated async block, never block main render |
| 5 | Backend throws generic error, frontend hides it | Add proper error logging + surface real message |
| 6 | Dashboard mixing shared + private data | Split into two independent render sections |

---

## PROMPT 1 — FIX THE DASHBOARD: SPLIT API CALLS INTO INDEPENDENT BLOCKS

Paste this into Codex:

```
In teacher-dashboard-page.js, the current load function calls multiple APIs in sequence and
if any fails, the entire page shows an error. Fix this by splitting the dashboard into
independent data sections, each with its own try/catch. No single failure should block others.

Replace the current single loadDashboard() or similar function with this pattern:

async function loadDashboard() {
  // Run all sections in parallel, each section is fully independent
  await Promise.allSettled([
    loadSharedEvents(),        // GET /events (admin-approved, all teachers see these)
    loadMyEvents(),            // GET /events?mine=true (only teacher's own events)
    loadAttendancePending(),   // GET /events?mine=true&status=completed (light call)
    loadStaffInvites(),        // GET /staff-invites (pending coordinator invites)
  ]);
  // Dashboard always renders — sections show their own empty/error states
}

Each loader function follows this exact pattern:

async function loadSharedEvents() {
  const section = document.getElementById('shared-events-section');
  try {
    showSectionLoader(section);
    const res = await api.get('/events?status=approved');
    renderSharedEvents(res.data);
  } catch (err) {
    console.error('[loadSharedEvents]', err);
    showSectionError(section, 'Could not load events. ' + extractMessage(err));
    // DO NOT throw — other sections must still load
  }
}

async function loadMyEvents() {
  const section = document.getElementById('my-events-section');
  try {
    showSectionLoader(section);
    const res = await api.get('/events?mine=true');
    renderMyEvents(res.data);
    // Attendance summary is a FOLLOW-UP optional call — only if my events loaded
    await loadAttendanceSummaryForMyEvents(res.data);
  } catch (err) {
    console.error('[loadMyEvents]', err);
    showSectionError(section, 'Could not load your events.');
    // DO NOT throw
  }
}

async function loadAttendanceSummaryForMyEvents(myEvents) {
  // This is the fragile fan-out section — wrap separately
  try {
    const completedEvents = myEvents.filter(e => e.status === 'completed').slice(0, 3);
    const summaries = await Promise.allSettled(
      completedEvents.map(e => api.get(`/attendance?event_id=${e.id}`))
    );
    // Use only the ones that resolved — ignore rejected ones silently
    const validSummaries = summaries
      .filter(r => r.status === 'fulfilled')
      .map(r => r.value.data);
    renderAttendanceSummary(validSummaries);
  } catch (err) {
    console.error('[loadAttendanceSummary]', err);
    // Silently skip — attendance summary is optional on dashboard
  }
}

async function loadStaffInvites() {
  try {
    const res = await api.get('/staff-invites?status=pending');
    renderStaffInvites(res.data);
  } catch (err) {
    console.error('[loadStaffInvites]', err);
    renderStaffInvites([]); // Show empty state, not error
  }
}

IMPORTANT: Add a helper function:
function extractMessage(err) {
  return err?.response?.data?.message
    || err?.response?.data?.error
    || err?.message
    || 'Unknown error';
}

This extracts the REAL backend error message instead of showing "Request failed".
Log it to console so you can see the actual cause.
```

---

## PROMPT 2 — FIX THE BACKEND AUTH: NORMALISE COGNITO ROLE CHECKING

Paste this into Codex:

```
In backend/shared/src/auth.ts, the current role detection is likely checking Cognito groups
in only one way. Fix it to check all possible locations where the group claim can appear.

Cognito puts the user's group in different places depending on how the token was issued:
- cognito:groups (array, most common)
- custom:role (custom attribute set at signup)
- The group name casing can vary: "Teachers" vs "teachers" vs "TEACHERS"

Replace the current role extraction with this robust version:

function getRoleFromToken(decodedToken: any): string {
  // Method 1: cognito:groups array (most reliable)
  const groups: string[] = decodedToken['cognito:groups'] || [];
  if (groups.some(g => g.toLowerCase() === 'admins')) return 'admin';
  if (groups.some(g => g.toLowerCase() === 'teachers')) return 'teacher';
  if (groups.some(g => g.toLowerCase() === 'students')) return 'student';

  // Method 2: custom:role attribute (fallback)
  const customRole = decodedToken['custom:role'];
  if (customRole) return customRole.toLowerCase();

  // Method 3: check if sub matches known patterns (last resort)
  return 'student'; // default safest fallback
}

Also fix the actor.id resolution. The teacher's user ID in your DB must match what
the token provides. Add this to your auth middleware:

async function resolveActor(decodedToken: any, db: Pool) {
  const cognitoSub = decodedToken.sub; // This is always present and never changes

  // Always look up by cognito_sub — never by email or username alone
  const result = await db.query(
    'SELECT * FROM users WHERE cognito_sub = $1',
    [cognitoSub]
  );

  if (result.rows.length === 0) {
    // User authenticated in Cognito but not yet in DB — auto-create record
    const email = decodedToken.email;
    const name = decodedToken.name || email.split('@')[0];
    const role = getRoleFromToken(decodedToken);

    const inserted = await db.query(
      `INSERT INTO users (cognito_sub, email, full_name, role)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (cognito_sub) DO UPDATE SET email = EXCLUDED.email
       RETURNING *`,
      [cognitoSub, email, name, role]
    );
    return inserted.rows[0];
  }

  return result.rows[0];
}

This ensures that even if the teacher account was created at different times or
the user record was recreated, the lookup always succeeds by cognito_sub.
```

---

## PROMPT 3 — FIX EVENT OWNERSHIP: mine=true QUERY

Paste this into Codex:

```
In backend/functions/events-handler/src/index.ts, the mine=true filter is:
  item.created_by === actor.id

This fails if the user record was created with a different ID shape at different times.
Fix the ownership check to be resilient:

When handling GET /events?mine=true:

// Step 1: get the actor's DB user record (using cognito_sub — always stable)
const actor = await resolveActor(decodedToken, db);

// Step 2: query events by the DB user's id (not cognito_sub directly)
const result = await db.query(
  `SELECT e.*, u.full_name as creator_name
   FROM events e
   LEFT JOIN users u ON u.id = e.created_by
   WHERE e.created_by = $1
   ORDER BY e.created_at DESC`,
  [actor.id]  // actor.id is now guaranteed to be the correct DB UUID
);

Also add a safety check — if actor is null or undefined, return empty array (not 500):

if (!actor) {
  return { statusCode: 200, body: JSON.stringify([]) };
}

For the shared events route GET /events (no mine=true), teachers should see ALL
approved events regardless of who created them:

const result = await db.query(
  `SELECT e.*, u.full_name as creator_name, u.department as creator_dept
   FROM events e
   LEFT JOIN users u ON u.id = e.created_by
   WHERE e.status = 'approved'
   ORDER BY e.event_date ASC`
  // No created_by filter here — ALL approved events are visible to all
);

This is the key separation:
- GET /events             → all approved events (admin + any teacher)
- GET /events?mine=true   → only events I created
Both routes must work independently. If mine=true fails, the shared events
route must still return data.
```

---

## PROMPT 4 — FIX BACKEND ERROR RESPONSES: SURFACE REAL MESSAGES

Paste this into Codex:

```
In backend/shared/src/http.ts, generic errors are swallowing the real cause.
Fix the error handler to always return a structured error with the actual message.

Replace the current error handling with:

export function errorResponse(err: any, context?: string): APIGatewayProxyResult {
  // Log the FULL error server-side so you can see it in CloudWatch
  console.error(`[ERROR]${context ? ' ' + context : ''}`, {
    message: err?.message,
    stack: err?.stack,
    code: err?.code,
    detail: err?.detail,  // PostgreSQL error detail
  });

  // Determine status code
  let statusCode = 500;
  if (err?.message?.includes('not found')) statusCode = 404;
  if (err?.message?.includes('forbidden') || err?.message?.includes('not allowed')) statusCode = 403;
  if (err?.message?.includes('already exists') || err?.message?.includes('duplicate')) statusCode = 409;
  if (err?.code === '23505') statusCode = 409; // PostgreSQL unique violation
  if (err?.code === '23503') statusCode = 400; // PostgreSQL foreign key violation

  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify({
      error: true,
      message: err?.message || 'An unexpected error occurred',
      code: err?.code || null,
      // Never expose stack trace in production
      ...(process.env.NODE_ENV !== 'production' && { stack: err?.stack }),
    }),
  };
}

Then wrap EVERY Lambda handler's main logic in try/catch using this:

exports.handler = async (event) => {
  try {
    // ... all your logic
  } catch (err) {
    return errorResponse(err, 'events-handler');
  }
};

On the frontend in teacher-shared.js, update the request interceptor to log clearly:

api.interceptors.response.use(
  response => response,
  error => {
    const status = error?.response?.status;
    const message = error?.response?.data?.message || error?.message || 'Request failed';
    const code = error?.response?.data?.code;

    // Always log the real error — this shows in browser console
    console.error(`[API Error] ${status} — ${message}`, { code, url: error?.config?.url });

    // Return a structured rejection so callers can read the real message
    return Promise.reject({
      status,
      message,
      code,
      originalError: error,
    });
  }
);
```

---

## PROMPT 5 — FIX THE TEACHER-SHARED.JS: TOKEN INJECTION ON EVERY CALL

Paste this into Codex:

```
In teacher-shared.js, verify that the Bearer token is being attached to EVERY
API call including the later ones like GET /events/:id/registrations and
GET /attendance?event_id=...

The most common reason later calls fail while /users/me works is that the
token refresh happens asynchronously and some calls fire before the new token
is ready.

Fix this with an async request interceptor that always awaits a fresh token:

import { fetchAuthSession } from 'aws-amplify/auth';

// Async request interceptor — awaits token before every request
api.interceptors.request.use(async (config) => {
  try {
    const session = await fetchAuthSession({ forceRefresh: false });
    const token = session?.tokens?.idToken?.toString();

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      // Token is missing — redirect to login
      console.warn('[Auth] No token available — redirecting to login');
      window.location.href = '/login';
    }
  } catch (err) {
    console.error('[Auth] Failed to get session token', err);
    window.location.href = '/login';
  }
  return config;
});

Also add a response interceptor to handle 401 (token expired mid-session):

api.interceptors.response.use(
  response => response,
  async (error) => {
    if (error?.response?.status === 401) {
      console.warn('[Auth] 401 received — attempting token refresh');
      try {
        // Force refresh the session
        const session = await fetchAuthSession({ forceRefresh: true });
        const newToken = session?.tokens?.idToken?.toString();

        if (newToken && error.config) {
          // Retry the original request with the new token
          error.config.headers.Authorization = `Bearer ${newToken}`;
          return api.request(error.config);
        }
      } catch (refreshErr) {
        console.error('[Auth] Token refresh failed', refreshErr);
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

This ensures:
1. Every call — including GET /events/:id/registrations — gets a valid token
2. If the token expires mid-session, it auto-refreshes and retries once
3. Only if refresh also fails does it redirect to login
```

---

## PROMPT 6 — ADD SECTION-LEVEL LOADING AND ERROR STATES IN DASHBOARD UI

Paste this into Codex:

```
In teacher-dashboard-page.js, replace the single full-page error banner with
section-level loading and error states. Each section on the dashboard is independent.

Add these two helper functions that work on individual section containers:

function showSectionLoader(sectionEl) {
  if (!sectionEl) return;
  sectionEl.innerHTML = `
    <div class="section-loader">
      <div class="skeleton-card"></div>
      <div class="skeleton-card"></div>
      <div class="skeleton-card"></div>
    </div>
  `;
}

function showSectionError(sectionEl, message) {
  if (!sectionEl) return;
  sectionEl.innerHTML = `
    <div class="section-error">
      <div class="section-error-icon">⚠</div>
      <p class="section-error-text">${message}</p>
      <button class="section-retry-btn" onclick="location.reload()">Retry</button>
    </div>
  `;
}

Add these CSS rules in the stylesheet:

.section-loader {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px;
}

.skeleton-card {
  height: 60px;
  border-radius: 10px;
  background: linear-gradient(90deg, #F0EBE3 25%, #E8E2D9 50%, #F0EBE3 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.section-error {
  padding: 24px 16px;
  text-align: center;
  color: var(--text-muted);
}

.section-error-icon {
  font-size: 24px;
  margin-bottom: 8px;
  color: var(--accent-amber);
}

.section-error-text {
  font-size: 13px;
  margin-bottom: 12px;
  color: var(--text-secondary);
}

.section-retry-btn {
  height: 32px;
  padding: 0 16px;
  border-radius: 8px;
  border: 1px solid var(--border-light);
  background: var(--bg-card);
  font-size: 12px;
  cursor: pointer;
  color: var(--text-primary);
}

.section-retry-btn:hover {
  background: var(--bg-card-alt);
}

Now the dashboard has sections like:
- Shared Events section → shows its own skeleton → shows its own error if it fails
- My Events section → shows its own skeleton → shows its own error
- Staff Invites section → shows empty state if API fails (not an error, just empty)
- Attendance Pending section → shows empty state if API fails

The top-level "Request failed" banner should be REMOVED entirely.
Only show a page-level banner for authentication failures (401/403).
```

---

## PROMPT 7 — ADD CONSOLE DEBUGGING TO FIND THE EXACT FAILING CALL

Paste this into Codex (run this FIRST before the others to identify the real problem):

```
In teacher-dashboard-page.js, add temporary detailed console logging around every
API call so we can see exactly which one is failing. Add this before any other fix:

async function loadDashboard() {
  console.group('[Teacher Dashboard] Loading all sections');
  console.time('dashboard-total');

  const results = await Promise.allSettled([

    (async () => {
      console.log('[1] Starting: GET /events (shared)');
      try {
        const r = await api.get('/events?status=approved');
        console.log('[1] SUCCESS: GET /events —', r.data?.length, 'events');
        return r;
      } catch (e) {
        console.error('[1] FAILED: GET /events —', e?.message || e?.status, e);
        throw e;
      }
    })(),

    (async () => {
      console.log('[2] Starting: GET /events?mine=true');
      try {
        const r = await api.get('/events?mine=true');
        console.log('[2] SUCCESS: GET /events?mine=true —', r.data?.length, 'events');
        return r;
      } catch (e) {
        console.error('[2] FAILED: GET /events?mine=true —', e?.message || e?.status, e);
        throw e;
      }
    })(),

    (async () => {
      console.log('[3] Starting: GET /users/me');
      try {
        const r = await api.get('/users/me');
        console.log('[3] SUCCESS: GET /users/me —', r.data?.email);
        return r;
      } catch (e) {
        console.error('[3] FAILED: GET /users/me —', e?.message || e?.status, e);
        throw e;
      }
    })(),

    (async () => {
      console.log('[4] Starting: GET /staff-invites');
      try {
        const r = await api.get('/staff-invites?status=pending');
        console.log('[4] SUCCESS: GET /staff-invites —', r.data?.length, 'invites');
        return r;
      } catch (e) {
        console.error('[4] FAILED: GET /staff-invites —', e?.message || e?.status, e);
        // This endpoint may not exist yet — log but do not throw
      }
    })(),

  ]);

  console.timeEnd('dashboard-total');
  console.log('[Teacher Dashboard] Results summary:',
    results.map((r, i) => `[${i+1}] ${r.status}${r.reason ? ' — ' + r.reason?.message : ''}`)
  );
  console.groupEnd();
}

After adding this, open browser DevTools → Console tab and reload the teacher portal.
You will see exactly which numbered call is failing and what the real error message is.
Share that console output to diagnose the root cause precisely.
```

---

## QUICK REFERENCE — WHICH FILE TO TOUCH FOR EACH FIX

| File | What to Fix |
|------|------------|
| `teacher-dashboard-page.js` | Split into independent sections (Prompt 1 + 6), add debug logging (Prompt 7) |
| `teacher-shared.js` | Token injection on every call + auto-refresh on 401 (Prompt 5) |
| `backend/shared/src/auth.ts` | Robust Cognito group + cognito_sub based user lookup (Prompt 2) |
| `backend/functions/events-handler/src/index.ts` | Fix mine=true ownership query (Prompt 3) |
| `backend/shared/src/http.ts` | Structured error responses with real messages (Prompt 4) |
| Dashboard HTML/CSS | Section-level error states (Prompt 6) |

---

## RUN ORDER IN CODEX

1. **Prompt 7 first** — add debug logging, run the app, check browser console, identify the exact failing call number
2. Based on what fails: run the matching fix prompt
3. Then run **Prompt 5** (token fix) — this fixes the most common root cause
4. Then run **Prompt 1** (independent sections) — this makes the dashboard resilient regardless
5. Then run **Prompt 4** (backend errors) — so you can see real messages going forward
6. Run **Prompts 2 + 3** only if the issue is confirmed to be auth or ownership related

---

## MOST LIKELY ACTUAL ROOT CAUSE

Based on the Codex diagnosis, the single most probable fix is **Prompt 1 + Prompt 5 together**:

- The dashboard is chaining calls and one later call (probably `GET /events/:id/registrations` or `GET /attendance?event_id=...`) is failing
- The token may not be refreshed before that call fires
- This crashes the entire page even though `GET /events` (shared events) succeeded

Fixing the token interceptor (Prompt 5) + making sections independent (Prompt 1) will most likely resolve the issue completely without needing backend changes.
