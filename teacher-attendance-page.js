(function () {
  const teacher = window.EMS_TEACHER;
  const state = {
    event: null,
    registrations: [],
    attendance: [],
    mode: "manual",
    draftStatuses: new Map(),
    saving: false
  };

  function registrationsWithStatus() {
    const attendanceMap = new Map((state.attendance || []).map(function (item) {
      return [item.student_id, item];
    }));
    return (state.registrations || []).filter(function (item) {
      return String(item.status || "").toLowerCase() !== "cancelled";
    }).map(function (item) {
      const studentId = item.studentId || item.student_id;
      const saved = attendanceMap.get(studentId);
      const draft = state.draftStatuses.get(studentId);
      return {
        id: studentId,
        name: item.studentName || item.student_name || "Student",
        email: item.studentEmail || item.student_email || "",
        status: draft || (saved ? String(saved.status || "present").toLowerCase() : "not-marked")
      };
    });
  }

  function renderSummary() {
    const root = document.getElementById("attendance-summary-bar");
    if (!root || !state.event) {
      return;
    }
    const rows = registrationsWithStatus();
    const present = rows.filter(function (item) { return item.status === "present"; }).length;
    const absent = rows.filter(function (item) { return item.status === "absent"; }).length;
    const pending = rows.filter(function (item) { return item.status === "not-marked"; }).length;
    root.innerHTML = [
      '<div><div style="font-size:18px;font-weight:700;">' + teacher.escapeHtml(state.event.title) + "</div><div class=\"teacher-card-sub\">Attendance writes back to the shared backend in real time.</div></div>",
      '<div class="teacher-summary-stats">',
      '<span class="teacher-summary-chip"><span class="material-symbols-outlined" style="font-size:16px;">check_circle</span><span>' + present + " present</span></span>",
      '<span class="teacher-summary-chip"><span class="material-symbols-outlined" style="font-size:16px;">cancel</span><span>' + absent + " absent</span></span>",
      '<span class="teacher-summary-chip"><span class="material-symbols-outlined" style="font-size:16px;">schedule</span><span>' + pending + ' not marked</span></span>',
      "</div>"
    ].join("");
  }

  function renderManualMode() {
    const body = document.getElementById("attendance-mode-body");
    if (!body) {
      return;
    }
    const rows = registrationsWithStatus();
    if (!rows.length) {
      body.innerHTML = '<div class="teacher-empty-state"><span class="material-symbols-outlined" style="font-size:38px;color:var(--text-muted);">fact_check</span><div>No registrations available for attendance yet.</div></div>';
      return;
    }
    body.innerHTML = [
      '<div class="teacher-grid">',
      rows.map(function (row) {
        return [
          '<div class="teacher-card" style="padding:16px 18px;display:flex;align-items:center;justify-content:space-between;gap:16px;">',
          '<div><div class="teacher-event-title">' + teacher.escapeHtml(row.name) + "</div><div class=\"teacher-card-sub\">" + teacher.escapeHtml(row.email) + "</div></div>",
          '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">',
          '<span class="teacher-badge ' + teacher.escapeHtml(row.status) + '">' + teacher.escapeHtml(teacher.getStatusLabel(row.status)) + "</span>",
          '<button class="teacher-btn-outline" type="button" data-mark="' + teacher.escapeHtml(row.id) + '" data-status="present">Present</button>',
          '<button class="teacher-btn-danger" type="button" data-mark="' + teacher.escapeHtml(row.id) + '" data-status="absent">Absent</button>',
          "</div></div>"
        ].join("");
      }).join(""),
      '<div style="display:flex;justify-content:flex-end;"><button class="teacher-btn" type="button" id="teacher-attendance-save">Save Attendance</button></div>',
      "</div>"
    ].join("");
    const saveButton = document.getElementById("teacher-attendance-save");
    if (saveButton) {
      saveButton.addEventListener("click", saveAttendance);
    }
  }

  function renderScannerMode() {
    const body = document.getElementById("attendance-mode-body");
    if (!body) {
      return;
    }
    body.innerHTML = [
      '<div class="teacher-empty-state">',
      '<span class="material-symbols-outlined" style="font-size:42px;color:var(--text-muted);">qr_code_scanner</span>',
      '<div>QR scanner mode UI is ready, but live QR check-in is not connected in the backend yet.</div>',
      '<div class="teacher-card-sub">Manual marking above is already saving real attendance records.</div>',
      "</div>"
    ].join("");
  }

  function renderMode() {
    document.querySelectorAll("[data-mode]").forEach(function (button) {
      button.classList.toggle("active", button.getAttribute("data-mode") === state.mode);
    });
    if (state.mode === "scanner") {
      renderScannerMode();
    } else {
      renderManualMode();
    }
  }

  function renderSideCard() {
    const root = document.getElementById("attendance-side-card");
    if (!root || !state.event) {
      return;
    }
    root.innerHTML = [
      '<div class="teacher-card-head"><div class="teacher-card-title">Event Links</div></div>',
      '<div class="teacher-grid" style="gap:10px;">',
      '<a class="teacher-btn-outline" href="teacher-event-detail.html?event=' + encodeURIComponent(state.event.id) + '">Event Detail</a>',
      '<a class="teacher-btn-outline" href="teacher-students.html?event=' + encodeURIComponent(state.event.id) + '">Registered Students</a>',
      '<a class="teacher-btn" href="teacher-my-events.html">Back to My Events</a>',
      "</div>"
    ].join("");
  }

  async function saveAttendance() {
    if (state.saving) {
      return;
    }
    const pending = Array.from(state.draftStatuses.entries());
    if (!pending.length) {
      teacher.showMessage("No new attendance changes to save.", "error");
      return;
    }
    state.saving = true;
    teacher.clearMessage();
    try {
      for (const entry of pending) {
        await teacher.apiRequest("/attendance", {
          method: "POST",
          body: {
            eventId: state.event.id,
            studentId: entry[0],
            method: "manual",
            status: entry[1]
          }
        });
      }
      teacher.pushNotification("Attendance updated", state.event.title + " attendance synced successfully.");
      state.draftStatuses.clear();
      await loadPage();
    } catch (error) {
      teacher.showMessage(error.message || "Attendance save failed.", "error");
    } finally {
      state.saving = false;
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
      const eventId = teacher.getQueryParam("event");
      if (!eventId) {
        teacher.showMessage("Open Attendance from one of your events first.", "error");
        return;
      }
      const eventPayload = await teacher.retryApi("/events/" + encodeURIComponent(eventId), 3, 800);
      const registrationsPayload = await teacher.retryApi("/events/" + encodeURIComponent(eventId) + "/registrations", 3, 800);
      const attendancePayload = await teacher.retryApi("/attendance?event_id=" + encodeURIComponent(eventId), 3, 800);
      state.event = teacher.normalizeEvent(eventPayload);
      state.registrations = Array.isArray(registrationsPayload.items) ? registrationsPayload.items : [];
      state.attendance = Array.isArray(attendancePayload.items) ? attendancePayload.items : [];
      renderSummary();
      renderMode();
      renderSideCard();
    } catch (error) {
      teacher.showMessage(error.message || "Attendance could not finish loading yet.", "error");
    }
  }

  document.addEventListener("click", function (event) {
    const modeButton = event.target.closest("[data-mode]");
    const markButton = event.target.closest("[data-mark]");
    if (modeButton) {
      state.mode = modeButton.getAttribute("data-mode");
      renderMode();
      return;
    }
    if (markButton) {
      state.draftStatuses.set(markButton.getAttribute("data-mark"), markButton.getAttribute("data-status"));
      renderSummary();
      renderMode();
    }
  });

  if (window.EMS_REALTIME) {
    window.EMS_REALTIME.ensureConnection("teacher");
    window.EMS_REALTIME.onMessage(function (message) {
      const type = String(message && message.type || "");
      if (["new_registration", "attendance_submitted", "registration_cancelled"].includes(type)) {
        loadPage();
      }
    });
  }
  loadPage();
  window.setInterval(loadPage, 15000);
})();
