(function () {
  const student = window.EMS_STUDENT;
  const state = {
    user: null,
    registrations: [],
    tab: "upcoming"
  };

  function isPast(item) {
    return String(item.eventDate || "") < student.getLocalDateKey(new Date());
  }

  function filteredRegistrations() {
    return state.registrations.filter(function (item) {
      if (state.tab === "upcoming") {
        return item.status !== "cancelled" && item.status !== "waitlisted" && !isPast(item);
      }
      if (state.tab === "past") {
        return item.status !== "waitlisted" && isPast(item);
      }
      if (state.tab === "waitlisted") {
        return item.status === "waitlisted";
      }
      if (state.tab === "cancelled") {
        return item.status === "cancelled";
      }
      return true;
    });
  }

  function renderTabs() {
    const root = document.getElementById("student-registrations-tabs");
    if (!root) {
      return;
    }
    const counts = {
      upcoming: state.registrations.filter(function (item) { return item.status !== "cancelled" && item.status !== "waitlisted" && !isPast(item); }).length,
      past: state.registrations.filter(function (item) { return item.status !== "waitlisted" && isPast(item); }).length,
      waitlisted: state.registrations.filter(function (item) { return item.status === "waitlisted"; }).length,
      cancelled: state.registrations.filter(function (item) { return item.status === "cancelled"; }).length
    };
    const items = [["upcoming", "Upcoming"], ["past", "Past"], ["waitlisted", "Waitlisted"], ["cancelled", "Cancelled"]];
    root.innerHTML = items.map(function (item) {
      const active = state.tab === item[0] ? " active" : "";
      return '<button class="teacher-tab-pill' + active + '" type="button" data-tab="' + item[0] + '">' + item[1] + " (" + counts[item[0]] + ")</button>";
    }).join("");
  }

  function badgeFor(item) {
    if (item.status === "waitlisted") {
      return '<span class="teacher-badge pending">Waitlisted #' + student.escapeHtml(String(item.waitlistPosition || "?")) + "</span>";
    }
    if (item.status === "cancelled") {
      return '<span class="teacher-badge rejected">Cancelled</span>';
    }
    if (item.attendanceStatus === "present" || item.status === "attended") {
      return '<span class="teacher-badge approved">Attended</span>';
    }
    if (item.attendanceStatus === "absent") {
      return '<span class="teacher-badge rejected">Absent</span>';
    }
    return '<span class="teacher-badge approved">Upcoming</span>';
  }

  function renderList() {
    const root = document.getElementById("student-registrations-list");
    if (!root) {
      return;
    }
    const items = filteredRegistrations();
    if (!items.length) {
      root.innerHTML = '<div class="teacher-empty-state teacher-card"><span class="material-symbols-outlined" style="font-size:38px;color:var(--text-muted);">confirmation_number</span><div>No registrations in this section yet.</div></div>';
      return;
    }
    root.innerHTML = items.map(function (item) {
      const canCancel = state.tab === "upcoming" || state.tab === "waitlisted";
      return '<article class="teacher-card" style="padding:16px 20px;"><div class="teacher-event-row" style="border-bottom:0;padding:0;"><img class="teacher-event-thumb" style="width:72px;height:72px;border-radius:10px;" alt="' + student.escapeHtml(item.title) + '" src="' + student.escapeHtml(student.resolveMediaUrl(item.posterUrl || "")) + '" /><div class="teacher-event-copy"><div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;"><div class="teacher-event-title">' + student.escapeHtml(item.title) + '</div>' + badgeFor(item) + '</div><div class="teacher-event-meta"><span class="material-symbols-outlined" style="font-size:14px;">calendar_month</span><span>' + student.escapeHtml(student.formatShortDate(item.eventDate)) + '</span><span>&bull;</span><span>' + student.escapeHtml(student.formatTime(item.startTime)) + '</span></div><div class="teacher-event-location"><span class="material-symbols-outlined" style="font-size:14px;color:var(--accent-red);">location_on</span><span>' + student.escapeHtml(item.venue || "") + '</span></div><div class="teacher-card-sub">Hosted by ' + student.escapeHtml(item.organizerName || "EMS") + '</div></div><div class="teacher-side-meta" style="min-width:170px;"><div style="font-size:14px;font-weight:700;">' + student.escapeHtml(student.formatCountdown(item.eventDate)) + '</div><div style="font-size:13px;font-weight:700;">' + student.escapeHtml(student.formatPrice(item.price || 0)) + '</div><div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end;"><a class="teacher-btn-outline" href="student-browse-events.html">View Details</a>' + (canCancel ? '<button class="teacher-btn-danger" type="button" data-cancel-registration="' + student.escapeHtml(item.id) + '">Cancel Join</button>' : '') + "</div></div></div></article>";
    }).join("");
  }

  async function cancelRegistration(registrationId) {
    try {
      await student.apiRequest("/registrations/" + encodeURIComponent(registrationId), {
        method: "DELETE"
      });
      state.registrations = state.registrations.map(function (item) {
        return item.id === registrationId ? Object.assign({}, item, { status: "cancelled" }) : item;
      });
      renderTabs();
      renderList();
      student.pushNotification("Registration updated", "Your registration was cancelled.", "warning");
      student.showMessage("Registration cancelled successfully.", "success");
    } catch (error) {
      student.showMessage(error.message || "Could not cancel this registration yet.", "error");
    }
  }

  async function loadPage() {
    try {
      student.clearMessage();
      if (!document.querySelector(".teacher-shell")) {
        student.createShell();
      }
      state.user = await student.loadStudentUser();
      if (!state.user) {
        return;
      }
      const payload = await student.retryApi("/registrations/me", 3, 700);
      state.registrations = Array.isArray(payload.items) ? payload.items : [];
      renderTabs();
      renderList();
    } catch (error) {
      student.showMessage(error.message || "My Registrations could not finish loading yet.", "error");
    }
  }

  document.addEventListener("click", function (event) {
    const tab = event.target.closest("[data-tab]");
    const cancelButton = event.target.closest("[data-cancel-registration]");
    if (tab) {
      state.tab = tab.getAttribute("data-tab");
      renderTabs();
      renderList();
      return;
    }
    if (cancelButton) {
      cancelRegistration(cancelButton.getAttribute("data-cancel-registration"));
    }
  });

  if (window.EMS_REALTIME) {
    window.EMS_REALTIME.ensureConnection("student");
    window.EMS_REALTIME.onMessage(function (message) {
      const type = String(message && message.type || "");
      if (["seat_updated", "registration_cancelled", "attendance_submitted", "new_registration"].includes(type)) {
        loadPage();
      }
    });
  }
  loadPage();
  window.setInterval(loadPage, 15000);
})();
