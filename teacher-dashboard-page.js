(function () {
  const teacher = window.EMS_TEACHER;
  const state = {
    user: null,
    events: [],
    ownEvents: [],
    staffInvites: [],
    attendanceSummary: new Map(),
    ownEventsError: null,
    visibleMonth: (function () {
      const now = new Date();
      return new Date(now.getFullYear(), now.getMonth(), 1);
    })(),
    selectedCalendarDate: null
  };
  const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  function isTeacherOwnedEvent(event) {
    return Boolean(state.user) && (event.createdBy === state.user.id);
  }

  function isTeacherAssignedEvent(event) {
    return Boolean(state.user) && Array.isArray(event.assignedStaff) && event.assignedStaff.some(function (item) {
      return item && item.id === state.user.id;
    });
  }

  function buildStaffInviteEvents() {
    const todayKey = teacher.getLocalDateKey(new Date());
    return state.events.filter(function (event) {
      const status = teacher.mapEventStatus(event.status);
      return (
        status === "approved" &&
        !isTeacherOwnedEvent(event) &&
        !isTeacherAssignedEvent(event) &&
        String(event.date || "") >= todayKey
      );
    }).sort(function (left, right) {
      return (left.date + left.startTime).localeCompare(right.date + right.startTime);
    });
  }

  function getAttendanceCandidateEvents() {
    const todayKey = teacher.getLocalDateKey(new Date());
    return state.events.filter(function (event) {
      return (
        teacher.mapEventStatus(event.status) === "approved" &&
        (isTeacherOwnedEvent(event) || isTeacherAssignedEvent(event)) &&
        String(event.date || "") <= todayKey
      );
    });
  }

  async function joinStaffInvite(eventId) {
    try {
      const payload = await teacher.apiRequest("/events/" + encodeURIComponent(eventId) + "/staff/join", {
        method: "PUT"
      });
      const updated = teacher.normalizeEvent(payload);
      state.events = state.events.map(function (event) {
        return event.id === updated.id ? updated : event;
      });
      state.staffInvites = buildStaffInviteEvents();
      renderInvites();
      renderUpcomingEvents();
      renderOverview();
      renderCalendar();
      renderStatCards();
      await loadAttendancePending();
      teacher.pushNotification("Staff joined", updated.title + " is now assigned to you.");
      teacher.showMessage("You joined this event as staff.", "success");
    } catch (error) {
      teacher.showMessage(error.message || "Could not join this staff invite yet.", "error");
    }
  }

  function renderStatCards() {
    const root = document.getElementById("teacher-stat-grid");
    if (!root) {
      return;
    }

    const upcoming = teacher.upcomingEvents(state.events);
    const approved = state.ownEvents.filter(function (event) {
      return teacher.mapEventStatus(event.status) === "approved";
    });
    const pending = state.ownEvents.filter(function (event) {
      return teacher.mapEventStatus(event.status) === "pending";
    });
    const attendancePending = Array.from(state.attendanceSummary.values()).filter(function (item) {
      return item.pending > 0;
    });

    const items = [
      { icon: "event", color: "#eef2ff", iconColor: "#4338ca", label: "My Events", value: state.ownEvents.length, meta: state.ownEventsError ? "Could not load your private events" : approved.length + " approved" },
      { icon: "upcoming", color: "#fef3c7", iconColor: "#b45309", label: "Upcoming Events", value: upcoming.length, meta: "Shared live events" },
      { icon: "pending_actions", color: "#fff7ed", iconColor: "#c2410c", label: "Pending Approval", value: pending.length, meta: "Your submissions" },
      { icon: "checklist", color: "#ecfdf5", iconColor: "#047857", label: "Attendance Pending", value: attendancePending.length, meta: "Today and past live events" }
    ];

    root.innerHTML = items.map(function (item) {
      return [
        '<article class="teacher-card teacher-stat-card">',
        '<div class="teacher-stat-top">',
        '<span class="teacher-stat-icon" style="background:' + item.color + ';color:' + item.iconColor + ';">',
        '<span class="material-symbols-outlined" style="font-size:18px;">' + item.icon + "</span>",
        "</span>",
        '<div class="teacher-stat-label">' + teacher.escapeHtml(item.label) + "</div>",
        "</div>",
        '<div class="teacher-stat-value">' + teacher.escapeHtml(String(item.value)) + "</div>",
        '<div class="teacher-stat-trend">' + teacher.escapeHtml(item.meta) + "</div>",
        "</article>"
      ].join("");
    }).join("");
  }

  function renderUpcomingEvents() {
    const root = document.getElementById("teacher-upcoming-events");
    if (!root) {
      return;
    }

    const items = (state.selectedCalendarDate
      ? state.events.filter(function (event) { return String(event.date || "") === state.selectedCalendarDate; })
      : teacher.upcomingEvents(state.events)
    ).slice(0, 5);
    if (!items.length) {
      root.innerHTML = '<div class="teacher-empty-state"><span class="material-symbols-outlined" style="font-size:32px;color:var(--text-muted);">calendar_month</span><div>' + teacher.escapeHtml(state.selectedCalendarDate ? "No events found on the selected date." : "No upcoming events yet.") + '</div></div>';
      return;
    }

    root.innerHTML = items.map(function (event) {
      return [
        '<a class="teacher-event-row" href="teacher-event-detail.html?event=' + encodeURIComponent(event.id) + '">',
        '<img class="teacher-event-thumb" alt="' + teacher.escapeHtml(event.title) + '" src="' + teacher.escapeHtml(event.image || "") + '" />',
        '<div class="teacher-event-copy">',
        '<div class="teacher-event-title">' + teacher.escapeHtml(event.title) + "</div>",
        '<div class="teacher-event-meta"><span class="material-symbols-outlined" style="font-size:14px;">calendar_month</span><span>' + teacher.escapeHtml(teacher.formatShortDate(event.date)) + "</span><span>&bull;</span><span>" + teacher.escapeHtml(teacher.formatTime(event.startTime)) + "</span></div>",
        '<div class="teacher-event-location"><span class="material-symbols-outlined" style="font-size:14px;color:var(--accent-red);">location_on</span><span>' + teacher.escapeHtml(event.venue) + "</span></div>",
        "</div>",
        '<div class="teacher-side-meta"><span class="teacher-badge ' + teacher.escapeHtml(teacher.mapEventStatus(event.status)) + '">' + teacher.escapeHtml(teacher.getStatusLabel(event.status)) + "</span></div>",
        "</a>"
      ].join("");
    }).join("");
  }

  function renderOverview() {
    const root = document.getElementById("teacher-overview-card");
    if (!root) {
      return;
    }

    const counts = {
      approved: state.events.filter(function (event) { return teacher.mapEventStatus(event.status) === "approved"; }).length,
      pending: state.ownEvents.filter(function (event) { return teacher.mapEventStatus(event.status) === "pending"; }).length,
      draft: state.ownEvents.filter(function (event) { return teacher.mapEventStatus(event.status) === "draft"; }).length,
      rejected: state.ownEvents.filter(function (event) { return teacher.mapEventStatus(event.status) === "rejected"; }).length
    };
    const total = Math.max(1, state.events.length);
    const approvedAngle = Math.round((counts.approved / total) * 360);
    const pendingAngle = Math.round((counts.pending / total) * 360);
    const draftAngle = Math.round((counts.draft / total) * 360);
    const gradient = "conic-gradient(#1a1a2e 0deg " + approvedAngle + "deg, #f59e0b " + approvedAngle + "deg " + (approvedAngle + pendingAngle) + "deg, #d1d5db " + (approvedAngle + pendingAngle) + "deg " + (approvedAngle + pendingAngle + draftAngle) + "deg, #ef4444 " + (approvedAngle + pendingAngle + draftAngle) + "deg 360deg)";

    root.innerHTML = [
      '<div style="display:grid;justify-items:center;gap:14px;">',
      '<div style="width:180px;height:180px;border-radius:50%;background:' + gradient + ';display:grid;place-items:center;">',
      '<div style="width:112px;height:112px;border-radius:50%;background:#fff;display:grid;place-items:center;text-align:center;">',
      '<div><div style="font-size:28px;font-weight:700;">' + teacher.escapeHtml(String(state.events.length)) + "</div>",
      '<div style="font-size:11px;color:var(--text-muted);">Shared Events</div></div></div></div>',
      "</div>",
      '<div class="teacher-grid">',
      [
        ["Approved", counts.approved, "#1a1a2e"],
        ["Pending", counts.pending, "#f59e0b"],
        ["Draft", counts.draft, "#d1d5db"],
        ["Rejected", counts.rejected, "#ef4444"]
      ].map(function (item) {
        return '<div style="display:flex;align-items:center;justify-content:space-between;gap:16px;padding:12px 14px;border:1px solid var(--border-light);border-radius:12px;background:var(--bg-card-alt);"><div style="display:flex;align-items:center;gap:10px;"><span style="width:10px;height:10px;border-radius:50%;background:' + item[2] + ';"></span><span style="font-size:13px;font-weight:600;">' + item[0] + '</span></div><strong style="font-size:14px;">' + item[1] + "</strong></div>";
      }).join(""),
      "</div>"
    ].join("");
  }

  function renderInvites() {
    const count = document.getElementById("teacher-invite-count");
    const list = document.getElementById("teacher-invites-list");
    if (!count || !list) {
      return;
    }
    const items = state.staffInvites.slice(0, 5);
    count.textContent = String(items.length);
    if (!items.length) {
      list.innerHTML = '<div class="teacher-empty-state" style="padding:24px 12px;"><span class="material-symbols-outlined" style="font-size:30px;color:var(--text-muted);">mail</span><div>No staff invites right now.</div></div>';
      return;
    }
    list.innerHTML = items.map(function (event) {
      const isToday = String(event.date || "") === teacher.getLocalDateKey(new Date());
      return [
        '<div class="teacher-event-row">',
        '<img class="teacher-event-thumb" alt="' + teacher.escapeHtml(event.title) + '" src="' + teacher.escapeHtml(event.image || "") + '" />',
        '<div class="teacher-event-copy">',
        '<div class="teacher-event-title">' + teacher.escapeHtml(event.title) + "</div>",
        '<div class="teacher-event-meta"><span class="material-symbols-outlined" style="font-size:14px;">calendar_month</span><span>' + teacher.escapeHtml(teacher.formatShortDate(event.date)) + "</span><span>&bull;</span><span>" + teacher.escapeHtml(teacher.formatTime(event.startTime)) + "</span></div>",
        '<div class="teacher-event-location"><span class="material-symbols-outlined" style="font-size:14px;color:var(--accent-red);">groups</span><span>' + teacher.escapeHtml(isToday ? "Staff invite for today" : "Staff invite available") + "</span></div>",
        "</div>",
        '<div class="teacher-side-meta" style="display:grid;gap:8px;justify-items:end;">',
        '<span class="teacher-badge approved">Invite</span>',
        '<button class="teacher-btn-outline" type="button" data-join-staff="' + teacher.escapeHtml(event.id) + '">Join</button>',
        '<a class="teacher-link" href="teacher-event-detail.html?event=' + encodeURIComponent(event.id) + '">View</a>',
        "</div>",
        "</div>"
      ].join("");
    }).join("");
  }

  function renderAttendancePending() {
    const count = document.getElementById("teacher-attendance-count");
    const list = document.getElementById("teacher-attendance-list");
    if (!count || !list) {
      return;
    }

    const todayKey = teacher.getLocalDateKey(new Date());
    const items = getAttendanceCandidateEvents().filter(function (event) {
      const summary = state.attendanceSummary.get(event.id);
      return summary && summary.pending > 0;
    }).slice(0, 5);

    count.textContent = String(items.length);
    if (!items.length) {
      list.innerHTML = '<div class="teacher-empty-state" style="padding:24px 12px;"><span class="material-symbols-outlined" style="font-size:30px;color:var(--text-muted);">check_circle</span><div>No pending attendance tasks.</div></div>';
      return;
    }

    list.innerHTML = items.map(function (event) {
      const summary = state.attendanceSummary.get(event.id);
      return [
        '<a class="teacher-event-row" href="teacher-attendance.html?event=' + encodeURIComponent(event.id) + '">',
        '<img class="teacher-event-thumb" alt="' + teacher.escapeHtml(event.title) + '" src="' + teacher.escapeHtml(event.image || "") + '" />',
        '<div class="teacher-event-copy">',
        '<div class="teacher-event-title">' + teacher.escapeHtml(event.title) + "</div>",
        '<div class="teacher-event-meta"><span>' + teacher.escapeHtml(String(summary.pending)) + " attendees pending</span></div>",
        '<div class="teacher-event-location"><span class="material-symbols-outlined" style="font-size:14px;color:var(--accent-red);">schedule</span><span>' + teacher.escapeHtml(String(event.date || "") === todayKey ? "Attendance ready for today" : "Mark attendance now") + "</span></div>",
        "</div>",
        '<div class="teacher-side-meta"><span class="teacher-badge pending">Pending</span></div>',
        "</a>"
      ].join("");
    }).join("");
  }

  function renderCalendar() {
    const root = document.getElementById("teacher-calendar");
    const title = document.getElementById("teacher-calendar-title");
    const subtitle = document.getElementById("teacher-calendar-subtitle");
    if (!root) {
      return;
    }
    const now = new Date();
    const year = state.visibleMonth.getFullYear();
    const month = state.visibleMonth.getMonth();
    const firstOfMonth = new Date(year, month, 1);
    const startDay = firstOfMonth.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();
    if (title) {
      title.textContent = state.visibleMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    }
    if (subtitle) {
      subtitle.textContent = state.selectedCalendarDate
        ? "Showing events on " + teacher.formatDate(state.selectedCalendarDate)
        : "Select a date to filter dashboard events.";
    }

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
        date.getFullYear() === now.getFullYear() &&
        date.getMonth() === now.getMonth() &&
        date.getDate() === now.getDate();
      const classes = ["calendar-day"];
      if (muted) {
        classes.push("muted");
      }
      if (isToday) {
        classes.push("today");
      }
      if (state.selectedCalendarDate === teacher.getLocalDateKey(date)) {
        classes.push("selected");
      }

      cells.push(
        '<button class="' + classes.join(" ") + '" type="button" data-calendar-date="' + teacher.getLocalDateKey(date) + '">' + date.getDate() + "</button>"
      );
    }
    root.innerHTML = cells.join("");
  }

  async function hydrateAttendanceSummary(events) {
    const candidates = events.slice(0, 12);
    const results = await Promise.all(candidates.map(async function (event) {
      try {
        const registrationsPayload = await teacher.apiRequest("/events/" + event.id + "/registrations");
        const attendancePayload = await teacher.apiRequest("/attendance?event_id=" + encodeURIComponent(event.id));
        const registrations = Array.isArray(registrationsPayload.items) ? registrationsPayload.items : [];
        const attendance = Array.isArray(attendancePayload.items) ? attendancePayload.items : [];
        return {
          eventId: event.id,
          pending: Math.max(0, registrations.filter(function (item) {
            return item.status !== "cancelled";
          }).length - attendance.length)
        };
      } catch (_error) {
        return { eventId: event.id, pending: 0 };
      }
    }));

    state.attendanceSummary = new Map(results.map(function (item) {
      return [item.eventId, item];
    }));
  }

  function renderSharedEventsSectionError(message) {
    const root = document.getElementById("teacher-upcoming-events");
    if (!root) {
      return;
    }
    root.innerHTML = '<div class="teacher-empty-state"><span class="material-symbols-outlined" style="font-size:30px;color:var(--accent-amber);">warning</span><div>' + teacher.escapeHtml(message) + "</div></div>";
  }

  function renderAttendanceSectionError(message) {
    const count = document.getElementById("teacher-attendance-count");
    const list = document.getElementById("teacher-attendance-list");
    if (count) {
      count.textContent = "0";
    }
    if (list) {
      list.innerHTML = '<div class="teacher-empty-state" style="padding:24px 12px;"><span class="material-symbols-outlined" style="font-size:30px;color:var(--accent-amber);">warning</span><div>' + teacher.escapeHtml(message) + "</div></div>";
    }
  }

  async function loadSharedEvents() {
    try {
      const payload = await teacher.retryApi("/events", 3, 800);
      state.events = (payload.items || []).map(teacher.normalizeEvent).filter(function (event) {
        return teacher.mapEventStatus(event.status) === "approved";
      });
      state.staffInvites = buildStaffInviteEvents();
      renderUpcomingEvents();
      renderOverview();
      renderCalendar();
      renderStatCards();
      renderInvites();
    } catch (error) {
      state.events = [];
      state.staffInvites = [];
      renderSharedEventsSectionError(error.message || "Could not load live events.");
      renderOverview();
      renderCalendar();
      renderStatCards();
      renderInvites();
    }
  }

  async function loadOwnEvents() {
    try {
      const ownPayload = await teacher.retryApi("/events?mine=true", 2, 600);
      state.ownEvents = (ownPayload.items || []).map(teacher.normalizeEvent);
      state.ownEventsError = null;
    } catch (error) {
      state.ownEvents = [];
      state.ownEventsError = error.message || "Could not load your events.";
    }
    renderStatCards();
  }

  async function loadAttendancePending() {
    try {
      await hydrateAttendanceSummary(getAttendanceCandidateEvents());
      renderAttendancePending();
    } catch (error) {
      renderAttendanceSectionError(error.message || "Could not load attendance summary.");
    }
  }

  async function loadPage() {
    teacher.clearMessage();
    if (!document.querySelector(".teacher-shell")) {
      teacher.createShell();
    }
    try {
      const user = await teacher.loadTeacherUser();
      if (!user) {
        return;
      }
      state.user = user;
    } catch (error) {
      teacher.showMessage(error.message || "Teacher session could not be restored.", "error");
      return;
    }

    await Promise.allSettled([
      loadSharedEvents(),
      loadOwnEvents()
    ]);
    await loadAttendancePending();
  }

  document.addEventListener("click", function (event) {
    const joinButton = event.target.closest("[data-join-staff]");
    const calendarDateButton = event.target.closest("[data-calendar-date]");
    if (calendarDateButton) {
      const selectedDate = calendarDateButton.getAttribute("data-calendar-date");
      state.selectedCalendarDate = state.selectedCalendarDate === selectedDate ? null : selectedDate;
      renderCalendar();
      renderUpcomingEvents();
      return;
    }
    if (joinButton) {
      joinStaffInvite(joinButton.getAttribute("data-join-staff"));
    }
  });

  const prevButton = document.getElementById("teacher-calendar-prev");
  const nextButton = document.getElementById("teacher-calendar-next");
  if (prevButton) {
    prevButton.addEventListener("click", function () {
      state.visibleMonth = new Date(state.visibleMonth.getFullYear(), state.visibleMonth.getMonth() - 1, 1);
      renderCalendar();
    });
  }
  if (nextButton) {
    nextButton.addEventListener("click", function () {
      state.visibleMonth = new Date(state.visibleMonth.getFullYear(), state.visibleMonth.getMonth() + 1, 1);
      renderCalendar();
    });
  }

  if (window.EMS_REALTIME) {
    window.EMS_REALTIME.ensureConnection("teacher");
    window.EMS_REALTIME.onMessage(function (message) {
      const type = String(message && message.type || "");
      if (["event_approved", "event_rejected", "event_deleted", "new_registration", "seat_updated", "attendance_submitted", "staff_joined", "registration_cancelled"].includes(type)) {
        loadPage();
      }
    });
  }
  loadPage();
  window.setInterval(loadPage, 15000);
})();