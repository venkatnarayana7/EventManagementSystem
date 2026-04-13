(function () {
  const teacher = window.EMS_TEACHER;
  const state = {
    user: null,
    event: null,
    registrations: []
  };

  function renderMissing(message) {
    const root = document.getElementById("teacher-page-content");
    if (!root) {
      return;
    }
    root.hidden = false;
    root.innerHTML = '<div class="teacher-empty-state teacher-card"><span class="material-symbols-outlined" style="font-size:38px;color:var(--text-muted);">event_busy</span><div>' + teacher.escapeHtml(message) + '</div><a class="teacher-btn" href="teacher-my-events.html">Go to My Events</a></div>';
  }

  function renderHero() {
    const root = document.getElementById("teacher-event-hero");
    const event = state.event;
    if (!root || !event) {
      return;
    }
    root.innerHTML = [
      '<div class="teacher-hero-image"><img alt="' + teacher.escapeHtml(event.title) + '" src="' + teacher.escapeHtml(event.image || "") + '" />',
      '<div class="teacher-hero-overlay">',
      '<div><div class="teacher-meta-chip" style="background:rgba(255,255,255,0.16);border-color:rgba(255,255,255,0.22);color:#fff;">' + teacher.escapeHtml(event.category) + "</div>",
      '<div class="teacher-hero-title" style="margin-top:14px;">' + teacher.escapeHtml(event.title) + "</div>",
      '<div class="teacher-event-meta" style="margin-top:10px;color:rgba(255,255,255,0.88);"><span class="material-symbols-outlined" style="font-size:14px;">calendar_month</span><span>' + teacher.escapeHtml(teacher.formatDate(event.date)) + "</span><span>&bull;</span><span>" + teacher.escapeHtml(teacher.formatTime(event.startTime)) + " - " + teacher.escapeHtml(teacher.formatTime(event.endTime)) + '</span><span>&bull;</span><span>' + teacher.escapeHtml(event.venue) + "</span></div></div>",
      '<div style="display:grid;gap:10px;justify-items:end;"><span class="teacher-badge ' + teacher.escapeHtml(teacher.mapEventStatus(event.status)) + '" style="background:rgba(255,255,255,0.16);color:#fff;border:1px solid rgba(255,255,255,0.2);">' + teacher.escapeHtml(teacher.getStatusLabel(event.status)) + "</span>",
      '<div style="font-size:26px;font-weight:700;">' + teacher.escapeHtml(teacher.formatPrice(event.price)) + "</div></div>",
      "</div></div>"
    ].join("");
  }

  function renderActionBar() {
    const root = document.getElementById("teacher-event-action-bar");
    if (!root || !state.event) {
      return;
    }
    const ownEvent = state.user && state.event.createdBy === state.user.id;
    const joinedStaff = Array.isArray(state.event.assignedStaff) && state.event.assignedStaff.some(function (item) {
      return item && item.id === state.user.id;
    });
    if (!ownEvent) {
      root.innerHTML = [
        '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;">',
        '<div style="font-size:13px;color:var(--text-secondary);">' + teacher.escapeHtml(joinedStaff ? "You joined this event as staff. Attendance access is active for you." : "You are viewing a shared approved event from the same live database the admin portal uses.") + '</div>',
        '<div style="display:flex;gap:10px;flex-wrap:wrap;">',
        joinedStaff
          ? '<a class="teacher-btn" href="teacher-attendance.html?event=' + encodeURIComponent(state.event.id) + '"><span class="material-symbols-outlined" style="font-size:18px;">fact_check</span><span>Open Attendance</span></a>'
          : '<button class="teacher-btn" type="button" id="teacher-join-staff-button"><span class="material-symbols-outlined" style="font-size:18px;">group_add</span><span>Join as Staff</span></button>',
        '</div></div>'
      ].join("");
      const joinButton = document.getElementById("teacher-join-staff-button");
      if (joinButton) {
        joinButton.addEventListener("click", joinAsStaff);
      }
      return;
    }
    root.innerHTML = [
      '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;">',
      '<div style="font-size:13px;color:var(--text-secondary);">This event syncs across teacher and admin portals in real time.</div>',
      '<div style="display:flex;gap:10px;flex-wrap:wrap;">',
      '<a class="teacher-btn-outline" href="teacher-students.html?event=' + encodeURIComponent(state.event.id) + '"><span class="material-symbols-outlined" style="font-size:18px;">groups</span><span>Registered Students</span></a>',
      '<a class="teacher-btn" href="teacher-attendance.html?event=' + encodeURIComponent(state.event.id) + '"><span class="material-symbols-outlined" style="font-size:18px;">fact_check</span><span>Mark Attendance</span></a>',
      "</div></div>"
    ].join("");
  }

  function renderDetails() {
    const root = document.getElementById("teacher-event-details-card");
    if (!root || !state.event) {
      return;
    }
    root.innerHTML = [
      '<div class="teacher-card-head"><div class="teacher-card-title">Event Details</div></div>',
      '<div class="teacher-form-grid">',
      '<div class="teacher-field"><label>Date</label><div class="teacher-field-value">' + teacher.escapeHtml(teacher.formatDate(state.event.date)) + "</div></div>",
      '<div class="teacher-field"><label>Time</label><div class="teacher-field-value">' + teacher.escapeHtml(teacher.formatTime(state.event.startTime) + " - " + teacher.formatTime(state.event.endTime)) + "</div></div>",
      '<div class="teacher-field"><label>Venue</label><div class="teacher-field-value">' + teacher.escapeHtml(state.event.venue) + "</div></div>",
      '<div class="teacher-field"><label>Department</label><div class="teacher-field-value">' + teacher.escapeHtml(state.event.department || "Open") + "</div></div>",
      '<div class="teacher-field"><label>Registration Deadline</label><div class="teacher-field-value">' + teacher.escapeHtml(state.event.registrationDeadline ? teacher.formatDate(state.event.registrationDeadline) : "Not set") + "</div></div>",
      '<div class="teacher-field"><label>Capacity</label><div class="teacher-field-value">' + teacher.escapeHtml(String(state.event.maxCapacity)) + "</div></div>",
      '<div class="teacher-field full"><label>Description</label><div class="teacher-field-value" style="min-height:96px;">' + teacher.escapeHtml(state.event.description || "No description added yet.") + "</div></div>",
      '<div class="teacher-field full"><label>Tags</label><div class="teacher-field-value">' + (state.event.tags.length ? state.event.tags.map(function (tag) {
        return '<span class="teacher-meta-chip" style="margin-right:8px;">' + teacher.escapeHtml(tag) + "</span>";
      }).join("") : "No tags added") + "</div></div>",
      "</div>"
    ].join("");
  }

  function renderStaffCard() {
    const root = document.getElementById("teacher-staff-card");
    if (!root || !state.event) {
      return;
    }
    const assignedStaff = Array.isArray(state.event.assignedStaff) ? state.event.assignedStaff : [];
    root.innerHTML = [
      '<div class="teacher-card-head"><div class="teacher-card-title">Ownership</div></div>',
      '<div class="teacher-list">',
      '<div class="teacher-event-row" style="border-bottom:0;">',
      '<span class="teacher-avatar">' + teacher.escapeHtml(teacher.getInitials(state.event.organizerName || "Teacher")) + '</span>',
      '<div class="teacher-event-copy"><div class="teacher-event-title">' + teacher.escapeHtml(state.event.organizerName || "Teacher") + "</div><div class=\"teacher-card-sub\">Event owner</div></div>",
      '<span class="teacher-badge approved">Owner</span>',
      "</div>",
      assignedStaff.map(function (item) {
        return '<div class="teacher-event-row" style="border-bottom:0;"><span class="teacher-avatar">' + teacher.escapeHtml(teacher.getInitials(item.fullName || "Teacher")) + '</span><div class="teacher-event-copy"><div class="teacher-event-title">' + teacher.escapeHtml(item.fullName || "Teacher") + '</div><div class="teacher-card-sub">' + teacher.escapeHtml(item.email || "Staff member") + '</div></div><span class="teacher-badge pending">Staff</span></div>';
      }).join(""),
      "</div>",
      '<div class="teacher-divider"></div>',
      '<div class="teacher-card-sub">' + teacher.escapeHtml(assignedStaff.length ? "Staff assignments update live for the admin portal too." : "No teacher has joined this event as staff yet.") + '</div>'
    ].join("");
  }

  async function joinAsStaff() {
    try {
      const payload = await teacher.apiRequest("/events/" + encodeURIComponent(state.event.id) + "/staff/join", {
        method: "PUT"
      });
      state.event = teacher.normalizeEvent(payload);
      teacher.pushNotification("Staff joined", state.event.title + " is now assigned to you.");
      teacher.showMessage("You joined this event as staff.", "success");
      renderActionBar();
      renderStaffCard();
      renderQuickActions();
    } catch (error) {
      teacher.showMessage(error.message || "Could not join this event as staff yet.", "error");
    }
  }

  function renderRegistrationCard() {
    const root = document.getElementById("teacher-registration-card");
    if (!root || !state.event) {
      return;
    }
    const seats = Math.max(0, Number(state.event.maxCapacity || 0) - Number(state.event.registrations || 0));
    const ratio = Math.min(100, Math.round((Number(state.event.registrations || 0) / Math.max(1, Number(state.event.maxCapacity || 0))) * 100));
    root.innerHTML = [
      '<div class="teacher-card-head"><div class="teacher-card-title">Registration Snapshot</div></div>',
      '<div style="font-size:36px;font-weight:700;">' + teacher.escapeHtml(String(state.event.registrations || 0)) + "</div>",
      '<div class="teacher-card-sub">Registered attendees</div>',
      '<div style="margin-top:14px;display:flex;align-items:center;justify-content:space-between;gap:10px;"><span class="teacher-meta-chip">' + seats + " seats left</span><span class=\"teacher-meta-chip\">" + ratio + "% filled</span></div>",
      '<div class="teacher-progress" style="width:100%;height:8px;margin-top:14px;"><span style="width:' + ratio + '%;"></span></div>',
      '<div class="teacher-divider"></div>',
      '<div class="teacher-card-sub">' + (state.registrations.length ? state.registrations.length + " live registration records loaded for this event." : "Registration details will appear here when available.") + "</div>"
    ].join("");
  }

  function renderQuickActions() {
    const root = document.getElementById("teacher-quick-actions");
    if (!root || !state.event) {
      return;
    }
    const canOpenAttendance = (state.user && state.event.createdBy === state.user.id) || (Array.isArray(state.event.assignedStaff) && state.event.assignedStaff.some(function (item) {
      return item && item.id === state.user.id;
    }));
    root.innerHTML = [
      '<div class="teacher-card-head"><div class="teacher-card-title">Quick Actions</div></div>',
      '<div class="teacher-grid" style="gap:10px;">',
      '<a class="teacher-btn-outline" href="teacher-my-events.html">Back to My Events</a>',
      '<a class="teacher-btn-outline" href="teacher-browse-events.html">Browse Shared Events</a>',
      (canOpenAttendance
        ? '<a class="teacher-btn" href="teacher-attendance.html?event=' + encodeURIComponent(state.event.id) + '">Open Attendance</a>'
        : '<button class="teacher-btn" type="button" id="teacher-quick-join-staff">Join as Staff</button>'),
      "</div>"
    ].join("");
    const quickJoinButton = document.getElementById("teacher-quick-join-staff");
    if (quickJoinButton) {
      quickJoinButton.addEventListener("click", joinAsStaff);
    }
  }

  async function loadPage() {
    try {
      teacher.clearMessage();
      if (!document.querySelector(".teacher-shell")) {
        teacher.createShell();
      }
      const user = await teacher.loadTeacherUser();
      if (!user) {
        return;
      }
      state.user = user;
      const eventId = teacher.getQueryParam("event");
      if (!eventId) {
        renderMissing("Select an event first.");
        return;
      }
      const eventPayload = await teacher.retryApi("/events/" + encodeURIComponent(eventId), 3, 800);
      state.event = teacher.normalizeEvent(eventPayload);
      const canLoadRegistrations = state.event.createdBy === user.id || (Array.isArray(state.event.assignedStaff) && state.event.assignedStaff.some(function (item) {
        return item && item.id === user.id;
      }));
      if (canLoadRegistrations) {
        const registrationsPayload = await teacher.retryApi("/events/" + encodeURIComponent(eventId) + "/registrations", 3, 800);
        state.registrations = Array.isArray(registrationsPayload.items) ? registrationsPayload.items : [];
      } else {
        state.registrations = [];
      }
      renderHero();
      renderActionBar();
      renderDetails();
      renderStaffCard();
      renderRegistrationCard();
      renderQuickActions();
    } catch (error) {
      teacher.showMessage(error.message || "Event detail could not finish loading yet.", "error");
    }
  }

  if (window.EMS_REALTIME) {
    window.EMS_REALTIME.ensureConnection("teacher");
    window.EMS_REALTIME.onMessage(function (message) {
      const type = String(message && message.type || "");
      if (["event_approved", "new_registration", "seat_updated", "attendance_submitted", "staff_joined", "registration_cancelled"].includes(type)) {
        loadPage();
      }
    });
  }
  loadPage();
  window.setInterval(loadPage, 15000);
})();
