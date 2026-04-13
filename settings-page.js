(function () {
  const config = window.EMS_CONFIG || {};
  const apiBaseUrl = String(config.apiBaseUrl || window.location.origin).replace(/\/$/, "") + "/";
  const signInPath = config.signInPath || "/index.html";
  const storageKey = "ems.auth.tokens";
  const roleStorageKey = "ems.auth.tokens.admin";
  const notificationsStoragePrefix = "ems.dashboard.notifications";

  const refs = {
    sidebar: document.getElementById("sidebar"),
    menuButton: document.getElementById("menu-button"),
    logoutButton: document.getElementById("logout-button"),
    feedback: document.getElementById("settings-feedback"),
    tabs: Array.prototype.slice.call(document.querySelectorAll("[data-tab]")),
    approvalsSection: document.getElementById("approvals-section"),
    securitySection: document.getElementById("security-section"),
    pendingList: document.getElementById("pending-approvals-list"),
    passwordResetSend: document.getElementById("password-reset-send"),
    passwordResetConfirm: document.getElementById("password-reset-confirm"),
    passwordResetCode: document.getElementById("password-reset-code"),
    passwordResetNew: document.getElementById("password-reset-new"),
    securityEmailNote: document.getElementById("security-email-note"),
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
    notifications: [],
    activeTab: "approvals",
    pendingUsers: [],
    isSaving: false
  };

  function getApiUrl(path) { return new URL(path.replace(/^\//, ""), apiBaseUrl).toString(); }
  function getUiUrl(path) { return /^https?:\/\//i.test(path) ? path : new URL(path, window.location.origin).toString(); }
  function escapeHtml(value) { return String(value == null ? "" : value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;"); }
  function loadTokens() { const keys = [roleStorageKey, storageKey]; for (const key of keys) { try { const raw = window.localStorage.getItem(key); if (raw) { return JSON.parse(raw); } } catch (_error) {} } return null; }
  function clearTokens() { window.localStorage.removeItem(roleStorageKey); window.localStorage.removeItem(storageKey); }
  function decodeJwt(token) { const parts = String(token || "").split("."); if (parts.length < 2) { return null; } try { return JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"))); } catch (_error) { return null; } }
  function getValidIdToken() { const tokens = loadTokens(); if (!tokens || !tokens.idToken) { return null; } const claims = decodeJwt(tokens.idToken); if (!claims || !claims.exp || Date.now() >= claims.exp * 1000) { clearTokens(); return null; } return tokens.idToken; }

  async function apiRequest(path, options) {
    const idToken = getValidIdToken();
    if (!idToken) { throw new Error("Missing session"); }
    const response = await fetch(getApiUrl(path), {
      method: options && options.method ? options.method : "GET",
      headers: Object.assign({ "Content-Type": "application/json", Authorization: "Bearer " + idToken }, options && options.headers ? options.headers : {}),
      body: options && options.body ? JSON.stringify(options.body) : undefined
    });
    const payload = await response.json().catch(function () { return {}; });
    if (!response.ok) { const error = new Error(payload.message || "Request failed"); error.statusCode = response.status; throw error; }
    return payload;
  }

  async function publicRequest(path, body) {
    const response = await fetch(getApiUrl(path), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const payload = await response.json().catch(function () { return {}; });
    if (!response.ok) { throw new Error(payload.message || "Request failed"); }
    return payload;
  }

  function getInitials(value) { return String(value || "EMS").split(" ").filter(Boolean).map(function (part) { return part.charAt(0).toUpperCase(); }).join("").slice(0, 2) || "EM"; }
  function setAvatar(node, name, avatarUrl) { if (!node) { return; } if (avatarUrl) { node.innerHTML = '<img alt="' + escapeHtml(name) + '" src="' + escapeHtml(avatarUrl) + '" />'; return; } node.textContent = getInitials(name); }
  function formatRole(value) { const role = String(value || "admin").toLowerCase(); return role.charAt(0).toUpperCase() + role.slice(1); }
  function formatJoinedDate(value) { const date = new Date(value || ""); if (Number.isNaN(date.getTime())) { return "Recently joined"; } return date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }); }
  function formatRelativeTime(value) { const date = new Date(value || ""); if (Number.isNaN(date.getTime())) { return "Just now"; } const diffMinutes = Math.max(0, Math.round((Date.now() - date.getTime()) / 60000)); if (diffMinutes < 1) { return "Just now"; } if (diffMinutes < 60) { return diffMinutes + " min ago"; } const diffHours = Math.round(diffMinutes / 60); if (diffHours < 24) { return diffHours + " hr ago"; } const diffDays = Math.round(diffHours / 24); return diffDays + " day" + (diffDays === 1 ? "" : "s") + " ago"; }
  function buildProfileId(user) { if (user && user.profileId) { return user.profileId; } const role = String(user && user.role || "admin").toLowerCase(); const prefix = role === "teacher" ? "TCH" : role === "student" ? "STD" : "ADM"; const compactId = String(user && user.id || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 10); return "EMS-" + prefix + "-" + (compactId || "USER"); }
  function getNotificationsStorageKey(user) { return notificationsStoragePrefix + "." + (user && (user.profileId || user.id) ? (user.profileId || user.id) : "guest"); }
  function loadNotifications(user) { try { const raw = window.localStorage.getItem(getNotificationsStorageKey(user)); const items = raw ? JSON.parse(raw) : []; return Array.isArray(items) ? items : []; } catch (_error) { return []; } }

  function showMessage(message, tone) {
    refs.feedback.innerHTML = '<div class="' + (tone === "success" ? "success" : "banner") + '">' + escapeHtml(message) + "</div>";
  }

  function clearMessage() {
    refs.feedback.innerHTML = "";
  }

  function renderNotifications() {
    const items = state.notifications || [];
    refs.notificationsCount.textContent = items.length + " New";
    refs.notificationsDot.classList.toggle("hidden", items.length === 0);
    if (!items.length) { refs.notificationsList.innerHTML = '<div class="notification-empty">No new notifications</div>'; return; }
    refs.notificationsList.innerHTML = items.map(function (item) {
      return '<div class="notification-item"><div class="notification-item-title">' + escapeHtml(item.title || "Notification") + '</div><div class="notification-item-copy">' + escapeHtml(item.message || "") + '</div><div class="notification-item-time">' + escapeHtml(formatRelativeTime(item.createdAt)) + "</div></div>";
    }).join("");
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
    refs.securityEmailNote.textContent = "Password reset will be sent to " + (user.email || "your signed-in email") + ".";
    setAvatar(refs.headerAvatar, user.fullName || "EMS Admin", user.avatarUrl || "");
    setAvatar(refs.profileModalAvatar, user.fullName || "EMS Admin", user.avatarUrl || "");
  }

  function openNotificationsMenu() { refs.notificationsMenu.classList.add("open"); refs.notificationsMenu.setAttribute("aria-hidden", "false"); refs.notificationsTrigger.setAttribute("aria-expanded", "true"); closeProfileMenu(); }
  function closeNotificationsMenu() { refs.notificationsMenu.classList.remove("open"); refs.notificationsMenu.setAttribute("aria-hidden", "true"); refs.notificationsTrigger.setAttribute("aria-expanded", "false"); }
  function toggleNotificationsMenu() { if (refs.notificationsMenu.classList.contains("open")) { closeNotificationsMenu(); } else { openNotificationsMenu(); } }
  function openProfileMenu() { refs.profileMenu.classList.add("open"); refs.profileMenu.setAttribute("aria-hidden", "false"); refs.profileTrigger.setAttribute("aria-expanded", "true"); closeNotificationsMenu(); }
  function closeProfileMenu() { refs.profileMenu.classList.remove("open"); refs.profileMenu.setAttribute("aria-hidden", "true"); refs.profileTrigger.setAttribute("aria-expanded", "false"); }
  function toggleProfileMenu() { if (refs.profileMenu.classList.contains("open")) { closeProfileMenu(); } else { openProfileMenu(); } }
  function openProfileModal() { refs.profileModal.classList.add("open"); refs.profileModal.setAttribute("aria-hidden", "false"); closeProfileMenu(); }
  function closeProfileModal() { refs.profileModal.classList.remove("open"); refs.profileModal.setAttribute("aria-hidden", "true"); }

  function renderTabs() {
    refs.tabs.forEach(function (button) {
      const active = button.getAttribute("data-tab") === state.activeTab;
      button.classList.toggle("active", active);
    });
    refs.approvalsSection.classList.toggle("active", state.activeTab === "approvals");
    refs.securitySection.classList.toggle("active", state.activeTab === "security");
  }

  function renderPendingApprovals() {
    if (!state.pendingUsers.length) {
      refs.pendingList.innerHTML = '<div class="empty-state">No pending signups right now. New teacher and student requests will appear here for approval.</div>';
      return;
    }

    refs.pendingList.innerHTML = state.pendingUsers.map(function (user) {
      return [
        '<article class="approval-item">',
        '<div>',
        '<div class="approval-name">' + escapeHtml(user.fullName || "Pending User") + '</div>',
        '<div class="approval-meta">' + escapeHtml(user.email || "") + '<br/>Requested role: ' + escapeHtml(formatRole(user.role)) + "</div>",
        "</div>",
        '<div><select class="approval-select" data-role-select="' + escapeHtml(user.id) + '">',
        ['student', 'teacher', 'admin'].map(function (role) {
          return '<option value="' + role + '"' + (role === user.role ? " selected" : "") + '>' + formatRole(role) + "</option>";
        }).join(""),
        "</select></div>",
        '<div class="approval-actions"><button class="btn-primary" type="button" data-approve="' + escapeHtml(user.id) + '">Approve</button><button class="btn-danger" type="button" data-reject="' + escapeHtml(user.id) + '">Reject</button></div>',
        "</article>"
      ].join("");
    }).join("");
  }

  async function loadPendingUsers() {
    const payload = await apiRequest("/users?approvalStatus=pending");
    state.pendingUsers = Array.isArray(payload.items) ? payload.items : [];
    renderPendingApprovals();
  }

  async function updateApproval(userId, approvalStatus) {
    if (state.isSaving) {
      return;
    }
    const select = refs.pendingList.querySelector('[data-role-select="' + userId + '"]');
    const role = select ? select.value : "student";

    state.isSaving = true;
    try {
      await apiRequest("/users/" + userId + "/approval", {
        method: "PUT",
        body: {
          role: role,
          approvalStatus: approvalStatus
        }
      });
      showMessage(approvalStatus === "approved" ? "User approved and role assigned successfully." : "User request rejected successfully.", "success");
      await loadPendingUsers();
    } catch (error) {
      showMessage(error.message || "Approval update failed.", "error");
    } finally {
      state.isSaving = false;
    }
  }

  async function sendPasswordReset() {
    if (!state.user) {
      return;
    }
    try {
      await publicRequest("/auth/password-reset/request", { email: state.user.email });
      showMessage("Password reset email sent successfully.", "success");
    } catch (error) {
      showMessage(error.message || "Could not send password reset email.", "error");
    }
  }

  async function confirmPasswordReset() {
    if (!state.user) {
      return;
    }

    const confirmationCode = refs.passwordResetCode.value.trim();
    const password = refs.passwordResetNew.value;
    if (!confirmationCode || !password) {
      showMessage("Enter the verification code and your new password first.", "error");
      return;
    }

    try {
      await publicRequest("/auth/password-reset/confirm", {
        email: state.user.email,
        confirmationCode: confirmationCode,
        password: password
      });
      refs.passwordResetCode.value = "";
      refs.passwordResetNew.value = "";
      showMessage("Password updated successfully. Use the new password on your next sign-in.", "success");
    } catch (error) {
      showMessage(error.message || "Password update failed.", "error");
    }
  }

  async function loadPage() {
    try {
      const user = await apiRequest("/users/me");
      if (String(user.role || "").toLowerCase() !== "admin") {
        throw new Error("Only admin users can access Settings.");
      }
      hydrateUser(user);
      await loadPendingUsers();
      clearMessage();
    } catch (error) {
      if (error.statusCode === 401 || error.statusCode === 403 || error.message === "Missing session") {
        clearTokens();
        window.location.assign(getUiUrl(signInPath));
        return;
      }
      showMessage(error.message || "Settings could not finish loading.", "error");
    }
  }

  if (refs.menuButton) { refs.menuButton.addEventListener("click", function () { refs.sidebar.classList.toggle("open"); }); }
  if (refs.logoutButton) { refs.logoutButton.addEventListener("click", function () { clearTokens(); window.location.assign(getUiUrl(signInPath)); }); }
  refs.tabs.forEach(function (button) { button.addEventListener("click", function () { state.activeTab = button.getAttribute("data-tab"); renderTabs(); }); });
  refs.pendingList.addEventListener("click", function (event) {
    const approveButton = event.target.closest("[data-approve]");
    const rejectButton = event.target.closest("[data-reject]");
    if (approveButton) { updateApproval(approveButton.getAttribute("data-approve"), "approved"); }
    if (rejectButton) { updateApproval(rejectButton.getAttribute("data-reject"), "rejected"); }
  });
  refs.passwordResetSend.addEventListener("click", sendPasswordReset);
  refs.passwordResetConfirm.addEventListener("click", confirmPasswordReset);
  refs.notificationsTrigger.addEventListener("click", function (event) { event.stopPropagation(); toggleNotificationsMenu(); });
  refs.profileTrigger.addEventListener("click", function (event) { event.stopPropagation(); toggleProfileMenu(); });
  refs.profileViewButton.addEventListener("click", openProfileModal);
  refs.profileModalClose.addEventListener("click", closeProfileModal);
  refs.profileModalDone.addEventListener("click", closeProfileModal);
  refs.profileModal.addEventListener("click", function (event) { if (event.target === refs.profileModal) { closeProfileModal(); } });
  document.addEventListener("click", function () { closeNotificationsMenu(); closeProfileMenu(); });
  document.addEventListener("keydown", function (event) { if (event.key === "Escape") { closeNotificationsMenu(); closeProfileMenu(); closeProfileModal(); } });

  renderTabs();
  loadPage();
})();
