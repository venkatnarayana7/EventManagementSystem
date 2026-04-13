# EMS Student Portal + Real-Time Architecture Plan
## Complete Plan · Same UI · AWS Expert Design · All Portals Connected

---

## WHAT THIS DOCUMENT COVERS

1. Student Portal — every page, every feature, same Eventopia UI
2. Real-Time Architecture — how all 3 portals share live data via AWS
3. Revenue Flow — how student joins → payment → admin revenue dashboard
4. Remaining Connections — every loose end that needs wiring across all portals
5. AWS Services Needed — exact services, exact purpose, no guessing

---

## PART 1 — STUDENT PORTAL

---

### DESIGN SYSTEM

Exact same as Admin and Teacher portals. Copy index.css verbatim.

```css
--bg-sidebar:   #1A1A2E;
--bg-main:      #F5F0E8;
--bg-card:      #FFFFFF;
--text-primary: #1A1A2E;
--accent-green: #4CAF82;
--accent-red:   #EF4444;
--accent-amber: #F59E0B;
--border-light: #E8E2D9;
font-family: 'Sora', sans-serif;
```

---

### PROJECT STRUCTURE

```
student-portal/
src/
  components/
    layout/
      Sidebar.jsx
      Header.jsx
      Layout.jsx
    events/
      EventCard.jsx
      EventsGrid.jsx
      EventDetailModal.jsx
    ui/
      StatCard.jsx
      Badge.jsx
      Toast.jsx
      RealTimeBadge.jsx    <- live seat counter
    realtime/
      useWebSocket.js      <- WebSocket hook
  pages/
    Dashboard.jsx
    BrowseEvents.jsx
    MyRegistrations.jsx
    MyAttendance.jsx
    Profile.jsx
  data/
    mockData.js
  App.jsx
  main.jsx
  index.css
```

---

### ROUTES

```
/                      -> redirect to /dashboard
/dashboard             -> Student Dashboard
/browse                -> Browse and Join Events
/my-registrations      -> My Joined Events
/my-attendance         -> My Attendance History
/profile               -> Student Profile
```

---

## STUDENT PAGE 1 — SIDEBAR

```
CODEX PROMPT:

Build the Sidebar for the Student Portal. Identical structure to Admin and Teacher sidebars.

Dimensions: 220px wide, full height fixed, background #1A1A2E.

TOP — Logo:
Brand icon + "EMS" bold white 16px
Subtitle "Student Portal" in var(--text-sidebar-muted) 11px

NAVIGATION label "Menu":
Nav items height 40px, border-radius 10px, padding 0 12px:
1. Dashboard        /dashboard          LayoutDashboard icon
2. Browse Events    /browse             Compass icon
3. My Registrations /my-registrations   Ticket icon
4. My Attendance    /my-attendance      ClipboardCheck icon

GENERAL section:
5. Profile          /profile            UserCircle icon
6. Logout           triggers logout     LogOut icon red on hover

BOTTOM — same Download Our Mobile App promo card as admin and teacher portals.

One key visual difference: add a live green pulse dot next to Browse Events label
when there are newly added events (real-time indicator):
8px circle, background #4CAF82
animation pulse 2s infinite opacity 1 to 0.4 to 1
This dot appears and disappears based on WebSocket new-event messages
controlled by a state variable showNewEventDot passed as prop from Layout
```

---

## STUDENT PAGE 2 — DASHBOARD

```
CODEX PROMPT:

Build the Student Dashboard at /dashboard.
Header: title="Dashboard" breadcrumb="Dashboard".
Padding 24px 28px, background var(--bg-main).

CSS Grid: left column flex 1, right column 380px. Gap 20px.

LEFT COLUMN top to bottom:

1. WELCOME BANNER:
Full-width card, background linear-gradient 135deg #1A1A2E 0% #2D2D4A 100%,
border-radius 16px, padding 24px 28px, color white, margin-bottom 20px.
Left: "Good morning, Priya!" bold 22px. Below: "Here is what is happening on campus today."
muted white 13px. Below: two quick-stat chips:
"3 upcoming events" CalendarDays icon white chip bg rgba(255,255,255,0.15)
"1 event this week" Clock icon same chip
Right side: decorative SVG illustration of student or calendar 80px.

2. STAT CARDS ROW — 4 cards, same style as admin and teacher portal:

Card 1 Events Joined:
CalendarCheck icon in bg #E8F5EE
Number 7 bold 28px
Subtext "total registrations" var(--text-muted) 11px

Card 2 Upcoming Events:
Clock icon in bg #FEF3CD
Number 3 bold 28px
Subtext "events ahead"

Card 3 Attended:
UserCheck icon in bg #EDE9FE
Number 4 bold 28px
Subtext "events attended"

Card 4 My Attendance Rate:
BarChart2 icon in bg #F0EBE3
Number "85%" bold 28px
Trend up 5% this month in var(--accent-green) 11px

3. UPCOMING REGISTERED EVENTS card white border-radius 16px padding 20px 24px:
Header "My Upcoming Events" bold 15px + "View All" link blue right to /my-registrations

List of 3 events I am registered for. Each row flex gap 12px padding 10px 0 border-bottom:
Poster thumbnail 52x52px border-radius 8px
Event title bold 14px + category chip small
Date and time row + location row with same icon style
Right side: LIVE seat counter chip showing "42/100 seats" — real-time via WebSocket
Chip style: bg var(--bg-card-alt) border var(--border-card) 11px font
When a seat is taken in real time the number animates and briefly flashes amber for 500ms
"View" link button outlined small 28px

4. RECOMMENDED EVENTS card white border-radius 16px padding 20px 24px:
Header "Recommended For You" bold 15px with small sparkle emoji
Subtitle "Based on your department and past registrations" muted 12px
Show 2 mini event rows: poster thumbnail 60x60px + title bold 13px + category chip +
date muted 12px + "Join Now" link blue 12px right

RIGHT COLUMN top to bottom:

5. LIVE EVENTS FEED card white border-radius 16px padding 20px 24px:
Header row: Zap icon yellow + "Live Updates" bold 15px + animated green dot 8px +
"LIVE" red chip 10px font bg #FEE2E2 color #EF4444 right
Subtitle "Real-time campus event activity" muted 12px

Feed list max 6 items scrollable new items slide in from top:
Each item padding 10px 0 border-bottom flex row gap 10px:
Left icon circle 32px:
  New registration: blue bg UserPlus icon white
  Event approved: green bg CheckCircle icon white
  Seat filling up: amber bg TrendingUp icon white
  New event added: purple bg CalendarPlus icon white
Center: event title bold 13px + activity text 12px var(--text-secondary)
Examples:
  "Food Exhibition" — "12 students joined in the last hour"
  "AI Workshop" — "Only 3 seats left!"
  "Tech Summit 2025" — "Just approved — registration open"
Right: timestamp "2m ago" 11px muted

This feed updates in real time via WebSocket. New items animate in from top
with slide-down + fade-in. Oldest items fade out at bottom when list exceeds 6.

6. CALENDAR CARD — same interactive calendar component reused from admin and teacher portals.
Events on their date shown as dark dots. Clicking a date shows events on that day.
```

---

## STUDENT PAGE 3 — BROWSE EVENTS PAGE

```
CODEX PROMPT:

Build the Browse Events page at /browse.
Header: title="Browse Events" breadcrumb="Browse Events".

THIS IS THE MOST IMPORTANT PAGE FOR STUDENTS.
It shows all approved events. Students JOIN events here consuming a seat.

TOP BAR same as admin Events page:
Left: "Browse Events" h2 + real-time count "24 events available"
Count has a small animated green dot left when WebSocket is connected
Right: search input + All Category filter pill + This Month filter pill + Grid/List toggle

TAB ROW pill tabs:
"All Events (24)" default
"Open to Join (18)" events with available seats
"Joined (3)" events I already joined
"Waitlisted (1)" events I am waitlisted for

CARD GRID — 4 columns, same EventCard component.

STUDENT-SPECIFIC CARD DIFFERENCES — hover action strip:
Eye icon opens EventDetailModal
"Join Event" button with UserPlus icon states:
  a. Available seats: "Join Event" green tint on hover
  b. Full 0 seats: "Join Waitlist" amber tint
  c. Already joined: checkmark "Joined" disabled green filled
  d. Waitlisted: hourglass "Waitlisted" disabled amber filled
  e. Deadline passed: "Closed" disabled gray

REAL-TIME SEAT COUNTER on card bottom updates LIVE via WebSocket:
When a seat is taken by someone else:
  Progress bar animates to new fill width
  Remaining seats count updates with brief amber flash
  If last 5 seats: progress bar changes from #1A1A2E to #F59E0B amber
  If 0 seats: progress bar changes to #EF4444 red, "Full" chip appears

EVENT DETAIL MODAL student version:
Same layout as teacher modal but right column shows:

SEAT AVAILABILITY WIDGET centerpiece:
Large display "42" bold 40px + "/100" muted 20px centered
Below "seats remaining" muted 12px centered
Progress bar 12px height
LIVE indicator: green dot + "Live" text 11px muted — updates in real time

If seats greater than 10: bar #1A1A2E, green "Available" chip
If seats 1 to 10: bar #F59E0B amber, "Filling Fast" chip with flame emoji
If seats 0: bar #EF4444 red, "Full" chip

PRICE SECTION:
Price "$10" bold 24px or "Free" in #4CAF82
If paid: note "Payment collected at venue" muted 11px

JOIN BUTTON full width 48px border-radius 12px font-weight 700:
Available: bg #1A1A2E white "Join This Event"
Full: bg #F59E0B white "Join Waitlist"
Already joined: bg #D1FAE5 color #065F46 "You are Joined" disabled

After clicking JOIN:
1. Button shows loading spinner, disabled
2. API call POST /registrations with event_id and student_id
3. On success:
   Button changes to joined green state
   Seat counter decrements by 1 with animation
   Toast: "You have successfully joined [Event Name]!" green
   WebSocket broadcasts seat update to ALL connected users viewing this event
4. On 409 conflict (last seat taken while modal was open):
   Toast: "Sorry, that was the last seat. You have been added to the waitlist." amber
5. On other error:
   Toast: "Something went wrong. Please try again." red
```

---

## STUDENT PAGE 4 — MY REGISTRATIONS PAGE

```
CODEX PROMPT:

Build the My Registrations page at /my-registrations.
Header: title="My Registrations" breadcrumb="My Registrations".

TAB ROW pill tabs:
"Upcoming (3)"
"Past (4)"
"Waitlisted (1)"
"Cancelled (0)"

CARD LIST STYLE same as teacher portal list rows:
white bg border-radius 14px border var(--border-card) padding 16px 20px
flex row gap 16px margin-bottom 10px hover bg var(--bg-card-alt)

LEFT: poster thumbnail 72x72px border-radius 10px

CENTER-LEFT flex 1:
Top row: event title bold 14px + category chip + status badge
Status badges:
  Upcoming: bg #DBEAFE color #1E40AF
  Attended: bg #D1FAE5 color #065F46 checkmark
  Absent: bg #FEE2E2 color #991B1B
  Waitlisted: bg #FEF3CD color #92400E showing position "Waitlisted #3"
  Cancelled: bg #F3F4F6 color #374151
Second row: CalendarDays icon + date + dot + Clock + time
Third row: MapPin red + venue
Fourth row: teacher avatar 20px + "Hosted by [Teacher Name]" 11px muted

CENTER-RIGHT width 160px:
COUNTDOWN TIMER for upcoming events:
"in 3 days" bold 14px
"Tomorrow" bold amber if less than 24 hours
"Today!" bold green with pulse if same day
"Ended" muted if past

RIGHT flex column align-items flex-end gap 8px:
Price paid: "$10" bold or "Free" green 13px
Action buttons:
"View Details" outlined 32px Eye icon
"Cancel Join" red text link only for upcoming before deadline with confirm modal
"Download Ticket" outlined Ticket icon only for upcoming confirmed
"Submit Feedback" amber outlined Star icon only for past attended events

WAITLISTED TAB:
Waitlist position prominently: "You are #3 on the waitlist"
Progress dots row 1 2 [3] 4 5 with current highlighted
Info text: "You will be auto-notified if someone cancels." muted
"Leave Waitlist" red text link
```

---

## STUDENT PAGE 5 — MY ATTENDANCE PAGE

```
CODEX PROMPT:

Build the My Attendance page at /my-attendance.
Header: title="My Attendance" breadcrumb="My Attendance".

TOP STATS ROW 3 stat cards:

Card 1 Total Attended:
UserCheck icon bg #E8F5EE
Number 4 bold 28px + "events attended" muted 11px

Card 2 Total Absent:
UserX icon bg #FEE2E2
Number 1 bold 28px + "events missed" muted 11px

Card 3 Attendance Rate:
Circular progress ring SVG 120px same as teacher attendance summary:
track #E8E2D9 fill #4CAF82 center "80%" bold 22px
Below ring "Your attendance rate" muted 11px

FILTER ROW: Date range picker + Event type dropdown + Sort by dropdown

ATTENDANCE LIST card list style:

Each row same layout as My Registrations but right side shows attendance status prominently.
Left border 4px: green if attended, red if absent.
Left: thumbnail + event info title date venue teacher name
Right: big status badge:
Present checkmark — bg #D1FAE5 color #16A34A bold 13px CheckCircle icon 36px height
Absent X — bg #FEE2E2 color #EF4444 XCircle icon
Not Marked dash — bg #F3F4F6 color #6B7280 teacher has not marked yet

Below status: "Marked by [Teacher Name]" 11px muted + timestamp

DOWNLOAD SECTION bottom:
Card white border-radius 16px padding 20px 24px
"Attendance Certificate" heading bold 15px
"Download your complete attendance record for this semester." muted 13px
"Download PDF Report" button filled #1A1A2E 40px Download icon
```

---

## STUDENT PAGE 6 — PROFILE PAGE

```
CODEX PROMPT:

Build the Student Profile page at /profile.
Header: title="My Profile" breadcrumb="Profile".
Identical two-column layout to Teacher Profile page.

LEFT COLUMN Profile Summary Card:
Avatar 96px circle with initials camera icon overlay
Student name bold 20px
"Student" chip bg #D1FAE5 color #065F46
Department, Roll Number mono 12px muted, email
Stats row: Events Joined / Events Attended / Feedback Given
"Change Password" outlined button full width

RIGHT COLUMN Editable Profile Form same edit mode pattern:
Fields: Full Name, Roll Number read-only, Department dropdown, Email read-only,
Phone Number, Date of Birth, Hostel or Address optional, Bio textarea
Save Changes + Cancel in edit mode

BELOW FORM Notification Preferences card same toggle style:
1. "New Event Notifications" — notify when events open for registration
2. "Registration Confirmation" — email when I join an event
3. "Seat Filling Alerts" — alert when an event I am watching is almost full
4. "Attendance Updates" — notify when teacher marks my attendance
5. "Event Reminder" — remind me 24 hours before my registered events
6. "Waitlist Movement" — notify when my waitlist position moves up
Save Preferences button filled #1A1A2E
```

---

## PART 2 — REAL-TIME ARCHITECTURE

---

### HOW REAL-TIME WORKS: THE AWS STACK

```
Three AWS services work together:

1. API Gateway WebSocket API  — persistent connections for all 3 portals
2. DynamoDB                   — stores active WebSocket connection IDs
3. Lambda                     — broadcasts messages to connected clients

Flow:
Student joins event
  POST /registrations REST API
  Lambda saves registration to Aurora DB
  Lambda decrements seat counter in DynamoDB atomic ADD -1
  Lambda invokes ws-broadcast Lambda async
  Broadcast Lambda queries DynamoDB for all connections watching this event_id
  Sends seat_updated message to all connected clients admin teachers students
  All portals receive the message and update their UI in under 300ms
```

---

## REAL-TIME PROMPT 1 — CDK WEBSOCKET INFRASTRUCTURE

```
CODEX CDK PROMPT:

In infrastructure/lib/realtime-stack.ts create the WebSocket infrastructure.

1. API GATEWAY WEBSOCKET API:

const wsApi = new apigatewayv2.WebSocketApi(this, 'EmsWebSocketApi', {
  apiName: 'ems-websocket-api',
  connectRouteOptions: {
    integration: new WebSocketLambdaIntegration('ConnectIntegration', connectHandler),
  },
  disconnectRouteOptions: {
    integration: new WebSocketLambdaIntegration('DisconnectIntegration', disconnectHandler),
  },
  defaultRouteOptions: {
    integration: new WebSocketLambdaIntegration('DefaultIntegration', messageHandler),
  },
});

const wsStage = new apigatewayv2.WebSocketStage(this, 'EmsWsStage', {
  webSocketApi: wsApi,
  stageName: 'prod',
  autoDeploy: true,
});

2. DYNAMODB CONNECTIONS TABLE:

const connectionsTable = new dynamodb.Table(this, 'WsConnections', {
  tableName: 'ems-ws-connections',
  partitionKey: { name: 'connectionId', type: dynamodb.AttributeType.STRING },
  billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
  timeToLiveAttribute: 'ttl',
});

connectionsTable.addGlobalSecondaryIndex({
  indexName: 'event-connections-index',
  partitionKey: { name: 'subscribed_event_id', type: dynamodb.AttributeType.STRING },
});

connectionsTable.addGlobalSecondaryIndex({
  indexName: 'portal-connections-index',
  partitionKey: { name: 'portal', type: dynamodb.AttributeType.STRING },
});

3. THREE LAMBDA FUNCTIONS:
ems-ws-connect    handles $connect route
ems-ws-disconnect handles $disconnect route
ems-ws-broadcast  called by other Lambdas to push messages

Grant broadcast Lambda execute-api:ManageConnections permission on wsApi.
Grant all WS Lambdas read/write on connectionsTable.
Export wsStage.callbackUrl as WS_ENDPOINT environment variable for broadcast Lambda.
```

---

## REAL-TIME PROMPT 2 — WEBSOCKET LAMBDA HANDLERS

```
CODEX PROMPT:

Create three Lambda functions for WebSocket management.

FILE: backend/functions/ws-connect/index.js

exports.handler = async (event) => {
  const connectionId = event.requestContext.connectionId;
  const queryParams = event.queryStringParameters || {};
  const portal = queryParams.portal || 'student';
  const eventId = queryParams.event_id || 'global';
  const userId = queryParams.user_id || 'anonymous';

  await dynamodb.put({
    TableName: 'ems-ws-connections',
    Item: {
      connectionId,
      portal,
      subscribed_event_id: eventId,
      user_id: userId,
      connected_at: Date.now(),
      ttl: Math.floor(Date.now() / 1000) + 7200,
    }
  }).promise();

  return { statusCode: 200, body: 'Connected' };
};

FILE: backend/functions/ws-disconnect/index.js

exports.handler = async (event) => {
  const connectionId = event.requestContext.connectionId;
  await dynamodb.delete({
    TableName: 'ems-ws-connections',
    Key: { connectionId }
  }).promise();
  return { statusCode: 200, body: 'Disconnected' };
};

FILE: backend/functions/ws-broadcast/index.js

exports.handler = async (event) => {
  const { message_type, payload, target } = event;

  let connections = [];

  if (target.type === 'event') {
    const result = await dynamodb.query({
      TableName: 'ems-ws-connections',
      IndexName: 'event-connections-index',
      KeyConditionExpression: 'subscribed_event_id = :eid',
      ExpressionAttributeValues: { ':eid': target.event_id }
    }).promise();
    connections = result.Items;
  }

  if (target.type === 'portal') {
    const result = await dynamodb.query({
      TableName: 'ems-ws-connections',
      IndexName: 'portal-connections-index',
      KeyConditionExpression: 'portal = :p',
      ExpressionAttributeValues: { ':p': target.portal }
    }).promise();
    connections = result.Items;
  }

  if (target.type === 'all') {
    const result = await dynamodb.scan({ TableName: 'ems-ws-connections' }).promise();
    connections = result.Items;
  }

  const client = new AWS.ApiGatewayManagementApi({ endpoint: process.env.WS_ENDPOINT });

  const sends = connections.map(async (conn) => {
    try {
      await client.postToConnection({
        ConnectionId: conn.connectionId,
        Data: JSON.stringify({ type: message_type, data: payload, timestamp: Date.now() })
      }).promise();
    } catch (err) {
      if (err.statusCode === 410) {
        await dynamodb.delete({
          TableName: 'ems-ws-connections',
          Key: { connectionId: conn.connectionId }
        }).promise();
      }
    }
  });

  await Promise.allSettled(sends);
  return { statusCode: 200 };
};
```

---

## REAL-TIME PROMPT 3 — MESSAGE TYPES

```
CODEX PROMPT:

Create backend/shared/src/ws-message-types.ts defining all WebSocket message types.

export const WS_EVENTS = {

  SEAT_UPDATED: 'seat_updated',
  // Payload: { event_id, seats_remaining, total_capacity, percentage_filled }
  // Target: all connections watching this event_id
  // Admin effect: updates registration count on event card
  // Teacher effect: updates student count on My Events
  // Student effect: updates seat counter on Browse page and detail modal

  SEAT_RELEASED: 'seat_released',
  // Payload: { event_id, seats_remaining, total_capacity }
  // Target: all connections for event + waitlisted students
  // Student waitlisted effect: toast "A seat opened up! Join now"

  EVENT_APPROVED: 'event_approved',
  // Payload: { event_id, event_title, event_date, category, seats_available }
  // Target: all portals
  // Student effect: new event card appears in Browse page with slide-in animation
  // Teacher effect: status badge on My Events changes to Approved
  // Admin effect: pending count decrements on dashboard

  EVENT_SUBMITTED: 'event_submitted',
  // Payload: { event_id, event_title, teacher_name }
  // Target: portal admin
  // Admin effect: pending approval badge increments, new item in approval list

  ATTENDANCE_SUBMITTED: 'attendance_submitted',
  // Payload: { event_id, present_count, absent_count, total_count, marked_by, student_marks }
  // Target: portal admin + individual students
  // Admin effect: attendance rate stats update on analytics page
  // Student effect: "Your attendance has been marked" notification

  REVENUE_UPDATED: 'revenue_updated',
  // Payload: { amount, event_id, event_title, total_revenue_today, total_revenue_month }
  // Target: portal admin
  // Admin effect: revenue chart updates, stat cards flash green briefly

  NEW_REGISTRATION: 'new_registration',
  // Payload: { event_id, event_title, student_name anonymised, seats_remaining }
  // Target: all
  // Student dashboard: live feed updates
  // Admin dashboard: activity feed updates

  WAITLIST_MOVED: 'waitlist_moved',
  // Payload: { event_id, student_id, new_position, event_title }
  // Target: specific student connection only via user_id match
  // Student effect: toast + My Registrations waitlist position number updates
};
```

---

## REAL-TIME PROMPT 4 — FRONTEND WEBSOCKET HOOK

```
CODEX PROMPT:

Create src/realtime/useWebSocket.js shared hook used identically in all three portals.

import { useEffect, useRef, useCallback, useState } from 'react';
import { fetchAuthSession } from 'aws-amplify/auth';

const WS_URL = import.meta.env.VITE_WS_URL;

export function useWebSocket({ portal, eventId = 'global', userId, onMessage }) {
  const ws = useRef(null);
  const reconnectTimer = useRef(null);
  const [status, setStatus] = useState('disconnected');
  const reconnectDelay = useRef(1000);

  const connect = useCallback(async () => {
    try {
      setStatus('connecting');
      const session = await fetchAuthSession();
      const token = session?.tokens?.idToken?.toString();

      const url = new URL(WS_URL);
      url.searchParams.set('portal', portal);
      url.searchParams.set('event_id', eventId);
      url.searchParams.set('user_id', userId || 'anon');
      url.searchParams.set('token', token || '');

      ws.current = new WebSocket(url.toString());

      ws.current.onopen = () => {
        setStatus('connected');
        reconnectDelay.current = 1000;
      };

      ws.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          onMessage(message);
        } catch (err) {
          console.error('[WS] Parse error', err);
        }
      };

      ws.current.onclose = (event) => {
        setStatus('disconnected');
        if (event.code !== 1000) {
          reconnectTimer.current = setTimeout(() => {
            reconnectDelay.current = Math.min(reconnectDelay.current * 2, 30000);
            connect();
          }, reconnectDelay.current);
        }
      };

      ws.current.onerror = () => ws.current?.close();

    } catch (err) {
      console.error('[WS] Connection failed', err);
      setStatus('disconnected');
    }
  }, [portal, eventId, userId, onMessage]);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectTimer.current);
      ws.current?.close(1000, 'unmounted');
    };
  }, [connect]);

  useEffect(() => {
    const ping = setInterval(() => {
      if (ws.current?.readyState === WebSocket.OPEN) {
        ws.current.send(JSON.stringify({ action: 'ping' }));
      }
    }, 60000);
    return () => clearInterval(ping);
  }, []);

  return { status };
}
```

---

## REAL-TIME PROMPT 5 — CONNECT WEBSOCKET TO EACH PORTAL LAYOUT

```
CODEX PROMPT:

In each portal Layout.jsx initialise the WebSocket connection once and handle
all incoming messages with a switch statement. Pattern is the same across all portals.

STUDENT PORTAL Layout.jsx:

const handleMessage = useCallback((message) => {
  switch (message.type) {

    case 'seat_updated':
      updateSeatCount(message.data.event_id, message.data.seats_remaining);
      break;

    case 'event_approved':
      addNewEventToGrid(message.data);
      addLiveFeedItem({ icon: 'calendar', text: message.data.event_title + ' is now open' });
      setShowBrowsePulseDot(true);
      setTimeout(() => setShowBrowsePulseDot(false), 5000);
      break;

    case 'new_registration':
      addLiveFeedItem({ icon: 'user-plus', text: 'Students joining ' + message.data.event_title });
      break;

    case 'waitlist_moved':
      if (message.data.student_id === currentUser?.id) {
        showToast('Your waitlist position for ' + message.data.event_title +
          ' is now #' + message.data.new_position, 'info');
        refreshMyRegistrations();
      }
      break;

    case 'attendance_submitted':
      if (message.data.student_marks?.includes(currentUser?.id)) {
        showToast('Your attendance has been marked', 'success');
        refreshMyAttendance();
      }
      break;
  }
}, [currentUser]);

const { status } = useWebSocket({ portal: 'student', userId: currentUser?.id, onMessage: handleMessage });

ADMIN PORTAL Layout.jsx — different cases:

case 'event_submitted':
  incrementPendingApprovalCount();
  showToast(message.data.teacher_name + ' submitted a new event for review', 'info');
  refreshApprovalList();
  break;

case 'seat_updated':
  updateEventRegistrationCount(message.data.event_id, message.data.seats_remaining);
  break;

case 'revenue_updated':
  updateRevenueStats(message.data);
  flashRevenueCard();
  break;

case 'attendance_submitted':
  updateAttendanceRate(message.data);
  break;

TEACHER PORTAL Layout.jsx — different cases:

case 'seat_updated':
  if (isMyEvent(message.data.event_id)) {
    updateMyEventRegistrationCount(message.data.event_id, message.data.seats_remaining);
  }
  break;

case 'new_registration':
  if (isMyEvent(message.data.event_id)) {
    refreshStudentList(message.data.event_id);
    showToast('A student just joined ' + message.data.event_title, 'info');
  }
  break;

case 'event_approved':
  if (isMyEvent(message.data.event_id)) {
    updateMyEventStatus(message.data.event_id, 'approved');
    showToast('Your event ' + message.data.event_title + ' was approved!', 'success');
  }
  break;
```

---

## REAL-TIME PROMPT 6 — TRIGGER BROADCASTS FROM REGISTRATION LAMBDA

```
CODEX PROMPT:

In backend/functions/registrations-handler/src/index.ts add broadcast calls after
every successful registration or cancellation.

Add helper function:

async function broadcast(messageType, payload, target) {
  await lambda.invoke({
    FunctionName: process.env.WS_BROADCAST_FUNCTION_NAME,
    InvocationType: 'Event',
    Payload: JSON.stringify({ message_type: messageType, payload, target })
  }).promise();
}

In POST /registrations handler after saving to Aurora:

const updateResult = await dynamodb.update({
  TableName: 'ems-seat-counter',
  Key: { event_id },
  UpdateExpression: 'ADD current_count :inc',
  ExpressionAttributeValues: { ':inc': 1 },
  ReturnValues: 'ALL_NEW'
}).promise();

const seatsRemaining = updateResult.Attributes.max_capacity - updateResult.Attributes.current_count;

await broadcast('seat_updated', {
  event_id,
  seats_remaining: seatsRemaining,
  total_capacity: updateResult.Attributes.max_capacity,
  percentage_filled: Math.round((updateResult.Attributes.current_count / updateResult.Attributes.max_capacity) * 100)
}, { type: 'event', event_id });

await broadcast('new_registration', {
  event_id,
  event_title: event.title,
  student_name: 'A student',
  seats_remaining: seatsRemaining
}, { type: 'all' });

In DELETE /registrations (cancel) handler:

await dynamodb.update({ ADD current_count: -1 });
await broadcast('seat_released', { event_id, seats_remaining: newCount }, { type: 'event', event_id });
// Also move up waitlist and notify next person

In events-handler PUT /events/:id/approve:
await broadcast('event_approved', { event_id, event_title, event_date, category, seats_available }, { type: 'all' });

In events-handler POST /events (create and submit):
await broadcast('event_submitted', { event_id, event_title, teacher_name }, { type: 'portal', portal: 'admin' });

In attendance-handler POST /attendance (submit):
await broadcast('attendance_submitted', { event_id, present_count, absent_count, marked_by, student_marks: [...studentIds] }, { type: 'portal', portal: 'admin' });
// Per-student notifications handled server-side by iterating student_marks array
```

---

## PART 3 — REVENUE FLOW

---

## REVENUE PROMPT 1 — DATABASE TABLE

```
CODEX PROMPT:

Add to database/migrations/004_revenue.sql:

CREATE TABLE revenue_transactions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id        UUID REFERENCES events(id) ON DELETE SET NULL,
  student_id      UUID REFERENCES users(id) ON DELETE SET NULL,
  amount          DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  currency        VARCHAR(3) DEFAULT 'INR',
  type            VARCHAR(20) DEFAULT 'registration'
                  CHECK (type IN ('registration', 'refund', 'fee_waiver')),
  status          VARCHAR(20) DEFAULT 'completed'
                  CHECK (status IN ('pending', 'completed', 'refunded', 'failed')),
  payment_method  VARCHAR(30),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_revenue_event ON revenue_transactions(event_id);
CREATE INDEX idx_revenue_date ON revenue_transactions(created_at);

CREATE MATERIALIZED VIEW revenue_summary AS
  SELECT
    DATE_TRUNC('month', created_at) as month,
    SUM(amount) as total_revenue,
    COUNT(*) as transaction_count,
    COUNT(DISTINCT event_id) as events_count
  FROM revenue_transactions
  WHERE status = 'completed' AND type = 'registration'
  GROUP BY DATE_TRUNC('month', created_at)
  ORDER BY month;
```

---

## REVENUE PROMPT 2 — CONNECT REGISTRATION TO REVENUE

```
CODEX PROMPT:

In registrations-handler after successful registration for a paid event:

if (event.price > 0) {
  await db.query(
    `INSERT INTO revenue_transactions (event_id, student_id, amount, type, status, payment_method)
     VALUES ($1, $2, $3, 'registration', 'completed', 'online')`,
    [event_id, student_id, event.price]
  );

  const todayRevenue = await db.query(
    `SELECT COALESCE(SUM(amount), 0) as total FROM revenue_transactions
     WHERE created_at >= CURRENT_DATE AND status = 'completed'`
  );

  const monthRevenue = await db.query(
    `SELECT COALESCE(SUM(amount), 0) as total FROM revenue_transactions
     WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE)
       AND status = 'completed'`
  );

  await broadcast('revenue_updated', {
    event_id,
    event_title: event.title,
    amount: event.price,
    total_revenue_today: parseFloat(todayRevenue.rows[0].total),
    total_revenue_month: parseFloat(monthRevenue.rows[0].total),
  }, { type: 'portal', portal: 'admin' });
}
```

---

## REVENUE PROMPT 3 — ADMIN DASHBOARD REAL-TIME REVENUE UPDATE

```
CODEX PROMPT:

In admin portal Dashboard.jsx update the Revenue Breakdown chart to use real data.

On mount: fetch GET /analytics/revenue?period=year
Response shape: { monthly: [{month, revenue, count}], today, this_month, total }
Map monthly array to Recharts ComposedChart Bar + Line data.

Add two new stat cards to dashboard:
"Revenue Today": amount green bold 28px + "today" muted label
"Revenue This Month": amount bold 28px + trend vs last month

WebSocket handler for revenue_updated:

case 'revenue_updated':
  setRevenueToday(message.data.total_revenue_today);
  setRevenueMonth(message.data.total_revenue_month);
  setRevenueFlash(true);
  setTimeout(() => setRevenueFlash(false), 800);
  updateCurrentMonthBarData(message.data.total_revenue_month);
  break;

CSS for revenue card flash animation:
.stat-card-highlight {
  animation: revenueFlash 0.8s ease-out;
}
@keyframes revenueFlash {
  0%   { background: #D1FAE5; }
  100% { background: var(--bg-card); }
}
```

---

## PART 4 — REMAINING CONNECTIONS CHECKLIST

---

## FINAL WIRING PROMPT — ALL CONNECTIONS

```
CODEX PROMPT:

Go through every item in this checklist and confirm or implement each connection:

ADMIN to TEACHER:
Teacher submits event for approval
  EVENT_SUBMITTED broadcast to portal admin
  Admin pending count badge increments in real time without page reload
  Admin approval list shows new item with slide-in animation
  IMPLEMENT IN: events-handler POST /events submit action

Admin approves or rejects event
  EVENT_APPROVED broadcast to all portals
  Teacher My Events card status badge updates in real time
  Student Browse page new event card appears with entrance animation
  IMPLEMENT IN: events-handler PUT /events/:id/approve and reject

STUDENT to TEACHER:
Student joins event
  NEW_REGISTRATION broadcast to event connections
  Teacher My Events registration count updates live
  Teacher Students page refreshes list in real time if open
  IMPLEMENT IN: registrations-handler POST /registrations

Teacher marks attendance
  ATTENDANCE_SUBMITTED broadcast per student
  Student My Attendance page updates from Not Marked to Present or Absent
  Admin analytics attendance rate recalculates
  IMPLEMENT IN: attendance-handler POST /attendance

STUDENT to ADMIN:
Student joins paid event
  Revenue transaction inserted in Aurora
  REVENUE_UPDATED broadcast to admin portal
  Admin revenue chart current month bar updates live
  Admin stat cards Revenue Today and Revenue This Month flash and update
  IMPLEMENT IN: registrations-handler POST /registrations

Admin cancels event
  SES bulk email to all registered students
  SEAT_UPDATED broadcast with status cancelled
  Student My Registrations shows Cancelled by Admin badge
  IMPLEMENT IN: events-handler PUT /events/:id/cancel

DATA PRIVACY RULES — enforce in every Lambda:
Student name and email are NEVER returned to admin portal
Admin sees counts only: registered_count, attended_count, not individual names
Teacher student list only accessible if created_by matches actor.id OR actor.id is in staff_coordinators array
Student portal never has a route to view other students' data

SES EMAIL TRIGGERS — all async Lambda invocations never blocking API response:
Student joins event -> registration-confirmation template
Event approved -> event-approved template to teacher
Event rejected -> event-rejected template to teacher with reason
24 hours before event -> reminder template to all registered students via EventBridge cron
Event cancelled -> event-cancelled template to all registered students
Attendance marked -> attendance-marked template to individual student
Waitlist moved -> waitlist-update template to student

SEAT COUNTER CONSISTENCY:
DynamoDB seat counter is source of truth for real-time UI
Aurora registrations table is source of truth for reports and attendance
EventBridge rule every 60 minutes: Lambda reconciles DynamoDB count with Aurora COUNT query
If mismatch: correct DynamoDB to match Aurora

ANALYTICS REAL-TIME:
GET /analytics/overview returns:
  total_events, total_registrations, avg_attendance_rate, top_department, monthly_revenue array
Cache in ElastiCache or DynamoDB with 5 minute TTL for heavy aggregation queries
WebSocket updates override cached values for current live numbers
```

---

## PART 5 — COMPLETE AWS ARCHITECTURE SUMMARY

| Service | Role in EMS |
|---------|------------|
| Cognito User Pools | Auth for all 3 portals, groups: Admins Teachers Students |
| API Gateway REST | All HTTP endpoints events users registrations attendance analytics |
| API Gateway WebSocket | Persistent connections for all 3 portals real-time updates |
| Lambda REST | events users registrations attendance analytics media revenue |
| Lambda WebSocket | ws-connect ws-disconnect ws-broadcast |
| Aurora Serverless v2 | All relational data users events registrations attendance revenue |
| DynamoDB | Seat counters atomic, WebSocket connection IDs with TTL |
| S3 three buckets | Admin Teacher Student frontend static files + media uploads |
| CloudFront three distros | HTTPS CDN for admin.domain teacher.domain student.domain |
| SES | All 6 transactional email templates |
| EventBridge | 24h reminders, seat reconciliation hourly, materialized view refresh |
| Secrets Manager | DB credentials API keys auto-rotation |
| CloudWatch | Lambda logs alarms on error rate spikes |
| WAF | Rate limiting bot protection on API Gateway and CloudFront |
| IAM | Per-Lambda least privilege roles |
| Route 53 + ACM | Three subdomains wildcard SSL cert |

---

## CODEX BUILD ORDER — EVERYTHING REMAINING

```
Run in this exact sequence:

STUDENT PORTAL:
1.  Project bootstrap copy index.css from admin portal exactly
2.  Sidebar student nav
3.  Header copy from admin portal no changes
4.  Mock data file
5.  Dashboard page with live feed
6.  Browse Events page EventCard student version with join button
7.  My Registrations page
8.  My Attendance page
9.  Profile page

REAL-TIME LAYER:
10. CDK RealtimeStack WebSocket API and DynamoDB connections table
11. ws-connect Lambda
12. ws-disconnect Lambda
13. ws-broadcast Lambda
14. useWebSocket hook create once copy to all three portals
15. Update Layout.jsx in each portal with message handler switch
16. Zustand stores updateSeatCount addLiveFeedItem addNewEvent etc

BACKEND BROADCAST TRIGGERS:
17. Update registrations-handler to broadcast after join and cancel
18. Update events-handler to broadcast on approve reject cancel submit
19. Update attendance-handler to broadcast on submission

REVENUE:
20. SQL migration revenue_transactions table and materialized view
21. Update registrations-handler to insert revenue on paid event join
22. Update GET /analytics/revenue endpoint
23. Update admin dashboard to handle revenue_updated WebSocket message

FINAL CONNECTIONS:
24. SES email templates six templates verified domain
25. EventBridge rules 24h reminder and hourly seat reconciliation
26. WAF rules on API Gateway
27. End-to-end test: student joins paid event verify in under 300ms
    seat counter updates on all three portals simultaneously
    revenue chart updates in admin portal
    teacher student count updates on My Events
```

---

## BETWEEN EVERY CODEX PROMPT ADD THIS LINE

Maintain the exact same colour palette from index.css CSS variables.
All cards use bg var(--bg-card) white. Page background is var(--bg-main) #F5F0E8 warm cream.
Sidebar is var(--bg-sidebar) #1A1A2E dark navy. Font is Sora throughout.
Do not introduce any new colours or fonts.
