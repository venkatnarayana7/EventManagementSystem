(function () {
  const student = window.EMS_STUDENT;
  const state = {
    user: null,
    events: [],
    registrations: [],
    attendance: [],
    visibleMonth: (function () {
      const now = new Date();
      return new Date(now.getFullYear(), now.getMonth(), 1);
    })(),
    selectedCalendarDate: null
  };
  const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  function renderLoaders() {
    var upcomingRoot = document.getElementById("student-upcoming-events");
    var recommendedRoot = document.getElementById("student-recommended-events");
    var liveFeedRoot = document.getElementById("student-live-feed");
    var calendarRoot = document.getElementById("student-calendar");
    var statRoot = document.getElementById("student-stat-grid");

    if (statRoot && !statRoot.innerHTML.trim()) {
      statRoot.innerHTML = [
        '<article class="teacher-card teacher-stat-card"><div style="height:14px;width:110px;border-radius:999px;background:var(--bg-card-alt);"></div><div style="height:34px;width:56px;border-radius:12px;background:var(--bg-card-alt);margin-top:14px;"></div></article>',
        '<article class="teacher-card teacher-stat-card"><div style="height:14px;width:130px;border-radius:999px;background:var(--bg-card-alt);"></div><div style="height:34px;width:56px;border-radius:12px;background:var(--bg-card-alt);margin-top:14px;"></div></article>',
        '<article class="teacher-card teacher-stat-card"><div style="height:14px;width:96px;border-radius:999px;background:var(--bg-card-alt);"></div><div style="height:34px;width:56px;border-radius:12px;background:var(--bg-card-alt);margin-top:14px;"></div></article>',
        '<article class="teacher-card teacher-stat-card"><div style="height:14px;width:122px;border-radius:999px;background:var(--bg-card-alt);"></div><div style="height:34px;width:56px;border-radius:12px;background:var(--bg-card-alt);margin-top:14px;"></div></article>'
      ].join("");
    }

    if (upcomingRoot && !upcomingRoot.innerHTML.trim()) {
      student.renderSectionLoader(upcomingRoot, "teacher-card");
    }
    if (recommendedRoot && !recommendedRoot.innerHTML.trim()) {
      student.renderSectionLoader(recommendedRoot, "teacher-card");
    }
    if (liveFeedRoot && !liveFeedRoot.innerHTML.trim()) {
      student.renderSectionLoader(liveFeedRoot, "teacher-card");
    }
    if (calendarRoot && !calendarRoot.innerHTML.trim()) {
      student.renderSectionLoader(calendarRoot, "teacher-card");
    }
  }

  function renderWelcome() {
    const root = document.getElementById("student-welcome-banner");
    if (!root || !state.user) {
      return;
    }
    const upcoming = state.registrations.filter(function (item) {
      return item.status !== "cancelled" && String(item.eventDate || "") >= student.getLocalDateKey(new Date());
    });
    const thisWeek = upcoming.filter(function (item) {
      const date = new Date(String(item.eventDate || "") + "T00:00:00");
      const now = new Date();
      const end = new Date(now);
      end.setDate(now.getDate() + 7);
      return !Number.isNaN(date.getTime()) && date >= new Date(now.getFullYear(), now.getMonth(), now.getDate()) && date <= end;
    });
    const firstName = String(state.user.fullName || state.user.email || "Student").split(" ")[0];
    root.innerHTML = [
      '<div style="display:flex;align-items:center;justify-content:space-between;gap:20px;flex-wrap:wrap;">',
      '<div style="display:grid;gap:10px;">',
      '<div style="font-size:22px;font-weight:700;">Good day, ' + student.escapeHtml(firstName) + '!</div>',
      '<div style="font-size:13px;color:rgba(255,255,255,0.78);">Here is what is happening on campus today.</div>',
      '<div class="teacher-filter-row">',
      '<span class="teacher-meta-chip" style="background:rgba(255,255,255,0.15);border-color:rgba(255,255,255,0.18);color:#fff;"><span class="material-symbols-outlined" style="font-size:14px;">calendar_month</span><span>' + upcoming.length + ' upcoming events</span></span>',
      '<span class="teacher-meta-chip" style="background:rgba(255,255,255,0.15);border-color:rgba(255,255,255,0.18);color:#fff;"><span class="material-symbols-outlined" style="font-size:14px;">schedule</span><span>' + thisWeek.length + ' event this week</span></span>',
      '</div></div>',
      '<div class="teacher-avatar large" style="background:rgba(255,255,255,0.14);font-size:30px;">' + student.escapeHtml(student.getInitials(firstName)) + "</div>",
      "</div>"
    ].join("");
  }

  function renderStats() {
    const root = document.getElementById("student-stat-grid");
    if (!root) {
      return;
    }
    const joined = state.registrations.filter(function (item) { return item.status !== "cancelled"; });
    const upcoming = joined.filter(function (item) { return String(item.eventDate || "") >= student.getLocalDateKey(new Date()); });
    const attended = state.attendance.filter(function (item) { return item.status === "present"; });
    const marked = state.attendance.filter(function (item) { return item.status === "present" || item.status === "absent"; });
    const rate = marked.length ? Math.round((attended.length / marked.length) * 100) : 0;
    const cards = [
      { icon: "event_available", color: "#E8F5EE", iconColor: "#2F6B54", label: "Events Joined", value: joined.length, meta: "total registrations" },
      { icon: "schedule", color: "#FEF3CD", iconColor: "#B45309", label: "Upcoming Events", value: upcoming.length, meta: "events ahead" },
      { icon: "task_alt", color: "#EDE9FE", iconColor: "#6D28D9", label: "Attended", value: attended.length, meta: "events attended" },
      { icon: "bar_chart", color: "#F0EBE3", iconColor: "#1A1A2E", label: "Attendance Rate", value: rate + "%", meta: "live from attendance" }
    ];
    root.innerHTML = cards.map(function (item) {
      return '<article class="teacher-card teacher-stat-card"><div class="teacher-stat-top"><span class="teacher-stat-icon" style="background:' + item.color + ';color:' + item.iconColor + ';"><span class="material-symbols-outlined" style="font-size:18px;">' + item.icon + '</span></span><div class="teacher-stat-label">' + student.escapeHtml(item.label) + '</div></div><div class="teacher-stat-value">' + student.escapeHtml(String(item.value)) + '</div><div class="teacher-stat-trend">' + student.escapeHtml(item.meta) + "</div></article>";
    }).join("");
  }

  function renderUpcomingEvents() {
    const root = document.getElementById("student-upcoming-events");
    if (!root) {
      return;
    }
    const items = state.registrations
      .filter(function (item) {
        if (item.status === "cancelled") {
          return false;
        }
        if (state.selectedCalendarDate) {
          return String(item.eventDate || "") === state.selectedCalendarDate;
        }
        return String(item.eventDate || "") >= student.getLocalDateKey(new Date());
      })
      .slice(0, 3);
    if (!items.length) {
      root.innerHTML = '<div class="teacher-empty-state"><span class="material-symbols-outlined" style="font-size:32px;color:var(--text-muted);">calendar_month</span><div>' + student.escapeHtml(state.selectedCalendarDate ? "No joined events on the selected date." : "No joined events yet.") + '</div></div>';
      return;
    }
    root.innerHTML = items.map(function (item) {
      const seats = Math.max(0, Number(item.maxCapacity || 0) - Number(item.currentCount || 0));
      return '<a class="teacher-event-row" href="student-registrations.html"><img class="teacher-event-thumb" alt="' + student.escapeHtml(item.title) + '" src="' + student.escapeHtml(student.resolveMediaUrl(item.posterUrl || "")) + '" /><div class="teacher-event-copy"><div class="teacher-event-title">' + student.escapeHtml(item.title) + '</div><div class="teacher-event-meta"><span class="material-symbols-outlined" style="font-size:14px;">calendar_month</span><span>' + student.escapeHtml(student.formatShortDate(item.eventDate)) + '</span><span>&bull;</span><span>' + student.escapeHtml(student.formatTime(item.startTime)) + '</span></div><div class="teacher-event-location"><span class="material-symbols-outlined" style="font-size:14px;color:var(--accent-red);">location_on</span><span>' + student.escapeHtml(item.venue || "") + '</span></div></div><div class="teacher-side-meta"><span class="teacher-meta-chip">' + student.escapeHtml(Number(item.currentCount || 0) + " joined • " + seats + " left") + '</span><span class="teacher-link">View</span></div></a>';
    }).join("");
  }

  function renderRecommended() {
    const root = document.getElementById("student-recommended-events");
    if (!root) {
      return;
    }
    const joinedIds = new Set(state.registrations.map(function (item) { return item.eventId; }));
    const items = state.events
      .filter(function (event) {
        return !joinedIds.has(event.id) && String(event.date || "") >= student.getLocalDateKey(new Date()) && (!state.user.department || !event.department || event.department === "Open" || event.department === state.user.department);
      })
      .sort(function (a, b) {
        return (a.date + a.startTime).localeCompare(b.date + b.startTime);
      })
      .slice(0, 2);
    if (!items.length) {
      root.innerHTML = '<div class="teacher-empty-state"><span class="material-symbols-outlined" style="font-size:32px;color:var(--text-muted);">auto_awesome</span><div>More recommendations will appear as new events open.</div></div>';
      return;
    }
    root.innerHTML = items.map(function (event) {
      return '<a class="teacher-event-row" href="student-browse-events.html?event=' + encodeURIComponent(event.id) + '"><img class="teacher-event-thumb" alt="' + student.escapeHtml(event.title) + '" src="' + student.escapeHtml(event.image || "") + '" /><div class="teacher-event-copy"><div class="teacher-event-title">' + student.escapeHtml(event.title) + '</div><div class="teacher-event-meta"><span class="teacher-category-chip">' + student.escapeHtml(event.category) + '</span></div><div class="teacher-card-sub">' + student.escapeHtml(student.formatShortDate(event.date)) + "</div></div><div class=\"teacher-side-meta\"><span class=\"teacher-link\">Join Now</span></div></a>";
    }).join("");
  }

  function renderFeed() {
    const root = document.getElementById("student-live-feed");
    if (!root) {
      return;
    }
    const items = (student.state.notifications || []).slice(0, 6);
    if (!items.length) {
      root.innerHTML = '<div class="teacher-empty-state" style="padding:24px 12px;"><span class="material-symbols-outlined" style="font-size:30px;color:var(--text-muted);">bolt</span><div>No live activity yet.</div></div>';
      return;
    }
    root.innerHTML = items.map(function (item) {
      return '<div class="teacher-event-row"><span class="teacher-stat-icon" style="width:32px;height:32px;border-radius:999px;background:#EEF2FF;color:#4338CA;"><span class="material-symbols-outlined" style="font-size:16px;">notifications</span></span><div class="teacher-event-copy"><div class="teacher-event-title" style="font-size:13px;">' + student.escapeHtml(item.title) + '</div><div class="teacher-card-sub">' + student.escapeHtml(item.message) + '</div></div><div class="teacher-side-meta"><span class="teacher-card-sub">' + student.escapeHtml("Now") + "</span></div></div>";
    }).join("");
  }

  function renderCalendar() {
    const root = document.getElementById("student-calendar");
    const title = document.getElementById("student-calendar-title");
    const subtitle = document.getElementById("student-calendar-subtitle");
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
        ? "Showing joined events on " + student.formatDate(state.selectedCalendarDate)
        : "Select a date to filter your dashboard events.";
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
      if (state.selectedCalendarDate === student.getLocalDateKey(date)) {
        classes.push("selected");
      }

      cells.push('<button class="' + classes.join(" ") + '" type="button" data-calendar-date="' + student.getLocalDateKey(date) + '">' + date.getDate() + "</button>");
    }
    root.innerHTML = cells.join("");
  }

  function renderPage() {
    renderWelcome();
    renderStats();
    renderUpcomingEvents();
    renderRecommended();
    renderFeed();
    renderCalendar();
  }

  async function loadPage(silent) {
    student.clearMessage();
    if (!document.querySelector(".teacher-shell")) {
      student.createShell();
    }

    if (!silent) {
      renderLoaders();
    }

    try {
      state.user = await student.loadStudentUser();
      if (!state.user) {
        return;
      }

      renderPage();

      var results = await Promise.allSettled([
        student.retryApi("/events", 3, 700),
        student.retryApi("/registrations/me", 3, 700),
        student.retryApi("/attendance/me", 3, 700)
      ]);

      if (results[0].status === "fulfilled") {
        state.events = (results[0].value.items || []).map(student.normalizeEvent);
      }

      if (results[1].status === "fulfilled") {
        state.registrations = Array.isArray(results[1].value.items) ? results[1].value.items : [];
      }

      if (results[2].status === "fulfilled") {
        state.attendance = Array.isArray(results[2].value.items) ? results[2].value.items : [];
      }

      renderPage();

      var failedResults = results.filter(function (result) {
        return result.status === "rejected";
      });
      if (failedResults.length) {
        var firstFailure = failedResults[0];
        student.showMessage(
          firstFailure.reason && firstFailure.reason.message
            ? firstFailure.reason.message
            : "Some student dashboard data is still loading. The rest of the page is live.",
          "error"
        );
      }
    } catch (error) {
      student.showMessage(error.message || "Student dashboard could not finish loading yet.", "error");
    }
  }

  if (window.EMS_REALTIME) {
    window.EMS_REALTIME.ensureConnection("student");
    window.EMS_REALTIME.onMessage(function (message) {
      const type = String(message && message.type || "");
      if (["event_approved", "event_deleted", "seat_updated", "new_registration", "attendance_submitted", "registration_cancelled"].includes(type)) {
        loadPage(true);
      }
    });
  }
  var prevButton = document.getElementById("student-calendar-prev");
  var nextButton = document.getElementById("student-calendar-next");
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
  document.addEventListener("click", function (event) {
    var calendarDateButton = event.target.closest("[data-calendar-date]");
    if (!calendarDateButton) {
      return;
    }
    var selectedDate = calendarDateButton.getAttribute("data-calendar-date");
    state.selectedCalendarDate = state.selectedCalendarDate === selectedDate ? null : selectedDate;
    renderCalendar();
    renderUpcomingEvents();
  });
  loadPage();
  window.setInterval(function () { loadPage(true); }, 15000);
})();