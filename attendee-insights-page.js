(function () {
  const config = window.EMS_CONFIG || {};
  const apiBaseUrl = String(config.apiBaseUrl || window.location.origin).replace(/\/$/, "") + "/";
  const signInPath = config.signInPath || "/index.html";
  const storageKey = "ems.auth.tokens";
  const roleStorageKey = "ems.auth.tokens.admin";
  const notificationsStoragePrefix = "ems.dashboard.notifications";
  const agePalette = ["#9B9589", "#1A1A1A", "#C2BBB0", "#D0C9BB", "#E5E0D8"];

  const refs = {
    sidebar: document.getElementById("sidebar"),
    menuButton: document.getElementById("menu-button"),
    logoutButton: document.getElementById("logout-button"),
    feedback: document.getElementById("insights-feedback"),
    searchInput: document.getElementById("insights-search-input"),
    breadcrumbLabel: document.getElementById("breadcrumb-label"),
    pageTitle: document.getElementById("insights-page-title"),
    attendeeTotal: document.getElementById("attendee-total"),
    genderChart: document.getElementById("gender-chart"),
    genderLegend: document.getElementById("gender-legend"),
    genderCallouts: document.getElementById("gender-callouts"),
    ageChart: document.getElementById("age-chart"),
    ageLegend: document.getElementById("age-legend"),
    locationChart: document.getElementById("location-chart"),
    categoryChart: document.getElementById("category-chart"),
    insightsGrid: document.getElementById("insights-grid"),
    eventList: document.getElementById("insights-event-list"),
    notificationsTrigger: document.getElementById("notifications-trigger"),
    notificationsMenu: document.getElementById("notifications-menu"),
    notificationsList: document.getElementById("notifications-list"),
    notificationsCount: document.getElementById("notifications-count"),
    notificationsDot: document.getElementById("notifications-dot"),
    profileTrigger: document.getElementById("profile-trigger"),
    profileMenu: document.getElementById("profile-menu"),
    profileMenuId: document.getElementById("profile-menu-id"),
    profileViewButton: document.getElementById("profile-view-button"),
    headerAvatar: document.getElementById("header-avatar"),
    headerUserName: document.getElementById("header-user-name"),
    headerUserEmail: document.getElementById("header-user-email"),
    profileModal: document.getElementById("profile-modal"),
    profileModalClose: document.getElementById("profile-modal-close"),
    profileModalDone: document.getElementById("profile-modal-done"),
    profileModalAvatar: document.getElementById("profile-modal-avatar"),
    profileModalName: document.getElementById("profile-modal-name"),
    profileModalEmail: document.getElementById("profile-modal-email"),
    profileModalRole: document.getElementById("profile-modal-role"),
    profileModalId: document.getElementById("profile-modal-id"),
    profileModalDepartment: document.getElementById("profile-modal-department"),
    profileModalCreated: document.getElementById("profile-modal-created")
  };

  const state = {
    user: null,
    events: [],
    selectedEvent: null,
    selectedEventId: null,
    selectedEventRegistrations: [],
    selectedEventAttendance: [],
    notifications: [],
    searchQuery: ""
  };

  function getApiUrl(path) {
    return new URL(path.replace(/^\//, ""), apiBaseUrl).toString();
  }

  function getUiUrl(path) {
    return /^https?:\/\//i.test(path) ? path : new URL(path, window.location.origin).toString();
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function loadTokens() {
    const keys = [roleStorageKey, storageKey];
    for (const key of keys) {
      try {
        const raw = window.localStorage.getItem(key);
        if (raw) {
          return JSON.parse(raw);
        }
      } catch (_error) {
        // keep trying fallbacks
      }
    }
    return null;
  }

  function clearTokens() {
    window.localStorage.removeItem(roleStorageKey);
    window.localStorage.removeItem(storageKey);
  }

  function decodeJwt(token) {
    const parts = String(token || "").split(".");
    if (parts.length < 2) {
      return null;
    }
    try {
      return JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
    } catch (_error) {
      return null;
    }
  }

  function getValidIdToken() {
    const tokens = loadTokens();
    if (!tokens || !tokens.idToken) {
      return null;
    }
    const claims = decodeJwt(tokens.idToken);
    if (!claims || !claims.exp || Date.now() >= claims.exp * 1000) {
      clearTokens();
      return null;
    }
    return tokens.idToken;
  }

  async function apiRequest(path, options) {
    const idToken = getValidIdToken();
    if (!idToken) {
      throw new Error("Missing session");
    }
    const response = await fetch(getApiUrl(path), {
      method: options && options.method ? options.method : "GET",
      headers: Object.assign(
        {
          "Content-Type": "application/json",
          Authorization: "Bearer " + idToken
        },
        options && options.headers ? options.headers : {}
      ),
      body: options && options.body ? JSON.stringify(options.body) : undefined
    });
    const payload = await response.json().catch(function () { return {}; });
    if (!response.ok) {
      const error = new Error(payload.message || "Request failed");
      error.statusCode = response.status;
      throw error;
    }
    return payload;
  }

  function getInitials(value) {
    return String(value || "EMS").split(" ").filter(Boolean).map(function (part) {
      return part.charAt(0).toUpperCase();
    }).join("").slice(0, 2) || "EM";
  }

  function setAvatar(node, name, avatarUrl) {
    if (!node) {
      return;
    }
    if (avatarUrl) {
      node.innerHTML = '<img alt="' + escapeHtml(name) + '" src="' + escapeHtml(avatarUrl) + '" />';
      return;
    }
    node.textContent = getInitials(name);
  }

  function formatRole(value) {
    const role = String(value || "admin").toLowerCase();
    return role.charAt(0).toUpperCase() + role.slice(1);
  }

  function formatJoinedDate(value) {
    const date = new Date(value || "");
    if (Number.isNaN(date.getTime())) {
      return "Recently joined";
    }
    return date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  }

  function formatRelativeTime(value) {
    const date = new Date(value || "");
    if (Number.isNaN(date.getTime())) {
      return "Just now";
    }
    const diffMinutes = Math.max(0, Math.round((Date.now() - date.getTime()) / 60000));
    if (diffMinutes < 1) { return "Just now"; }
    if (diffMinutes < 60) { return diffMinutes + " min ago"; }
    const diffHours = Math.round(diffMinutes / 60);
    if (diffHours < 24) { return diffHours + " hr ago"; }
    const diffDays = Math.round(diffHours / 24);
    return diffDays + " day" + (diffDays === 1 ? "" : "s") + " ago";
  }

  function buildProfileId(user) {
    if (user && user.profileId) {
      return user.profileId;
    }
    const role = String(user && user.role || "admin").toLowerCase();
    const prefix = role === "teacher" ? "TCH" : role === "student" ? "STD" : "ADM";
    const compactId = String(user && user.id || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 10);
    return "EMS-" + prefix + "-" + (compactId || "USER");
  }

  function getNotificationsStorageKey(user) {
    return notificationsStoragePrefix + "." + (user && (user.profileId || user.id) ? (user.profileId || user.id) : "guest");
  }

  function loadNotifications(user) {
    try {
      const raw = window.localStorage.getItem(getNotificationsStorageKey(user));
      const items = raw ? JSON.parse(raw) : [];
      return Array.isArray(items) ? items : [];
    } catch (_error) {
      return [];
    }
  }

  function renderNotifications() {
    const items = state.notifications || [];
    refs.notificationsCount.textContent = items.length + " New";
    refs.notificationsDot.classList.toggle("hidden", items.length === 0);
    if (!items.length) {
      refs.notificationsList.innerHTML = '<div class="notification-empty">No new notifications</div>';
      return;
    }
    refs.notificationsList.innerHTML = items.map(function (item) {
      return '<div class="notification-item"><div class="notification-item-title">' + escapeHtml(item.title || "Notification") + '</div><div class="notification-item-copy">' + escapeHtml(item.message || "") + '</div><div class="notification-item-time">' + escapeHtml(formatRelativeTime(item.createdAt)) + "</div></div>";
    }).join("");
  }

  function showBanner(message) {
    refs.feedback.innerHTML = '<div class="banner">' + escapeHtml(message) + "</div>";
  }

  function clearBanner() {
    refs.feedback.innerHTML = "";
  }

  function openNotificationsMenu() {
    refs.notificationsMenu.classList.add("open");
    refs.notificationsMenu.setAttribute("aria-hidden", "false");
    refs.notificationsTrigger.setAttribute("aria-expanded", "true");
    closeProfileMenu();
  }

  function closeNotificationsMenu() {
    refs.notificationsMenu.classList.remove("open");
    refs.notificationsMenu.setAttribute("aria-hidden", "true");
    refs.notificationsTrigger.setAttribute("aria-expanded", "false");
  }

  function toggleNotificationsMenu() {
    if (refs.notificationsMenu.classList.contains("open")) {
      closeNotificationsMenu();
    } else {
      openNotificationsMenu();
    }
  }

  function openProfileMenu() {
    refs.profileMenu.classList.add("open");
    refs.profileMenu.setAttribute("aria-hidden", "false");
    refs.profileTrigger.setAttribute("aria-expanded", "true");
    closeNotificationsMenu();
  }

  function closeProfileMenu() {
    refs.profileMenu.classList.remove("open");
    refs.profileMenu.setAttribute("aria-hidden", "true");
    refs.profileTrigger.setAttribute("aria-expanded", "false");
  }

  function toggleProfileMenu() {
    if (refs.profileMenu.classList.contains("open")) {
      closeProfileMenu();
    } else {
      openProfileMenu();
    }
  }

  function openProfileModal() {
    refs.profileModal.classList.add("open");
    refs.profileModal.setAttribute("aria-hidden", "false");
    closeProfileMenu();
  }

  function closeProfileModal() {
    refs.profileModal.classList.remove("open");
    refs.profileModal.setAttribute("aria-hidden", "true");
  }

  function hydrateUser(user) {
    state.user = user;
    state.notifications = loadNotifications(user);
    renderNotifications();
    const profileId = buildProfileId(user);
    refs.headerUserName.textContent = user.fullName || "EMS Admin";
    refs.headerUserEmail.textContent = user.email || "admin@ems.app";
    refs.profileMenuId.textContent = profileId;
    refs.profileModalName.textContent = user.fullName || "EMS Admin";
    refs.profileModalEmail.textContent = user.email || "admin@ems.app";
    refs.profileModalRole.textContent = formatRole(user.role);
    refs.profileModalId.textContent = profileId;
    refs.profileModalDepartment.textContent = user.department || "Not added yet";
    refs.profileModalCreated.textContent = formatJoinedDate(user.createdAt);
    setAvatar(refs.headerAvatar, user.fullName || "EMS Admin", user.avatarUrl || "");
    setAvatar(refs.profileModalAvatar, user.fullName || "EMS Admin", user.avatarUrl || "");
  }

  function normalizeEvents(items) {
    return (items || []).map(function (item) {
      return {
        id: item.id,
        title: item.title || "Untitled Event",
        status: item.status || "draft",
        eventType: item.eventType || "Technology",
        venue: item.venue || "Main Hall",
        eventDate: item.eventDate || "",
        currentCount: Number(item.currentCount || 0),
        maxCapacity: Number(item.maxCapacity || 0)
      };
    }).sort(function (left, right) {
      return String(right.eventDate || "").localeCompare(String(left.eventDate || ""));
    });
  }

  function getSearchFilteredEvents() {
    const query = state.searchQuery.trim().toLowerCase();
    if (!query) {
      return state.events.slice();
    }
    return state.events.filter(function (event) {
      return [event.title, event.eventType, event.venue].join(" ").toLowerCase().indexOf(query) !== -1;
    });
  }

  function getSelectedEvent() {
    const params = new URLSearchParams(window.location.search);
    const queryEventId = params.get("eventId");
    const filtered = getSearchFilteredEvents();
    if (state.selectedEventId) {
      const selected = filtered.find(function (item) { return item.id === state.selectedEventId; }) || state.events.find(function (item) { return item.id === state.selectedEventId; });
      if (selected) {
        return selected;
      }
    }
    if (queryEventId) {
      const found = filtered.find(function (item) { return item.id === queryEventId; }) || state.events.find(function (item) { return item.id === queryEventId; });
      if (found) {
        return found;
      }
    }
    return filtered[0] || state.events[0] || null;
  }

  function updateSelectedEventUrl(eventId) {
    const url = new URL(window.location.href);
    if (eventId) {
      url.searchParams.set("eventId", eventId);
    } else {
      url.searchParams.delete("eventId");
    }
    window.history.replaceState({}, "", url.toString());
  }

  function renderEventSelector() {
    if (!refs.eventList) {
      return;
    }
    const items = getSearchFilteredEvents();
    if (!items.length) {
      refs.eventList.innerHTML = '<div class="event-switcher-item"><div class="event-switcher-name">No matching events</div><div class="event-switcher-meta"><span>Try a different search to view event-specific insights.</span></div></div>';
      return;
    }
    refs.eventList.innerHTML = items.map(function (event) {
      const isActive = state.selectedEvent && state.selectedEvent.id === event.id;
      return [
        '<button class="event-switcher-item' + (isActive ? ' active' : '') + '" type="button" data-insight-event="' + escapeHtml(event.id) + '">',
        '<div class="event-switcher-row">',
        '<div class="event-switcher-name">' + escapeHtml(event.title) + '</div>',
        '<span class="event-switcher-type">' + escapeHtml(event.eventType) + '</span>',
        '</div>',
        '<div class="event-switcher-meta"><span>' + escapeHtml(event.eventDate || 'No date') + '</span><span>&bull;</span><span>' + escapeHtml(event.venue || 'No venue') + '</span></div>',
        '<div class="event-switcher-row"><span class="event-switcher-stat">' + escapeHtml(String(event.currentCount || 0)) + ' joined</span><span class="event-switcher-stat">' + escapeHtml(String(event.maxCapacity || 0)) + ' capacity</span></div>',
        '</button>'
      ].join("");
    }).join("");
  }

  function getActiveRegistrations() {
    return state.selectedEventRegistrations.filter(function (item) {
      return item.status !== "cancelled";
    });
  }

  function buildAttendanceBreakdown() {
    const activeRegistrations = getActiveRegistrations();
    const attendanceMap = new Map(
      state.selectedEventAttendance.map(function (item) {
        return [item.student_id || item.studentId, item.status || "present"];
      })
    );
    let present = 0;
    let absent = 0;
    let pending = 0;

    activeRegistrations.forEach(function (registration) {
      const status = attendanceMap.get(registration.studentId);
      if (status === "present") {
        present += 1;
      } else if (status === "absent") {
        absent += 1;
      } else {
        pending += 1;
      }
    });

    return [
      { label: "Present", value: present, color: "#1A1A1A" },
      { label: "Absent", value: absent, color: "#D0C9BB" },
      { label: "Not Marked", value: pending, color: "#E5E0D8" }
    ];
  }

  function buildDepartmentBreakdown() {
    const tallies = new Map();
    getActiveRegistrations().forEach(function (registration) {
      const key = String(registration.studentDepartment || "Not Added").trim() || "Not Added";
      tallies.set(key, (tallies.get(key) || 0) + 1);
    });

    const items = Array.from(tallies.entries())
      .map(function (entry) { return { label: entry[0], value: entry[1] }; })
      .sort(function (left, right) { return right.value - left.value; })
      .slice(0, 5);

    if (!items.length) {
      return [{ label: "No Data", value: 1, color: agePalette[0] }];
    }

    return items.map(function (item, index) {
      return Object.assign({}, item, { color: agePalette[index % agePalette.length] });
    });
  }

  function extractVenueLocation(value) {
    const raw = String(value || "").trim();
    if (!raw) {
      return "On Campus";
    }
    const parts = raw.split(",").map(function (item) { return item.trim(); }).filter(Boolean);
    return parts.length > 1 ? parts[parts.length - 1] : parts[0];
  }

  function buildLocationData() {
    const tallies = new Map();
    getSearchFilteredEvents().forEach(function (event) {
      const label = extractVenueLocation(event.venue);
      const weight = Math.max(1, Number(event.currentCount || 0));
      tallies.set(label, (tallies.get(label) || 0) + weight);
    });

    const items = Array.from(tallies.entries())
      .map(function (entry) { return { label: entry[0], value: entry[1] }; })
      .sort(function (left, right) { return right.value - left.value; })
      .slice(0, 7);

    return items.length ? items : [{ label: "On Campus", value: 1 }];
  }

  function buildCategoryData() {
    const tallies = new Map();
    getSearchFilteredEvents().forEach(function (event) {
      const label = String(event.eventType || "Other");
      const weight = Math.max(1, Number(event.currentCount || 0));
      tallies.set(label, (tallies.get(label) || 0) + weight);
    });

    const items = Array.from(tallies.entries())
      .map(function (entry) { return { label: entry[0], value: entry[1] }; })
      .sort(function (left, right) { return right.value - left.value; })
      .slice(0, 5);

    return items.length ? items : [{ label: "No Events", value: 1 }];
  }

  function polarToCartesian(cx, cy, radius, angle) {
    const radians = (angle - 90) * (Math.PI / 180);
    return { x: cx + radius * Math.cos(radians), y: cy + radius * Math.sin(radians) };
  }

  function describeArc(cx, cy, radius, startAngle, endAngle) {
    const start = polarToCartesian(cx, cy, radius, endAngle);
    const end = polarToCartesian(cx, cy, radius, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
    return ["M", start.x, start.y, "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y].join(" ");
  }

  function renderDonut(svg, segments, radius, strokeWidth, cx, cy) {
    const total = segments.reduce(function (sum, item) { return sum + item.value; }, 0) || 1;
    let currentAngle = 0;
    const bg = '<circle cx="' + cx + '" cy="' + cy + '" r="' + radius + '" fill="none" stroke="#F3EFE8" stroke-width="' + strokeWidth + '"></circle>';
    const arcs = segments.map(function (segment) {
      const arcAngle = (segment.value / total) * 360;
      const path = describeArc(cx, cy, radius, currentAngle, currentAngle + arcAngle);
      currentAngle += arcAngle;
      return '<path d="' + path + '" fill="none" stroke="' + segment.color + '" stroke-width="' + strokeWidth + '" stroke-linecap="round"></path>';
    }).join("");
    svg.innerHTML = bg + arcs;
  }

  function renderGender(genderData) {
    renderDonut(refs.genderChart, genderData, 70, 20, 110, 110);
    const total = genderData.reduce(function (sum, item) { return sum + item.value; }, 0) || 1;
    refs.genderLegend.innerHTML = genderData.map(function (item) {
      return '<div class="mini-legend-item"><span class="legend-swatch" style="background:' + item.color + ';"></span><span>' + Math.round((item.value / total) * 100) + '%</span></div>';
    }).join("");
    refs.genderCallouts.innerHTML = genderData.map(function (item) {
      return '<div class="mini-legend-item"><span class="legend-swatch" style="background:' + item.color + ';border-radius:999px;"></span><span>' + escapeHtml(item.label) + "</span></div>";
    }).join("");
  }

  function renderAge(ageData) {
    renderDonut(refs.ageChart, ageData, 52, 22, 80, 110);
    refs.ageLegend.innerHTML = ageData.map(function (item) {
      return '<div class="mini-legend-item"><span class="legend-swatch" style="background:' + item.color + ';"></span><span>' + escapeHtml(item.label) + "</span></div>";
    }).join("");
  }

  function renderLocationChart(items) {
    const maxValue = Math.max.apply(null, items.map(function (item) { return item.value; }).concat([1]));
    const chartLeft = 46;
    const chartBottom = 238;
    const chartTop = 18;
    const chartHeight = chartBottom - chartTop;
    const itemCount = Math.max(1, items.length);
    const slotWidth = 640 / itemCount;
    const barWidth = Math.max(26, Math.min(54, slotWidth * 0.45));
    const gap = Math.max(18, slotWidth - barWidth);
    const roundedMax = Math.max(5, Math.ceil(maxValue / 5) * 5);
    const yTicks = [0.25, 0.5, 0.75, 1].map(function (ratio) {
      return Math.max(1, Math.round(roundedMax * ratio));
    });
    const axis = yTicks.map(function (tick) {
      const y = chartBottom - ((tick / roundedMax) * chartHeight);
      return '<text x="12" y="' + (y + 4) + '" font-size="11" fill="#3A3631">' + tick + "</text>";
    }).join("");
    const bars = items.map(function (item, index) {
      const height = chartHeight * Math.max(0.12, item.value / roundedMax);
      const x = chartLeft + index * (barWidth + gap);
      const y = chartBottom - height;
      return '<rect x="' + x + '" y="' + y + '" width="' + barWidth + '" height="' + height + '" rx="18" fill="#1A1A1A"></rect><text x="' + (x + barWidth / 2) + '" y="' + (chartBottom + 22) + '" text-anchor="middle" font-size="12" fill="#3A3631">' + escapeHtml(item.label) + "</text>";
    }).join("");
    refs.locationChart.innerHTML = axis + bars;
  }

  function renderCategoryChart(items) {
    const maxValue = Math.max.apply(null, items.map(function (item) { return item.value; }).concat([1]));
    const chartLeft = 54;
    const chartRight = 706;
    const chartTop = 26;
    const chartBottom = 175;
    const width = chartRight - chartLeft;
    const height = chartBottom - chartTop;
    const step = width / Math.max(1, items.length - 1);
    const points = items.map(function (item, index) {
      const x = chartLeft + index * step;
      const y = chartBottom - ((item.value / maxValue) * height);
      return { x: x, y: y, label: item.label };
    });
    const stems = points.map(function (point) {
      return '<line x1="' + point.x + '" y1="' + chartTop + '" x2="' + point.x + '" y2="' + chartBottom + '" stroke="#1A1A1A" stroke-width="10" stroke-linecap="round"></line>';
    }).join("");
    const path = points.map(function (point, index) {
      return (index === 0 ? "M " : "L ") + point.x + " " + point.y;
    }).join(" ");
    const dots = points.map(function (point) {
      return '<circle cx="' + point.x + '" cy="' + point.y + '" r="6" fill="#FFFFFF" stroke="#1A1A1A" stroke-width="2"></circle>';
    }).join("");
    const labels = points.map(function (point) {
      return '<text x="' + point.x + '" y="' + (chartBottom + 28) + '" text-anchor="middle" font-size="11" fill="#3A3631">' + escapeHtml(point.label) + "</text>";
    }).join("");
    refs.categoryChart.innerHTML = stems + '<path d="' + path + '" fill="none" stroke="#1A1A1A" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"></path>' + dots + labels;
  }

  function renderEmptyState(message) {
    refs.insightsGrid.innerHTML = '<div class="empty-card card" style="grid-column:1 / -1;">' + escapeHtml(message) + "</div>";
  }

  function renderInsights() {
    const event = state.selectedEvent;
    if (!event) {
      renderEmptyState("No events are available yet. Create an event from the dashboard first.");
      refs.pageTitle.textContent = "Attendee Insights";
      refs.breadcrumbLabel.textContent = "Dashboard / Event / Insights";
      return;
    }
    refs.pageTitle.textContent = event.title;
    refs.breadcrumbLabel.textContent = "Dashboard / Event / " + event.title;
    const attendeeTotal = getActiveRegistrations().length;
    refs.attendeeTotal.textContent = String(attendeeTotal);
    renderGender(buildAttendanceBreakdown());
    renderAge(buildDepartmentBreakdown());
    renderLocationChart(buildLocationData());
    renderCategoryChart(buildCategoryData());
  }

  async function loadEventInsightDetails(eventId) {
    const [registrationsPayload, attendancePayload] = await Promise.all([
      apiRequest("/events/" + eventId + "/registrations").catch(function () { return { items: [] }; }),
      apiRequest("/attendance?event_id=" + encodeURIComponent(eventId)).catch(function () { return { items: [] }; })
    ]);
    state.selectedEventRegistrations = Array.isArray(registrationsPayload.items) ? registrationsPayload.items : [];
    state.selectedEventAttendance = Array.isArray(attendancePayload.items) ? attendancePayload.items : [];
  }

  async function selectAndRenderEvent() {
    state.selectedEvent = getSelectedEvent();
    state.selectedEventId = state.selectedEvent ? state.selectedEvent.id : null;
    renderEventSelector();
    if (!state.selectedEvent) {
      updateSelectedEventUrl("");
      renderInsights();
      return;
    }
    updateSelectedEventUrl(state.selectedEvent.id);
    await loadEventInsightDetails(state.selectedEvent.id);
    renderInsights();
  }

  async function loadPage() {
    try {
      const user = await apiRequest("/users/me");
      hydrateUser(user);
      const eventsPayload = await apiRequest("/events");
      state.events = normalizeEvents(eventsPayload.items || []);
      clearBanner();
      await selectAndRenderEvent();
    } catch (error) {
      if (error.statusCode === 401 || error.statusCode === 403 || error.message === "Missing session") {
        clearTokens();
        window.location.assign(getUiUrl(signInPath));
        return;
      }
      showBanner(error.message || "Attendee insights could not finish loading right now.");
      renderEmptyState("Attendee insights could not finish loading right now.");
    }
  }

  if (refs.menuButton) {
    refs.menuButton.addEventListener("click", function () {
      refs.sidebar.classList.toggle("open");
    });
  }

  if (refs.logoutButton) {
    refs.logoutButton.addEventListener("click", function () {
      clearTokens();
      window.location.assign(getUiUrl(signInPath));
    });
  }

  refs.searchInput.addEventListener("input", function () {
    state.searchQuery = refs.searchInput.value || "";
    selectAndRenderEvent().catch(function (error) {
      showBanner(error.message || "Search could not refresh attendee insights.");
    });
  });

  if (refs.eventList) {
    refs.eventList.addEventListener("click", function (event) {
      const button = event.target.closest("[data-insight-event]");
      if (!button) {
        return;
      }
      state.selectedEventId = button.getAttribute("data-insight-event");
      selectAndRenderEvent().catch(function (error) {
        showBanner(error.message || "Could not load the selected event insights.");
      });
    });
  }

  refs.notificationsTrigger.addEventListener("click", function (event) {
    event.stopPropagation();
    toggleNotificationsMenu();
  });

  refs.profileTrigger.addEventListener("click", function (event) {
    event.stopPropagation();
    toggleProfileMenu();
  });

  refs.profileViewButton.addEventListener("click", openProfileModal);
  refs.profileModalClose.addEventListener("click", closeProfileModal);
  refs.profileModalDone.addEventListener("click", closeProfileModal);
  refs.profileModal.addEventListener("click", function (event) {
    if (event.target === refs.profileModal) {
      closeProfileModal();
    }
  });

  document.addEventListener("click", function () {
    closeNotificationsMenu();
    closeProfileMenu();
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      closeNotificationsMenu();
      closeProfileMenu();
      closeProfileModal();
    }
  });

  if (window.EMS_REALTIME) {
    window.EMS_REALTIME.ensureConnection("admin");
    window.EMS_REALTIME.onMessage(function (message) {
      const type = String(message && message.type || "");
      if (["new_registration", "registration_cancelled", "attendance_submitted", "event_approved", "seat_updated"].includes(type)) {
        loadPage().catch(function (error) {
          showBanner(error.message || "Live attendee insights refresh failed.");
        });
      }
    });
  }

  loadPage();
})();
