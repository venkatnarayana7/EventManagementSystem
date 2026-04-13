(function () {
  const student = window.EMS_STUDENT;
  const state = {
    user: null,
    events: [],
    registrations: [],
    query: "",
    category: "all",
    period: "all",
    tab: "all"
  };

  function updateEventRecord(eventId, updater) {
    var nextEvent = null;
    state.events = state.events.map(function (item) {
      if (item.id !== eventId) {
        return item;
      }
      nextEvent = updater(item);
      return nextEvent;
    });
    return nextEvent;
  }

  function renderLoaders() {
    var tabsRoot = document.getElementById("student-browse-tabs");
    var gridRoot = document.getElementById("student-browse-grid");
    if (tabsRoot && !tabsRoot.innerHTML.trim()) {
      tabsRoot.innerHTML = [
        '<div class="teacher-tab-pill active">All Events (--)</div>',
        '<div class="teacher-tab-pill">Open to Join (--)</div>',
        '<div class="teacher-tab-pill">Joined (--)</div>',
        '<div class="teacher-tab-pill">Waitlisted (--)</div>'
      ].join("");
    }
    if (gridRoot && !gridRoot.innerHTML.trim()) {
      gridRoot.innerHTML = '<div class="teacher-card" style="grid-column:1 / -1;padding:20px 24px;"><div style="display:grid;gap:12px;"><div style="height:18px;border-radius:10px;background:var(--bg-card-alt);"></div><div style="height:180px;border-radius:16px;background:var(--bg-card-alt);"></div></div></div>';
    }
  }

  function getRegistrationMap() {
    return new Map(state.registrations.map(function (item) { return [item.eventId, item]; }));
  }

  function filteredEvents() {
    const todayKey = student.getLocalDateKey(new Date());
    const registrationMap = getRegistrationMap();
    return state.events.filter(function (event) {
      const registration = registrationMap.get(event.id);
      const query = state.query.trim().toLowerCase();
      const matchesSearch = !query || event.title.toLowerCase().includes(query) || event.venue.toLowerCase().includes(query);
      const matchesCategory = state.category === "all" || event.category === state.category;
      const matchesPeriod = state.period === "all" || (event.date || "").slice(0, 7) === todayKey.slice(0, 7);
      const matchesTab =
        state.tab === "all" ||
        (state.tab === "open" && !registration && event.seatsRemaining > 0) ||
        (state.tab === "joined" && registration && registration.status !== "waitlisted" && registration.status !== "cancelled") ||
        (state.tab === "waitlisted" && registration && registration.status === "waitlisted");
      return matchesSearch && matchesCategory && matchesPeriod && matchesTab;
    }).sort(function (left, right) {
      return (left.date + left.startTime).localeCompare(right.date + right.startTime);
    });
  }

  function actionState(event) {
    const registration = getRegistrationMap().get(event.id);
    if (registration && registration.status === "waitlisted") {
      return { label: "Waitlisted", disabled: true, tone: "pending" };
    }
    if (registration && registration.status !== "cancelled") {
      return { label: "Joined", disabled: true, tone: "approved" };
    }
    if (event.registrationDeadline && new Date(event.registrationDeadline).getTime() < Date.now()) {
      return { label: "Closed", disabled: true, tone: "draft" };
    }
    if (event.seatsRemaining <= 0) {
      return { label: "Join Waitlist", disabled: false, tone: "pending" };
    }
    return { label: "Join Event", disabled: false, tone: "approved" };
  }

  function renderTabs() {
    const root = document.getElementById("student-browse-tabs");
    if (!root) {
      return;
    }
    const registrationMap = getRegistrationMap();
    const counts = {
      all: state.events.length,
      open: state.events.filter(function (event) { return !registrationMap.has(event.id) && event.seatsRemaining > 0; }).length,
      joined: state.registrations.filter(function (item) { return item.status !== "waitlisted" && item.status !== "cancelled"; }).length,
      waitlisted: state.registrations.filter(function (item) { return item.status === "waitlisted"; }).length
    };
    const items = [["all", "All Events"], ["open", "Open to Join"], ["joined", "Joined"], ["waitlisted", "Waitlisted"]];
    root.innerHTML = items.map(function (item) {
      const active = state.tab === item[0] ? " active" : "";
      return '<button class="teacher-tab-pill' + active + '" type="button" data-tab="' + item[0] + '">' + item[1] + " (" + counts[item[0]] + ")</button>";
    }).join("");
  }

  function renderFilters() {
    const categoryFilter = document.getElementById("student-browse-category");
    const countNode = document.getElementById("student-browse-count");
    if (countNode) {
      countNode.textContent = state.events.length + " events available";
    }
    if (categoryFilter) {
      const categories = Array.from(new Set(state.events.map(function (event) { return event.category; }).filter(Boolean))).sort();
      categoryFilter.innerHTML = ['<option value="all">All Category</option>'].concat(categories.map(function (category) {
        return '<option value="' + student.escapeHtml(category) + '">' + student.escapeHtml(category) + "</option>";
      })).join("");
      categoryFilter.value = state.category;
    }
  }

  function renderGrid() {
    const root = document.getElementById("student-browse-grid");
    if (!root) {
      return;
    }
    const items = filteredEvents();
    if (!items.length) {
      root.innerHTML = '<div class="teacher-empty-state teacher-card" style="grid-column:1 / -1;"><span class="material-symbols-outlined" style="font-size:38px;color:var(--text-muted);">travel_explore</span><div>No approved events match this filter.</div></div>';
      return;
    }
    root.innerHTML = items.map(function (event) {
      const action = actionState(event);
      const progress = event.maxCapacity ? Math.min(100, Math.round((event.registrations / Math.max(1, event.maxCapacity)) * 100)) : 0;
      return '<article class="teacher-event-card" data-event-id="' + student.escapeHtml(event.id) + '"><div class="teacher-event-card-image"><img alt="' + student.escapeHtml(event.title) + '" src="' + student.escapeHtml(event.image || "") + '" /><span class="teacher-category-chip" style="position:absolute;top:10px;left:10px;background:#fff;color:var(--text-primary);">' + student.escapeHtml(event.category) + '</span><span class="teacher-badge ' + student.escapeHtml(action.tone) + '" style="position:absolute;top:10px;right:10px;">' + student.escapeHtml(action.label) + '</span></div><div class="teacher-event-card-body"><div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;"><div class="teacher-event-card-title">' + student.escapeHtml(event.title) + '</div><div class="teacher-event-card-price">' + student.escapeHtml(student.formatPrice(event.price)) + '</div></div><div class="teacher-event-meta"><span class="material-symbols-outlined" style="font-size:14px;">calendar_month</span><span>' + student.escapeHtml(student.formatShortDate(event.date)) + '</span><span>&bull;</span><span>' + student.escapeHtml(student.formatTime(event.startTime)) + '</span></div><div class="teacher-event-location"><span class="material-symbols-outlined" style="font-size:14px;color:var(--accent-red);">location_on</span><span>' + student.escapeHtml(event.venue) + '</span></div><div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:6px;"><div class="teacher-progress"><span class="capacity-bar-fill" style="width:' + progress + '%;background:' + (event.seatsRemaining <= 0 ? "#ef4444" : event.seatsRemaining <= 5 ? "#f59e0b" : "var(--text-primary)") + ';"></span></div><span class="seat-count" style="font-size:11px;font-weight:700;color:var(--text-secondary);">' + student.escapeHtml(String(event.seatsRemaining) + " seats left") + '</span><span class="capacity-percent" style="display:none;">' + progress + '%</span></div></div><div class="teacher-event-action-strip"><button type="button" data-open-event="' + student.escapeHtml(event.id) + '" style="color:#fff;font-size:12px;font-weight:700;">Open</button><button type="button" class="join-btn ' + (action.label === "Join Waitlist" ? "btn-waitlist" : action.label === "Join Event" ? "btn-join" : "btn-joined") + '" data-join-event="' + student.escapeHtml(event.id) + '" style="color:#fff;font-size:12px;font-weight:700;"' + (action.disabled ? " disabled" : "") + ">" + student.escapeHtml(action.label) + "</button></div></article>";
    }).join("");
  }

  function openEventModal(eventId) {
    const event = state.events.find(function (item) { return item.id === eventId; });
    if (!event) {
      return;
    }
    const action = actionState(event);
    const modal = student.mountModal(
      "student-event-detail-modal",
      event.title,
      "Live event details from the shared EMS database.",
      '<div class="teacher-two-column" style="grid-template-columns:minmax(0,1fr) 240px;gap:18px;"><div class="teacher-grid"><img alt="' + student.escapeHtml(event.title) + '" src="' + student.escapeHtml(event.image || "") + '" style="width:100%;height:220px;object-fit:cover;border-radius:16px;border:1px solid var(--border-card);" /><div class="teacher-card-sub">' + student.escapeHtml(event.description || "No description added yet.") + '</div><div class="teacher-form-grid"><div class="teacher-field"><label>Date</label><div class="teacher-field-value">' + student.escapeHtml(student.formatDate(event.date)) + '</div></div><div class="teacher-field"><label>Time</label><div class="teacher-field-value">' + student.escapeHtml(student.formatTime(event.startTime) + " - " + student.formatTime(event.endTime)) + '</div></div><div class="teacher-field"><label>Venue</label><div class="teacher-field-value">' + student.escapeHtml(event.venue) + '</div></div><div class="teacher-field"><label>Host</label><div class="teacher-field-value">' + student.escapeHtml(event.organizerName || "EMS") + '</div></div></div></div><div class="teacher-card" style="padding:18px;"><div style="font-size:40px;font-weight:700;text-align:center;">' + student.escapeHtml(String(event.seatsRemaining)) + '<span style="font-size:20px;color:var(--text-muted);">/' + student.escapeHtml(String(event.maxCapacity)) + '</span></div><div class="teacher-card-sub" style="text-align:center;margin-top:8px;">seats remaining</div><div class="teacher-progress" style="width:100%;height:12px;margin-top:14px;"><span style="width:' + Math.min(100, Math.round((event.registrations / Math.max(1, event.maxCapacity)) * 100)) + '%;background:' + (event.seatsRemaining <= 0 ? "#ef4444" : event.seatsRemaining <= 10 ? "#f59e0b" : "var(--text-primary)") + ';"></span></div><div style="margin-top:14px;text-align:center;"><span class="teacher-badge ' + student.escapeHtml(action.tone) + '">' + student.escapeHtml(action.label) + '</span></div><div style="margin-top:16px;font-size:24px;font-weight:700;text-align:center;">' + student.escapeHtml(student.formatPrice(event.price)) + '</div><div class="teacher-card-sub" style="text-align:center;">' + student.escapeHtml(event.price > 0 ? "Payment collected at venue" : "Free event") + '</div></div></div>',
      '<button class="teacher-btn-ghost" type="button" data-close-modal="true">Close</button><button class="teacher-btn" type="button" data-join-event="' + student.escapeHtml(event.id) + '"' + (action.disabled ? " disabled" : "") + ">" + student.escapeHtml(action.label) + "</button>"
    );
    modal.classList.add("open");
    modal.querySelector('[data-close-modal="true"]').addEventListener("click", function () {
      modal.classList.remove("open");
    });
  }

  async function joinEvent(eventId) {
    var joinButton = document.querySelector('[data-event-id="' + eventId + '"] .join-btn');
    var originalText = joinButton ? joinButton.textContent : "";
    try {
      if (joinButton) {
        joinButton.disabled = true;
        joinButton.textContent = "Joining...";
        joinButton.style.opacity = "0.7";
      }
      const response = await student.apiRequest("/registrations", {
        method: "POST",
        body: { eventId: eventId }
      });
      const previous = state.events.find(function (item) { return item.id === eventId; });
      state.registrations = [response].concat(state.registrations.filter(function (item) { return item.eventId !== eventId; }));
      state.events = state.events.map(function (item) {
        if (item.id !== eventId) {
          return item;
        }
        const nextRegistrations = item.registrations + (response.status === "registered" ? 1 : 0);
        return Object.assign({}, item, {
          registrations: nextRegistrations,
          seatsRemaining: Math.max(0, item.maxCapacity - nextRegistrations),
          myRegistrationStatus: response.status
        });
      });
      renderTabs();
      renderFilters();
      renderGrid();
      student.pushNotification(
        response.status === "waitlisted" ? "Waitlist updated" : "Event joined",
        response.status === "waitlisted"
          ? "You were added to the waitlist for " + (previous ? previous.title : "this event") + "."
          : "You successfully joined " + (previous ? previous.title : "this event") + ".",
        response.status === "waitlisted" ? "warning" : "success"
      );
      student.showMessage(
        response.status === "waitlisted"
          ? "The event filled up, so you were added to the waitlist."
          : "You joined this event successfully.",
        response.status === "waitlisted" ? "error" : "success"
      );
    } catch (error) {
      if (joinButton) {
        joinButton.textContent = originalText || "Join Event";
        joinButton.disabled = false;
        joinButton.style.opacity = "1";
      }
      student.showMessage(error.message || "Could not join this event yet.", "error");
    }
  }

  function patchSeatUpdate(data) {
    var eventId = String(data && (data.eventId || data.event_id) || "");
    if (!eventId) {
      return;
    }
    var currentCount = Number(data && (data.currentCount != null ? data.currentCount : data.current_count));
    var maxCapacity = Number(data && (data.maxCapacity != null ? data.maxCapacity : data.total_capacity));
    var seatsRemaining = Number(data && (data.seatsRemaining != null ? data.seatsRemaining : data.seats_remaining));
    var waitlistCount = Number(data && (data.waitlistCount != null ? data.waitlistCount : data.waitlist_count));
    if (Number.isNaN(currentCount) || Number.isNaN(maxCapacity) || Number.isNaN(seatsRemaining)) {
      return;
    }

    updateEventRecord(eventId, function (item) {
      return Object.assign({}, item, {
        registrations: currentCount,
        maxCapacity: maxCapacity || item.maxCapacity,
        seatsRemaining: seatsRemaining,
        waitlistCount: Number.isNaN(waitlistCount) ? item.waitlistCount : waitlistCount
      });
    });

    var card = document.querySelector('[data-event-id="' + eventId + '"]');
    if (!card) {
      renderTabs();
      return;
    }

    var percentage = maxCapacity > 0 ? Math.round(((maxCapacity - seatsRemaining) / maxCapacity) * 100) : 0;
    var seatEl = card.querySelector(".seat-count");
    var progressBar = card.querySelector(".capacity-bar-fill");
    var pctEl = card.querySelector(".capacity-percent");
    var joinBtn = card.querySelector(".join-btn");

    if (seatEl) {
      seatEl.textContent = Math.max(0, seatsRemaining) + " seats left";
      seatEl.style.background = "#FEF3CD";
      seatEl.style.color = "#92400E";
      seatEl.style.borderRadius = "999px";
      seatEl.style.padding = "2px 8px";
      window.setTimeout(function () {
        seatEl.style.background = "";
        seatEl.style.color = "";
        seatEl.style.borderRadius = "";
        seatEl.style.padding = "";
      }, 600);
    }

    if (progressBar) {
      progressBar.style.width = percentage + "%";
      if (seatsRemaining <= 5) {
        progressBar.style.background = "#EF4444";
      } else if (seatsRemaining <= 15) {
        progressBar.style.background = "#F59E0B";
      } else {
        progressBar.style.background = "var(--text-primary)";
      }
    }

    if (pctEl) {
      pctEl.textContent = percentage + "%";
    }

    if (joinBtn) {
      var registration = getRegistrationMap().get(eventId);
      if (!registration && seatsRemaining === 0) {
        joinBtn.textContent = "Join Waitlist";
        joinBtn.disabled = false;
      }
    }

    renderTabs();
  }

  function handleApprovedEvent(data) {
    var eventId = String(data && (data.eventId || data.event_id) || "");
    if (!eventId || state.events.some(function (item) { return item.id === eventId; })) {
      loadPage();
      return;
    }
    student.setBrowsePulseDot(true);
    loadPage();
  }

  function maybeOpenEventFromQuery() {
    var eventId = student.getQueryParam("event");
    if (!eventId) {
      return;
    }
    var matchedEvent = state.events.find(function (item) {
      return item.id === eventId;
    });
    if (!matchedEvent) {
      return;
    }
    openEventModal(eventId);
  }

  async function loadPage() {
    try {
      student.clearMessage();
      if (!document.querySelector(".teacher-shell")) {
        student.createShell();
      }
      renderLoaders();
      state.user = await student.loadStudentUser();
      if (!state.user) {
        return;
      }
      const results = await Promise.allSettled([
        student.retryApi("/events", 3, 700),
        student.retryApi("/registrations/me", 3, 700)
      ]);
      const previousIds = new Set(state.events.map(function (item) { return item.id; }));
      if (results[0].status === "fulfilled") {
        state.events = (results[0].value.items || []).map(student.normalizeEvent);
      }
      if (results[1].status === "fulfilled") {
        state.registrations = Array.isArray(results[1].value.items) ? results[1].value.items : [];
      }
      renderTabs();
      renderFilters();
      renderGrid();
      maybeOpenEventFromQuery();
      const newEventAvailable = state.events.some(function (item) { return !previousIds.has(item.id); });
      if (newEventAvailable && previousIds.size) {
        student.setBrowsePulseDot(true);
      }

      const failedResult = results.find(function (result) {
        return result.status === "rejected";
      });
      if (failedResult) {
        student.showMessage(
          failedResult.reason && failedResult.reason.message
            ? failedResult.reason.message
            : "Some browse data is still loading, but the available events are ready.",
          "error"
        );
      }
    } catch (error) {
      student.showMessage(error.message || "Browse Events could not finish loading yet.", "error");
    }
  }

  document.addEventListener("click", function (event) {
    const tab = event.target.closest("[data-tab]");
    const openButton = event.target.closest("[data-open-event]");
    const joinButton = event.target.closest("[data-join-event]");
    if (tab) {
      state.tab = tab.getAttribute("data-tab");
      renderTabs();
      renderGrid();
      return;
    }
    if (openButton) {
      openEventModal(openButton.getAttribute("data-open-event"));
      return;
    }
    if (joinButton && !joinButton.disabled) {
      joinEvent(joinButton.getAttribute("data-join-event"));
    }
  });

  const searchInput = document.getElementById("student-browse-search");
  const categoryFilter = document.getElementById("student-browse-category");
  const periodFilter = document.getElementById("student-browse-period");
  if (searchInput) {
    searchInput.addEventListener("input", function () {
      state.query = searchInput.value || "";
      renderGrid();
    });
  }
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
    window.EMS_REALTIME.ensureConnection("student");
    window.EMS_REALTIME.onMessage(function (message) {
      const type = String(message && message.type || "");
      if (["registration_cancelled"].includes(type)) {
        loadPage();
      }
    });
    if (typeof window.onRealtimeMessage === "function") {
      window.onRealtimeMessage("seat_updated", patchSeatUpdate);
      window.onRealtimeMessage("event_approved", handleApprovedEvent);
    }
  }
  loadPage();
  window.setInterval(loadPage, 15000);
})();
