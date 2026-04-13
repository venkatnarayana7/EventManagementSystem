(function () {
  const teacher = window.EMS_TEACHER;
  const state = {
    event: null,
    registrations: [],
    attendance: [],
    search: "",
    status: "all"
  };

  function mergeRows() {
    const attendanceMap = new Map((state.attendance || []).map(function (item) {
      return [item.student_id, item];
    }));
    return (state.registrations || []).filter(function (item) {
      return String(item.status || "").toLowerCase() !== "cancelled";
    }).map(function (item, index) {
      const attendance = attendanceMap.get(item.studentId || item.student_id);
      return {
        index: index + 1,
        id: item.studentId || item.student_id,
        name: item.studentName || item.student_name || "Student",
        email: item.studentEmail || item.student_email || "Not available",
        rollNo: item.studentRollNo || item.student_roll_no || "N/A",
        department: item.studentDepartment || item.student_department || "N/A",
        registeredAt: item.registeredAt || item.registered_at || "",
        status: String(item.status || "registered").toLowerCase(),
        attendance: attendance ? String(attendance.status || "present").toLowerCase() : "not-marked"
      };
    }).filter(function (item) {
      const query = state.search.trim().toLowerCase();
      const matchesSearch = !query || item.name.toLowerCase().includes(query) || item.email.toLowerCase().includes(query);
      const matchesStatus = state.status === "all" || item.status === state.status;
      return matchesSearch && matchesStatus;
    });
  }

  function renderSummary() {
    const root = document.getElementById("students-summary");
    const title = document.getElementById("students-count-title");
    if (!root || !title || !state.event) {
      return;
    }
    const rows = mergeRows();
    const attended = rows.filter(function (row) { return row.attendance === "present"; }).length;
    title.textContent = rows.length + " students for " + state.event.title;
    root.innerHTML = [
      '<div><div style="font-size:18px;font-weight:700;">' + teacher.escapeHtml(state.event.title) + "</div><div class=\"teacher-card-sub\">Live registrations from the shared event table.</div></div>",
      '<div class="teacher-summary-stats">',
      '<span class="teacher-summary-chip"><span class="material-symbols-outlined" style="font-size:16px;">groups</span><span>' + rows.length + " registered</span></span>",
      '<span class="teacher-summary-chip"><span class="material-symbols-outlined" style="font-size:16px;">check_circle</span><span>' + attended + " attended</span></span>",
      '<span class="teacher-summary-chip"><span class="material-symbols-outlined" style="font-size:16px;">schedule</span><span>' + Math.max(0, rows.length - attended) + " pending</span></span>",
      "</div>"
    ].join("");
  }

  function renderTable() {
    const body = document.getElementById("students-table-body");
    if (!body) {
      return;
    }
    const rows = mergeRows();
    if (!rows.length) {
      body.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--text-muted);padding:28px;">No students match this filter yet.</td></tr>';
      return;
    }
    body.innerHTML = rows.map(function (row) {
      return [
        "<tr>",
        "<td>" + row.index + "</td>",
        "<td>" + teacher.escapeHtml(row.name) + "</td>",
        "<td>" + teacher.escapeHtml(row.email) + "</td>",
        "<td>" + teacher.escapeHtml(row.rollNo) + "</td>",
        "<td>" + teacher.escapeHtml(row.department) + "</td>",
        "<td>" + teacher.escapeHtml(row.registeredAt ? teacher.formatDate(row.registeredAt) : "Not available") + "</td>",
        '<td><span class="teacher-badge ' + teacher.escapeHtml(row.status) + '">' + teacher.escapeHtml(teacher.getStatusLabel(row.status)) + "</span></td>",
        '<td><span class="teacher-badge ' + teacher.escapeHtml(row.attendance) + '">' + teacher.escapeHtml(teacher.getStatusLabel(row.attendance)) + "</span></td>",
        "</tr>"
      ].join("");
    }).join("");
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
        teacher.showMessage("Open Registered Students from one of your events first.", "error");
        return;
      }
      const eventPayload = await teacher.retryApi("/events/" + encodeURIComponent(eventId), 3, 800);
      state.event = teacher.normalizeEvent(eventPayload);
      const registrationsPayload = await teacher.retryApi("/events/" + encodeURIComponent(eventId) + "/registrations", 3, 800);
      const attendancePayload = await teacher.retryApi("/attendance?event_id=" + encodeURIComponent(eventId), 3, 800);
      state.registrations = Array.isArray(registrationsPayload.items) ? registrationsPayload.items : [];
      state.attendance = Array.isArray(attendancePayload.items) ? attendancePayload.items : [];
      renderSummary();
      renderTable();
    } catch (error) {
      teacher.showMessage(error.message || "Student list could not finish loading yet.", "error");
    }
  }

  const searchInput = document.getElementById("students-search");
  const statusFilter = document.getElementById("students-status-filter");
  const emailBlast = document.getElementById("students-email-blast");

  if (searchInput) {
    searchInput.addEventListener("input", function () {
      state.search = searchInput.value || "";
      renderTable();
    });
  }
  if (statusFilter) {
    statusFilter.addEventListener("change", function () {
      state.status = statusFilter.value || "all";
      renderTable();
    });
  }
  if (emailBlast) {
    emailBlast.addEventListener("click", function () {
      teacher.showMessage("Email blast is not wired to a mail service yet. Student records above are live.", "error");
    });
  }

  if (window.EMS_REALTIME) {
    window.EMS_REALTIME.ensureConnection("teacher");
    window.EMS_REALTIME.onMessage(function (message) {
      const type = String(message && message.type || "");
      if (["new_registration", "registration_cancelled", "seat_updated", "attendance_submitted"].includes(type)) {
        loadPage();
      }
    });
  }
  loadPage();
  window.setInterval(loadPage, 15000);
})();
