(function () {
  const config = window.EMS_CONFIG || {};
  const apiBaseUrl = String(config.apiBaseUrl || window.location.origin).replace(/\/$/, "") + "/";
  const mediaBaseUrl = String(config.mediaBaseUrl || "").replace(/\/$/, "");
  const cognitoRegion = config.cognitoRegion;
  const signInPath = config.signInPath || "/index.html";
  const storageKey = "ems.auth.tokens";
  const roleStorageKey = "ems.auth.tokens.admin";
  const notificationsStoragePrefix = "ems.dashboard.notifications";

  const refs = {
    messagesTrigger: document.querySelector('button[aria-label="Messages"]'),
    logoutButton: document.getElementById("logout-button"),
    menuButton: document.getElementById("menu-button"),
    sidebar: document.getElementById("sidebar"),
    feedbackRoot: document.getElementById("dashboard-feedback"),
    chartRoot: document.getElementById("revenue-chart"),
    eventsRoot: document.getElementById("upcoming-events-list"),
    mapCaption: document.getElementById("map-event-caption"),
    calendarGrid: document.getElementById("calendar-grid"),
    calendarTitle: document.getElementById("calendar-title"),
    calendarPrev: document.getElementById("calendar-prev"),
    calendarNext: document.getElementById("calendar-next"),
    donutChart: document.getElementById("donut-chart"),
    donutLabel1: document.getElementById("donut-label-1"),
    donutLabel2: document.getElementById("donut-label-2"),
    donutLabel3: document.getElementById("donut-label-3"),
    donutPercent1: document.getElementById("donut-percent-1"),
    donutPercent2: document.getElementById("donut-percent-2"),
    donutPercent3: document.getElementById("donut-percent-3"),
    trendTotalEvents: document.getElementById("trend-total-events"),
    trendTicketsSold: document.getElementById("trend-tickets-sold"),
    trendUpcomingEvents: document.getElementById("trend-upcoming-events"),
    notificationsTrigger: document.getElementById("notifications-trigger"),
    notificationsMenu: document.getElementById("notifications-menu"),
    notificationsList: document.getElementById("notifications-list"),
    notificationsCount: document.getElementById("notifications-count"),
    notificationsDot: document.getElementById("notifications-dot"),
    profileTrigger: document.getElementById("profile-trigger"),
    profileMenu: document.getElementById("profile-menu"),
    profileMenuId: document.getElementById("profile-menu-id"),
    profileViewButton: document.getElementById("profile-view-button"),
    profileModal: document.getElementById("profile-modal"),
    profileModalClose: document.getElementById("profile-modal-close"),
    profileModalDone: document.getElementById("profile-modal-done"),
    createButton: document.getElementById("create-event-button"),
    createModal: document.getElementById("create-event-modal"),
    createClose: document.getElementById("create-event-close"),
    createCancel: document.getElementById("create-event-cancel"),
    createForm: document.getElementById("create-event-form"),
    createSubmit: document.getElementById("create-event-submit"),
    priceInput: document.getElementById("event-price-input"),
    priceShell: document.getElementById("event-price-shell"),
    freeToggle: document.getElementById("event-free-toggle"),
    tagsWrap: document.getElementById("event-tags-wrap"),
    tagsChipInput: document.getElementById("event-tags-chip-input"),
    tagsInput: document.getElementById("event-tags-input"),
    bannerFile: document.getElementById("event-banner-file"),
    bannerStatus: document.getElementById("event-banner-status")
  };

  const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const eventBackgrounds = [
    "linear-gradient(135deg,#412f25 0%,#6a4a36 45%,#201513 100%)",
    "linear-gradient(135deg,#1d2c43 0%,#3a5f8f 46%,#10203a 100%)",
    "linear-gradient(135deg,#41351f 0%,#92724f 50%,#2d2114 100%)"
  ];
  const donutColors = ["#1a1a2e", "#9b9bb4", "#e8e2d9"];

  const state = {
    user: null,
    events: [],
    notifications: [],
    mailMessages: [],
    visibleMonth: (function () {
      const now = new Date();
      return new Date(now.getFullYear(), now.getMonth(), 1);
    })(),
    selectedCalendarDate: null,
    isSaving: false,
    isUploadingBanner: false,
    createTags: [],
    createFreeEvent: false
  };

  function getApiUrl(path) {
    return new URL(path.replace(/^\//, ""), apiBaseUrl).toString();
  }

  function getUiUrl(path) {
    return /^https?:\/\//i.test(path) ? path : new URL(path, window.location.origin).toString();
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

  function getNow() {
    return new Date();
  }

  function getDateKey(date) {
    const target = date instanceof Date ? date : new Date(date || "");
    if (Number.isNaN(target.getTime())) {
      return "";
    }

    return [
      target.getFullYear(),
      String(target.getMonth() + 1).padStart(2, "0"),
      String(target.getDate()).padStart(2, "0")
    ].join("-");
  }

  function parseDateParts(value) {
    const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) {
      return null;
    }

    return {
      year: Number(match[1]),
      month: Number(match[2]) - 1,
      day: Number(match[3])
    };
  }

  function getNotificationsStorageKey(user) {
    const suffix = user && (user.profileId || user.id) ? (user.profileId || user.id) : "guest";
    return notificationsStoragePrefix + "." + suffix;
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

  function decodeJwt(token) {
    const parts = String(token || "").split(".");
    if (parts.length < 2) {
      return null;
    }

    try {
      const normalized = parts[1].replace(/-/g, "+").replace(/_/g, "/");
      return JSON.parse(atob(normalized));
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

    const payload = await response.json().catch(function () {
      return {};
    });

    if (!response.ok) {
      const issueMessage =
        Array.isArray(payload.issues) && payload.issues.length
          ? payload.issues.map(function (issue) { return issue.message; }).join(", ")
          : null;
      const error = new Error(issueMessage || payload.message || "Request failed");
      error.statusCode = response.status;
      throw error;
    }

    return payload;
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function setText(id, value) {
    const node = document.getElementById(id);
    if (node) {
      node.textContent = value;
    }
  }

  function setLoadingPlaceholder(node, isLoading) {
    if (!node) {
      return;
    }

    node.classList.toggle("loading-placeholder", Boolean(isLoading));
  }

  function getInitials(value) {
    const initials = String(value || "EMS")
      .split(" ")
      .filter(Boolean)
      .map(function (part) {
        return part.charAt(0).toUpperCase();
      })
      .join("")
      .slice(0, 2);

    return initials || "EM";
  }

  function setAvatar(nodeId, fullName, avatarUrl) {
    const node = document.getElementById(nodeId);
    if (!node) {
      return;
    }

    if (avatarUrl) {
      node.innerHTML = '<img alt="' + escapeHtml(fullName) + '" src="' + escapeHtml(avatarUrl) + '" />';
      return;
    }

    node.textContent = getInitials(fullName);
  }

  function formatDate(value) {
    if (!value) {
      return "Unknown date";
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric"
    });
  }

  function formatTime(value) {
    if (!value) {
      return "";
    }

    const parts = String(value).split(":");
    if (parts.length < 2) {
      return value;
    }

    const hours = Number(parts[0]);
    const minutes = parts[1];
    if (Number.isNaN(hours)) {
      return value;
    }

    const meridiem = hours >= 12 ? "PM" : "AM";
    const normalizedHour = hours % 12 || 12;
    return normalizedHour + ":" + minutes + " " + meridiem;
  }

  function formatMoney(value) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0
    }).format(value);
  }

  function resolveMediaUrl(value) {
    const raw = String(value || "").trim();
    if (!raw) {
      return "";
    }

    if (!mediaBaseUrl) {
      return raw;
    }

    const bucketPattern = /^https:\/\/[^/]+\.s3\.[^/]+\.amazonaws\.com\/(.+)$/i;
    const match = raw.match(bucketPattern);
    if (match && match[1]) {
      return mediaBaseUrl + "/" + match[1];
    }

    return raw;
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

  function formatRole(value) {
    const role = String(value || "").toLowerCase();
    if (!role) {
      return "Admin";
    }

    return role.charAt(0).toUpperCase() + role.slice(1);
  }

  function formatJoinedDate(value) {
    if (!value) {
      return "Recently joined";
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "Recently joined";
    }

    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  }

  function formatRelativeTime(value) {
    if (!value) {
      return "Just now";
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "Just now";
    }

    const diffMs = Date.now() - date.getTime();
    const diffMinutes = Math.max(0, Math.round(diffMs / 60000));
    if (diffMinutes < 1) {
      return "Just now";
    }
    if (diffMinutes < 60) {
      return diffMinutes + " min ago";
    }

    const diffHours = Math.round(diffMinutes / 60);
    if (diffHours < 24) {
      return diffHours + " hr ago";
    }

    const diffDays = Math.round(diffHours / 24);
    return diffDays + " day" + (diffDays === 1 ? "" : "s") + " ago";
  }

  function getProfileId(user) {
    if (!user) {
      return "EMS-ADM-USER";
    }

    if (user.profileId) {
      return user.profileId;
    }

    const compactId = String(user.id || "")
      .replace(/[^a-zA-Z0-9]/g, "")
      .toUpperCase()
      .slice(0, 10);
    const rolePrefix = String(user.role || "admin").toLowerCase() === "teacher"
      ? "TCH"
      : String(user.role || "admin").toLowerCase() === "student"
        ? "STD"
        : "ADM";

    return "EMS-" + rolePrefix + "-" + (compactId || "USER");
  }

  function buildEventDateTime(event, timeValue) {
    const dateParts = parseDateParts(event && event.eventDate);
    if (!dateParts) {
      return null;
    }

    const timeParts = String(timeValue || "").split(":");
    const hours = Number(timeParts[0] || 0);
    const minutes = Number(timeParts[1] || 0);

    const date = new Date(
      dateParts.year,
      dateParts.month,
      dateParts.day,
      Number.isNaN(hours) ? 0 : hours,
      Number.isNaN(minutes) ? 0 : minutes,
      0,
      0
    );

    return Number.isNaN(date.getTime()) ? null : date;
  }

  function parseEventDate(event) {
    return buildEventDateTime(event, "00:00");
  }

  function getEventStartDateTime(event) {
    return buildEventDateTime(event, event && event.startTime ? event.startTime : "00:00");
  }

  function getEventEndDateTime(event) {
    return buildEventDateTime(event, event && event.endTime ? event.endTime : (event && event.startTime ? event.startTime : "23:59"));
  }

  function isEventPast(event) {
    if (!event) {
      return false;
    }
    if (event.status === "completed" || event.status === "cancelled") {
      return true;
    }

    const endDate = getEventEndDateTime(event) || parseEventDate(event);
    return Boolean(endDate && endDate.getTime() < getNow().getTime());
  }

  function isEventUpcoming(event) {
    if (!event || event.status === "cancelled" || event.status === "completed" || event.status === "rejected") {
      return false;
    }

    const endDate = getEventEndDateTime(event) || parseEventDate(event);
    return Boolean(endDate && endDate.getTime() >= getNow().getTime());
  }

  function normalizeEvent(item) {
    return {
      id: item.id,
      title: item.title || "Untitled Event",
      description: item.description || "",
      eventType: item.eventType || "Other",
      status: item.status || "draft",
      venue: item.venue || "Main Hall",
      eventDate: item.eventDate || "",
      startTime: item.startTime || "",
      endTime: item.endTime || "",
      maxCapacity: Number(item.maxCapacity || 0),
      currentCount: Number(item.currentCount || 0),
      registrationDeadline: item.registrationDeadline || null,
      posterUrl: resolveMediaUrl(item.posterUrl || ""),
      isPublic: Boolean(item.isPublic),
      departmentFilter: item.departmentFilter || "",
      tags: Array.isArray(item.tags) ? item.tags : []
    };
  }

  function normalizeEvents(items) {
    return (items || [])
      .map(normalizeEvent)
      .sort(function (left, right) {
        const leftDate = parseEventDate(left);
        const rightDate = parseEventDate(right);
        const leftTime = leftDate ? leftDate.getTime() : Number.MAX_SAFE_INTEGER;
        const rightTime = rightDate ? rightDate.getTime() : Number.MAX_SAFE_INTEGER;
        return leftTime - rightTime;
      });
  }

  function showBanner(message) {
    if (!refs.feedbackRoot) {
      return;
    }

    refs.feedbackRoot.innerHTML = '<div class="banner">' + escapeHtml(message) + "</div>";
  }

  function clearBanner() {
    if (refs.feedbackRoot) {
      refs.feedbackRoot.innerHTML = "";
    }
  }

  function hydrateUser(user) {
    const previousStorageKey = state.user ? getNotificationsStorageKey(state.user) : null;
    state.user = user;
    const profileId = getProfileId(user);
    setText("dashboard-user-name", user.fullName || "EMS Admin");
    setText("dashboard-user-email", user.email || "admin@ems.app");
    setText("dashboard-page-title", "Dashboard");
    setText("breadcrumb-label", "Dashboard");
    setAvatar("header-avatar", user.fullName || "EMS Admin", user.avatarUrl || "");
    setText("profile-menu-id", profileId);
    setText("profile-modal-name", user.fullName || "EMS Admin");
    setText("profile-modal-email", user.email || "admin@ems.app");
    setText("profile-modal-role", formatRole(user.role));
    setText("profile-modal-id", profileId);
    setText("profile-modal-department", user.department || "Not added yet");
    setText("profile-modal-created", formatJoinedDate(user.createdAt));
    setAvatar("profile-modal-avatar", user.fullName || "EMS Admin", user.avatarUrl || "");
    if (previousStorageKey !== getNotificationsStorageKey(user)) {
      state.notifications = loadNotifications(user);
    }
    renderNotifications();

    const departmentInput = document.getElementById("event-department-input");
    if (departmentInput && user.department && !departmentInput.value) {
      departmentInput.value = user.department;
    }
  }

  function openProfileMenu() {
    if (!refs.profileMenu || !refs.profileTrigger) {
      return;
    }

    refs.profileMenu.classList.add("open");
    refs.profileMenu.setAttribute("aria-hidden", "false");
    refs.profileTrigger.setAttribute("aria-expanded", "true");
    closeNotificationsMenu();
  }

  function closeProfileMenu() {
    if (!refs.profileMenu || !refs.profileTrigger) {
      return;
    }

    refs.profileMenu.classList.remove("open");
    refs.profileMenu.setAttribute("aria-hidden", "true");
    refs.profileTrigger.setAttribute("aria-expanded", "false");
  }

  function toggleProfileMenu() {
    if (!refs.profileMenu || !refs.profileTrigger) {
      return;
    }

    if (refs.profileMenu.classList.contains("open")) {
      closeProfileMenu();
      return;
    }

    openProfileMenu();
  }

  function openProfileModal() {
    if (!refs.profileModal) {
      return;
    }

    closeProfileMenu();
    refs.profileModal.classList.add("open");
    refs.profileModal.setAttribute("aria-hidden", "false");
  }

  function closeProfileModal() {
    if (!refs.profileModal) {
      return;
    }

    refs.profileModal.classList.remove("open");
    refs.profileModal.setAttribute("aria-hidden", "true");
  }

  function renderNotifications() {
    if (!refs.notificationsList || !refs.notificationsCount || !refs.notificationsDot) {
      return;
    }

    const items = state.notifications || [];
    refs.notificationsCount.textContent = items.length + (items.length === 1 ? " New" : " New");
    refs.notificationsDot.classList.toggle("hidden", items.length === 0);

    if (!items.length) {
      refs.notificationsList.innerHTML = '<div class="notification-empty">No new notifications</div>';
      return;
    }

    refs.notificationsList.innerHTML = items
      .map(function (item) {
        return [
          '<div class="notification-item">',
          '<div class="notification-item-title">' + escapeHtml(item.title || "Notification") + "</div>",
          '<div class="notification-item-copy">' + escapeHtml(item.message || "") + "</div>",
          '<div class="notification-item-time">' + escapeHtml(formatRelativeTime(item.createdAt)) + "</div>",
          "</div>"
        ].join("");
      })
      .join("");
  }

  function ensureMessagesModal() {
    let modal = document.getElementById("messages-modal");
    if (modal) {
      return modal;
    }

    modal = document.createElement("div");
    modal.id = "messages-modal";
    modal.className = "modal-backdrop";
    modal.setAttribute("aria-hidden", "true");
    modal.innerHTML = [
      '<div class="modal-card create-modal-card" role="dialog" aria-modal="true" aria-labelledby="messages-modal-title">',
      '<div class="modal-head">',
      '<div>',
      '<div class="modal-title" id="messages-modal-title">Inbox & Broadcasts</div>',
      '<div class="modal-sub">Send a message to one registered account or broadcast to everyone. All recipients will see it in their mail area.</div>',
      "</div>",
      '<button class="modal-close" id="messages-modal-close" type="button" aria-label="Close messages"><span class="material-symbols-outlined">close</span></button>',
      "</div>",
      '<div class="modal-form create-modal-form">',
      '<div class="modal-grid">',
      '<div class="field"><label for="message-recipient-email">Recipient Email</label><input id="message-recipient-email" type="email" placeholder="user@example.com" /></div>',
      '<div class="field"><label>&nbsp;</label><label class="checkbox-row" for="message-send-all"><input id="message-send-all" type="checkbox" /><span>Send to all registered users</span></label></div>',
      '<div class="field full"><label for="message-subject">Subject</label><input id="message-subject" type="text" maxlength="140" placeholder="Campus update" /></div>',
      '<div class="field full"><label for="message-body">Message</label><textarea id="message-body" placeholder="Write the update you want every user to see..."></textarea></div>',
      "</div>",
      '<div class="modal-actions">',
      '<button class="btn-secondary" id="messages-refresh" type="button">Refresh Inbox</button>',
      '<button class="btn-primary" id="messages-send" type="button">Send Message</button>',
      "</div>",
      '<div class="card" style="margin-top:18px;box-shadow:none;">',
      '<div class="card-head" style="padding:18px 20px 0;"><h3 class="card-title">Recent Messages</h3><div class="notification-count" id="messages-count">0 Messages</div></div>',
      '<div class="notification-list" id="messages-list" style="padding:18px 20px 20px;"></div>',
      "</div>",
      "</div>",
      "</div>"
    ].join("");

    document.body.appendChild(modal);

    const closeButton = modal.querySelector("#messages-modal-close");
    const refreshButton = modal.querySelector("#messages-refresh");
    const sendButton = modal.querySelector("#messages-send");
    const sendAllCheckbox = modal.querySelector("#message-send-all");
    const emailInput = modal.querySelector("#message-recipient-email");

    if (closeButton) {
      closeButton.addEventListener("click", closeMessagesModal);
    }
    if (refreshButton) {
      refreshButton.addEventListener("click", function () {
        loadMailMessages(true).catch(function (error) {
          showBanner(error.message || "Inbox could not refresh.");
        });
      });
    }
    if (sendButton) {
      sendButton.addEventListener("click", sendMailMessage);
    }
    if (sendAllCheckbox && emailInput) {
      sendAllCheckbox.addEventListener("change", function () {
        emailInput.disabled = sendAllCheckbox.checked;
        if (sendAllCheckbox.checked) {
          emailInput.value = "";
        }
      });
    }
    modal.addEventListener("click", function (event) {
      if (event.target === modal) {
        closeMessagesModal();
      }
    });

    return modal;
  }

  function renderMailMessages() {
    const modal = ensureMessagesModal();
    const list = modal.querySelector("#messages-list");
    const count = modal.querySelector("#messages-count");

    if (!list || !count) {
      return;
    }

    const items = state.mailMessages || [];
    count.textContent = items.length + (items.length === 1 ? " Message" : " Messages");

    if (!items.length) {
      list.innerHTML = '<div class="notification-empty">No messages yet</div>';
      return;
    }

    list.innerHTML = items.map(function (item) {
      const audience = item.targetScope === "all" ? "All Users" : (item.recipientEmail || "Direct");
      return [
        '<div class="notification-item">',
        '<div class="notification-item-title">' + escapeHtml(item.subject || "Message") + "</div>",
        '<div class="notification-item-copy">' + escapeHtml(item.body || "") + "</div>",
        '<div class="notification-item-time">To ' + escapeHtml(audience) + " • " + escapeHtml(formatRelativeTime(item.createdAt)) + "</div>",
        "</div>"
      ].join("");
    }).join("");

    updateMessagesTrigger();
  }

  function updateMessagesTrigger() {
    if (!refs.messagesTrigger) {
      return;
    }

    let dot = document.getElementById("messages-dot");
    if (!dot) {
      dot = document.createElement("span");
      dot.id = "messages-dot";
      dot.className = "dot hidden";
      refs.messagesTrigger.appendChild(dot);
    }

    dot.classList.toggle("hidden", (state.mailMessages || []).length === 0);
  }

  async function loadMailMessages(silent) {
    const payload = await apiRequest("/users/messages");
    state.mailMessages = Array.isArray(payload.items) ? payload.items : [];
    renderMailMessages();
    if (!silent) {
      clearBanner();
    }
  }

  function openMessagesModal() {
    const modal = ensureMessagesModal();
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
    closeNotificationsMenu();
    closeProfileMenu();
    loadMailMessages(true).catch(function (error) {
      showBanner(error.message || "Inbox could not load.");
    });
  }

  function closeMessagesModal() {
    const modal = document.getElementById("messages-modal");
    if (!modal) {
      return;
    }
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
  }

  async function sendMailMessage() {
    const modal = ensureMessagesModal();
    const emailInput = modal.querySelector("#message-recipient-email");
    const sendAllInput = modal.querySelector("#message-send-all");
    const subjectInput = modal.querySelector("#message-subject");
    const bodyInput = modal.querySelector("#message-body");
    const sendButton = modal.querySelector("#messages-send");

    const sendToAll = Boolean(sendAllInput && sendAllInput.checked);
    const recipientEmail = emailInput ? emailInput.value.trim().toLowerCase() : "";
    const subject = subjectInput ? subjectInput.value.trim() : "";
    const body = bodyInput ? bodyInput.value.trim() : "";

    if (!sendToAll && !recipientEmail) {
      showBanner("Enter a recipient email or choose send to all.");
      return;
    }

    if (!subject || !body) {
      showBanner("Subject and message are both required.");
      return;
    }

    if (sendButton) {
      sendButton.disabled = true;
      sendButton.textContent = "Sending...";
    }

    try {
      await apiRequest("/users/messages", {
        method: "POST",
        body: {
          recipientEmail: sendToAll ? undefined : recipientEmail,
          sendToAll: sendToAll,
          subject: subject,
          body: body
        }
      });

      if (emailInput) {
        emailInput.value = "";
      }
      if (sendAllInput) {
        sendAllInput.checked = false;
      }
      if (subjectInput) {
        subjectInput.value = "";
      }
      if (bodyInput) {
        bodyInput.value = "";
      }
      if (emailInput) {
        emailInput.disabled = false;
      }

      showBanner(sendToAll ? "Message sent to all registered accounts." : "Message sent successfully.");
      await loadMailMessages(true);
    } catch (error) {
      showBanner(error.message || "Message could not be sent.");
    } finally {
      if (sendButton) {
        sendButton.disabled = false;
        sendButton.textContent = "Send Message";
      }
    }
  }

  function pushNotification(title, message) {
    state.notifications = [
      {
        id: "ntf-" + Date.now(),
        title: title,
        message: message,
        createdAt: new Date().toISOString()
      }
    ].concat(state.notifications || []).slice(0, 10);

    saveNotifications();
    renderNotifications();
  }

  function openNotificationsMenu() {
    if (!refs.notificationsMenu || !refs.notificationsTrigger) {
      return;
    }

    refs.notificationsMenu.classList.add("open");
    refs.notificationsMenu.setAttribute("aria-hidden", "false");
    refs.notificationsTrigger.setAttribute("aria-expanded", "true");
    closeProfileMenu();
  }

  function closeNotificationsMenu() {
    if (!refs.notificationsMenu || !refs.notificationsTrigger) {
      return;
    }

    refs.notificationsMenu.classList.remove("open");
    refs.notificationsMenu.setAttribute("aria-hidden", "true");
    refs.notificationsTrigger.setAttribute("aria-expanded", "false");
  }

  function toggleNotificationsMenu() {
    if (!refs.notificationsMenu) {
      return;
    }

    if (refs.notificationsMenu.classList.contains("open")) {
      closeNotificationsMenu();
      return;
    }

    openNotificationsMenu();
  }

  function buildMonthlySeries(events) {
    const bars = new Array(12).fill(0);
    const line = new Array(12).fill(0);

    events.forEach(function (event) {
      const date = parseEventDate(event);
      if (!date) {
        return;
      }

      const monthIndex = date.getMonth();
      bars[monthIndex] += Number(event.currentCount || 0) * Number(event.price || 0);
      line[monthIndex] += Number(event.currentCount || 0);
    });

    return { bars: bars, line: line };
  }

  function renderRevenueChart(events) {
    if (!refs.chartRoot) {
      return;
    }

    const series = buildMonthlySeries(events);
    const maximum = Math.max(10, Math.max.apply(Math, series.bars.concat(series.line)));
    const yTicks = [0.25, 0.5, 0.75, 1].map(function (ratio) {
      return Math.ceil((maximum * ratio) / 10) * 10;
    });
    const chartLeft = 58;
    const chartBottom = 198;
    const chartWidth = 650;
    const chartHeight = 150;
    const barWidth = 28;
    const step = chartWidth / monthLabels.length;

    const linePath = series.line
      .map(function (value, index) {
        const x = chartLeft + step * index + step / 2;
        const y = chartBottom - (value / yTicks[yTicks.length - 1]) * chartHeight;
        return (index === 0 ? "M" : "L") + x.toFixed(1) + "," + y.toFixed(1);
      })
      .join(" ");

    refs.chartRoot.innerHTML = [
      '<rect x="0" y="0" width="760" height="240" fill="transparent"></rect>',
      yTicks
        .map(function (tick) {
          const y = chartBottom - (tick / yTicks[yTicks.length - 1]) * chartHeight;
          return [
            '<line x1="' + chartLeft + '" y1="' + y.toFixed(1) + '" x2="' + (chartLeft + chartWidth) + '" y2="' + y.toFixed(1) + '" stroke="#f0ebe3" stroke-width="1"></line>',
            '<text x="12" y="' + (y + 4).toFixed(1) + '" fill="#9ca3af" font-size="11">' + tick + "</text>"
          ].join("");
        })
        .join(""),
      series.bars
        .map(function (value, index) {
          const height = (value / yTicks[yTicks.length - 1]) * chartHeight;
          const x = chartLeft + step * index + (step - barWidth) / 2;
          const y = chartBottom - height;
          return '<path d="M' + x.toFixed(1) + "," + chartBottom + " L" + x.toFixed(1) + "," + (y + 4).toFixed(1) + ' Q' + x.toFixed(1) + "," + y.toFixed(1) + " " + (x + 4).toFixed(1) + "," + y.toFixed(1) + " L" + (x + barWidth - 4).toFixed(1) + "," + y.toFixed(1) + ' Q' + (x + barWidth).toFixed(1) + "," + y.toFixed(1) + " " + (x + barWidth).toFixed(1) + "," + (y + 4).toFixed(1) + " L" + (x + barWidth).toFixed(1) + "," + chartBottom + ' Z" fill="#1a1a2e"></path>';
        })
        .join(""),
      linePath
        ? '<path d="' + linePath + '" fill="none" stroke="#c8c0b4" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"></path>'
        : "",
      monthLabels
        .map(function (label, index) {
          const x = chartLeft + step * index + step / 2;
          return '<text x="' + x.toFixed(1) + '" y="224" text-anchor="middle" fill="#9ca3af" font-size="11">' + label + "</text>";
        })
        .join("")
    ].join("");
  }

  function renderLoadingChart() {
    if (!refs.chartRoot) {
      return;
    }

    refs.chartRoot.innerHTML =
      '<foreignObject x="0" y="0" width="760" height="240">' +
      '<div xmlns="http://www.w3.org/1999/xhtml" class="loading-block loading-chart"></div>' +
      "</foreignObject>";
  }

  function buildDonutData(events) {
    const totals = {};
    let total = 0;

    events.forEach(function (event) {
      const key = event.eventType || "Other";
      const weight = event.currentCount > 0 ? event.currentCount : 1;
      totals[key] = (totals[key] || 0) + weight;
      total += weight;
    });

    const entries = Object.keys(totals)
      .map(function (key) {
        return { label: key, value: totals[key] };
      })
      .sort(function (left, right) {
        return right.value - left.value;
      })
      .slice(0, 3);

    while (entries.length < 3) {
      entries.push({ label: entries.length === 0 ? "No Events" : "Waiting", value: 0 });
    }

    if (total === 0) {
      return entries.map(function (entry, index) {
        return {
          label: entry.label,
          value: 0,
          percent: index === 0 ? 100 : 0
        };
      });
    }

    return entries.map(function (entry, index) {
      const rawPercent = Math.round((entry.value / total) * 100);
      return {
        label: entry.label,
        value: entry.value,
        percent: index === entries.length - 1
          ? Math.max(0, 100 - entries.slice(0, index).reduce(function (sum, item) {
            return sum + Math.round((item.value / total) * 100);
          }, 0))
          : rawPercent
      };
    });
  }

  function renderDonut(events) {
    if (!refs.donutChart) {
      return;
    }

    const items = buildDonutData(events);
    const firstBreak = items[0].percent;
    const secondBreak = items[0].percent + items[1].percent;

    refs.donutChart.style.background =
      "conic-gradient(" +
      donutColors[0] + " 0 " + firstBreak + "%," +
      donutColors[1] + " " + firstBreak + "% " + secondBreak + "%," +
      donutColors[2] + " " + secondBreak + "% 100%)";

    if (refs.donutLabel1) { refs.donutLabel1.textContent = items[0].label; }
    if (refs.donutLabel2) { refs.donutLabel2.textContent = items[1].label; }
    if (refs.donutLabel3) { refs.donutLabel3.textContent = items[2].label; }
    if (refs.donutPercent1) { refs.donutPercent1.textContent = items[0].percent + "%"; }
    if (refs.donutPercent2) { refs.donutPercent2.textContent = items[2].percent + "%"; }
    if (refs.donutPercent3) { refs.donutPercent3.textContent = items[1].percent + "%"; }
  }

  function renderUpcomingEvents(events) {
    if (!refs.eventsRoot) {
      return;
    }

    const selectedDate = state.selectedCalendarDate;
    const upcoming = events
      .filter(function (event) {
        if (selectedDate) {
          return String(event.eventDate || "") === selectedDate;
        }
        return isEventUpcoming(event);
      })
      .sort(function (left, right) {
        const leftTime = (getEventStartDateTime(left) || parseEventDate(left) || new Date(8640000000000000)).getTime();
        const rightTime = (getEventStartDateTime(right) || parseEventDate(right) || new Date(8640000000000000)).getTime();
        return leftTime - rightTime;
      })
      .slice(0, selectedDate ? 6 : 2);

    if (!upcoming.length) {
      refs.eventsRoot.innerHTML = '<article class="event-card" style="background:linear-gradient(135deg,#6a6259 0%,#8b7d70 100%);"><div><div class="event-title">' + escapeHtml(selectedDate ? "No events on selected date" : "No events created yet") + '</div><div class="event-meta"><span class="event-item">' + escapeHtml(selectedDate ? "Choose another calendar date to view matching events." : "Create your first event using the + button.") + '</span></div></div></article>';
      if (refs.mapCaption) {
        refs.mapCaption.textContent = selectedDate ? selectedDate : "No event selected";
      }
      return;
    }

    refs.eventsRoot.innerHTML = upcoming
      .map(function (event, index) {
        const background = event.posterUrl
          ? "linear-gradient(180deg,rgba(8,8,16,.12),rgba(8,8,16,.68)),url('" + escapeHtml(event.posterUrl) + "') center/cover"
          : eventBackgrounds[index % eventBackgrounds.length];
        const seatLabel = event.currentCount + "/" + event.maxCapacity + " seats";

        return [
          '<article class="event-card" data-event-id="' + escapeHtml(event.id) + '" style="background:' + background + ';">',
          '<span class="event-about">' + escapeHtml(event.status.replace(/_/g, " ")) + "</span>",
          '<button class="event-delete-btn" data-event-id="' + escapeHtml(event.id) + '" data-event-title="' + escapeHtml(event.title) + '" title="Delete event" style="position:absolute;top:8px;right:8px;background:rgba(239,68,68,0.85);border:none;border-radius:6px;color:#fff;cursor:pointer;padding:4px 8px;font-size:11px;font-weight:600;display:flex;align-items:center;gap:4px;z-index:2;"><span class=\"material-symbols-outlined\" style=\"font-size:14px;\">delete</span></button>',
          "<div>",
          '<div class="event-title">' + escapeHtml(event.title) + "</div>",
          '<div class="event-meta">',
          '<span class="event-item"><span class="material-symbols-outlined" style="font-size:12px;">calendar_month</span>' + escapeHtml(formatDate(event.eventDate) + ", " + formatTime(event.startTime)) + "</span>",
          '<span class="event-item"><span class="material-symbols-outlined" style="font-size:12px;">location_on</span>' + escapeHtml(event.venue) + "</span>",
          '<span class="price">' + escapeHtml(seatLabel) + "</span>",
          "</div>",
          "</div>",
          "</article>"
        ].join("");
      })
      .join("");

    if (refs.mapCaption) {
      refs.mapCaption.textContent = selectedDate ? (formatDate(selectedDate) + " • " + upcoming[0].title) : upcoming[0].title;
    }
  }

  function renderLoadingEvents() {
    if (refs.eventsRoot) {
      refs.eventsRoot.innerHTML = [
        '<article class="event-card loading-event-card" style="background:linear-gradient(135deg,#a49184 0%,#b9aa9f 48%,#928274 100%);">',
        '<div>',
        '<span class="loading-line md"></span>',
        '<div class="loading-meta">',
        '<span class="loading-line sm"></span>',
        '<span class="loading-line sm"></span>',
        '<span class="loading-chip"></span>',
        "</div>",
        "</div>",
        "</article>",
        '<article class="event-card loading-event-card" style="background:linear-gradient(135deg,#8b97af 0%,#9da8bc 45%,#77829b 100%);">',
        '<div>',
        '<span class="loading-line md"></span>',
        '<div class="loading-meta">',
        '<span class="loading-line sm"></span>',
        '<span class="loading-line sm"></span>',
        '<span class="loading-chip"></span>',
        "</div>",
        "</div>",
        "</article>"
      ].join("");
    }

    if (refs.mapCaption) {
      refs.mapCaption.textContent = "Loading events...";
    }
  }

  function renderLoadingSummary() {
    setText("metric-total-events", "--");
    setText("metric-tickets-sold", "--");
    setText("metric-upcoming-events", "--");
    setText("ticket-total-sold", "--");
    setText("ticket-total-revenue", "--");
    setText("ticket-conversion-rate", "--");
    setText("donut-label-1", "Loading");
    setText("donut-label-2", "Loading");
    setText("donut-label-3", "Loading");
    setText("donut-percent-1", "--");
    setText("donut-percent-2", "--");
    setText("donut-percent-3", "--");

    if (refs.trendTotalEvents) {
      refs.trendTotalEvents.textContent = "Loading...";
    }
    if (refs.trendTicketsSold) {
      refs.trendTicketsSold.textContent = "Loading...";
    }
    if (refs.trendUpcomingEvents) {
      refs.trendUpcomingEvents.textContent = "Loading...";
    }

    setLoadingPlaceholder(document.getElementById("metric-total-events"), true);
    setLoadingPlaceholder(document.getElementById("metric-tickets-sold"), true);
    setLoadingPlaceholder(document.getElementById("metric-upcoming-events"), true);
    setLoadingPlaceholder(document.getElementById("ticket-total-sold"), true);
    setLoadingPlaceholder(document.getElementById("ticket-total-revenue"), true);
    setLoadingPlaceholder(document.getElementById("ticket-conversion-rate"), true);

    if (refs.donutChart) {
      refs.donutChart.classList.add("loading-donut");
      refs.donutChart.style.background = "";
    }

    renderLoadingChart();
    renderLoadingEvents();
  }

  function updateBannerStatus(message, tone) {
    if (!refs.bannerStatus) {
      return;
    }

    refs.bannerStatus.textContent = message;
    refs.bannerStatus.style.background =
      tone === "success"
        ? "#eef5f1"
        : tone === "uploading"
          ? "#eef2fb"
          : "#f3efe8";
    refs.bannerStatus.style.color =
      tone === "success"
        ? "#2f6b54"
        : tone === "uploading"
          ? "#315b9b"
          : "#6b7280";
  }

  function syncCreateTags() {
    if (refs.tagsWrap) {
      refs.tagsWrap.innerHTML = state.createTags
        .map(function (tag) {
          return '<span class="chip">' + escapeHtml(tag) + '<button class="chip-remove" type="button" data-remove-create-tag="' + escapeHtml(tag) + '">&times;</button></span>';
        })
        .join("");
    }

    if (refs.tagsInput) {
      refs.tagsInput.value = state.createTags.join(",");
    }
  }

  function syncCreatePricing() {
    if (refs.freeToggle) {
      refs.freeToggle.classList.toggle("on", state.createFreeEvent);
      refs.freeToggle.setAttribute("aria-pressed", String(state.createFreeEvent));
    }

    if (refs.priceInput) {
      refs.priceInput.disabled = state.createFreeEvent;
      if (state.createFreeEvent) {
        refs.priceInput.value = "";
      }
    }

    if (refs.priceShell) {
      refs.priceShell.classList.toggle("disabled", state.createFreeEvent);
    }
  }

  function resetCreateFormState() {
    state.createTags = [];
    state.createFreeEvent = false;
    syncCreateTags();
    syncCreatePricing();
    updateBannerStatus("No banner selected", "idle");
  }

  async function uploadBannerFile(file) {
    const contentType = String(file.type || "").toLowerCase();
    if (contentType !== "image/png" && contentType !== "image/jpeg") {
      throw new Error("Banner image must be a PNG or JPG file.");
    }

    state.isUploadingBanner = true;
    updateBannerStatus("Uploading banner...", "uploading");

    try {
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
        headers: {
          "Content-Type": contentType
        },
        body: file
      });

      if (!uploadResponse.ok) {
        throw new Error("Banner upload failed.");
      }

      updateBannerStatus("Banner ready: " + file.name, "success");
      if (presigned.key && mediaBaseUrl) {
        return mediaBaseUrl + "/" + presigned.key;
      }

      return resolveMediaUrl(presigned.publicUrl);
    } finally {
      state.isUploadingBanner = false;
    }
  }

  function renderCalendar() {
    if (!refs.calendarGrid || !refs.calendarTitle) {
      return;
    }

    const today = getNow();

    const year = state.visibleMonth.getFullYear();
    const month = state.visibleMonth.getMonth();
    const firstOfMonth = new Date(year, month, 1);
    const startDay = firstOfMonth.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    refs.calendarTitle.textContent = state.visibleMonth.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric"
    });

    const cells = [];
    weekdayLabels.forEach(function (label) {
      cells.push('<div class="calendar-label">' + label + "</div>");
    });

    for (let index = 0; index < 42; index += 1) {
      const dayNumber = index - startDay + 1;
      let date;
      let muted = false;

      if (dayNumber <= 0) {
        date = new Date(year, month - 1, prevMonthDays + dayNumber);
        muted = true;
      } else if (dayNumber > daysInMonth) {
        date = new Date(year, month + 1, dayNumber - daysInMonth);
        muted = true;
      } else {
        date = new Date(year, month, dayNumber);
      }

      const isToday =
        date.getFullYear() === today.getFullYear() &&
        date.getMonth() === today.getMonth() &&
        date.getDate() === today.getDate();

      const classes = ["calendar-day"];
      if (muted) {
        classes.push("muted");
      }
      if (isToday) {
        classes.push("today");
      }
      if (state.selectedCalendarDate === getDateKey(date)) {
        classes.push("selected");
      }

      cells.push('<button class="' + classes.join(" ") + '" type="button" data-calendar-date="' + getDateKey(date) + '">' + date.getDate() + "</button>");
    }

    refs.calendarGrid.innerHTML = cells.join("");
  }

  function updateSummary(events) {
    const totalEvents = events.length;
    const ticketsSold = events.reduce(function (sum, event) {
      return sum + Math.max(0, Number(event.currentCount || 0));
    }, 0);
    const totalRevenue = events.reduce(function (sum, event) {
      return sum + (Math.max(0, Number(event.currentCount || 0)) * Math.max(0, Number(event.price || 0)));
    }, 0);
    const totalCapacity = events.reduce(function (sum, event) {
      return sum + Math.max(0, Number(event.maxCapacity || 0));
    }, 0);
    const upcomingEvents = events.filter(function (event) {
      return isEventUpcoming(event);
    }).length;
    const conversionRate = totalCapacity ? Math.round((ticketsSold / totalCapacity) * 100) : 0;

    setLoadingPlaceholder(document.getElementById("metric-total-events"), false);
    setLoadingPlaceholder(document.getElementById("metric-tickets-sold"), false);
    setLoadingPlaceholder(document.getElementById("metric-upcoming-events"), false);
    setLoadingPlaceholder(document.getElementById("ticket-total-sold"), false);
    setLoadingPlaceholder(document.getElementById("ticket-total-revenue"), false);
    setLoadingPlaceholder(document.getElementById("ticket-conversion-rate"), false);

    setText("metric-total-events", String(totalEvents));
    setText("metric-tickets-sold", String(ticketsSold));
    setText("metric-upcoming-events", String(upcomingEvents));
    setText("ticket-total-sold", String(ticketsSold));
    setText("ticket-total-revenue", formatMoney(totalRevenue));
    setText("ticket-conversion-rate", String(conversionRate) + "%");
    if (refs.trendTotalEvents) {
      refs.trendTotalEvents.textContent = "Live";
    }
    if (refs.trendTicketsSold) {
      refs.trendTicketsSold.textContent = "Live";
    }
    if (refs.trendUpcomingEvents) {
      refs.trendUpcomingEvents.textContent = "Live";
    }
    if (refs.donutChart) {
      refs.donutChart.classList.remove("loading-donut");
    }

    renderRevenueChart(events);
    renderDonut(events);
    renderUpcomingEvents(events);
  }

  function refreshDashboardRealtime() {
    if (!state.events.length) {
      renderCalendar();
      return;
    }

    updateSummary(state.events);
    renderCalendar();
  }

  function openCreateModal() {
    if (!refs.createModal) {
      return;
    }

    refs.createModal.classList.add("open");
    refs.createModal.setAttribute("aria-hidden", "false");
    syncCreateTags();
    syncCreatePricing();
  }

  function closeCreateModal() {
    if (!refs.createModal) {
      return;
    }

    refs.createModal.classList.remove("open");
    refs.createModal.setAttribute("aria-hidden", "true");
  }

  function buildCreatePayload(formData) {
    const tagsValue = String(formData.get("tags") || "")
      .split(",")
      .map(function (tag) {
        return tag.trim();
      })
      .filter(Boolean);

    const deadlineValue = String(formData.get("registrationDeadline") || "").trim();
    const posterUrl = String(formData.get("posterUrl") || "").trim();
    const departmentFilter = String(formData.get("departmentFilter") || "").trim();

    return {
      title: String(formData.get("title") || "").trim(),
      description: String(formData.get("description") || "").trim(),
      eventType: String(formData.get("eventType") || "").trim(),
      price: state.createFreeEvent ? 0 : Number(formData.get("price") || 0),
      venue: String(formData.get("venue") || "").trim(),
      eventDate: String(formData.get("eventDate") || "").trim(),
      startTime: String(formData.get("startTime") || "").trim(),
      endTime: String(formData.get("endTime") || "").trim(),
      maxCapacity: Number(formData.get("maxCapacity") || 0),
      registrationDeadline: deadlineValue ? new Date(deadlineValue).toISOString() : undefined,
      posterUrl: posterUrl || undefined,
      departmentFilter: departmentFilter || undefined,
      isPublic: Boolean(formData.get("isPublic")),
      tags: tagsValue
    };
  }

  async function createEvent(event) {
    event.preventDefault();

    if (!refs.createForm || state.isSaving) {
      return;
    }

    const formData = new FormData(refs.createForm);
    const payload = buildCreatePayload(formData);
    const bannerFile = refs.bannerFile && refs.bannerFile.files ? refs.bannerFile.files[0] : null;

    state.isSaving = true;
    if (refs.createSubmit) {
      refs.createSubmit.textContent = "Creating...";
      refs.createSubmit.disabled = true;
    }

    try {
      if (bannerFile) {
        payload.posterUrl = await uploadBannerFile(bannerFile);
      }

      const created = await apiRequest("/events", {
        method: "POST",
        body: payload
      });

      state.events = normalizeEvents([created].concat(state.events));
      updateSummary(state.events);
      pushNotification("Event Created", created.title + " was added successfully.");
      clearBanner();
      refs.createForm.reset();
      resetCreateFormState();
      const publicInput = document.getElementById("event-public-input");
      if (publicInput) {
        publicInput.checked = true;
      }
      if (state.user && state.user.department) {
        const departmentInput = document.getElementById("event-department-input");
        if (departmentInput) {
          departmentInput.value = state.user.department;
        }
      }
      closeCreateModal();
    } catch (error) {
      showBanner(error.message || "Event could not be created.");
    } finally {
      state.isSaving = false;
      if (refs.createSubmit) {
        refs.createSubmit.textContent = "Done";
        refs.createSubmit.disabled = false;
      }
    }
  }

  async function retryApi(path, attempts, delayMs) {
    let lastError = null;

    for (let attempt = 0; attempt < attempts; attempt += 1) {
      try {
        return await apiRequest(path);
      } catch (error) {
        lastError = error;
        if ((error.statusCode === 401 || error.statusCode === 403 || error.message === "Missing session") && attempt === attempts - 1) {
          throw error;
        }
        await new Promise(function (resolve) {
          window.setTimeout(resolve, delayMs);
        });
      }
    }

    throw lastError || new Error("Request failed");
  }

  async function loadDashboard() {
    renderLoadingSummary();

    try {
      const user = await retryApi("/users/me", 5, 1200);
      hydrateUser(user);
      await loadMailMessages(true);
    } catch (error) {
      if (error.statusCode === 401 || error.statusCode === 403 || error.message === "Missing session") {
        clearTokens();
        window.location.assign(getUiUrl(signInPath));
        return;
      }

      showBanner("Session could not be restored. Please sign in again.");
      return;
    }

    try {
      const eventsPayload = await retryApi("/events", 4, 900);
      state.events = normalizeEvents(eventsPayload.items || []);
      updateSummary(state.events);
      clearBanner();
    } catch (error) {
      state.events = [];
      updateSummary(state.events);
      showBanner(error.message || "Events could not be loaded right now.");
    }
  }

  async function logout() {
    const tokens = loadTokens();

    try {
      if (tokens && tokens.accessToken) {
        await fetch("https://cognito-idp." + cognitoRegion + ".amazonaws.com/", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-amz-json-1.1",
            "X-Amz-Target": "AWSCognitoIdentityProviderService.GlobalSignOut"
          },
          body: JSON.stringify({
            AccessToken: tokens.accessToken
          })
        });
      }
    } finally {
      clearTokens();
      window.location.assign(getUiUrl(signInPath));
    }
  }

  if (refs.logoutButton) {
    refs.logoutButton.addEventListener("click", logout);
  }

  if (refs.menuButton && refs.sidebar) {
    refs.menuButton.addEventListener("click", function () {
      refs.sidebar.classList.toggle("open");
    });
  }

  if (refs.calendarPrev) {
    refs.calendarPrev.addEventListener("click", function () {
      state.visibleMonth = new Date(state.visibleMonth.getFullYear(), state.visibleMonth.getMonth() - 1, 1);
      renderCalendar();
    });
  }

  if (refs.calendarNext) {
    refs.calendarNext.addEventListener("click", function () {
      state.visibleMonth = new Date(state.visibleMonth.getFullYear(), state.visibleMonth.getMonth() + 1, 1);
      renderCalendar();
    });
  }

  if (refs.calendarGrid) {
    refs.calendarGrid.addEventListener("click", function (event) {
      const button = event.target.closest("[data-calendar-date]");
      if (!button) {
        return;
      }

      const selectedDate = button.getAttribute("data-calendar-date");
      state.selectedCalendarDate = state.selectedCalendarDate === selectedDate ? null : selectedDate;
      renderCalendar();
      updateSummary(state.events);
    });
  }

  if (refs.createButton) {
    refs.createButton.addEventListener("click", openCreateModal);
  }

  if (refs.profileTrigger) {
    refs.profileTrigger.addEventListener("click", function (event) {
      event.stopPropagation();
      toggleProfileMenu();
    });
  }

  if (refs.profileMenu) {
    refs.profileMenu.addEventListener("click", function (event) {
      event.stopPropagation();
    });
  }

  if (refs.profileViewButton) {
    refs.profileViewButton.addEventListener("click", openProfileModal);
  }

  if (refs.notificationsTrigger) {
    refs.notificationsTrigger.addEventListener("click", function (event) {
      event.stopPropagation();
      toggleNotificationsMenu();
    });
  }

  if (refs.messagesTrigger) {
    refs.messagesTrigger.addEventListener("click", function (event) {
      event.stopPropagation();
      openMessagesModal();
    });
  }

  if (refs.notificationsMenu) {
    refs.notificationsMenu.addEventListener("click", function (event) {
      event.stopPropagation();
    });
  }

  if (refs.profileModalClose) {
    refs.profileModalClose.addEventListener("click", closeProfileModal);
  }

  if (refs.profileModalDone) {
    refs.profileModalDone.addEventListener("click", closeProfileModal);
  }

  if (refs.createClose) {
    refs.createClose.addEventListener("click", closeCreateModal);
  }

  if (refs.createCancel) {
    refs.createCancel.addEventListener("click", closeCreateModal);
  }

  if (refs.createModal) {
    refs.createModal.addEventListener("click", function (event) {
      if (event.target === refs.createModal) {
        closeCreateModal();
      }
    });
  }

  if (refs.profileModal) {
    refs.profileModal.addEventListener("click", function (event) {
      if (event.target === refs.profileModal) {
        closeProfileModal();
      }
    });
  }

  if (refs.createForm) {
    refs.createForm.addEventListener("submit", createEvent);
  }

  if (refs.bannerFile) {
    refs.bannerFile.addEventListener("change", function () {
      const file = refs.bannerFile.files && refs.bannerFile.files[0];
      if (!file) {
        updateBannerStatus("No banner selected", "idle");
        return;
      }

      updateBannerStatus("Selected: " + file.name, "success");
    });
  }

  if (refs.freeToggle) {
    refs.freeToggle.addEventListener("click", function () {
      state.createFreeEvent = !state.createFreeEvent;
      syncCreatePricing();
    });
  }

  if (refs.tagsChipInput) {
    refs.tagsChipInput.addEventListener("keydown", function (event) {
      if (event.key !== "Enter") {
        return;
      }

      event.preventDefault();
      const value = refs.tagsChipInput.value.trim();
      if (!value || state.createTags.length >= 6 || state.createTags.includes(value)) {
        return;
      }

      state.createTags.push(value);
      refs.tagsChipInput.value = "";
      syncCreateTags();
    });
  }

  if (refs.tagsWrap) {
    refs.tagsWrap.addEventListener("click", function (event) {
      const button = event.target.closest("[data-remove-create-tag]");
      if (!button) {
        return;
      }

      event.preventDefault();
      const value = button.getAttribute("data-remove-create-tag");
      state.createTags = state.createTags.filter(function (tag) {
        return tag !== value;
      });
      syncCreateTags();
    });
  }

  document.addEventListener("click", function () {
    closeNotificationsMenu();
    closeProfileMenu();
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      closeNotificationsMenu();
      closeProfileMenu();
      closeProfileModal();
      closeCreateModal();
      closeMessagesModal();
    }
  });

  renderCalendar();
  renderNotifications();
  renderMailMessages();
  renderLoadingSummary();
  resetCreateFormState();
  if (window.EMS_REALTIME) {
    window.EMS_REALTIME.ensureConnection("admin");
    window.EMS_REALTIME.onMessage(function (message) {
      const type = String(message && message.type || "");
      if (type === "mail_message" && message.data && message.data.message) {
        state.mailMessages = [message.data.message].concat(state.mailMessages || []).slice(0, 25);
        renderMailMessages();
      }
      if (["event_submitted", "event_approved", "event_rejected", "event_deleted", "new_registration", "seat_updated", "attendance_submitted", "staff_joined", "registration_cancelled"].includes(type)) {
        if (type === "event_deleted" && message.data && message.data.eventId) {
          // Remove card immediately from DOM without full reload
          var deletedCard = document.querySelector('[data-event-id="' + message.data.eventId + '"]');
          if (deletedCard) { deletedCard.remove(); }
        }
        loadDashboard();
      }
    });
  }
  loadDashboard();
  window.setInterval(refreshDashboardRealtime, 15000);
})();