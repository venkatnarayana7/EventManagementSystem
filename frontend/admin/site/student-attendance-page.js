(function () {
  const student = window.EMS_STUDENT;
  const state = {
    user: null,
    attendance: []
  };

  function renderStats() {
    const root = document.getElementById("student-attendance-stats");
    if (!root) {
      return;
    }
    const present = state.attendance.filter(function (item) { return item.status === "present"; }).length;
    const absent = state.attendance.filter(function (item) { return item.status === "absent"; }).length;
    const marked = present + absent;
    const rate = marked ? Math.round((present / marked) * 100) : 0;
    root.innerHTML = [
      '<article class="teacher-card teacher-stat-card"><div class="teacher-stat-top"><span class="teacher-stat-icon" style="background:#E8F5EE;color:#2F6B54;"><span class="material-symbols-outlined" style="font-size:18px;">task_alt</span></span><div class="teacher-stat-label">Total Attended</div></div><div class="teacher-stat-value">' + present + '</div><div class="teacher-stat-trend">events attended</div></article>',
      '<article class="teacher-card teacher-stat-card"><div class="teacher-stat-top"><span class="teacher-stat-icon" style="background:#FEE2E2;color:#B91C1C;"><span class="material-symbols-outlined" style="font-size:18px;">close</span></span><div class="teacher-stat-label">Total Absent</div></div><div class="teacher-stat-value">' + absent + '</div><div class="teacher-stat-trend">events missed</div></article>',
      '<article class="teacher-card teacher-stat-card" style="grid-column:span 2;"><div class="teacher-stat-top"><span class="teacher-stat-icon" style="background:#F0EBE3;color:#1A1A2E;"><span class="material-symbols-outlined" style="font-size:18px;">donut_large</span></span><div class="teacher-stat-label">Attendance Rate</div></div><div class="teacher-stat-value">' + rate + '%</div><div class="teacher-stat-trend">Your attendance rate</div></article>'
    ].join("");
  }

  function renderList() {
    const root = document.getElementById("student-attendance-list");
    if (!root) {
      return;
    }
    if (!state.attendance.length) {
      root.innerHTML = '<div class="teacher-empty-state"><span class="material-symbols-outlined" style="font-size:38px;color:var(--text-muted);">checklist</span><div>No attendance records yet.</div></div>';
      return;
    }
    root.innerHTML = state.attendance.map(function (item) {
      const tone = item.status === "present" ? "#4CAF82" : item.status === "absent" ? "#EF4444" : "#9CA3AF";
      const badgeClass = item.status === "present" ? "approved" : item.status === "absent" ? "rejected" : "draft";
      return '<article class="teacher-card" style="padding:16px 20px;border-left:4px solid ' + tone + ';"><div class="teacher-event-row" style="border-bottom:0;padding:0;"><img class="teacher-event-thumb" style="width:72px;height:72px;border-radius:10px;" alt="' + student.escapeHtml(item.title) + '" src="' + student.escapeHtml(student.resolveMediaUrl(item.posterUrl || "")) + '" /><div class="teacher-event-copy"><div class="teacher-event-title">' + student.escapeHtml(item.title) + '</div><div class="teacher-event-meta"><span class="material-symbols-outlined" style="font-size:14px;">calendar_month</span><span>' + student.escapeHtml(student.formatShortDate(item.eventDate)) + '</span><span>&bull;</span><span>' + student.escapeHtml(student.formatTime(item.startTime)) + '</span></div><div class="teacher-event-location"><span class="material-symbols-outlined" style="font-size:14px;color:var(--accent-red);">location_on</span><span>' + student.escapeHtml(item.venue || "") + '</span></div><div class="teacher-card-sub">' + student.escapeHtml(item.markedBy ? "Marked by " + item.markedBy : "Teacher has not marked this yet") + "</div></div><div class=\"teacher-side-meta\"><span class=\"teacher-badge " + badgeClass + '">' + student.escapeHtml(student.getStatusLabel(item.status)) + '</span><div class="teacher-card-sub">' + student.escapeHtml(item.markedAt ? student.formatDate(item.markedAt) : "Pending") + "</div></div></div></article>";
    }).join("");
  }

  function downloadReport() {
    const rows = [
      ["Event", "Date", "Status", "Marked By"],
      ...state.attendance.map(function (item) {
        return [item.title || "", item.eventDate || "", item.status || "", item.markedBy || ""];
      })
    ];
    const csv = rows.map(function (row) { return row.map(function (cell) { return '"' + String(cell).replace(/"/g, '""') + '"'; }).join(","); }).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "ems-attendance-report.csv";
    link.click();
    URL.revokeObjectURL(url);
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
      const payload = await student.retryApi("/attendance/me", 3, 700);
      state.attendance = Array.isArray(payload.items) ? payload.items : [];
      renderStats();
      renderList();
    } catch (error) {
      student.showMessage(error.message || "My Attendance could not finish loading yet.", "error");
    }
  }

  const downloadButton = document.getElementById("student-attendance-download");
  if (downloadButton) {
    downloadButton.addEventListener("click", downloadReport);
  }

  if (window.EMS_REALTIME) {
    window.EMS_REALTIME.ensureConnection("student");
    window.EMS_REALTIME.onMessage(function (message) {
      const type = String(message && message.type || "");
      if (["attendance_submitted"].includes(type)) {
        loadPage();
      }
    });
  }
  loadPage();
  window.setInterval(loadPage, 15000);
})();
