(function () {
  const config = window.EMS_CONFIG || {};
  const apiBaseUrl = String(config.apiBaseUrl || window.location.origin).replace(/\/$/, "") + "/";
  const mediaBaseUrl = String(config.mediaBaseUrl || "").replace(/\/$/, "");
  const signInPath = config.signInPath || "/index.html";
  const dashboardPath = config.dashboardPath || "/dashboard.html";
  const storageKey = "ems.auth.tokens";
  const roleStorageKey = "ems.auth.tokens.admin";
  const notificationsStoragePrefix = "ems.dashboard.notifications";
  const categoryOptions = [
    "All Category",
    "Food & Culinary",
    "Technology",
    "Fashion",
    "Music",
    "Outdoor & Adventure",
    "Health & Fitness"
  ];
  const periodOptions = ["Today", "This Week", "This Month", "Last 3 Months", "This Year"];
  const departmentOptions = ["All Departments", "CSE", "ECE", "MBA", "Civil", "Mechanical", "Design", "Law"];
  const categoryColors = {
    "Food & Culinary": "rgba(0,0,0,0.55)",
    Technology: "rgba(15,40,80,0.65)",
    Fashion: "rgba(80,20,60,0.60)",
    Music: "rgba(60,0,80,0.65)",
    "Outdoor & Adventure": "rgba(20,50,20,0.60)",
    "Health & Fitness": "rgba(0,60,40,0.60)"
  };
  const refs = {
    sidebar: document.getElementById("sidebar"),
    menuButton: document.getElementById("menu-button"),
    logoutButton: document.getElementById("logout-button"),
    feedback: document.getElementById("events-feedback"),
    searchInput: document.getElementById("events-search-input"),
    statusTabs: document.getElementById("status-tabs"),
    resetFiltersButton: document.getElementById("reset-filters-button"),
    categoryShell: document.getElementById("category-shell"),
    categoryButton: document.getElementById("category-button"),
    categoryLabel: document.getElementById("category-label"),
    categoryMenu: document.getElementById("category-menu"),
    periodShell: document.getElementById("period-shell"),
    periodButton: document.getElementById("period-button"),
    periodLabel: document.getElementById("period-label"),
    periodMenu: document.getElementById("period-menu"),
    gridToggleButton: document.getElementById("grid-toggle-button"),
    listToggleButton: document.getElementById("list-toggle-button"),
    transition: document.getElementById("events-transition"),
    contentRoot: document.getElementById("events-content-root"),
    detailBackdrop: document.getElementById("detail-modal-backdrop"),
    detailClose: document.getElementById("detail-modal-close"),
    detailContent: document.getElementById("detail-modal-content"),
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
    profileBackdrop: document.getElementById("profile-modal-backdrop"),
    profileClose: document.getElementById("profile-modal-close"),
    profileDone: document.getElementById("profile-modal-done"),
    profileModalAvatar: document.getElementById("profile-modal-avatar"),
    profileModalName: document.getElementById("profile-modal-name"),
    profileModalEmail: document.getElementById("profile-modal-email"),
    profileModalRole: document.getElementById("profile-modal-role"),
    profileModalId: document.getElementById("profile-modal-id"),
    profileModalDepartment: document.getElementById("profile-modal-department"),
    profileModalCreated: document.getElementById("profile-modal-created"),
    toastStack: document.getElementById("toast-stack")
  };
  const state = {
    user: null,
    events: [],
    notifications: [],
    activeTab: "active",
    activeCategory: "All Category",
    activePeriod: "This Month",
    viewMode: "grid",
    searchQuery: "",
    isLoading: true,
    selectedEventId: null,
    registrations: [],
    registrationsLoadedFor: null,
    loadingRegistrations: false,
    openDropdown: null,
    isSaving: false
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
    return String(value || "EMS").split(" ").filter(Boolean).map(function (part) { return part.charAt(0).toUpperCase(); }).join("").slice(0, 2) || "EM";
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
    const role = String(value || "admin");
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

  function resolveMediaUrl(value) {
    const raw = String(value || "").trim();
    if (!raw) {
      return "";
    }
    if (!mediaBaseUrl) {
      return raw;
    }
    const match = raw.match(/^https:\/\/[^/]+\.s3\.[^/]+\.amazonaws\.com\/(.+)$/i);
    if (match && match[1]) {
      return mediaBaseUrl + "/" + match[1];
    }
    return raw;
  }

  function parseEventDate(event) {
    const date = new Date(event.eventDate || "");
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function formatEventDate(value) {
    const date = new Date(value || "");
    if (Number.isNaN(date.getTime())) {
      return "Unknown date";
    }
    return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  }

  function formatTime(value) {
    const parts = String(value || "").split(":");
    if (parts.length < 2) {
      return value || "--";
    }
    const hours = Number(parts[0]);
    const minutes = parts[1];
    const normalized = hours % 12 || 12;
    return normalized + ":" + minutes + " " + (hours >= 12 ? "PM" : "AM");
  }

  function formatPrice(value) {
    return Number(value || 0) <= 0 ? "Free" : "$" + Number(value || 0);
  }

  function buildProfileId(user) {
    const role = String(user && user.role || "admin").toLowerCase();
    const prefix = role === "teacher" ? "TCH" : role === "student" ? "STD" : "ADM";
    const compactId = String(user && user.id || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 10);
    return "EMS-" + prefix + "-" + (compactId || "USER");
  }

  function createTempEventId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (char) {
      const rand = Math.random() * 16 | 0;
      const value = char === "x" ? rand : (rand & 0x3) | 0x8;
      return value.toString(16);
    });
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

  function saveNotifications() {
    if (!state.user) {
      return;
    }
    window.localStorage.setItem(getNotificationsStorageKey(state.user), JSON.stringify(state.notifications));
  }

  function pushNotification(title, message) {
    state.notifications = [{
      id: "ntf-" + Date.now(),
      title: title,
      message: message,
      createdAt: new Date().toISOString()
    }].concat(state.notifications || []).slice(0, 10);
    saveNotifications();
    renderNotifications();
  }

  function showBanner(message) {
    refs.feedback.innerHTML = '<div class="banner">' + escapeHtml(message) + "</div>";
  }

  function clearBanner() {
    refs.feedback.innerHTML = "";
  }

  function showToast(type, message, icon) {
    const toast = document.createElement("div");
    toast.className = "toast " + type;
    toast.innerHTML = '<span class="material-symbols-outlined" style="font-size:18px;">' + escapeHtml(icon) + '</span><span>' + escapeHtml(message) + "</span>";
    refs.toastStack.appendChild(toast);
    window.setTimeout(function () {
      toast.remove();
    }, 3000);
  }

  function normalizeEvent(item) {
    return {
      id: item.id,
      title: item.title || "Untitled Event",
      description: item.description || "",
      eventType: item.eventType || "Technology",
      status: item.status || "draft",
      price: Number(item.price || 0),
      venue: item.venue || "Main Hall",
      eventDate: item.eventDate || "",
      startTime: item.startTime || "",
      endTime: item.endTime || "",
      maxCapacity: Number(item.maxCapacity || 0),
      currentCount: Number(item.currentCount || 0),
      registrationDeadline: item.registrationDeadline || null,
      posterUrl: resolveMediaUrl(item.posterUrl || ""),
      isPublic: Boolean(item.isPublic),
      departmentFilter: item.departmentFilter || "All Departments",
      tags: Array.isArray(item.tags) ? item.tags : [],
      assignedStaff: Array.isArray(item.assignedStaff) ? item.assignedStaff : [],
      organizerName: item.organizerName || (state.user ? state.user.fullName : "Event Admin"),
      createdAt: item.createdAt || null,
      rejectionReason: item.rejectionReason || null
    };
  }

  function normalizeEvents(items) {
    return (items || []).map(normalizeEvent).sort(function (left, right) {
      const leftDate = parseEventDate(left);
      const rightDate = parseEventDate(right);
      return (rightDate ? rightDate.getTime() : 0) - (leftDate ? leftDate.getTime() : 0);
    });
  }

  function getTodayStart() {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now;
  }

  function getEventBucket(event) {
    const date = parseEventDate(event);
    if (event.status === "draft") {
      return "draft";
    }
    if (event.status === "completed" || event.status === "cancelled" || (date && date.getTime() < getTodayStart().getTime())) {
      return "past";
    }
    if (event.status === "rejected") {
      return "draft";
    }
    return "active";
  }

  function getStatusMeta(event) {
    const bucket = getEventBucket(event);
    if (bucket === "past") {
      return { label: "Past", color: "#6b7280", dotClass: "" };
    }
    if (event.status === "draft") {
      return { label: "Draft", color: "#d97706", dotClass: "" };
    }
    if (event.status === "pending_approval") {
      return { label: "Pending", color: "#d97706", dotClass: "" };
    }
    return { label: "Active", color: "#16a34a", dotClass: "pulse" };
  }

  function getImageUrl(event) {
    return event.posterUrl || "https://picsum.photos/seed/" + encodeURIComponent(event.id || event.title) + "/400/200";
  }

  function getRegistrationPercentage(event) {
    if (!event.maxCapacity) {
      return 0;
    }
    return Math.max(0, Math.min(100, Math.round((event.currentCount / event.maxCapacity) * 100)));
  }

  function getCounts() {
    return state.events.reduce(function (accumulator, event) {
      const bucket = getEventBucket(event);
      accumulator[bucket] += 1;
      return accumulator;
    }, { active: 0, past: 0, draft: 0 });
  }

  function matchesPeriod(event) {
    const selected = state.activePeriod;
    if (selected === "This Month" || !selected) {
      return true;
    }
    const date = parseEventDate(event);
    if (!date) {
      return false;
    }
    const today = new Date();
    const startOfToday = getTodayStart().getTime();
    if (selected === "Today") {
      const end = startOfToday + 86400000;
      return date.getTime() >= startOfToday && date.getTime() < end;
    }
    if (selected === "This Week") {
      const start = getTodayStart();
      start.setDate(start.getDate() - start.getDay());
      const end = new Date(start);
      end.setDate(end.getDate() + 7);
      return date >= start && date < end;
    }
    if (selected === "Last 3 Months") {
      const start = new Date(today.getFullYear(), today.getMonth() - 2, 1);
      const end = new Date(today.getFullYear(), today.getMonth() + 1, 1);
      return date >= start && date < end;
    }
    if (selected === "This Year") {
      return date.getFullYear() === today.getFullYear();
    }
    return true;
  }

  function getFilteredEvents() {
    return state.events.filter(function (event) {
      const query = state.searchQuery.trim().toLowerCase();
      const matchesTab = getEventBucket(event) === state.activeTab;
      const matchesCategory = state.activeCategory === "All Category" || event.eventType === state.activeCategory;
      const matchesSearch = !query || event.title.toLowerCase().includes(query);
      return matchesTab && matchesCategory && matchesPeriod(event) && matchesSearch;
    });
  }

  function hydrateUser(user) {
    state.user = user;
    state.notifications = loadNotifications(user);
    const profileId = user.profileId || buildProfileId(user);
    refs.headerUserName.textContent = user.fullName || "Event Admin";
    refs.headerUserEmail.textContent = user.email || "admin@eventopia.com";
    refs.profileMenuId.textContent = profileId;
    refs.profileModalName.textContent = user.fullName || "Event Admin";
    refs.profileModalEmail.textContent = user.email || "admin@eventopia.com";
    refs.profileModalRole.textContent = formatRole(user.role);
    refs.profileModalId.textContent = profileId;
    refs.profileModalDepartment.textContent = user.department || "Not added yet";
    refs.profileModalCreated.textContent = formatJoinedDate(user.createdAt);
    setAvatar(refs.headerAvatar, user.fullName || "Event Admin", user.avatarUrl || "");
    setAvatar(refs.profileModalAvatar, user.fullName || "Event Admin", user.avatarUrl || "");
    renderNotifications();
  }

  function renderNotifications() {
    refs.notificationsCount.textContent = String((state.notifications || []).length) + " New";
    refs.notificationsDot.classList.toggle("hidden", !state.notifications.length);
    if (!state.notifications.length) {
      refs.notificationsList.innerHTML = '<div class="notification-empty">No new notifications</div>';
      return;
    }
    refs.notificationsList.innerHTML = state.notifications.map(function (item) {
      return '<div class="notification-item"><div class="notification-item-title">' + escapeHtml(item.title) + '</div><div class="notification-item-copy">' + escapeHtml(item.message) + '</div><div class="notification-item-time">' + escapeHtml(formatRelativeTime(item.createdAt)) + "</div></div>";
    }).join("");
  }

  function renderDropdownMenu(menu, options, selectedValue, showDots) {
    menu.innerHTML = options.map(function (option) {
      const dot = showDots ? '<span class="option-dot" style="background:' + escapeHtml(categoryColors[option] || "#8b8fa3") + ';"></span>' : "";
      const check = option === selectedValue ? '<span class="material-symbols-outlined" style="font-size:16px;color:var(--text-secondary);">check</span>' : "";
      return '<button class="dropdown-option" type="button" data-value="' + escapeHtml(option) + '"><span class="dropdown-option-left">' + dot + '<span>' + escapeHtml(option) + "</span></span>" + check + "</button>";
    }).join("");
  }

  function renderTabs() {
    const counts = getCounts();
    const items = [
      { key: "active", label: "Active" },
      { key: "past", label: "Past" },
      { key: "draft", label: "Draft" }
    ];
    refs.statusTabs.innerHTML = items.map(function (item) {
      const isActive = state.activeTab === item.key;
      return '<button class="tab-pill' + (isActive ? " active" : "") + '" type="button" data-tab="' + item.key + '">' + item.label + " (" + counts[item.key] + ")</button>";
    }).join("");
  }

  function renderSkeleton() {
    refs.contentRoot.innerHTML = '<div class="skeleton-grid">' + new Array(8).fill("").map(function () {
      return '<article class="skeleton-card"><div class="skeleton-image shimmer"></div><div class="skeleton-body"><div class="skeleton-line shimmer short"></div><div class="skeleton-line shimmer medium"></div><div class="skeleton-line shimmer wide"></div></div></article>';
    }).join("") + "</div>";
  }

  function renderEmptyState() {
    refs.contentRoot.innerHTML = [
      '<div class="empty-state">',
      '<svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">',
      '<rect x="10" y="12" width="44" height="40" rx="10" stroke="#9CA3AF" stroke-width="2"/>',
      '<path d="M20 8V18" stroke="#9CA3AF" stroke-width="2" stroke-linecap="round"/>',
      '<path d="M44 8V18" stroke="#9CA3AF" stroke-width="2" stroke-linecap="round"/>',
      '<path d="M10 24H54" stroke="#9CA3AF" stroke-width="2"/>',
      '<path d="M24 34L40 46" stroke="#9CA3AF" stroke-width="2.5" stroke-linecap="round"/>',
      '<path d="M40 34L24 46" stroke="#9CA3AF" stroke-width="2.5" stroke-linecap="round"/>',
      "</svg>",
      "<h3>No events found</h3>",
      "<p>Try adjusting your filters to view more events</p>",
      "</div>"
    ].join("");
  }

  function renderGrid(events) {
    refs.contentRoot.innerHTML = '<div class="events-grid">' + events.map(function (event) {
      const status = getStatusMeta(event);
      const progress = getRegistrationPercentage(event);
      return [
        '<article class="event-card" data-open-detail="true" data-id="' + escapeHtml(event.id) + '">',
        '<div class="event-card-image">',
        '<img alt="' + escapeHtml(event.title) + '" src="' + escapeHtml(getImageUrl(event)) + '" />',
        '<span class="category-chip" style="background:' + escapeHtml(categoryColors[event.eventType] || "rgba(0,0,0,0.55)") + ';">' + escapeHtml(event.eventType) + "</span>",
        '<span class="status-chip" style="color:' + escapeHtml(status.color) + ';"><span class="status-dot ' + status.dotClass + '" style="background:' + escapeHtml(status.color) + ';"></span>' + escapeHtml(status.label) + "</span>",
        "</div>",
        '<div class="event-card-body">',
        '<div class="event-title-row"><div class="event-title">' + escapeHtml(event.title) + '</div><div class="event-price' + (event.price <= 0 ? " free" : "") + '">' + escapeHtml(formatPrice(event.price)) + "</div></div>",
        '<div class="meta-row"><span class="material-symbols-outlined" style="font-size:13px;color:var(--text-muted);">calendar_month</span><span>' + escapeHtml(formatEventDate(event.eventDate)) + "</span></div>",
        '<div class="meta-row"><span class="material-symbols-outlined" style="font-size:13px;color:var(--text-muted);">schedule</span><span>' + escapeHtml(formatTime(event.startTime)) + "</span></div>",
        '<div class="meta-row location"><span class="material-symbols-outlined" style="font-size:13px;">location_on</span><span class="meta-text">' + escapeHtml(event.venue) + "</span></div>",
        '<div class="event-progress"><div class="event-progress-track"><div class="event-progress-fill" data-progress="' + progress + '"></div></div><div class="event-progress-meta"><span>' + progress + "%</span></div></div>",
        "</div>",
        "</article>"
      ].join("");
    }).join("") + "</div>";
  }

  function renderList(events) {
    refs.contentRoot.innerHTML = '<div class="events-list">' + events.map(function (event) {
      const status = getStatusMeta(event);
      const progress = getRegistrationPercentage(event);
      return [
        '<article class="event-row" data-open-detail="true" data-id="' + escapeHtml(event.id) + '">',
        '<img class="event-row-thumb" alt="' + escapeHtml(event.title) + '" src="' + escapeHtml(getImageUrl(event)) + '" />',
        '<div class="event-row-main">',
        '<div class="event-row-title"><strong>' + escapeHtml(event.title) + '</strong><span class="list-chip list-category">' + escapeHtml(event.eventType) + '</span><span class="list-chip" style="background:rgba(255,255,255,.9);color:' + escapeHtml(status.color) + ';border:1px solid #ece6dd;"><span class="status-dot ' + status.dotClass + '" style="background:' + escapeHtml(status.color) + ';"></span>' + escapeHtml(status.label) + "</span></div>",
        '<div class="event-row-meta"><span class="material-symbols-outlined" style="font-size:12px;color:var(--text-muted);">calendar_month</span><span>' + escapeHtml(formatEventDate(event.eventDate)) + '</span><span>&bull;</span><span class="material-symbols-outlined" style="font-size:12px;color:var(--text-muted);">schedule</span><span>' + escapeHtml(formatTime(event.startTime)) + '</span><span>&bull;</span><span class="material-symbols-outlined" style="font-size:12px;color:var(--accent-red);">location_on</span><span>' + escapeHtml(event.venue) + "</span></div>",
        "</div>",
        '<div class="event-row-progress"><div class="event-row-progress-label">Registrations</div><div class="event-progress-track" style="margin-top:4px;"><div class="event-progress-fill" data-progress="' + progress + '"></div></div><div class="event-row-progress-copy">' + event.currentCount + "/" + event.maxCapacity + " registered</div></div>",
        '<div class="event-row-side"><div class="event-price' + (event.price <= 0 ? " free" : "") + '">' + escapeHtml(formatPrice(event.price)) + '</div><div class="mini-actions"><button class="mini-action" type="button" data-action="view" data-id="' + escapeHtml(event.id) + '"><span class="material-symbols-outlined" style="font-size:14px;">visibility</span></button>' + (event.status === "pending_approval" ? '<button class="mini-action" type="button" data-action="approve" data-id="' + escapeHtml(event.id) + '"><span class="material-symbols-outlined" style="font-size:14px;">check_circle</span></button><button class="mini-action" type="button" data-action="reject" data-id="' + escapeHtml(event.id) + '"><span class="material-symbols-outlined" style="font-size:14px;">cancel</span></button>' : "") + "</div></div>",
        "</article>"
      ].join("");
    }).join("") + "</div>";
  }

  function animateProgressBars() {
    window.requestAnimationFrame(function () {
      Array.from(refs.contentRoot.querySelectorAll(".event-progress-fill")).forEach(function (node) {
        node.style.width = String(node.getAttribute("data-progress") || 0) + "%";
      });
    });
  }

  function renderContent() {
    renderTabs();
    refs.categoryLabel.textContent = state.activeCategory;
    refs.periodLabel.textContent = state.activePeriod;
    refs.gridToggleButton.classList.toggle("active", state.viewMode === "grid");
    refs.listToggleButton.classList.toggle("active", state.viewMode === "list");
    renderDropdownMenu(refs.categoryMenu, categoryOptions, state.activeCategory, true);
    renderDropdownMenu(refs.periodMenu, periodOptions, state.activePeriod, false);

    if (state.isLoading) {
      renderSkeleton();
      return;
    }
    const events = getFilteredEvents();
    if (!events.length) {
      renderEmptyState();
      return;
    }
    if (state.viewMode === "grid") {
      renderGrid(events);
    } else {
      renderList(events);
    }
    animateProgressBars();
  }

  function getSelectedEvent() {
    return state.events.find(function (event) { return event.id === state.selectedEventId; }) || null;
  }

  function renderDetailModal() {
    const event = getSelectedEvent();
    if (!event) {
      refs.detailBackdrop.classList.remove("open");
      refs.detailBackdrop.setAttribute("aria-hidden", "true");
      refs.detailContent.innerHTML = "";
      return;
    }
    const status = getStatusMeta(event);
    const seatsAvailable = Math.max(0, event.maxCapacity - event.currentCount);
    const progress = getRegistrationPercentage(event);
    const submittedDate = event.createdAt ? formatEventDate(event.createdAt) : formatEventDate(event.eventDate);
    const timeline = [
      { time: event.registrationDeadline ? formatEventDate(event.registrationDeadline) : "Open now", label: "Registration closes" },
      { time: formatTime(event.startTime), label: "Guest check-in begins" },
      { time: formatTime(event.startTime), label: "Main event begins" },
      { time: formatTime(event.endTime), label: "Event wraps up" }
    ];
    const tags = event.tags.length ? event.tags : [event.eventType, event.departmentFilter || "General", status.label];
    const registrationsHtml = state.registrationsLoadedFor === event.id
      ? (state.registrations.length
        ? state.registrations.map(function (item) {
          return '<div class="registration-item"><div class="registration-item-title">' + escapeHtml(item.studentName || item.studentEmail || "Registration") + '</div><div class="registration-item-meta">' + escapeHtml(item.studentEmail || "No email") + " • " + escapeHtml(item.status || "registered") + "</div></div>";
        }).join("")
        : '<div class="registration-item"><div class="registration-item-title">No registrations yet</div><div class="registration-item-meta">This event has not received any registrations yet.</div></div>')
      : "";
    const staffHtml = Array.isArray(event.assignedStaff) && event.assignedStaff.length
      ? event.assignedStaff.map(function (item) {
        return '<div class="registration-item"><div class="registration-item-title">' + escapeHtml(item.fullName || "Teacher") + '</div><div class="registration-item-meta">' + escapeHtml(item.email || "Staff member") + '</div></div>';
      }).join("")
      : '<div class="registration-item"><div class="registration-item-title">No staff joined yet</div><div class="registration-item-meta">Teachers will appear here after they accept the staff invite.</div></div>';

    refs.detailContent.innerHTML = [
      '<div class="detail-hero"><img alt="' + escapeHtml(event.title) + '" src="' + escapeHtml(getImageUrl(event)) + '" /><div class="detail-overlay"><div class="detail-overlay-copy"><span class="category-chip" style="position:static;background:' + escapeHtml(categoryColors[event.eventType] || "rgba(0,0,0,0.55)") + ';">' + escapeHtml(event.eventType) + '</span><div class="detail-title" id="detail-modal-title">' + escapeHtml(event.title) + '</div><div class="detail-price">' + escapeHtml(formatPrice(event.price)) + '</div></div><span class="status-chip" style="position:static;color:' + escapeHtml(status.color) + ';"><span class="status-dot ' + status.dotClass + '" style="background:' + escapeHtml(status.color) + ';"></span>' + escapeHtml(status.label) + "</span></div></div>",
      '<div class="detail-body">',
      '<div>',
      '<div class="section-heading">About this Event</div><div class="detail-copy">' + escapeHtml(event.description || "This event is ready to bring the community together with a focused schedule, guided sessions, and a strong attendee experience built around the theme.") + "</div>",
      '<div class="tag-row">' + tags.map(function (tag) { return '<span class="tag-pill">' + escapeHtml(tag) + "</span>"; }).join("") + "</div>",
      '<div class="section-heading">Event Schedule</div><div class="timeline">' + timeline.map(function (item) { return '<div class="timeline-item"><div class="timeline-marker"></div><div><div class="timeline-time">' + escapeHtml(item.time) + '</div><div class="timeline-label">' + escapeHtml(item.label) + "</div></div></div>"; }).join("") + "</div>",
      '<div class="section-heading">Organizer</div><div class="organizer-row"><span class="avatar">' + escapeHtml(getInitials(event.organizerName)) + '</span><div class="organizer-copy"><div class="organizer-name">' + escapeHtml(event.organizerName || "Event Admin") + '</div><div class="organizer-dept">' + escapeHtml(event.departmentFilter || "General Department") + '</div><a class="organizer-link" href="#" data-open-profile="true">View Profile</a></div></div>',
      '<div class="section-heading">Staff Team</div><div class="registrations-panel">' + staffHtml + '</div>',
      "</div>",
      '<div><div class="registration-card"><div class="seats-row"><span class="seats-value">' + seatsAvailable + '</span><span class="seats-total">/' + event.maxCapacity + "</span></div><div style=\"font-size:12px;color:var(--text-muted);\">Seats Available</div><div class=\"event-progress\" style=\"margin-top:12px;\"><div class=\"event-progress-track\" style=\"height:8px;\"><div class=\"event-progress-fill\" data-progress=\"" + progress + "\"></div></div></div>",
      '<div class="info-grid"><div class="info-item"><div class="info-meta"><span class="material-symbols-outlined" style="font-size:14px;">calendar_month</span><span>Date</span></div><div class="info-value">' + escapeHtml(formatEventDate(event.eventDate)) + '</div></div><div class="info-item"><div class="info-meta"><span class="material-symbols-outlined" style="font-size:14px;">schedule</span><span>Time</span></div><div class="info-value">' + escapeHtml(formatTime(event.startTime)) + '</div></div><div class="info-item full"><div class="info-meta"><span class="material-symbols-outlined" style="font-size:14px;">location_on</span><span>Venue</span></div><div class="info-value">' + escapeHtml(event.venue) + '</div></div><div class="info-item"><div class="info-meta"><span class="material-symbols-outlined" style="font-size:14px;">apartment</span><span>Department</span></div><div class="info-value">' + escapeHtml(event.departmentFilter || "All Departments") + '</div></div><div class="info-item"><div class="info-meta"><span class="material-symbols-outlined" style="font-size:14px;">event_upcoming</span><span>Registration Deadline</span></div><div class="info-value">' + escapeHtml(event.registrationDeadline ? formatEventDate(event.registrationDeadline) : "Not set") + "</div></div></div>",
      '<div class="detail-divider"></div><div class="action-stack">' + (event.status === "pending_approval"
        ? '<button class="action-btn primary" type="button" data-action="approve" data-id="' + escapeHtml(event.id) + '"><span class="material-symbols-outlined" style="font-size:18px;">check_circle</span><span>Approve Event</span></button><button class="action-btn danger" type="button" data-action="reject" data-id="' + escapeHtml(event.id) + '"><span class="material-symbols-outlined" style="font-size:18px;">cancel</span><span>Reject Event</span></button>'
        : '<div class="approval-banner">&#10003; Event is Approved</div>') + (event.status !== "draft" ? '<button class="action-btn outlined" type="button" data-action="registrations" data-id="' + escapeHtml(event.id) + '"><span class="material-symbols-outlined" style="font-size:18px;">group</span><span>' + (state.loadingRegistrations && state.selectedEventId === event.id ? "Loading..." : "View Registrations") + '</span></button>' : "") + '</div>' + (registrationsHtml ? '<div class="registrations-panel">' + registrationsHtml + "</div>" : "") + '<div class="detail-meta-note">Created by ' + escapeHtml(event.organizerName || "Event Admin") + " • Submitted " + escapeHtml(submittedDate) + "</div></div></div>"
    ].join("");
    refs.detailBackdrop.classList.add("open");
    refs.detailBackdrop.setAttribute("aria-hidden", "false");
    animateProgressBars();
  }

  function openDrawer(mode, event) {
    state.drawerOpen = true;
    state.drawerMode = mode;
    state.editingEventId = event ? event.id : null;
    state.drawerCategory = event ? event.eventType : "Technology";
    state.drawerDepartment = event ? (event.departmentFilter || "All Departments") : "All Departments";
    state.drawerTags = event ? event.tags.slice(0, 6) : [];
    state.freeEvent = event ? Number(event.price || 0) <= 0 : false;
    state.existingPosterUrl = event ? event.posterUrl || "" : "";
    state.uploadFile = null;
    if (state.uploadPreviewUrl) {
      URL.revokeObjectURL(state.uploadPreviewUrl);
    }
    state.uploadPreviewUrl = event && event.posterUrl ? event.posterUrl : "";
    refs.drawerTitle.textContent = mode === "edit" ? "Edit Event" : "Create New Event";
    refs.drawerTitleInput.value = event ? event.title : "";
    refs.priceInput.value = event && event.price ? String(event.price) : "";
    refs.dateInput.value = event ? event.eventDate : "";
    refs.timeInput.value = event ? event.startTime : "";
    refs.endTimeInput.value = event ? event.endTime : "";
    refs.venueInput.value = event ? event.venue : "";
    refs.capacityInput.value = event ? String(event.maxCapacity) : "";
    refs.deadlineInput.value = event && event.registrationDeadline ? event.registrationDeadline.slice(0, 16) : "";
    refs.descriptionInput.value = event ? event.description : "";
    refs.freeToggle.classList.toggle("on", state.freeEvent);
    refs.freeToggle.setAttribute("aria-pressed", String(state.freeEvent));
    refs.priceInput.disabled = state.freeEvent;
    refs.priceInputShell.classList.toggle("disabled", state.freeEvent);
    refs.drawerCategoryLabel.textContent = state.drawerCategory;
    refs.drawerDepartmentLabel.textContent = state.drawerDepartment;
    refs.imageInput.value = "";
    syncTags();
    syncUploadPreview();
    refs.drawer.classList.add("open");
    refs.drawerBackdrop.classList.add("open");
    refs.drawer.setAttribute("aria-hidden", "false");
    renderContent();
  }

  function closeDrawer() {
    state.drawerOpen = false;
    state.drawer.classList.remove("open");
    refs.drawerBackdrop.classList.remove("open");
    refs.drawer.setAttribute("aria-hidden", "true");
  }

  function syncTags() {
    refs.tagWrap.innerHTML = state.drawerTags.map(function (tag) {
      return '<span class="chip">' + escapeHtml(tag) + '<button class="chip-remove" type="button" data-remove-tag="' + escapeHtml(tag) + '">&times;</button></span>';
    }).join("");
  }

  function syncUploadPreview() {
    const previewUrl = state.uploadPreviewUrl || state.existingPosterUrl;
    if (!previewUrl) {
      refs.uploadPreview.classList.remove("visible");
      refs.uploadPreviewImage.removeAttribute("src");
      return;
    }
    refs.uploadPreview.classList.add("visible");
    refs.uploadPreviewImage.src = previewUrl;
    refs.uploadPreviewName.textContent = state.uploadFile ? state.uploadFile.name : "Current poster";
    refs.uploadPreviewSub.textContent = state.uploadFile ? "Ready to upload" : "Using saved event poster";
  }

  async function uploadBannerFile(file) {
    const contentType = String(file.type || "").toLowerCase();
    if (contentType !== "image/png" && contentType !== "image/jpeg") {
      throw new Error("Cover image must be a PNG or JPG file.");
    }
    const presigned = await apiRequest("/media/presign", {
      method: "POST",
      body: {
        eventId: createTempEventId(),
        filename: file.name,
        contentType: contentType
      }
    });
    const uploadResponse = await fetch(presigned.uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": contentType },
      body: file
    });
    if (!uploadResponse.ok) {
      throw new Error("Cover image upload failed.");
    }
    return presigned.key && mediaBaseUrl ? mediaBaseUrl + "/" + presigned.key : resolveMediaUrl(presigned.publicUrl);
  }

  function buildDrawerPayload(status) {
    return {
      title: refs.drawerTitleInput.value.trim(),
      description: refs.descriptionInput.value.trim(),
      eventType: state.drawerCategory,
      status: status,
      price: state.freeEvent ? 0 : Number(refs.priceInput.value || 0),
      venue: refs.venueInput.value.trim(),
      eventDate: refs.dateInput.value,
      startTime: refs.timeInput.value,
      endTime: refs.endTimeInput.value,
      maxCapacity: Number(refs.capacityInput.value || 0),
      registrationDeadline: refs.deadlineInput.value ? new Date(refs.deadlineInput.value).toISOString() : undefined,
      posterUrl: state.existingPosterUrl || undefined,
      departmentFilter: state.drawerDepartment === "All Departments" ? undefined : state.drawerDepartment,
      isPublic: true,
      tags: state.drawerTags
    };
  }

  function updateEventInState(updated) {
    const normalized = normalizeEvent(updated);
    const index = state.events.findIndex(function (item) { return item.id === normalized.id; });
    if (index >= 0) {
      state.events.splice(index, 1, normalized);
    } else {
      state.events.unshift(normalized);
    }
    state.events = normalizeEvents(state.events);
    if (state.selectedEventId === normalized.id) {
      state.selectedEventId = normalized.id;
    }
    renderContent();
    renderDetailModal();
  }

  async function saveDrawer(status) {
    if (state.isSaving) {
      return;
    }
    const payload = buildDrawerPayload(status);
    if (!payload.title || !payload.eventDate || !payload.startTime || !payload.endTime || !payload.venue || !payload.maxCapacity) {
      showBanner("Please complete the required event fields first.");
      return;
    }
    state.isSaving = true;
    refs.draftButton.disabled = true;
    refs.submitButton.disabled = true;
    try {
      if (state.uploadFile) {
        payload.posterUrl = await uploadBannerFile(state.uploadFile);
      }
      const result = state.drawerMode === "edit" && state.editingEventId
        ? await apiRequest("/events/" + state.editingEventId, { method: "PUT", body: payload })
        : await apiRequest("/events", { method: "POST", body: payload });
      updateEventInState(result);
      pushNotification(state.drawerMode === "edit" ? "Event Updated" : "Event Created", result.title + " is now available in Events.");
      showToast("success", state.drawerMode === "edit" ? "Event updated successfully" : "Event created successfully", "check_circle");
      clearBanner();
      closeDrawer();
    } catch (error) {
      showBanner(error.message || "The event could not be saved.");
    } finally {
      state.isSaving = false;
      refs.draftButton.disabled = false;
      refs.submitButton.disabled = false;
    }
  }

  async function loadRegistrations(eventId) {
    state.loadingRegistrations = true;
    renderDetailModal();
    try {
      const payload = await apiRequest("/events/" + eventId + "/registrations");
      state.registrations = payload.items || [];
      state.registrationsLoadedFor = eventId;
    } catch (error) {
      showBanner(error.message || "Registrations could not be loaded.");
    } finally {
      state.loadingRegistrations = false;
      renderDetailModal();
    }
  }

  async function approveEvent(eventId) {
    const updated = await apiRequest("/events/" + eventId + "/approve", { method: "PUT" });
    updateEventInState(updated);
    pushNotification("Event Approved", updated.title + " was approved.");
    showToast("success", "Event approved successfully", "check_circle");
  }

  async function rejectEvent(eventId) {
    const updated = await apiRequest("/events/" + eventId + "/reject", { method: "PUT", body: { reason: "Rejected by admin" } });
    updateEventInState(updated);
    pushNotification("Event Rejected", updated.title + " was rejected.");
    showToast("error", "Event rejected", "cancel");
  }

  function openProfileModal() {
    refs.profileBackdrop.classList.add("open");
    refs.profileBackdrop.setAttribute("aria-hidden", "false");
    closeProfileMenu();
  }

  function closeProfileModal() {
    refs.profileBackdrop.classList.remove("open");
    refs.profileBackdrop.setAttribute("aria-hidden", "true");
  }

  function openNotificationsMenu() {
    refs.notificationsMenu.classList.add("open");
    refs.notificationsTrigger.setAttribute("aria-expanded", "true");
    closeProfileMenu();
  }

  function closeNotificationsMenu() {
    refs.notificationsMenu.classList.remove("open");
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
    refs.profileTrigger.setAttribute("aria-expanded", "true");
    closeNotificationsMenu();
  }

  function closeProfileMenu() {
    refs.profileMenu.classList.remove("open");
    refs.profileTrigger.setAttribute("aria-expanded", "false");
  }

  function toggleProfileMenu() {
    if (refs.profileMenu.classList.contains("open")) {
      closeProfileMenu();
    } else {
      openProfileMenu();
    }
  }

  function setDropdown(name, open) {
    state.openDropdown = open ? name : null;
    [refs.categoryShell, refs.periodShell].forEach(function (shell) {
      if (shell) {
        shell.classList.remove("open");
      }
    });
    if (open) {
      if (name === "category") { refs.categoryShell.classList.add("open"); }
      if (name === "period") { refs.periodShell.classList.add("open"); }
    }
  }

  function transitionAndRender(callback) {
    refs.transition.classList.add("switching");
    window.setTimeout(function () {
      callback();
      refs.transition.classList.remove("switching");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 150);
  }

  async function loadPage() {
    const started = Date.now();
    renderContent();
    try {
      const user = await apiRequest("/users/me");
      hydrateUser(user);
      const eventsPayload = await apiRequest("/events");
      state.events = normalizeEvents(eventsPayload.items || []);
      const elapsed = Date.now() - started;
      await new Promise(function (resolve) { window.setTimeout(resolve, Math.max(0, 800 - elapsed)); });
      state.isLoading = false;
      clearBanner();
      renderContent();
    } catch (error) {
      if (error.statusCode === 401 || error.statusCode === 403 || error.message === "Missing session") {
        clearTokens();
        window.location.assign(getUiUrl(signInPath));
        return;
      }
      state.isLoading = false;
      showBanner(error.message || "Events could not finish loading right now.");
      renderContent();
    }
  }

  function handleContentClick(event) {
    const openDetail = event.target.closest("[data-open-detail='true']");
    const actionButton = event.target.closest("[data-action]");
    const removeTag = event.target.closest("[data-remove-tag]");
    if (removeTag) {
      event.preventDefault();
      state.drawerTags = state.drawerTags.filter(function (tag) { return tag !== removeTag.getAttribute("data-remove-tag"); });
      syncTags();
      return;
    }
    if (actionButton) {
      event.preventDefault();
      event.stopPropagation();
      const action = actionButton.getAttribute("data-action");
      const id = actionButton.getAttribute("data-id");
      if (action === "view") { state.selectedEventId = id; renderDetailModal(); }
      if (action === "approve") { approveEvent(id).catch(function (error) { showBanner(error.message || "Approval failed."); }); }
      if (action === "reject") { rejectEvent(id).catch(function (error) { showBanner(error.message || "Rejection failed."); }); }
      if (action === "registrations") { loadRegistrations(id); }
      return;
    }
    if (openDetail) {
      state.selectedEventId = openDetail.getAttribute("data-id");
      state.registrations = [];
      state.registrationsLoadedFor = null;
      renderDetailModal();
    }
  }

  function closeDetailModal() {
    state.selectedEventId = null;
    state.registrations = [];
    state.registrationsLoadedFor = null;
    renderDetailModal();
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
    renderContent();
  });

  refs.resetFiltersButton.addEventListener("click", function () {
    state.activeCategory = "All Category";
    state.activePeriod = "This Month";
    state.searchQuery = "";
    refs.searchInput.value = "";
    renderContent();
  });

  refs.statusTabs.addEventListener("click", function (event) {
    const button = event.target.closest("[data-tab]");
    if (!button) {
      return;
    }
    state.activeTab = button.getAttribute("data-tab");
    transitionAndRender(renderContent);
  });

  refs.categoryButton.addEventListener("click", function (event) {
    event.stopPropagation();
    setDropdown("category", state.openDropdown !== "category");
  });
  refs.periodButton.addEventListener("click", function (event) {
    event.stopPropagation();
    setDropdown("period", state.openDropdown !== "period");
  });
  refs.categoryMenu.addEventListener("click", function (event) {
    const button = event.target.closest("[data-value]");
    if (!button) { return; }
    state.activeCategory = button.getAttribute("data-value");
    setDropdown(null, false);
    renderContent();
  });
  refs.periodMenu.addEventListener("click", function (event) {
    const button = event.target.closest("[data-value]");
    if (!button) { return; }
    state.activePeriod = button.getAttribute("data-value");
    setDropdown(null, false);
    renderContent();
  });
  refs.gridToggleButton.addEventListener("click", function () {
    state.viewMode = "grid";
    renderContent();
  });
  refs.listToggleButton.addEventListener("click", function () {
    state.viewMode = "list";
    renderContent();
  });

  refs.detailClose.addEventListener("click", closeDetailModal);
  refs.detailBackdrop.addEventListener("click", function (event) {
    if (event.target === refs.detailBackdrop) {
      closeDetailModal();
    }
  });
  refs.contentRoot.addEventListener("click", handleContentClick);
  refs.detailContent.addEventListener("click", function (event) {
    if (event.target.closest("[data-open-profile='true']")) {
      event.preventDefault();
      openProfileModal();
      return;
    }
    const button = event.target.closest("[data-action]");
    if (!button) { return; }
    const action = button.getAttribute("data-action");
    const id = button.getAttribute("data-id");
    if (action === "approve") { approveEvent(id).catch(function (error) { showBanner(error.message || "Approval failed."); }); }
    if (action === "reject") { rejectEvent(id).catch(function (error) { showBanner(error.message || "Rejection failed."); }); }
    if (action === "registrations") { loadRegistrations(id); }
  });

  refs.notificationsTrigger.addEventListener("click", function (event) {
    event.stopPropagation();
    toggleNotificationsMenu();
  });
  refs.profileTrigger.addEventListener("click", function (event) {
    event.stopPropagation();
    toggleProfileMenu();
  });
  refs.profileViewButton.addEventListener("click", openProfileModal);
  refs.profileClose.addEventListener("click", closeProfileModal);
  refs.profileDone.addEventListener("click", closeProfileModal);
  refs.profileBackdrop.addEventListener("click", function (event) {
    if (event.target === refs.profileBackdrop) {
      closeProfileModal();
    }
  });

  document.addEventListener("click", function () {
    setDropdown(null, false);
    closeNotificationsMenu();
    closeProfileMenu();
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      setDropdown(null, false);
      closeNotificationsMenu();
      closeProfileMenu();
      closeProfileModal();
      closeDetailModal();
    }
  });

  renderContent();
  if (window.EMS_REALTIME) {
    window.EMS_REALTIME.ensureConnection("admin");
    window.EMS_REALTIME.onMessage(function (message) {
      const type = String(message && message.type || "");
      if (["event_submitted", "event_approved", "event_rejected", "new_registration", "seat_updated", "staff_joined", "registration_cancelled"].includes(type)) {
        loadPage();
      }
    });
  }
  loadPage();
  window.setInterval(loadPage, 15000);
})();
