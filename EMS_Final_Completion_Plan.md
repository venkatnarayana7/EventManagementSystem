# EMS Project — Final Completion Plan
## What Is Left · Exact Fixes · Real-Time Connections · Codex Prompts

---

## CURRENT STATE SUMMARY

Based on the project guide, here is exactly what exists vs what is missing:

### What EXISTS and is Working
- All three portals have HTML + JS pages deployed on AWS
- Cognito auth with JWT tokens and role-based redirects
- DynamoDB tables: users, events, registrations, attendance, seat-counter, OTP, ws-connections
- Lambda functions for all major handlers
- API Gateway REST + WebSocket API both live
- WebSocket infrastructure (ws-connect, ws-disconnect, ws-default, ems-realtime.js)
- CDK stacks deployed (Auth, Database, API, Storage, Notifications)
- Build script and CloudFront deployment working
- Real-time message types defined: event_approved, seat_updated, new_registration, etc.

### What is MISSING or BROKEN (The Final Gap List)

| # | Gap | Affects | Priority |
|---|-----|---------|----------|
| 1 | WebSocket messages fire but portals do not re-render on receiving them | All 3 portals | CRITICAL |
| 2 | Teacher dashboard sequential API calls — one fails, whole page crashes | Teacher | CRITICAL |
| 3 | Student join button does not update seat counter live across all portals | Student + Admin + Teacher | CRITICAL |
| 4 | Admin revenue chart is static — does not update when students join paid events | Admin | HIGH |
| 5 | Attendance submission does not trigger student notification | Teacher → Student | HIGH |
| 6 | Event approval does not make event appear live in Student Browse page | Admin → Student | HIGH |
| 7 | Teacher My Events status badge does not change live when admin approves | Admin → Teacher | HIGH |
| 8 | Admin pending approval count badge does not update when teacher submits event | Teacher → Admin | HIGH |
| 9 | Waitlist logic — when a student cancels, next waitlisted student is not notified | Student | MEDIUM |
| 10 | Section-level error handling missing — one API failure kills whole page | All | MEDIUM |
| 11 | Token auto-refresh on 401 not implemented — sessions die silently | All | MEDIUM |
| 12 | Role restrictions not enforced consistently on all Lambda routes | Backend | MEDIUM |
| 13 | Media upload banner rendering inconsistent | All | LOW |
| 14 | Help page content incomplete | Admin | LOW |

---

## THE CORE REAL-TIME PROBLEM EXPLAINED

Your WebSocket infrastructure IS deployed and working at the connection level.

The problem is the last mile: `ems-realtime.js` receives messages but the portal
pages do not have handlers that react to those messages and update the DOM.

Think of it this way:
- The pipe is built and water flows through it
- But the taps at each page are not connected to the pipe

The fix is adding message handlers in each portal page that:
1. Listen to the global message bus from ems-realtime.js
2. When a relevant message arrives, re-fetch or patch the specific DOM element
3. Never reload the whole page — only update the affected section

---

## PROMPT 1 — FIX ems-realtime.js: MAKE IT A PROPER EVENT BUS

```
CODEX PROMPT:

Open ems-realtime.js. Currently it opens a WebSocket connection but does not
give individual pages a clean way to subscribe to specific message types.

Add a global message bus pattern so any page can subscribe to specific message types:

// Global subscriber registry
window._emsRealtimeSubscribers = {};

// Pages call this to subscribe to a message type
window.onRealtimeMessage = function(messageType, callbackFn) {
  if (!window._emsRealtimeSubscribers[messageType]) {
    window._emsRealtimeSubscribers[messageType] = [];
  }
  window._emsRealtimeSubscribers[messageType].push(callbackFn);
};

// Pages call this to unsubscribe (on page unload)
window.offRealtimeMessage = function(messageType, callbackFn) {
  if (!window._emsRealtimeSubscribers[messageType]) return;
  window._emsRealtimeSubscribers[messageType] =
    window._emsRealtimeSubscribers[messageType].filter(fn => fn !== callbackFn);
};

// Inside the existing ws.onmessage handler, dispatch to subscribers:
ws.onmessage = function(event) {
  try {
    const message = JSON.parse(event.data);
    const type = message.type || message.action;
    if (type && window._emsRealtimeSubscribers[type]) {
      window._emsRealtimeSubscribers[type].forEach(fn => {
        try { fn(message.data || message); }
        catch(err) { console.error('[Realtime] Handler error for', type, err); }
      });
    }
    // Also dispatch a wildcard subscriber for pages that want all messages
    if (window._emsRealtimeSubscribers['*']) {
      window._emsRealtimeSubscribers['*'].forEach(fn => {
        try { fn(message); }
        catch(err) {}
      });
    }
  } catch(err) {
    console.error('[Realtime] Failed to parse WS message', err);
  }
};

// Also expose a status observable
window._emsWsStatus = 'disconnected';
ws.onopen = function() {
  window._emsWsStatus = 'connected';
  document.dispatchEvent(new CustomEvent('ems-ws-connected'));
};
ws.onclose = function() {
  window._emsWsStatus = 'disconnected';
  document.dispatchEvent(new CustomEvent('ems-ws-disconnected'));
};

This change is purely additive — it does not break anything existing.
Existing code in the file stays exactly as is.
```

---

## PROMPT 2 — FIX STUDENT BROWSE EVENTS: LIVE SEAT COUNTER

```
CODEX PROMPT:

Open student-browse-events-page.js.

After events are rendered on the page, add WebSocket subscriptions
so seat counts update live without any page reload.

Add this block AFTER the events have been rendered into the DOM:

// Subscribe to seat updates
window.onRealtimeMessage('seat_updated', function(data) {
  const eventId = data.event_id;
  const seatsRemaining = data.seats_remaining;
  const totalCapacity = data.total_capacity;
  const percentage = Math.round(((totalCapacity - seatsRemaining) / totalCapacity) * 100);

  // Find the event card for this event_id on the current page
  const card = document.querySelector('[data-event-id="' + eventId + '"]');
  if (!card) return;

  // Update the seat count text inside the card
  const seatEl = card.querySelector('.seat-count');
  if (seatEl) {
    seatEl.textContent = seatsRemaining + ' seats left';
    // Flash amber for 600ms then return to normal
    seatEl.style.background = '#FEF3CD';
    seatEl.style.color = '#92400E';
    setTimeout(function() {
      seatEl.style.background = '';
      seatEl.style.color = '';
    }, 600);
  }

  // Update the progress bar fill
  const progressBar = card.querySelector('.capacity-bar-fill');
  if (progressBar) {
    progressBar.style.width = percentage + '%';
    if (seatsRemaining <= 5) progressBar.style.background = '#EF4444';
    else if (seatsRemaining <= 15) progressBar.style.background = '#F59E0B';
    else progressBar.style.background = '#1A1A2E';
  }

  // Update percentage text
  const pctEl = card.querySelector('.capacity-percent');
  if (pctEl) pctEl.textContent = percentage + '%';

  // Update join button state if seats hit 0
  const joinBtn = card.querySelector('.join-btn');
  if (joinBtn && seatsRemaining === 0) {
    joinBtn.textContent = 'Join Waitlist';
    joinBtn.classList.remove('btn-join');
    joinBtn.classList.add('btn-waitlist');
    joinBtn.disabled = false;
  }
});

// Subscribe to new events being approved — add card to grid live
window.onRealtimeMessage('event_approved', function(data) {
  // Pulse the Browse Events sidebar link to signal new content
  const sidebarLink = document.querySelector('a[href*="browse"]');
  if (sidebarLink) {
    const dot = sidebarLink.querySelector('.pulse-dot');
    if (dot) {
      dot.style.display = 'block';
      setTimeout(function() { dot.style.display = 'none'; }, 8000);
    }
  }
  // Refresh the event grid to include the new event
  // Call the existing loadEvents function which the page already has
  if (typeof loadEvents === 'function') loadEvents();
});

IMPORTANT: Make sure every event card in student-browse-events-page.js has
data-event-id="[the event's id]" on its root element when it is rendered.
This is how the WebSocket handler finds the right card to update.
```

---

## PROMPT 3 — FIX STUDENT JOIN BUTTON: UPDATE ALL PORTALS AFTER JOIN

```
CODEX PROMPT:

Open student-browse-events-page.js. Find the join button click handler.

After the POST /registrations API call succeeds, the backend already broadcasts
seat_updated and new_registration. The frontend just needs to handle the response
correctly and update the UI immediately without waiting for the WebSocket echo.

Update the join handler to do both an optimistic local update AND handle
the WebSocket broadcast:

async function handleJoinEvent(eventId, maxCapacity, currentCount) {
  const joinBtn = document.querySelector('[data-event-id="' + eventId + '"] .join-btn');
  if (!joinBtn) return;

  // Disable button and show loading state
  joinBtn.disabled = true;
  const originalText = joinBtn.textContent;
  joinBtn.textContent = 'Joining...';
  joinBtn.style.opacity = '0.7';

  try {
    const response = await apiRequest('POST', '/registrations', {
      event_id: eventId
    });

    if (response.status === 'registered') {
      // Success — update button to joined state immediately
      joinBtn.textContent = '✓ Joined';
      joinBtn.classList.remove('btn-join');
      joinBtn.classList.add('btn-joined');
      joinBtn.disabled = true;

      // Optimistically update seat count on THIS student's screen
      // without waiting for WebSocket (WebSocket will update other users)
      const card = document.querySelector('[data-event-id="' + eventId + '"]');
      const seatEl = card?.querySelector('.seat-count');
      if (seatEl) {
        const currentSeats = parseInt(seatEl.textContent) || 0;
        seatEl.textContent = Math.max(0, currentSeats - 1) + ' seats left';
      }

      showToast('You have joined this event successfully!', 'success');

    } else if (response.status === 'waitlisted') {
      joinBtn.textContent = '⏳ Waitlisted';
      joinBtn.classList.remove('btn-join');
      joinBtn.classList.add('btn-waitlist');
      joinBtn.disabled = true;
      showToast('Event is full. You have been added to the waitlist.', 'info');

    }
  } catch(err) {
    joinBtn.textContent = originalText;
    joinBtn.disabled = false;
    joinBtn.style.opacity = '1';

    if (err.status === 409) {
      showToast('That was the last seat. You have been waitlisted instead.', 'warning');
      if (typeof loadEvents === 'function') loadEvents();
    } else if (err.status === 400 && err.message?.includes('already')) {
      showToast('You are already registered for this event.', 'info');
    } else {
      showToast('Failed to join event. Please try again.', 'error');
    }
  }
}
```

---

## PROMPT 4 — FIX ADMIN DASHBOARD: REACT TO REALTIME MESSAGES

```
CODEX PROMPT:

Open dashboard-page.js. Add WebSocket subscriptions after the dashboard
has finished its initial data load.

Add this block at the end of the page initialization:

// Realtime: new event submitted by teacher — update pending count badge
window.onRealtimeMessage('event_submitted', function(data) {
  const badge = document.querySelector('.pending-approval-count');
  if (badge) {
    const current = parseInt(badge.textContent) || 0;
    badge.textContent = current + 1;
    // Flash badge amber
    badge.style.background = '#F59E0B';
    setTimeout(function() { badge.style.background = ''; }, 1000);
  }
  // Also refresh approval list section if visible
  if (typeof loadPendingApprovals === 'function') loadPendingApprovals();
});

// Realtime: student joined — update registration count
window.onRealtimeMessage('new_registration', function(data) {
  // Update total registrations stat card
  const regCard = document.querySelector('[data-stat="total-registrations"] .stat-number');
  if (regCard) {
    const current = parseInt(regCard.textContent.replace(/,/g, '')) || 0;
    regCard.textContent = (current + 1).toLocaleString();
    // Flash green
    const card = regCard.closest('.stat-card');
    if (card) {
      card.style.background = '#D1FAE5';
      setTimeout(function() { card.style.background = ''; }, 800);
    }
  }
  // Update live activity feed
  addLiveFeedItem('new_registration', data);
});

// Realtime: revenue update — update chart and revenue cards
window.onRealtimeMessage('revenue_updated', function(data) {
  // Update today revenue card if it exists
  const todayEl = document.querySelector('[data-stat="revenue-today"] .stat-number');
  if (todayEl && data.total_revenue_today !== undefined) {
    todayEl.textContent = '₹' + data.total_revenue_today.toLocaleString();
    const card = todayEl.closest('.stat-card');
    if (card) {
      card.style.background = '#D1FAE5';
      setTimeout(function() { card.style.background = ''; }, 800);
    }
  }
  // Update revenue chart current month bar if chart exists
  if (window.revenueChartInstance && data.total_revenue_month) {
    const currentMonth = new Date().getMonth();
    if (window.revenueChartInstance.data?.datasets?.[0]?.data) {
      window.revenueChartInstance.data.datasets[0].data[currentMonth] = data.total_revenue_month;
      window.revenueChartInstance.update('none'); // no animation on live update
    }
  }
});

// Realtime: event approved — update event counts
window.onRealtimeMessage('event_approved', function(data) {
  addLiveFeedItem('event_approved', data);
  if (typeof loadEvents === 'function') loadEvents();
});

// Helper: add item to live activity feed
function addLiveFeedItem(type, data) {
  const feed = document.querySelector('.live-activity-feed');
  if (!feed) return;

  const icons = {
    new_registration: { icon: '👤', color: '#3B82F6' },
    event_approved: { icon: '✅', color: '#4CAF82' },
    event_submitted: { icon: '📋', color: '#F59E0B' },
    seat_updated: { icon: '🎟️', color: '#1A1A2E' },
  };

  const meta = icons[type] || { icon: '📢', color: '#6B7280' };
  const timeStr = 'Just now';

  const item = document.createElement('div');
  item.className = 'feed-item feed-item-new';
  item.innerHTML =
    '<div class="feed-icon" style="background:' + meta.color + '20;color:' + meta.color + '">' + meta.icon + '</div>' +
    '<div class="feed-content">' +
    '<span class="feed-title">' + (data.event_title || 'Event') + '</span>' +
    '<span class="feed-desc">' + getFeedDescription(type, data) + '</span>' +
    '</div>' +
    '<span class="feed-time">' + timeStr + '</span>';

  // Animate in
  item.style.opacity = '0';
  item.style.transform = 'translateY(-8px)';
  feed.insertBefore(item, feed.firstChild);
  setTimeout(function() {
    item.style.transition = 'all 0.3s ease';
    item.style.opacity = '1';
    item.style.transform = 'translateY(0)';
  }, 10);

  // Remove oldest item if feed exceeds 6 items
  const items = feed.querySelectorAll('.feed-item');
  if (items.length > 6) {
    const last = items[items.length - 1];
    last.style.opacity = '0';
    setTimeout(function() { last.remove(); }, 300);
  }
}

function getFeedDescription(type, data) {
  if (type === 'new_registration') return 'A student just joined';
  if (type === 'event_approved') return 'Event is now live';
  if (type === 'event_submitted') return 'Submitted by ' + (data.teacher_name || 'a teacher');
  return 'Activity recorded';
}
```

---

## PROMPT 5 — FIX TEACHER PORTAL: REACT TO REALTIME MESSAGES

```
CODEX PROMPT:

Open teacher-dashboard-page.js. Add WebSocket subscriptions after page load.
Also open teacher-my-events-page.js and teacher-students-page.js.

IN teacher-dashboard-page.js add after page initialization:

// Realtime: new student joined MY event
window.onRealtimeMessage('new_registration', function(data) {
  // Check if this registration is for one of my events
  // myEventIds should be a Set built when loadMyEvents() runs
  if (!window.myEventIds || !window.myEventIds.has(data.event_id)) return;

  // Update the registered count on the event row
  const countEl = document.querySelector(
    '[data-event-id="' + data.event_id + '"] .registered-count'
  );
  if (countEl) {
    const current = parseInt(countEl.textContent) || 0;
    countEl.textContent = current + 1;
    countEl.style.color = '#4CAF82';
    setTimeout(function() { countEl.style.color = ''; }, 1000);
  }

  showToast('A student just joined ' + (data.event_title || 'your event'), 'info');
});

// Realtime: my event was approved or rejected
window.onRealtimeMessage('event_approved', function(data) {
  if (!window.myEventIds || !window.myEventIds.has(data.event_id)) return;
  updateEventStatusBadge(data.event_id, 'approved');
  showToast('Your event "' + data.event_title + '" has been approved!', 'success');
});

window.onRealtimeMessage('event_rejected', function(data) {
  if (!window.myEventIds || !window.myEventIds.has(data.event_id)) return;
  updateEventStatusBadge(data.event_id, 'rejected');
  showToast('Your event "' + data.event_title + '" was rejected. Check your email for details.', 'error');
});

function updateEventStatusBadge(eventId, newStatus) {
  const badge = document.querySelector('[data-event-id="' + eventId + '"] .status-badge');
  if (!badge) return;
  badge.className = 'status-badge status-' + newStatus;
  const labels = { approved: 'Approved', rejected: 'Rejected', pending: 'Pending', draft: 'Draft' };
  badge.textContent = labels[newStatus] || newStatus;
}

// When loading events, populate window.myEventIds for the checks above
// Add this line inside the existing loadMyEvents() or loadTeacherEvents() function:
// window.myEventIds = new Set(events.map(e => e.id || e.event_id));

IN teacher-students-page.js add after page renders the student table:

// Realtime: new student joined this event — add row to table live
window.onRealtimeMessage('new_registration', function(data) {
  const currentEventId = new URLSearchParams(window.location.search).get('event_id');
  if (data.event_id !== currentEventId) return;

  // Increment the registered count in the summary bar
  const countEl = document.querySelector('.total-registered-count');
  if (countEl) countEl.textContent = parseInt(countEl.textContent || 0) + 1;

  // Refresh the student table to show the new student
  if (typeof loadStudents === 'function') loadStudents();
});
```

---

## PROMPT 6 — FIX THE TEACHER DASHBOARD SEQUENTIAL API CRASH

```
CODEX PROMPT:

Open teacher-dashboard-page.js. The current code calls multiple APIs in sequence
and one failure crashes the entire page. Apply the Promise.allSettled fix.

Find the main initialization function (likely called init, loadDashboard, or similar).
Replace any chained await calls with parallel independent calls:

async function initDashboard() {
  // Run all sections in parallel — each is fully independent
  await Promise.allSettled([
    loadSharedEventsSection(),
    loadMyEventsSection(),
    loadStaffInvitesSection(),
    loadAttendancePendingSection(),
  ]);
  // After all settle, set up realtime subscriptions
  setupRealtimeHandlers();
}

async function loadSharedEventsSection() {
  const section = document.getElementById('shared-events-section');
  try {
    showSectionSkeleton(section);
    const data = await apiRequest('GET', '/events?status=approved');
    renderSharedEvents(data);
  } catch(err) {
    console.error('[SharedEvents]', extractErrorMessage(err));
    showSectionError(section, 'Could not load events.');
    // Never rethrow — other sections must still load
  }
}

async function loadMyEventsSection() {
  const section = document.getElementById('my-events-section');
  try {
    showSectionSkeleton(section);
    const data = await apiRequest('GET', '/events?mine=true');
    window.myEventIds = new Set((data || []).map(e => e.id || e.event_id));
    renderMyEvents(data);
    // Attendance summary is a secondary optional call
    // It runs inside its own try/catch so it cannot crash myEvents section
    await loadAttendanceSummaryOptional(data);
  } catch(err) {
    console.error('[MyEvents]', extractErrorMessage(err));
    showSectionError(section, 'Could not load your events.');
  }
}

async function loadAttendanceSummaryOptional(myEvents) {
  try {
    const completed = (myEvents || [])
      .filter(e => e.status === 'completed')
      .slice(0, 3);
    const results = await Promise.allSettled(
      completed.map(e => apiRequest('GET', '/attendance?event_id=' + (e.id || e.event_id)))
    );
    const valid = results
      .filter(r => r.status === 'fulfilled')
      .map(r => r.value);
    renderAttendanceSummary(valid);
  } catch(err) {
    console.warn('[AttendanceSummary] Skipped:', extractErrorMessage(err));
    // Silently skip — this is optional dashboard data
  }
}

async function loadStaffInvitesSection() {
  try {
    // Check if staff-invites endpoint exists before calling it
    const data = await apiRequest('GET', '/events/staff-invites').catch(() => []);
    renderStaffInvites(data || []);
  } catch(err) {
    renderStaffInvites([]);
  }
}

async function loadAttendancePendingSection() {
  try {
    const data = await apiRequest('GET', '/attendance/pending').catch(() => []);
    renderAttendancePending(data || []);
  } catch(err) {
    renderAttendancePending([]);
  }
}

function extractErrorMessage(err) {
  return err?.message || err?.response?.data?.message || 'Unknown error';
}

function showSectionSkeleton(sectionEl) {
  if (!sectionEl) return;
  sectionEl.innerHTML =
    '<div style="padding:16px">' +
    '<div class="skeleton-line" style="height:14px;width:60%;margin-bottom:10px"></div>' +
    '<div class="skeleton-line" style="height:14px;width:80%;margin-bottom:10px"></div>' +
    '<div class="skeleton-line" style="height:14px;width:45%"></div>' +
    '</div>';
}

function showSectionError(sectionEl, message) {
  if (!sectionEl) return;
  sectionEl.innerHTML =
    '<div style="padding:20px;text-align:center;color:#9CA3AF">' +
    '<div style="font-size:22px;margin-bottom:8px">⚠</div>' +
    '<p style="font-size:13px;margin-bottom:12px">' + message + '</p>' +
    '<button onclick="location.reload()" style="height:32px;padding:0 16px;border-radius:8px;border:1px solid #E8E2D9;background:#fff;font-size:12px;cursor:pointer">Retry</button>' +
    '</div>';
}
```

---

## PROMPT 7 — FIX TOKEN AUTO-REFRESH ON 401

```
CODEX PROMPT:

Open teacher-shared.js and student-shared.js.

Find the existing apiRequest function or the fetch/axios wrapper.
Add a 401 auto-retry with token refresh so sessions do not die silently.

Wrap the existing request logic with this pattern:

async function apiRequest(method, path, body) {
  const result = await makeRequest(method, path, body);

  // If 401, try to refresh token once then retry
  if (result.status === 401) {
    console.warn('[Auth] 401 received — attempting session refresh');
    const refreshed = await tryRefreshSession();
    if (refreshed) {
      return await makeRequest(method, path, body);
    } else {
      console.error('[Auth] Refresh failed — redirecting to login');
      clearSession();
      window.location.href = '/index.html';
      return;
    }
  }

  return result;
}

async function tryRefreshSession() {
  try {
    // Get stored refresh token
    const tokenBundle = JSON.parse(localStorage.getItem('ems_auth') || '{}');
    const refreshToken = tokenBundle.refreshToken;
    if (!refreshToken) return false;

    // Call Cognito token refresh endpoint directly
    const cognitoEndpoint = EMS_CONFIG.cognitoTokenEndpoint;
    const clientId = EMS_CONFIG.cognitoClientId;

    const response = await fetch(cognitoEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: clientId,
        refresh_token: refreshToken,
      })
    });

    if (!response.ok) return false;

    const tokens = await response.json();
    // Store new tokens
    tokenBundle.accessToken = tokens.access_token;
    tokenBundle.idToken = tokens.id_token;
    localStorage.setItem('ems_auth', JSON.stringify(tokenBundle));
    return true;
  } catch(err) {
    console.error('[Auth] Token refresh error:', err);
    return false;
  }
}

Also add these two values to ems-config.js if not already present:
cognitoTokenEndpoint: 'https://cognito-idp.ap-south-1.amazonaws.com/YOUR_USER_POOL_ID/token'
cognitoClientId: 'YOUR_APP_CLIENT_ID'
Replace the placeholder values with the actual Cognito pool values already in use.
```

---

## PROMPT 8 — FIX ATTENDANCE SUBMISSION → STUDENT NOTIFICATION

```
CODEX PROMPT:

Open teacher-attendance-page.js. Find the function that submits attendance
(likely a submit button click handler calling POST /attendance).

After a successful attendance submission, the backend already broadcasts
attendance_submitted via WebSocket. The student portal needs to handle it.

IN teacher-attendance-page.js — after successful POST /attendance:
// Nothing to add here — the backend broadcast handles it.
// Just ensure the success flow shows a confirmation:

showToast('Attendance submitted successfully for ' + attendedCount + ' students.', 'success');
// Disable the submit button to prevent double submission
submitBtn.disabled = true;
submitBtn.textContent = '✓ Attendance Submitted';
submitBtn.style.background = '#4CAF82';

IN student-attendance-page.js — add after page initialization:

window.onRealtimeMessage('attendance_submitted', function(data) {
  const currentUserId = getCurrentUserId(); // from shared session helper
  const myMark = (data.marks || []).find(m =>
    m.student_id === currentUserId || m.userId === currentUserId
  );

  if (!myMark) return; // This attendance submission is not for this student

  // Show a toast notification
  const status = myMark.status === 'present' ? 'Present ✓' : 'Absent ✗';
  const toastType = myMark.status === 'present' ? 'success' : 'warning';
  showToast('Your attendance for "' + data.event_title + '" has been marked: ' + status, toastType);

  // Refresh the attendance list to show the new status
  if (typeof loadAttendance === 'function') loadAttendance();
});
```

---

## PROMPT 9 — FIX WAITLIST: AUTO-PROMOTE ON CANCELLATION

```
CODEX PROMPT:

Open the registrations-handler Lambda backend file.

Find the DELETE /registrations/:id handler (student cancels registration).

After the cancellation is recorded and the seat counter is incremented back,
add waitlist promotion logic:

// After successful cancellation and seat counter increment:

// Check if anyone is waitlisted for this event
const waitlistedResult = await dynamoRepo.queryByGSI(
  REGISTRATIONS_TABLE,
  'event-status-index',      // GSI on event_id + status
  { event_id: eventId, status: 'waitlisted' },
  { limit: 1, sortBy: 'created_at', ascending: true }  // oldest waitlisted first
);

if (waitlistedResult.items.length > 0) {
  const nextInLine = waitlistedResult.items[0];

  // Promote from waitlist to registered
  await dynamoRepo.update(REGISTRATIONS_TABLE, nextInLine.id, {
    status: 'registered',
    promoted_from_waitlist_at: new Date().toISOString(),
  });

  // Decrement seat counter again (the newly promoted student takes the released seat)
  await dynamoRepo.atomicDecrement(SEAT_COUNTER_TABLE, eventId, 'current_count', 1);

  // Broadcast seat_updated (net change = 0 seats, someone just moved from waitlist)
  await broadcastRealtimeMessage('seat_updated', {
    event_id: eventId,
    seats_remaining: 0,  // recalculate actual seats remaining
    event_title: eventDetails.title,
  });

  // Broadcast waitlist_moved to ALL connections so the promoted student gets notified
  await broadcastRealtimeMessage('waitlist_moved', {
    event_id: eventId,
    student_id: nextInLine.student_id || nextInLine.userId,
    new_position: 0,        // 0 means promoted to registered
    event_title: eventDetails.title,
    promoted: true,
  });
}

IN student-registrations-page.js add:

window.onRealtimeMessage('waitlist_moved', function(data) {
  const currentUserId = getCurrentUserId();
  if (data.student_id !== currentUserId) return;

  if (data.promoted) {
    showToast('Great news! A spot opened up and you have been registered for "' + data.event_title + '"!', 'success');
    // Refresh registrations list
    if (typeof loadRegistrations === 'function') loadRegistrations();
  }
});
```

---

## PROMPT 10 — FIX BACKEND ROLE ENFORCEMENT

```
CODEX PROMPT:

Open backend/shared/src/auth.ts.

The current role checking may not be handling all edge cases. Replace with
a hardened version that checks all Cognito claim locations:

export function getRoleFromClaims(claims: Record<string, any>): string {
  // Primary: Cognito groups array (most reliable)
  const groups: string[] = claims['cognito:groups'] || [];
  if (groups.some(g => g.toLowerCase() === 'admins' || g.toLowerCase() === 'admin')) return 'admin';
  if (groups.some(g => g.toLowerCase() === 'teachers' || g.toLowerCase() === 'teacher')) return 'teacher';
  if (groups.some(g => g.toLowerCase() === 'students' || g.toLowerCase() === 'student')) return 'student';

  // Fallback: custom attribute
  const customRole = claims['custom:role'];
  if (customRole) return customRole.toLowerCase();

  return 'student'; // safest default
}

// Role permission check
export function requireRole(actor: any, allowedRoles: string[]): void {
  if (!allowedRoles.includes(actor.role)) {
    throw Object.assign(new Error('You do not have permission to perform this action'), { statusCode: 403 });
  }
}

// Data privacy: students never see other students' data
export function requireSelfOrRole(actor: any, targetUserId: string, allowedRoles: string[]): void {
  if (actor.id === targetUserId) return; // own data is always allowed
  requireRole(actor, allowedRoles);
}

Apply requireRole checks to these routes if not already enforced:
- POST /events                     → requireRole(actor, ['admin', 'teacher'])
- PUT /events/:id/approve          → requireRole(actor, ['admin'])
- PUT /events/:id/reject           → requireRole(actor, ['admin'])
- GET /events/:id/registrations    → requireRole(actor, ['admin', 'teacher'])
- POST /attendance                 → requireRole(actor, ['teacher'])
- GET /analytics/overview          → requireRole(actor, ['admin'])
- GET /users                       → requireRole(actor, ['admin'])
- PUT /users/:id/approval          → requireRole(actor, ['admin'])

For GET /events/:id/registrations also verify:
  - if teacher: either created_by matches OR actor.id is in staff_coordinators
  - never return student email or name to admin portal (return count only)
```

---

## FINAL WIRING PROMPT — END-TO-END TEST CHECKLIST

```
CODEX PROMPT:

Create a manual end-to-end test script at docs/e2e-test-checklist.md that
covers every real-time connection in the system.

The tester should open three browser windows simultaneously:
- Window 1: Admin Portal (admin account)
- Window 2: Teacher Portal (teacher account)
- Window 3: Student Portal (student account)

Test 1: STUDENT JOINS EVENT — seats update across all portals
Steps:
1. Admin: open Events page, note seat count for "Food Exhibition"
2. Teacher: open My Events, find "Food Exhibition"
3. Student: open Browse Events, find "Food Exhibition", click Join
Expected within 3 seconds:
  - Student: button changes to "Joined", seat count decrements by 1
  - Teacher: registration count on event card increments by 1
  - Admin: event registration count increments by 1
  - Admin: live activity feed shows "A student just joined Food Exhibition"

Test 2: ADMIN APPROVES EVENT — new event appears in student browse
Steps:
1. Teacher: create a new event, submit for approval
2. Admin: open Event Approvals page, approve the event
Expected within 3 seconds:
  - Teacher: event status badge changes from Pending to Approved
  - Student: new event card appears in Browse Events grid
  - Admin: pending count badge decrements by 1

Test 3: STUDENT CANCELS — waitlisted student gets promoted
Steps:
1. Fill an event to capacity using test accounts
2. Register one more student — they get waitlisted
3. First student cancels their registration
Expected within 5 seconds:
  - Waitlisted student: toast "A spot opened up for you!"
  - Waitlisted student: My Registrations shows status changed to Registered
  - All portals: seat count stays at 0 (promoted student filled the seat)

Test 4: TEACHER MARKS ATTENDANCE — student sees their status update
Steps:
1. Teacher: open Attendance for an event with registered students
2. Mark student A as Present, student B as Absent, submit
Expected within 3 seconds:
  - Student A: toast "Your attendance has been marked: Present"
  - Student B: toast "Your attendance has been marked: Absent"
  - Admin analytics: attendance rate refreshes

Test 5: REVENUE UPDATE
Steps:
1. Admin: note current Revenue Today value on dashboard
2. Student: join a paid event (non-zero price)
Expected within 3 seconds:
  - Admin: Revenue Today value increments by the event price
  - Admin: revenue stat card flashes green briefly

All 5 tests passing = the system is fully connected in real time.
```

---

## REMAINING WORK SUMMARY (in order of importance)

### Must fix before project is complete

```
1.  ems-realtime.js — add onRealtimeMessage event bus (Prompt 1)
2.  teacher-dashboard-page.js — Promise.allSettled fix (Prompt 6)
3.  student-browse-events-page.js — live seat counter + join handler (Prompts 2 + 3)
4.  dashboard-page.js admin — realtime message handlers (Prompt 4)
5.  teacher-dashboard-page.js — realtime message handlers (Prompt 5)
6.  Token auto-refresh on 401 (Prompt 7)
7.  Attendance → student notification (Prompt 8)
8.  Waitlist auto-promotion on cancel (Prompt 9)
9.  Backend role enforcement hardening (Prompt 10)
```

### Nice to have before launch

```
10. Skeleton loaders in every section that makes an API call
11. Media banner rendering consistency (check CloudFront URL is used everywhere)
12. Help page content completion
13. End-to-end test run using the checklist in Prompt 11
```

### Files to touch in order

```
1.  ems-realtime.js                              (Prompt 1)
2.  student-browse-events-page.js                (Prompts 2 + 3)
3.  dashboard-page.js                            (Prompt 4)
4.  teacher-dashboard-page.js                    (Prompts 5 + 6)
5.  teacher-students-page.js                     (Prompt 5)
6.  teacher-shared.js + student-shared.js        (Prompt 7)
7.  teacher-attendance-page.js                   (Prompt 8)
8.  student-attendance-page.js                   (Prompt 8)
9.  student-registrations-page.js                (Prompt 9)
10. backend/functions/registrations-handler      (Prompt 9)
11. backend/shared/src/auth.ts                   (Prompt 10)
```

### The single most important fact

Everything in AWS is already deployed and working at the infrastructure level.
The WebSocket API is live. The Lambda functions are live. DynamoDB is live.
The only thing missing is the last mile: portal pages listening to and reacting
to the messages that are already being broadcast.

Fix ems-realtime.js first (Prompt 1). Then add handlers page by page.
The whole system connects with these additions — no new infrastructure needed.
