(function () {
  const config = window.EMS_CONFIG || {};
  const apiBaseUrl = String(config.apiBaseUrl || window.location.origin).replace(/\/$/, "") + "/";
  const mediaBaseUrl = String(config.mediaBaseUrl || "").replace(/\/$/, "");
  const signInPath = config.signInPath || "/index.html";
  const storageKey = "ems.auth.tokens";
  const roleStorageKey = "ems.auth.tokens.teacher";
  const notificationsStoragePrefix = "ems.teacher.notifications";
  const teacherDashboardPath = config.teacherDashboardPath || "/teacher-dashboard.html";

  const state = {
    user: null,
    notifications: [],
    mailMessages: []
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
    const url = getApiUrl(path);
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
      error.url = url;
      if (window.console && typeof window.console.error === "function") {
        window.console.error("[Teacher API Error]", {
          path: path,
          url: url,
          statusCode: response.status,
          message: error.message,
          payload: payload
        });
      }
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
    return String(value || "TP").split(" ").filter(Boolean).map(function (part) {
      return part.charAt(0).toUpperCase();
    }).join("").slice(0, 2) || "TP";
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
      image: resolveMediaUrl(event.posterUrl) || "",
      registrationDeadline: event.registrationDeadline || "",
      tags: Array.isArray(event.tags) ? event.tags : [],
      assignedStaff: Array.isArray(event.assignedStaff) ? event.assignedStaff : [],
      rejectionReason: event.rejectionReason || "",
      organizerName: event.organizerName || ""
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
      absent: "Absent"
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

  function pushNotification(title, message) {
    state.notifications = [{
      id: "teacher-ntf-" + Date.now(),
      title: title,
      message: message,
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

  function navItem(pageKey, icon, label, href) {
    const active = getPageKey() === pageKey ? " active" : "";
    return '<a class="teacher-nav-item' + active + '" href="' + href + '"><span class="material-symbols-outlined">' + icon + "</span><span>" + label + "</span></a>";
  }

  function renderNotifications() {
    const list = document.getElementById("teacher-notification-list");
    const count = document.getElementById("teacher-notification-count");
    const dot = document.getElementById("teacher-notifications-dot");
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
    const count = document.getElementById("teacher-message-count");
    const list = document.getElementById("teacher-message-list");
    const dot = document.getElementById("teacher-messages-dot");
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

  function wireShellInteractions() {
    const menuButton = document.getElementById("teacher-menu-button");
    const sidebar = document.getElementById("teacher-sidebar");
    const messagesTrigger = document.getElementById("teacher-messages-trigger");
    const notificationsTrigger = document.getElementById("teacher-notifications-trigger");
    const notificationsMenu = document.getElementById("teacher-notifications-menu");
    const profileTrigger = document.getElementById("teacher-profile-trigger");
    const profileMenu = document.getElementById("teacher-profile-menu");
    const profileViewButton = document.getElementById("teacher-profile-view-button");
    const profileModal = document.getElementById("teacher-profile-modal");
    const profileModalClose = document.getElementById("teacher-profile-modal-close");
    const profileModalDone = document.getElementById("teacher-profile-modal-done");
    const logoutButton = document.getElementById("teacher-logout-button");
    const messagesModal = document.getElementById("teacher-messages-modal");

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
        profileMenu.classList.remove("open");
        notificationsMenu.classList.toggle("open");
      });
    }
    if (profileTrigger && profileMenu) {
      profileTrigger.addEventListener("click", function (event) {
        event.stopPropagation();
        notificationsMenu.classList.remove("open");
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
      const closeButtons = messagesModal.querySelectorAll("[data-close-teacher-messages]");
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
    const content = document.getElementById("teacher-page-content");
    const shell = document.createElement("div");
    shell.className = "teacher-shell";
    shell.innerHTML = '<aside class="teacher-sidebar" id="teacher-sidebar"><div class="teacher-brand"><div class="teacher-brand-row"><span class="teacher-mark"><span class="teacher-mark-inner">G</span></span><div><div class="teacher-brand-title">EMS</div><div class="teacher-brand-sub">Teacher Portal</div></div></div></div><div class="teacher-sidebar-grow"><div><div class="teacher-section-label">Menu</div><nav class="teacher-nav-list">' + navItem("dashboard", "dashboard", "Dashboard", "teacher-dashboard.html") + navItem("my-events", "calendar_month", "My Events", "teacher-my-events.html") + navItem("browse-events", "travel_explore", "Browse Events", "teacher-browse-events.html") + navItem("students", "groups", "Students", "teacher-students.html") + navItem("attendance", "checklist", "Attendance", "teacher-attendance.html") + '</nav></div><div><div class="teacher-section-label">General</div><nav class="teacher-nav-list">' + navItem("settings", "settings", "Settings", "teacher-settings.html") + '<button class="teacher-nav-item danger" id="teacher-logout-button" type="button"><span class="material-symbols-outlined">logout</span><span>Logout</span></button></nav></div></div><div class="teacher-promo"><div class="teacher-promo-top"><span class="teacher-promo-badge"><span class="teacher-mark-inner">G</span></span><div class="teacher-promo-title">Download Our Mobile App</div></div><div class="teacher-promo-chips"><span class="teacher-promo-chip"><span class="material-symbols-outlined" style="font-size:16px;">smartphone</span></span><span class="teacher-promo-chip"><span class="material-symbols-outlined" style="font-size:16px;">download</span></span></div><div class="teacher-promo-copy">Get another easy way</div><button class="teacher-promo-btn" type="button">Download Now</button></div></aside><div class="teacher-main"><header class="teacher-topbar"><div class="teacher-topbar-left"><button class="teacher-menu-btn" id="teacher-menu-button" type="button" aria-label="Open menu"><span class="material-symbols-outlined">menu</span></button><div class="teacher-page-meta"><div class="teacher-breadcrumb">' + escapeHtml(breadcrumb) + '</div><div class="teacher-page-title">' + escapeHtml(pageTitle) + '</div></div><label class="teacher-search" aria-label="Search"><span class="material-symbols-outlined" style="font-size:18px;color:var(--text-muted);">search</span><input id="teacher-search-input" type="search" placeholder="Search" /></label></div><div class="teacher-topbar-right"><button class="teacher-icon-btn" id="teacher-messages-trigger" type="button" aria-label="Messages"><span class="teacher-dot hidden" id="teacher-messages-dot"></span><span class="material-symbols-outlined" style="font-size:18px;">mail</span></button><div class="teacher-action-shell"><button class="teacher-icon-btn" id="teacher-notifications-trigger" type="button" aria-haspopup="menu" aria-expanded="false"><span class="teacher-dot hidden" id="teacher-notifications-dot"></span><span class="material-symbols-outlined" style="font-size:18px;">notifications</span></button><div class="teacher-notification-menu" id="teacher-notifications-menu" role="menu" aria-hidden="true"><div class="teacher-notification-head"><div class="teacher-notification-title">Notifications</div><div class="teacher-notification-count" id="teacher-notification-count">0 New</div></div><div class="teacher-notification-list" id="teacher-notification-list"></div></div></div><div class="teacher-profile-shell"><button class="teacher-profile teacher-profile-trigger" id="teacher-profile-trigger" type="button" aria-haspopup="menu" aria-expanded="false"><span class="teacher-avatar" id="teacher-header-avatar"></span><span class="teacher-profile-text"><span class="teacher-profile-name" id="teacher-header-name">teacher@ems.app</span><span class="teacher-profile-email" id="teacher-header-email">Teacher</span></span><span class="material-symbols-outlined teacher-profile-caret">expand_more</span></button><div class="teacher-profile-menu" id="teacher-profile-menu" role="menu" aria-hidden="true"><div class="teacher-profile-menu-head"><div class="teacher-profile-menu-label">Profile ID</div><div class="teacher-profile-menu-id" id="teacher-profile-id">EMS-TCH-USER</div></div><div class="teacher-profile-menu-list"><button class="teacher-profile-menu-action" id="teacher-profile-view-button" type="button" role="menuitem"><span class="material-symbols-outlined" style="font-size:18px;">badge</span><span>View Profile</span></button></div></div></div></div></header><main class="teacher-content"><div class="teacher-feedback" id="teacher-feedback"></div></main></div><div class="teacher-modal-backdrop" id="teacher-profile-modal" aria-hidden="true"><div class="teacher-modal-card teacher-profile-modal-card" role="dialog" aria-modal="true" aria-labelledby="teacher-profile-modal-title"><div class="teacher-modal-head"><div><div class="teacher-modal-title" id="teacher-profile-modal-title">My Profile</div><div class="teacher-modal-sub">Your teacher account details from the live portal.</div></div><button class="teacher-modal-close" id="teacher-profile-modal-close" type="button" aria-label="Close profile"><span class="material-symbols-outlined">close</span></button></div><div class="teacher-profile-summary"><span class="teacher-avatar" id="teacher-profile-modal-avatar">TP</span><div class="teacher-profile-summary-copy"><div class="teacher-profile-name" id="teacher-profile-modal-name">Teacher</div><div class="teacher-profile-email" id="teacher-profile-modal-email">teacher@ems.app</div><div class="teacher-profile-role" id="teacher-profile-modal-role">Teacher</div></div></div><div class="teacher-profile-grid"><div class="teacher-profile-field"><div class="teacher-profile-field-label">Profile ID</div><div class="teacher-profile-field-value" id="teacher-profile-modal-id">EMS-TCH-USER</div></div><div class="teacher-profile-field"><div class="teacher-profile-field-label">Department</div><div class="teacher-profile-field-value" id="teacher-profile-modal-department">Not added yet</div></div><div class="teacher-profile-field"><div class="teacher-profile-field-label">Joined</div><div class="teacher-profile-field-value" id="teacher-profile-modal-created">Just now</div></div></div><div class="teacher-modal-actions"><button class="teacher-btn" id="teacher-profile-modal-done" type="button">Done</button></div></div></div><div class="teacher-modal-backdrop" id="teacher-messages-modal" aria-hidden="true"><div class="teacher-modal-card" role="dialog" aria-modal="true" aria-labelledby="teacher-messages-title"><div class="teacher-modal-head"><div><div class="teacher-modal-title" id="teacher-messages-title">Inbox</div><div class="teacher-modal-sub">Admin messages for your account appear here in real time.</div></div><button class="teacher-modal-close" type="button" data-close-teacher-messages="true" aria-label="Close messages"><span class="material-symbols-outlined">close</span></button></div><div class="teacher-notification-head"><div class="teacher-notification-title">Messages</div><div class="teacher-notification-count" id="teacher-message-count">0 Messages</div></div><div class="teacher-notification-list" id="teacher-message-list" style="margin-top:12px;"></div><div class="teacher-modal-actions"><button class="teacher-btn secondary" type="button" data-close-teacher-messages="true">Done</button></div></div></div>';
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
  }

  function hydrateShellUser(user) {
    state.user = user;
    state.notifications = loadNotifications(user);
    renderNotifications();
    loadMailMessages().catch(function () {
      state.mailMessages = [];
      renderMailMessages();
    });
    const headerName = document.getElementById("teacher-header-name");
    const headerEmail = document.getElementById("teacher-header-email");
    const profileId = document.getElementById("teacher-profile-id");
    const modalName = document.getElementById("teacher-profile-modal-name");
    const modalEmail = document.getElementById("teacher-profile-modal-email");
    const modalRole = document.getElementById("teacher-profile-modal-role");
    const modalId = document.getElementById("teacher-profile-modal-id");
    const modalDepartment = document.getElementById("teacher-profile-modal-department");
    const modalCreated = document.getElementById("teacher-profile-modal-created");
    if (headerName) { headerName.textContent = user.email || "teacher@ems.app"; }
    if (headerEmail) { headerEmail.textContent = "Teacher"; }
    if (profileId) { profileId.textContent = user.profileId || "EMS-TCH-USER"; }
    if (modalName) { modalName.textContent = user.fullName || "Teacher"; }
    if (modalEmail) { modalEmail.textContent = user.email || ""; }
    if (modalRole) { modalRole.textContent = "Teacher"; }
    if (modalId) { modalId.textContent = user.profileId || "EMS-TCH-USER"; }
    if (modalDepartment) { modalDepartment.textContent = user.department || "Not added yet"; }
    if (modalCreated) { modalCreated.textContent = user.createdAt ? formatDate(user.createdAt) : "Recently joined"; }
    setAvatar(document.getElementById("teacher-header-avatar"), user.fullName || "Teacher", user.avatarUrl || "");
    setAvatar(document.getElementById("teacher-profile-modal-avatar"), user.fullName || "Teacher", user.avatarUrl || "");
  }

  function ensureTeacherUser(user) {
    const role = String(user && user.role || "").toLowerCase();
    if (role !== "teacher") {
      if (role === "admin") {
        window.location.assign(getUiUrl(config.dashboardPath || "/dashboard.html"));
        return false;
      }
      clearTokens();
      window.location.assign(getUiUrl(signInPath));
      return false;
    }
    return true;
  }

  async function loadTeacherUser() {
    try {
      const user = await retryApi("/users/me", 4, 900);
      if (!ensureTeacherUser(user)) {
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
    const root = document.getElementById("teacher-feedback");
    if (!root) {
      return;
    }
    root.innerHTML = '<div class="' + (tone === "success" ? "teacher-success" : "teacher-banner") + '">' + escapeHtml(message) + "</div>";
  }

  function clearMessage() {
    const root = document.getElementById("teacher-feedback");
    if (root) {
      root.innerHTML = "";
    }
  }

  function renderSectionState(node, bodyHtml) {
    if (!node) {
      return;
    }
    node.innerHTML = bodyHtml;
  }

  function renderSectionLoader(node, cardClass) {
    renderSectionState(
      node,
      '<div class="' + (cardClass || 'teacher-card') + '" style="padding:20px 24px;"><div class="teacher-grid" style="gap:10px;">' +
      '<div style="height:18px;border-radius:8px;background:var(--bg-card-alt);"></div>' +
      '<div style="height:52px;border-radius:12px;background:var(--bg-card-alt);"></div>' +
      '<div style="height:52px;border-radius:12px;background:var(--bg-card-alt);"></div>' +
      "</div></div>"
    );
  }

  function renderSectionError(node, message, cardClass) {
    renderSectionState(
      node,
      '<div class="' + (cardClass || 'teacher-card') + '" style="padding:20px 24px;"><div class="teacher-empty-state" style="padding:20px 12px;">' +
      '<span class="material-symbols-outlined" style="font-size:30px;color:var(--accent-amber);">warning</span>' +
      '<div>' + escapeHtml(message) + "</div></div></div>"
    );
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

  function byStatus(events, status) {
    const target = mapEventStatus(status);
    return events.filter(function (event) { return mapEventStatus(event.status) === target; });
  }

  function createEventCard(event, options) {
    const bottomBanner = options && options.bottomBanner ? options.bottomBanner : "";
    const actionStrip = options && options.actionStrip ? options.actionStrip : "";
    const ratio = Math.min(100, Math.round((Number(event.registrations || 0) / Math.max(1, Number(event.maxCapacity || 0))) * 100));
    return '<article class="teacher-event-card"><div class="teacher-event-card-image"><img alt="' + escapeHtml(event.title) + '" src="' + escapeHtml(event.image || "") + '" /><span class="teacher-category-chip" style="position:absolute;top:10px;left:10px;background:#ffffff;color:var(--text-primary);">' + escapeHtml(event.category) + '</span><span class="teacher-badge ' + escapeHtml(mapEventStatus(event.status)) + '" style="position:absolute;top:10px;right:10px;">' + escapeHtml(getStatusLabel(event.status)) + '</span></div><div class="teacher-event-card-body"><div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;"><div class="teacher-event-card-title">' + escapeHtml(event.title) + '</div><div class="teacher-event-card-price">' + escapeHtml(formatPrice(event.price)) + '</div></div><div class="teacher-event-meta"><span class="material-symbols-outlined" style="font-size:14px;">calendar_month</span><span>' + escapeHtml(formatShortDate(event.date)) + '</span><span>&bull;</span><span>' + escapeHtml(formatTime(event.startTime)) + '</span></div><div class="teacher-event-location"><span class="material-symbols-outlined" style="font-size:14px;color:var(--accent-red);">location_on</span><span>' + escapeHtml(event.venue) + '</span></div><div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:6px;"><div class="teacher-progress"><span style="width:' + ratio + '%;"></span></div><span style="font-size:11px;font-weight:700;color:var(--text-secondary);">' + ratio + '%</span></div></div>' + bottomBanner + actionStrip + '</article>';
  }

  function mountModal(id, title, subtitle, bodyHtml, actionsHtml) {
    let modal = document.getElementById(id);
    if (!modal) {
      modal = document.createElement("div");
      modal.id = id;
      modal.className = "teacher-modal-backdrop";
      modal.innerHTML = '<div class="teacher-modal-card"><div class="teacher-modal-head"><div><div class="teacher-modal-title"></div><div class="teacher-modal-sub"></div></div><button class="teacher-modal-close" type="button" aria-label="Close"><span class="material-symbols-outlined">close</span></button></div><div class="teacher-modal-body"></div><div class="teacher-modal-actions"></div></div>';
      document.body.appendChild(modal);
      modal.addEventListener("click", function (event) { if (event.target === modal) { modal.classList.remove("open"); } });
      modal.querySelector(".teacher-modal-close").addEventListener("click", function () { modal.classList.remove("open"); });
    }
    modal.querySelector(".teacher-modal-title").textContent = title;
    modal.querySelector(".teacher-modal-sub").textContent = subtitle || "";
    modal.querySelector(".teacher-modal-body").innerHTML = bodyHtml || "";
    modal.querySelector(".teacher-modal-actions").innerHTML = actionsHtml || "";
    return modal;
  }

  window.EMS_TEACHER = {
    config: config,
    state: state,
    storageKey: storageKey,
    teacherDashboardPath: teacherDashboardPath,
    signInPath: signInPath,
    apiRequest: apiRequest,
    retryApi: retryApi,
    createShell: createShell,
    loadTeacherUser: loadTeacherUser,
    hydrateShellUser: hydrateShellUser,
    ensureTeacherUser: ensureTeacherUser,
    clearTokens: clearTokens,
    escapeHtml: escapeHtml,
    formatDate: formatDate,
    formatShortDate: formatShortDate,
    formatTime: formatTime,
    formatPrice: formatPrice,
    getLocalDateKey: getLocalDateKey,
    isPastEventDay: isPastEventDay,
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
    byStatus: byStatus,
    createEventCard: createEventCard,
    mountModal: mountModal,
    setAvatar: setAvatar,
    getInitials: getInitials,
    getUiUrl: getUiUrl,
    pushNotification: pushNotification,
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
