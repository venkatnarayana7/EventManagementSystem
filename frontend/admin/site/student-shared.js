(function () {
  const config = window.EMS_CONFIG || {};
  const apiBaseUrl = String(config.apiBaseUrl || window.location.origin).replace(/\/$/, "") + "/";
  const mediaBaseUrl = String(config.mediaBaseUrl || "").replace(/\/$/, "");
  const signInPath = config.signInPath || "/index.html";
  const studentDashboardPath = config.studentDashboardPath || "/student-dashboard.html";
  const storageKey = "ems.auth.tokens";
  const roleStorageKey = "ems.auth.tokens.student";
  const notificationsStoragePrefix = "ems.student.notifications";

  const state = {
    user: null,
    notifications: [],
    mailMessages: [],
    browsePulseDotVisible: false
  };

  function getPageKey() {
    return document.body.getAttribute("data-page") || "";
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function getUiUrl(path) {
    return /^https?:\/\//i.test(path) ? path : new URL(path, window.location.origin).toString();
  }

  function getApiUrl(path) {
    return new URL(path.replace(/^\//, ""), apiBaseUrl).toString();
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

  function getValidToken(tokenName) {
    const tokens = loadTokens();
    if (!tokens || !tokens[tokenName]) {
      return null;
    }
    const claims = decodeJwt(tokens[tokenName]);
    if (!claims || !claims.exp || Date.now() >= claims.exp * 1000) {
      clearTokens();
      return null;
    }
    return tokens[tokenName];
  }

  function getValidApiToken() {
    return getValidToken("idToken") || getValidToken("accessToken");
  }

  function getSessionClaims() {
    const tokens = loadTokens();
    if (!tokens) {
      return null;
    }
    return decodeJwt(tokens.idToken) || decodeJwt(tokens.accessToken);
  }

  async function apiRequest(path, options) {
    const authToken = getValidApiToken();
    if (!authToken) {
      throw new Error("Missing session");
    }
    const response = await fetch(getApiUrl(path), {
      method: options && options.method ? options.method : "GET",
      headers: Object.assign(
        {
          "Content-Type": "application/json",
          Authorization: "Bearer " + authToken
        },
        options && options.headers ? options.headers : {}
      ),
      body: options && options.body ? JSON.stringify(options.body) : undefined
    });
    const payload = await response.json().catch(function () { return {}; });
    if (!response.ok) {
      const issueMessage =
        Array.isArray(payload.issues) && payload.issues.length
          ? payload.issues.map(function (issue) { return issue.message; }).join(", ")
          : null;
      const error = new Error(issueMessage || payload.message || "Request failed");
      error.statusCode = response.status;
      error.url = getApiUrl(path);
      throw error;
    }
    return payload;
  }

  async function retryApi(path, attempts, delayMs, options) {
    let lastError = null;
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      try {
        return await apiRequest(path, options);
      } catch (error) {
        lastError = error;
        if (error.statusCode === 401 || error.statusCode === 403) {
          throw error;
        }
        if (attempt < attempts - 1) {
          await new Promise(function (resolve) { window.setTimeout(resolve, delayMs); });
        }
      }
    }
    throw lastError || new Error("Request failed");
  }

  function getInitials(value) {
    return String(value || "ST")
      .split(" ")
      .filter(Boolean)
      .map(function (part) { return part.charAt(0).toUpperCase(); })
      .join("")
      .slice(0, 2) || "ST";
  }

  function setAvatar(node, name, avatar) {
    if (!node) {
      return;
    }
    if (avatar) {
      node.innerHTML = '<img alt="' + escapeHtml(name) + '" src="' + escapeHtml(avatar) + '" />';
      return;
    }
    node.textContent = getInitials(name);
  }

  function formatDate(value, options) {
    const date = new Date(String(value || ""));
    if (Number.isNaN(date.getTime())) {
      return value || "";
    }
    return date.toLocaleDateString("en-US", options || { month: "long", day: "numeric", year: "numeric" });
  }

  function formatShortDate(value) {
    return formatDate(value, { month: "short", day: "numeric", year: "numeric" });
  }

  function formatTime(value) {
    if (!value) {
      return "";
    }
    const parts = String(value).split(":");
    const hours = Number(parts[0]);
    const minutes = parts[1] || "00";
    const meridiem = hours >= 12 ? "PM" : "AM";
    return (((hours + 11) % 12) + 1) + ":" + minutes + " " + meridiem;
  }

  function formatPrice(value) {
    return Number(value) <= 0 ? "Free" : "$" + Number(value);
  }

  function formatCountdown(value) {
    const now = new Date();
    const target = new Date(String(value || "") + "T00:00:00");
    if (Number.isNaN(target.getTime())) {
      return "Upcoming";
    }
    const startOfNow = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diffDays = Math.round((target.getTime() - startOfNow.getTime()) / 86400000);
    if (diffDays < 0) {
      return "Ended";
    }
    if (diffDays === 0) {
      return "Today!";
    }
    if (diffDays === 1) {
      return "Tomorrow";
    }
    return "In " + diffDays + " days";
  }

  function getLocalDateKey(date) {
    const target = date instanceof Date ? date : new Date(date || "");
    if (Number.isNaN(target.getTime())) {
      return "";
    }
    const year = target.getFullYear();
    const month = String(target.getMonth() + 1).padStart(2, "0");
    const day = String(target.getDate()).padStart(2, "0");
    return year + "-" + month + "-" + day;
  }

  function isPastEventDay(event) {
    const eventDateKey = String(event && event.date || "");
    if (!eventDateKey) {
      return false;
    }
    return eventDateKey < getLocalDateKey(new Date());
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

  function normalizeEvent(event) {
    return {
      id: event.id,
      createdBy: event.createdBy || null,
      approvedBy: event.approvedBy || null,
      title: event.title || "Untitled Event",
      description: event.description || "",
      category: event.eventType || "General",
      status: String(event.status || "draft").toLowerCase(),
      price: Number(event.price || 0),
      date: event.eventDate || "",
      startTime: event.startTime || "",
      endTime: event.endTime || "",
      venue: event.venue || "",
      department: event.departmentFilter || "Open",
      maxCapacity: Number(event.maxCapacity || 0),
      registrations: Number(event.currentCount || 0),
      seatsRemaining:
        event.seatsRemaining != null
          ? Number(event.seatsRemaining)
          : Math.max(0, Number(event.maxCapacity || 0) - Number(event.currentCount || 0)),
      waitlistCount: Number(event.waitlistCount || 0),
      image: resolveMediaUrl(event.posterUrl) || "",
      registrationDeadline: event.registrationDeadline || "",
      tags: Array.isArray(event.tags) ? event.tags : [],
      myRegistrationStatus: event.myRegistrationStatus || null,
      organizerName: event.organizerName || "",
      assignedStaff: Array.isArray(event.assignedStaff) ? event.assignedStaff : []
    };
  }

  function mapEventStatus(status) {
    const value = String(status || "").toLowerCase();
    if (value === "pending_approval") {
      return "pending";
    }
    return value;
  }

  function getStatusLabel(status) {
    const normalized = mapEventStatus(status);
    const map = {
      approved: "Approved",
      pending: "Pending Approval",
      draft: "Draft",
      rejected: "Rejected",
      completed: "Completed",
      cancelled: "Cancelled",
      registered: "Registered",
      waitlisted: "Waitlisted",
      attended: "Attended",
      present: "Present",
      absent: "Absent",
      not_marked: "Not Marked"
    };
    return map[normalized] || String(status || "");
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

  function pushNotification(title, message, tone) {
    state.notifications = [{
      id: "student-ntf-" + Date.now(),
      title: title,
      message: message,
      tone: tone || "info",
      createdAt: new Date().toISOString()
    }].concat(state.notifications || []).slice(0, 10);
    saveNotifications();
    renderNotifications();
  }

  function relativeTime(value) {
    const date = new Date(value || "");
    if (Number.isNaN(date.getTime())) {
      return "Just now";
    }
    const diffMinutes = Math.max(0, Math.round((Date.now() - date.getTime()) / 60000));
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
    return Math.round(diffHours / 24) + " days ago";
  }

  function navItem(pageKey, icon, label, href, withDot) {
    const active = getPageKey() === pageKey ? " active" : "";
    const pulseDot = withDot
      ? '<span id="student-browse-live-dot" style="margin-left:auto;width:8px;height:8px;border-radius:50%;background:var(--accent-green);box-shadow:0 0 0 0 rgba(76,175,130,0.55);animation:studentPulse 2s infinite;' + (state.browsePulseDotVisible ? "" : "display:none;") + '"></span>'
      : "";
    return '<a class="teacher-nav-item' + active + '" href="' + href + '"><span class="material-symbols-outlined">' + icon + "</span><span>" + label + "</span>" + pulseDot + "</a>";
  }

  function renderNotifications() {
    const list = document.getElementById("student-notification-list");
    const count = document.getElementById("student-notification-count");
    const dot = document.getElementById("student-notifications-dot");
    if (!list || !count || !dot) {
      return;
    }
    count.textContent = state.notifications.length + " New";
    dot.classList.toggle("hidden", state.notifications.length === 0);
    if (!state.notifications.length) {
      list.innerHTML = '<div class="teacher-notification-empty">No new notifications</div>';
      return;
    }
    list.innerHTML = state.notifications.map(function (item) {
      return '<div class="teacher-notification-item"><div class="teacher-notification-item-title">' + escapeHtml(item.title) + '</div><div class="teacher-notification-item-copy">' + escapeHtml(item.message) + '</div><div class="teacher-notification-item-time">' + escapeHtml(relativeTime(item.createdAt)) + "</div></div>";
    }).join("");
  }

  function renderMailMessages() {
    const count = document.getElementById("student-message-count");
    const list = document.getElementById("student-message-list");
    const dot = document.getElementById("student-messages-dot");
    if (!count || !list || !dot) {
      return;
    }

    count.textContent = state.mailMessages.length + (state.mailMessages.length === 1 ? " Message" : " Messages");
    dot.classList.toggle("hidden", state.mailMessages.length === 0);

    if (!state.mailMessages.length) {
      list.innerHTML = '<div class="teacher-notification-empty">No messages yet</div>';
      return;
    }

    list.innerHTML = state.mailMessages.map(function (item) {
      return '<div class="teacher-notification-item"><div class="teacher-notification-item-title">' + escapeHtml(item.subject || "Message") + '</div><div class="teacher-notification-item-copy">' + escapeHtml(item.body || "") + '</div><div class="teacher-notification-item-time">' + escapeHtml(relativeTime(item.createdAt)) + "</div></div>";
    }).join("");
  }

  async function loadMailMessages() {
    const payload = await apiRequest("/users/messages");
    state.mailMessages = Array.isArray(payload.items) ? payload.items : [];
    renderMailMessages();
    return state.mailMessages;
  }

  function syncBrowsePulseDot() {
    const dot = document.getElementById("student-browse-live-dot");
    if (dot) {
      dot.style.display = state.browsePulseDotVisible ? "block" : "none";
    }
  }

  function setBrowsePulseDot(visible) {
    state.browsePulseDotVisible = Boolean(visible);
    syncBrowsePulseDot();
  }

  function wireShellInteractions() {
    const menuButton = document.getElementById("student-menu-button");
    const sidebar = document.getElementById("student-sidebar");
    const messagesTrigger = document.getElementById("student-messages-trigger");
    const notificationsTrigger = document.getElementById("student-notifications-trigger");
    const notificationsMenu = document.getElementById("student-notifications-menu");
    const profileTrigger = document.getElementById("student-profile-trigger");
    const profileMenu = document.getElementById("student-profile-menu");
    const profileViewButton = document.getElementById("student-profile-view-button");
    const profileModal = document.getElementById("student-profile-modal");
    const profileModalClose = document.getElementById("student-profile-modal-close");
    const profileModalDone = document.getElementById("student-profile-modal-done");
    const logoutButton = document.getElementById("student-logout-button");
    const messagesModal = document.getElementById("student-messages-modal");

    function closeMenus() {
      if (notificationsMenu) {
        notificationsMenu.classList.remove("open");
      }
      if (profileMenu) {
        profileMenu.classList.remove("open");
      }
    }

    function openMessagesModal() {
      if (!messagesModal) {
        return;
      }
      closeMenus();
      messagesModal.classList.add("open");
      messagesModal.setAttribute("aria-hidden", "false");
      loadMailMessages().catch(function (error) {
        showMessage(error.message || "Messages could not load right now.", "error");
      });
    }

    function closeMessagesModal() {
      if (!messagesModal) {
        return;
      }
      messagesModal.classList.remove("open");
      messagesModal.setAttribute("aria-hidden", "true");
    }

    function openProfileModal() {
      if (!profileModal) {
        return;
      }
      closeMenus();
      profileModal.classList.add("open");
      profileModal.setAttribute("aria-hidden", "false");
    }

    function closeProfileModal() {
      if (!profileModal) {
        return;
      }
      profileModal.classList.remove("open");
      profileModal.setAttribute("aria-hidden", "true");
    }

    if (menuButton && sidebar) {
      menuButton.addEventListener("click", function () { sidebar.classList.toggle("open"); });
    }
    if (messagesTrigger) {
      messagesTrigger.addEventListener("click", function (event) {
        event.stopPropagation();
        openMessagesModal();
      });
    }
    if (notificationsTrigger && notificationsMenu) {
      notificationsTrigger.addEventListener("click", function (event) {
        event.stopPropagation();
        if (profileMenu) {
          profileMenu.classList.remove("open");
        }
        notificationsMenu.classList.toggle("open");
      });
    }
    if (profileTrigger && profileMenu) {
      profileTrigger.addEventListener("click", function (event) {
        event.stopPropagation();
        if (notificationsMenu) {
          notificationsMenu.classList.remove("open");
        }
        profileMenu.classList.toggle("open");
      });
    }
    if (profileViewButton) {
      profileViewButton.addEventListener("click", function () {
        openProfileModal();
      });
    }
    if (profileModalClose) {
      profileModalClose.addEventListener("click", function () {
        closeProfileModal();
      });
    }
    if (profileModalDone) {
      profileModalDone.addEventListener("click", function () {
        closeProfileModal();
      });
    }
    if (profileModal) {
      profileModal.addEventListener("click", function (event) {
        if (event.target === profileModal) {
          closeProfileModal();
        }
      });
    }
    if (messagesModal) {
      messagesModal.addEventListener("click", function (event) {
        if (event.target === messagesModal) {
          closeMessagesModal();
        }
      });
      const closeButtons = messagesModal.querySelectorAll("[data-close-student-messages]");
      closeButtons.forEach(function (button) {
        button.addEventListener("click", function () {
          closeMessagesModal();
        });
      });
    }
    if (logoutButton) {
      logoutButton.addEventListener("click", function () {
        clearTokens();
        window.location.assign(getUiUrl(signInPath));
      });
    }
    document.addEventListener("click", closeMenus);
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        closeMenus();
        closeProfileModal();
        closeMessagesModal();
      }
    });
  }

  function createShell() {
    const pageTitle = document.body.getAttribute("data-title") || "Dashboard";
    const breadcrumb = document.body.getAttribute("data-breadcrumb") || pageTitle;
    const content = document.getElementById("student-page-content");
    const shell = document.createElement("div");
    shell.className = "teacher-shell";
    shell.innerHTML =
      '<style>@keyframes studentPulse{0%{opacity:1;box-shadow:0 0 0 0 rgba(76,175,130,.55)}70%{opacity:.45;box-shadow:0 0 0 10px rgba(76,175,130,0)}100%{opacity:1;box-shadow:0 0 0 0 rgba(76,175,130,0)}}</style>' +
      '<aside class="teacher-sidebar" id="student-sidebar">' +
      '<div class="teacher-brand"><div class="teacher-brand-row"><span class="teacher-mark"><span class="teacher-mark-inner">G</span></span><div><div class="teacher-brand-title">EMS</div><div class="teacher-brand-sub">Student Portal</div></div></div></div>' +
      '<div class="teacher-sidebar-grow"><div><div class="teacher-section-label">Menu</div><nav class="teacher-nav-list">' +
      navItem("dashboard", "dashboard", "Dashboard", "student-dashboard.html") +
      navItem("browse", "travel_explore", "Browse Events", "student-browse-events.html", true) +
      navItem("registrations", "confirmation_number", "My Registrations", "student-registrations.html") +
      navItem("attendance", "checklist", "My Attendance", "student-attendance.html") +
      '</nav></div><div><div class="teacher-section-label">General</div><nav class="teacher-nav-list">' +
      navItem("settings", "settings", "Settings", "student-profile.html") +
      '<button class="teacher-nav-item danger" id="student-logout-button" type="button"><span class="material-symbols-outlined">logout</span><span>Logout</span></button>' +
      '</nav></div></div>' +
      '<div class="teacher-promo"><div class="teacher-promo-top"><span class="teacher-promo-badge"><span class="teacher-mark-inner">G</span></span><div class="teacher-promo-title">Download Our Mobile App</div></div><div class="teacher-promo-chips"><span class="teacher-promo-chip"><span class="material-symbols-outlined" style="font-size:16px;">smartphone</span></span><span class="teacher-promo-chip"><span class="material-symbols-outlined" style="font-size:16px;">download</span></span></div><div class="teacher-promo-copy">Get another easy way</div><button class="teacher-promo-btn" type="button">Download Now</button></div>' +
      '</aside>' +
      '<div class="teacher-main"><header class="teacher-topbar"><div class="teacher-topbar-left"><button class="teacher-menu-btn" id="student-menu-button" type="button" aria-label="Open menu"><span class="material-symbols-outlined">menu</span></button><div class="teacher-page-meta"><div class="teacher-breadcrumb">' + escapeHtml(breadcrumb) + '</div><div class="teacher-page-title">' + escapeHtml(pageTitle) + '</div></div><label class="teacher-search" aria-label="Search"><span class="material-symbols-outlined" style="font-size:18px;color:var(--text-muted);">search</span><input id="student-search-input" type="search" placeholder="Search" /></label></div><div class="teacher-topbar-right"><button class="teacher-icon-btn" id="student-messages-trigger" type="button" aria-label="Messages"><span class="teacher-dot hidden" id="student-messages-dot"></span><span class="material-symbols-outlined" style="font-size:18px;">mail</span></button><div class="teacher-action-shell"><button class="teacher-icon-btn" id="student-notifications-trigger" type="button" aria-haspopup="menu" aria-expanded="false"><span class="teacher-dot hidden" id="student-notifications-dot"></span><span class="material-symbols-outlined" style="font-size:18px;">notifications</span></button><div class="teacher-notification-menu" id="student-notifications-menu" role="menu" aria-hidden="true"><div class="teacher-notification-head"><div class="teacher-notification-title">Notifications</div><div class="teacher-notification-count" id="student-notification-count">0 New</div></div><div class="teacher-notification-list" id="student-notification-list"></div></div></div><div class="teacher-profile-shell"><button class="teacher-profile teacher-profile-trigger" id="student-profile-trigger" type="button" aria-haspopup="menu" aria-expanded="false"><span class="teacher-avatar" id="student-header-avatar"></span><span class="teacher-profile-text"><span class="teacher-profile-name" id="student-header-name">student@ems.app</span><span class="teacher-profile-email" id="student-header-email">Student</span></span><span class="material-symbols-outlined teacher-profile-caret">expand_more</span></button><div class="teacher-profile-menu" id="student-profile-menu" role="menu" aria-hidden="true"><div class="teacher-profile-menu-head"><div class="teacher-profile-menu-label">Profile ID</div><div class="teacher-profile-menu-id" id="student-profile-id">EMS-STD-USER</div></div><div class="teacher-profile-menu-list"><button class="teacher-profile-menu-action" id="student-profile-view-button" type="button" role="menuitem"><span class="material-symbols-outlined" style="font-size:18px;">badge</span><span>View Profile</span></button></div></div></div></div></header><main class="teacher-content"><div class="teacher-feedback" id="student-feedback"></div></main></div>' +
      '<div class="teacher-modal-backdrop" id="student-profile-modal" aria-hidden="true"><div class="teacher-modal-card teacher-profile-modal-card" role="dialog" aria-modal="true" aria-labelledby="student-profile-modal-title"><div class="teacher-modal-head"><div><div class="teacher-modal-title" id="student-profile-modal-title">My Profile</div><div class="teacher-modal-sub">Your student account details from the live portal.</div></div><button class="teacher-modal-close" id="student-profile-modal-close" type="button" aria-label="Close profile"><span class="material-symbols-outlined">close</span></button></div><div class="teacher-profile-summary"><span class="teacher-avatar" id="student-profile-modal-avatar">ST</span><div class="teacher-profile-summary-copy"><div class="teacher-profile-name" id="student-profile-modal-name">Student</div><div class="teacher-profile-email" id="student-profile-modal-email">student@ems.app</div><div class="teacher-profile-role" id="student-profile-modal-role">Student</div></div></div><div class="teacher-profile-grid"><div class="teacher-profile-field"><div class="teacher-profile-field-label">Profile ID</div><div class="teacher-profile-field-value" id="student-profile-modal-id">EMS-STD-USER</div></div><div class="teacher-profile-field"><div class="teacher-profile-field-label">Department</div><div class="teacher-profile-field-value" id="student-profile-modal-department">Not added yet</div></div><div class="teacher-profile-field"><div class="teacher-profile-field-label">Roll Number</div><div class="teacher-profile-field-value" id="student-profile-modal-rollno">Not added yet</div></div><div class="teacher-profile-field"><div class="teacher-profile-field-label">Joined</div><div class="teacher-profile-field-value" id="student-profile-modal-created">Just now</div></div></div><div class="teacher-modal-actions"><button class="teacher-btn" id="student-profile-modal-done" type="button">Done</button></div></div></div>';
      '<div class="teacher-modal-backdrop" id="student-profile-modal" aria-hidden="true"><div class="teacher-modal-card teacher-profile-modal-card" role="dialog" aria-modal="true" aria-labelledby="student-profile-modal-title"><div class="teacher-modal-head"><div><div class="teacher-modal-title" id="student-profile-modal-title">My Profile</div><div class="teacher-modal-sub">Your student account details from the live portal.</div></div><button class="teacher-modal-close" id="student-profile-modal-close" type="button" aria-label="Close profile"><span class="material-symbols-outlined">close</span></button></div><div class="teacher-profile-summary"><span class="teacher-avatar" id="student-profile-modal-avatar">ST</span><div class="teacher-profile-summary-copy"><div class="teacher-profile-name" id="student-profile-modal-name">Student</div><div class="teacher-profile-email" id="student-profile-modal-email">student@ems.app</div><div class="teacher-profile-role" id="student-profile-modal-role">Student</div></div></div><div class="teacher-profile-grid"><div class="teacher-profile-field"><div class="teacher-profile-field-label">Profile ID</div><div class="teacher-profile-field-value" id="student-profile-modal-id">EMS-STD-USER</div></div><div class="teacher-profile-field"><div class="teacher-profile-field-label">Department</div><div class="teacher-profile-field-value" id="student-profile-modal-department">Not added yet</div></div><div class="teacher-profile-field"><div class="teacher-profile-field-label">Roll Number</div><div class="teacher-profile-field-value" id="student-profile-modal-rollno">Not added yet</div></div><div class="teacher-profile-field"><div class="teacher-profile-field-label">Joined</div><div class="teacher-profile-field-value" id="student-profile-modal-created">Just now</div></div></div><div class="teacher-modal-actions"><button class="teacher-btn" id="student-profile-modal-done" type="button">Done</button></div></div></div><div class="teacher-modal-backdrop" id="student-messages-modal" aria-hidden="true"><div class="teacher-modal-card" role="dialog" aria-modal="true" aria-labelledby="student-messages-title"><div class="teacher-modal-head"><div><div class="teacher-modal-title" id="student-messages-title">Inbox</div><div class="teacher-modal-sub">Admin messages for your account appear here in real time.</div></div><button class="teacher-modal-close" type="button" data-close-student-messages="true" aria-label="Close messages"><span class="material-symbols-outlined">close</span></button></div><div class="teacher-notification-head"><div class="teacher-notification-title">Messages</div><div class="teacher-notification-count" id="student-message-count">0 Messages</div></div><div class="teacher-notification-list" id="student-message-list" style="margin-top:12px;"></div><div class="teacher-modal-actions"><button class="teacher-btn secondary" type="button" data-close-student-messages="true">Done</button></div></div></div>';
    document.body.innerHTML = "";
    document.body.appendChild(shell);
    const contentRoot = shell.querySelector(".teacher-content");
    if (content) {
      contentRoot.appendChild(content);
      content.hidden = false;
    }
    wireShellInteractions();
    renderNotifications();
    renderMailMessages();
    syncBrowsePulseDot();
  }

  function hydrateShellUser(user) {
    state.user = user;
    state.notifications = loadNotifications(user);
    renderNotifications();
    loadMailMessages().catch(function () {
      state.mailMessages = [];
      renderMailMessages();
    });
    const headerName = document.getElementById("student-header-name");
    const headerEmail = document.getElementById("student-header-email");
    const profileId = document.getElementById("student-profile-id");
    const modalName = document.getElementById("student-profile-modal-name");
    const modalEmail = document.getElementById("student-profile-modal-email");
    const modalRole = document.getElementById("student-profile-modal-role");
    const modalId = document.getElementById("student-profile-modal-id");
    const modalDepartment = document.getElementById("student-profile-modal-department");
    const modalRollNo = document.getElementById("student-profile-modal-rollno");
    const modalCreated = document.getElementById("student-profile-modal-created");
    if (headerName) { headerName.textContent = user.email || "student@ems.app"; }
    if (headerEmail) { headerEmail.textContent = "Student"; }
    if (profileId) { profileId.textContent = user.profileId || "EMS-STD-USER"; }
    if (modalName) { modalName.textContent = user.fullName || "Student"; }
    if (modalEmail) { modalEmail.textContent = user.email || ""; }
    if (modalRole) { modalRole.textContent = "Student"; }
    if (modalId) { modalId.textContent = user.profileId || "EMS-STD-USER"; }
    if (modalDepartment) { modalDepartment.textContent = user.department || "Not added yet"; }
    if (modalRollNo) { modalRollNo.textContent = user.rollNo || "Not added yet"; }
    if (modalCreated) { modalCreated.textContent = user.createdAt ? formatDate(user.createdAt) : "Recently joined"; }
    setAvatar(document.getElementById("student-header-avatar"), user.fullName || "Student", user.avatarUrl || "");
    setAvatar(document.getElementById("student-profile-modal-avatar"), user.fullName || "Student", user.avatarUrl || "");
  }

  function ensureStudentUser(user) {
    const role = String(user && user.role || "").toLowerCase();
    if (role !== "student") {
      if (role === "admin") {
        window.location.assign(getUiUrl(config.dashboardPath || "/dashboard.html"));
        return false;
      }
      if (role === "teacher") {
        window.location.assign(getUiUrl(config.teacherDashboardPath || "/teacher-dashboard.html"));
        return false;
      }
      clearTokens();
      window.location.assign(getUiUrl(signInPath));
      return false;
    }
    return true;
  }

  async function loadStudentUser() {
    try {
      const user = await retryApi("/users/me", 4, 900);
      if (!ensureStudentUser(user)) {
        return null;
      }
      hydrateShellUser(user);
      return user;
    } catch (error) {
      if (error && (error.statusCode === 401 || error.statusCode === 403 || error.message === "Missing session")) {
        clearTokens();
        window.location.assign(getUiUrl(signInPath));
        return null;
      }
      throw error;
    }
  }

  function showMessage(message, tone) {
    const root = document.getElementById("student-feedback");
    if (!root) {
      return;
    }
    root.innerHTML = '<div class="' + (tone === "success" ? "teacher-success" : "teacher-banner") + '">' + escapeHtml(message) + "</div>";
  }

  function clearMessage() {
    const root = document.getElementById("student-feedback");
    if (root) {
      root.innerHTML = "";
    }
  }

  function upcomingEvents(events) {
    return events.filter(function (event) {
      const status = mapEventStatus(event.status);
      return Boolean(event.date) && status !== "completed" && status !== "cancelled" && !isPastEventDay(event);
    }).sort(function (left, right) {
      return (left.date + left.startTime).localeCompare(right.date + right.startTime);
    });
  }

  function completedEvents(events) {
    return events.filter(function (event) {
      const status = mapEventStatus(event.status);
      return status === "completed" || status === "cancelled" || isPastEventDay(event);
    });
  }

  function renderSectionState(node, bodyHtml) {
    if (!node) {
      return;
    }
    node.innerHTML = bodyHtml;
  }

  function renderSectionLoader(node, cardClass) {
    renderSectionState(node, '<div class="' + (cardClass || "teacher-card") + '" style="padding:20px 24px;"><div class="teacher-grid" style="gap:10px;"><div style="height:18px;border-radius:8px;background:var(--bg-card-alt);"></div><div style="height:52px;border-radius:12px;background:var(--bg-card-alt);"></div><div style="height:52px;border-radius:12px;background:var(--bg-card-alt);"></div></div></div>');
  }

  function renderSectionError(node, message, cardClass) {
    renderSectionState(node, '<div class="' + (cardClass || "teacher-card") + '" style="padding:20px 24px;"><div class="teacher-empty-state" style="padding:20px 12px;"><span class="material-symbols-outlined" style="font-size:30px;color:var(--accent-amber);">warning</span><div>' + escapeHtml(message) + "</div></div></div>");
  }

  function mountModal(id, title, subtitle, bodyHtml, actionsHtml) {
    let modal = document.getElementById(id);
    if (!modal) {
      modal = document.createElement("div");
      modal.id = id;
      modal.className = "teacher-modal-backdrop";
      modal.innerHTML = '<div class="teacher-modal-card"><div class="teacher-modal-head"><div><div class="teacher-modal-title"></div><div class="teacher-modal-sub"></div></div><button class="teacher-modal-close" type="button" aria-label="Close"><span class="material-symbols-outlined">close</span></button></div><div class="teacher-modal-body"></div><div class="teacher-modal-actions"></div></div>';
      document.body.appendChild(modal);
      modal.addEventListener("click", function (event) {
        if (event.target === modal) {
          modal.classList.remove("open");
        }
      });
      modal.querySelector(".teacher-modal-close").addEventListener("click", function () {
        modal.classList.remove("open");
      });
    }
    modal.querySelector(".teacher-modal-title").textContent = title;
    modal.querySelector(".teacher-modal-sub").textContent = subtitle || "";
    modal.querySelector(".teacher-modal-body").innerHTML = bodyHtml || "";
    modal.querySelector(".teacher-modal-actions").innerHTML = actionsHtml || "";
    return modal;
  }

  window.EMS_STUDENT = {
    config: config,
    state: state,
    studentDashboardPath: studentDashboardPath,
    signInPath: signInPath,
    apiRequest: apiRequest,
    retryApi: retryApi,
    createShell: createShell,
    loadStudentUser: loadStudentUser,
    hydrateShellUser: hydrateShellUser,
    ensureStudentUser: ensureStudentUser,
    clearTokens: clearTokens,
    escapeHtml: escapeHtml,
    formatDate: formatDate,
    formatShortDate: formatShortDate,
    formatTime: formatTime,
    formatPrice: formatPrice,
    formatCountdown: formatCountdown,
    getLocalDateKey: getLocalDateKey,
    getStatusLabel: getStatusLabel,
    getQueryParam: function (name) { return new URL(window.location.href).searchParams.get(name); },
    normalizeEvent: normalizeEvent,
    mapEventStatus: mapEventStatus,
    resolveMediaUrl: resolveMediaUrl,
    showMessage: showMessage,
    clearMessage: clearMessage,
    renderSectionLoader: renderSectionLoader,
    renderSectionError: renderSectionError,
    upcomingEvents: upcomingEvents,
    completedEvents: completedEvents,
    mountModal: mountModal,
    setAvatar: setAvatar,
    getInitials: getInitials,
    getUiUrl: getUiUrl,
    pushNotification: pushNotification,
    setBrowsePulseDot: setBrowsePulseDot,
    loadMailMessages: loadMailMessages,
    renderMailMessages: renderMailMessages
  };

  if (window.EMS_REALTIME) {
    window.EMS_REALTIME.onMessage(function (message) {
      const type = String(message && message.type || "");
      if (type === "mail_message" && message.data && message.data.message) {
        state.mailMessages = [message.data.message].concat(state.mailMessages || []).slice(0, 25);
        renderMailMessages();
        pushNotification("New Message", message.data.message.subject || "Admin sent you a message.");
      }
    });
  }
})();
