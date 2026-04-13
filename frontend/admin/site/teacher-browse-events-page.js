(function () {
  const teacher = window.EMS_TEACHER;
  const state = {
    events: [],
    category: "all",
    period: "all",
    tab: "upcoming"
  };

  function filteredEvents() {
    const todayKey = teacher.getLocalDateKey(new Date());
    const now = new Date();
    return state.events.filter(function (event) {
      const approved = teacher.mapEventStatus(event.status) === "approved";
      if (!approved) {
        return false;
      }
      const matchesCategory = state.category === "all" || event.category === state.category;
      const eventDate = new Date(event.date + "T00:00:00");
      const eventDateKey = String(event.date || "");
      const matchesTab = state.tab === "all"
        || (state.tab === "upcoming" && eventDateKey >= todayKey)
        || (state.tab === "past" && eventDateKey < todayKey);
      let matchesPeriod = true;
      if (state.period === "month") {
        matchesPeriod = !Number.isNaN(eventDate.getTime()) && eventDate.getMonth() === now.getMonth() && eventDate.getFullYear() === now.getFullYear();
      }
      return matchesCategory && matchesTab && matchesPeriod;
    }).sort(function (left, right) {
      return (left.date + left.startTime).localeCompare(right.date + right.startTime);
    });
  }

  function renderTabs() {
    const root = document.getElementById("browse-events-tabs");
    if (!root) {
      return;
    }
    const items = [["upcoming", "Upcoming"], ["past", "Past"], ["all", "All"]];
    root.innerHTML = items.map(function (item) {
      const active = state.tab === item[0] ? " active" : "";
      return '<button class="teacher-tab-pill' + active + '" type="button" data-tab="' + item[0] + '">' + item[1] + "</button>";
    }).join("");
  }

  function renderFilters() {
    const categoryFilter = document.getElementById("browse-category-filter");
    if (categoryFilter) {
      const categories = Array.from(new Set(state.events.map(function (event) { return event.category; }).filter(Boolean))).sort();
      categoryFilter.innerHTML = ['<option value="all">All Category</option>'].concat(categories.map(function (category) {
        return '<option value="' + teacher.escapeHtml(category) + '">' + teacher.escapeHtml(category) + "</option>";
      })).join("");
      categoryFilter.value = state.category;
    }
  }

  function renderGrid() {
    const root = document.getElementById("browse-events-grid");
    if (!root) {
      return;
    }
    const items = filteredEvents();
    if (!items.length) {
      root.innerHTML = '<div class="teacher-empty-state teacher-card" style="grid-column:1 / -1;"><span class="material-symbols-outlined" style="font-size:38px;color:var(--text-muted);">explore</span><div>No approved events match this filter.</div></div>';
      return;
    }
    root.innerHTML = items.map(function (event) {
      return teacher.createEventCard(event, {
        actionStrip: '<div class="teacher-event-action-strip"><a href="teacher-event-detail.html?event=' + encodeURIComponent(event.id) + '" style="color:#fff;font-size:12px;font-weight:700;">Open Event</a></div>'
      });
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
      const payload = await teacher.retryApi("/events", 3, 800);
      state.events = (payload.items || []).map(teacher.normalizeEvent);
      renderTabs();
      renderFilters();
      renderGrid();
    } catch (error) {
      teacher.showMessage(error.message || "Browse Events could not finish loading yet.", "error");
    }
  }

  document.addEventListener("click", function (event) {
    const tab = event.target.closest("[data-tab]");
    if (tab) {
      state.tab = tab.getAttribute("data-tab");
      renderTabs();
      renderGrid();
    }
  });

  const categoryFilter = document.getElementById("browse-category-filter");
  const periodFilter = document.getElementById("browse-period-filter");
  if (categoryFilter) {
    categoryFilter.addEventListener("change", function () {
      state.category = categoryFilter.value || "all";
      renderGrid();
    });
  }
  if (periodFilter) {
    periodFilter.addEventListener("change", function () {
      state.period = periodFilter.value === "all-time" ? "all" : "month";
      renderGrid();
    });
  }

  if (window.EMS_REALTIME) {
    window.EMS_REALTIME.ensureConnection("teacher");
    window.EMS_REALTIME.onMessage(function (message) {
      const type = String(message && message.type || "");
      if (["event_approved", "event_rejected", "seat_updated", "staff_joined"].includes(type)) {
        loadPage();
      }
    });
  }
  loadPage();
  window.setInterval(loadPage, 15000);
})();
