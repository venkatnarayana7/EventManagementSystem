(function () {
  const teacher = window.EMS_TEACHER;
  const prefKey = "ems.teacher.profile.preferences";
  const state = {
    user: null,
    events: [],
    preferences: {
      eventAlerts: true,
      approvalUpdates: true,
      weeklyDigest: false
    }
  };

  function loadPreferences() {
    try {
      const raw = window.localStorage.getItem(prefKey);
      const parsed = raw ? JSON.parse(raw) : null;
      if (parsed && typeof parsed === "object") {
        state.preferences = Object.assign({}, state.preferences, parsed);
      }
    } catch (_error) {
      return;
    }
  }

  function savePreferences() {
    window.localStorage.setItem(prefKey, JSON.stringify(state.preferences));
  }

  function renderSummary() {
    const root = document.getElementById("teacher-profile-summary");
    if (!root || !state.user) {
      return;
    }
    const approved = state.events.filter(function (event) { return teacher.mapEventStatus(event.status) === "approved"; }).length;
    root.innerHTML = [
      '<div style="display:grid;justify-items:center;gap:16px;">',
      '<span class="teacher-avatar large" id="teacher-profile-large-avatar"></span>',
      '<div><div style="font-size:22px;font-weight:700;">' + teacher.escapeHtml(state.user.fullName || "Teacher") + "</div><div class=\"teacher-card-sub\">" + teacher.escapeHtml(state.user.email || "") + "</div></div>",
      '<div class="teacher-grid" style="width:100%;gap:10px;">',
      '<div class="teacher-summary-chip" style="justify-content:center;">Profile ID: ' + teacher.escapeHtml(state.user.profileId || "") + "</div>",
      '<div class="teacher-summary-chip" style="justify-content:center;">' + state.events.length + " total events</div>",
      '<div class="teacher-summary-chip" style="justify-content:center;">' + approved + " approved events</div>",
      "</div></div>"
    ].join("");
    teacher.setAvatar(document.getElementById("teacher-profile-large-avatar"), state.user.fullName || "Teacher", state.user.avatarUrl || "");
  }

  function renderForm() {
    const root = document.getElementById("teacher-profile-form-card");
    if (!root || !state.user) {
      return;
    }
    root.innerHTML = [
      '<div class="teacher-card-head"><div class="teacher-card-title">Profile Details</div></div>',
      '<form class="teacher-form-grid" id="teacher-profile-form">',
      '<div class="teacher-field"><label>Full Name</label><input name="fullName" value="' + teacher.escapeHtml(state.user.fullName || "") + '" /></div>',
      '<div class="teacher-field"><label>Email</label><div class="teacher-field-value">' + teacher.escapeHtml(state.user.email || "") + "</div></div>",
      '<div class="teacher-field"><label>Role</label><div class="teacher-field-value">' + teacher.escapeHtml(String(state.user.role || "teacher").toUpperCase()) + "</div></div>",
      '<div class="teacher-field"><label>Department</label><input name="department" value="' + teacher.escapeHtml(state.user.department || "") + '" placeholder="Department" /></div>',
      '<div class="teacher-field full"><label>Avatar URL</label><input name="avatarUrl" value="' + teacher.escapeHtml(state.user.avatarUrl || "") + '" placeholder="https://..." /></div>',
      '<div class="teacher-field full"><button class="teacher-btn" type="submit">Save Profile</button></div>',
      "</form>"
    ].join("");

    const form = document.getElementById("teacher-profile-form");
    if (form) {
      form.addEventListener("submit", async function (event) {
        event.preventDefault();
        const formData = new FormData(form);
        try {
          teacher.clearMessage();
          const updated = await teacher.apiRequest("/users/me", {
            method: "PUT",
            body: {
              fullName: String(formData.get("fullName") || "").trim(),
              department: String(formData.get("department") || "").trim() || null,
              avatarUrl: String(formData.get("avatarUrl") || "").trim() || null
            }
          });
          state.user = updated;
          teacher.hydrateShellUser(updated);
          renderSummary();
          renderForm();
          teacher.showMessage("Profile updated successfully.", "success");
        } catch (error) {
          teacher.showMessage(error.message || "Profile update failed.", "error");
        }
      });
    }
  }

  function renderNotifications() {
    const root = document.getElementById("teacher-profile-notifications");
    if (!root) {
      return;
    }
    root.innerHTML = [
      '<div class="teacher-card-head"><div class="teacher-card-title">Notification Preferences</div></div>',
      [
        ["eventAlerts", "Event alerts", "Get notified when your event status changes."],
        ["approvalUpdates", "Approval updates", "Receive admin approval or rejection updates."],
        ["weeklyDigest", "Weekly digest", "Receive a weekly summary of your events."]
      ].map(function (item) {
        const on = state.preferences[item[0]] ? " on" : "";
        return '<button class="teacher-toggle-row" type="button" data-toggle-pref="' + item[0] + '"><span class="teacher-toggle-copy"><span class="teacher-toggle-title">' + item[1] + '</span><span class="teacher-toggle-sub">' + item[2] + '</span></span><span class="teacher-switch' + on + '"></span></button>';
      }).join("")
    ].join("");
  }

  async function loadPage() {
    try {
      teacher.clearMessage();
      loadPreferences();
      if (!document.querySelector(".teacher-shell")) {
        teacher.createShell();
      }
      const user = await teacher.loadTeacherUser();
      if (!user) {
        return;
      }
      state.user = user;
      const payload = await teacher.retryApi("/events?mine=true", 3, 800);
      state.events = (payload.items || []).map(teacher.normalizeEvent);
      renderSummary();
      renderForm();
      renderNotifications();
    } catch (error) {
      teacher.showMessage(error.message || "Teacher profile could not finish loading yet.", "error");
    }
  }

  document.addEventListener("click", function (event) {
    const toggle = event.target.closest("[data-toggle-pref]");
    if (!toggle) {
      return;
    }
    const key = toggle.getAttribute("data-toggle-pref");
    state.preferences[key] = !state.preferences[key];
    savePreferences();
    renderNotifications();
  });

  loadPage();
})();
