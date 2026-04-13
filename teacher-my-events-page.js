(function () {
  const teacher = window.EMS_TEACHER;
  const state = {
    user: null,
    events: [],
    query: "",
    status: "all",
    category: "all",
    tab: "all",
    saving: false,
    editingId: null,
    createTags: [],
    createFreeEvent: false,
    isUploadingBanner: false
  };

  const refs = {
    createButton: document.getElementById("my-events-create"),
    createFab: document.getElementById("teacher-create-event-button"),
    createModal: document.getElementById("teacher-create-event-modal"),
    createTitle: document.getElementById("teacher-create-event-title"),
    createSubtitle: document.getElementById("teacher-create-event-subtitle"),
    createNote: document.getElementById("teacher-create-note"),
    createClose: document.getElementById("teacher-create-event-close"),
    createCancel: document.getElementById("teacher-create-event-cancel"),
    createForm: document.getElementById("teacher-create-event-form"),
    createSubmit: document.getElementById("teacher-create-event-submit"),
    freeToggle: document.getElementById("teacher-event-free-toggle"),
    priceInput: document.getElementById("teacher-event-price-input"),
    priceShell: document.getElementById("teacher-event-price-shell"),
    tagsWrap: document.getElementById("teacher-event-tags-wrap"),
    tagsChipInput: document.getElementById("teacher-event-tags-chip-input"),
    tagsInput: document.getElementById("teacher-event-tags-input"),
    bannerFile: document.getElementById("teacher-event-banner-file"),
    bannerStatus: document.getElementById("teacher-event-banner-status"),
    departmentInput: document.getElementById("teacher-event-department-input")
  };

  function createTempEventId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }

    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (char) {
      const rand = Math.random() * 16 | 0;
      const value = char === "x" ? rand : (rand & 0x3) | 0x8;
      return value.toString(16);
    });
  }

  function getBuckets() {
    const todayKey = teacher.getLocalDateKey(new Date());
    return state.events.reduce(function (acc, event) {
      const status = teacher.mapEventStatus(event.status);
      acc.all += 1;
      if (status === "draft") {
        acc.draft += 1;
      } else if (status === "rejected") {
        acc.rejected += 1;
      } else if (status === "pending") {
        acc.pending += 1;
      } else if (String(event.date || "") < todayKey || status === "completed" || status === "cancelled") {
        acc.past += 1;
      } else {
        acc.active += 1;
      }
      return acc;
    }, { all: 0, active: 0, pending: 0, draft: 0, past: 0, rejected: 0 });
  }

  function matchesTab(event) {
    const status = teacher.mapEventStatus(event.status);
    const todayKey = teacher.getLocalDateKey(new Date());
    const isPast = status === "completed" || status === "cancelled" || String(event.date || "") < todayKey;
    if (state.tab === "all") {
      return true;
    }
    if (state.tab === "past") {
      return isPast && status !== "draft";
    }
    if (state.tab === "active") {
      return !isPast && status === "approved";
    }
    return status === state.tab;
  }

  function filteredEvents() {
    return state.events.filter(function (event) {
      const status = teacher.mapEventStatus(event.status);
      const query = state.query.trim().toLowerCase();
      const matchesSearch = !query || event.title.toLowerCase().includes(query) || event.venue.toLowerCase().includes(query);
      const matchesStatus = state.status === "all" || status === state.status;
      const matchesCategory = state.category === "all" || event.category === state.category;
      return matchesSearch && matchesStatus && matchesCategory && matchesTab(event);
    }).sort(function (left, right) {
      return (right.date + right.startTime).localeCompare(left.date + left.startTime);
    });
  }

  function renderTabs() {
    const root = document.getElementById("my-events-tabs");
    const buckets = getBuckets();
    if (!root) {
      return;
    }
    const items = [["all", "All"], ["active", "Active"], ["pending", "Pending"], ["draft", "Draft"], ["past", "Past"], ["rejected", "Rejected"]];
    root.innerHTML = items.map(function (item) {
      const active = state.tab === item[0] ? " active" : "";
      return '<button class="teacher-tab-pill' + active + '" type="button" data-tab="' + item[0] + '">' + item[1] + " (" + buckets[item[0]] + ")</button>";
    }).join("");
  }

  function renderFilters() {
    const countNode = document.getElementById("my-events-count");
    const categoryFilter = document.getElementById("my-events-category-filter");
    if (countNode) {
      countNode.textContent = filteredEvents().length + " events loaded from the shared live event table.";
    }
    if (categoryFilter) {
      const categories = Array.from(new Set(state.events.map(function (event) { return event.category; }).filter(Boolean))).sort();
      categoryFilter.innerHTML = ['<option value="all">All Category</option>'].concat(categories.map(function (category) {
        return '<option value="' + teacher.escapeHtml(category) + '">' + teacher.escapeHtml(category) + "</option>";
      })).join("");
      categoryFilter.value = state.category;
    }
  }

  function eventActions(event) {
    return '<div class="teacher-event-action-strip"><a href="teacher-event-detail.html?event=' + encodeURIComponent(event.id) + '" style="color:#fff;font-size:12px;font-weight:700;">View</a><button type="button" data-edit-event="' + teacher.escapeHtml(event.id) + '" style="color:#fff;font-size:12px;font-weight:700;">Edit</button></div>';
  }

  function statusBanner(event) {
    const status = teacher.mapEventStatus(event.status);
    if (status === "pending") {
      return '<div class="teacher-event-bottom-banner pending"><span class="material-symbols-outlined" style="font-size:14px;">hourglass_top</span><span>Awaiting admin approval</span></div>';
    }
    if (status === "rejected") {
      return '<div class="teacher-event-bottom-banner rejected"><span class="material-symbols-outlined" style="font-size:14px;">error</span><span>' + teacher.escapeHtml(event.rejectionReason || "Rejected by admin") + "</span></div>";
    }
    return "";
  }

  function renderGrid() {
    const root = document.getElementById("my-events-grid");
    if (!root) {
      return;
    }
    const items = filteredEvents();
    if (!items.length) {
      root.innerHTML = '<div class="teacher-empty-state teacher-card" style="grid-column:1 / -1;"><span class="material-symbols-outlined" style="font-size:38px;color:var(--text-muted);">event_busy</span><div>No matching events yet.</div></div>';
      return;
    }
    root.innerHTML = items.map(function (event) {
      return teacher.createEventCard(event, {
        bottomBanner: statusBanner(event),
        actionStrip: eventActions(event)
      });
    }).join("");
  }

  function updateBannerStatus(message, tone) {
    if (!refs.bannerStatus) {
      return;
    }

    refs.bannerStatus.textContent = message;
    refs.bannerStatus.style.background =
      tone === "success"
        ? "#eef5f1"
        : tone === "uploading"
          ? "#eef2fb"
          : "#f3efe8";
    refs.bannerStatus.style.color =
      tone === "success"
        ? "#2f6b54"
        : tone === "uploading"
          ? "#315b9b"
          : "#6b7280";
  }

  function syncCreateTags() {
    if (refs.tagsWrap) {
      refs.tagsWrap.innerHTML = state.createTags.map(function (tag) {
        return '<span class="teacher-create-chip">' + teacher.escapeHtml(tag) + '<button class="teacher-create-chip-remove" type="button" data-remove-create-tag="' + teacher.escapeHtml(tag) + '">&times;</button></span>';
      }).join("");
    }

    if (refs.tagsInput) {
      refs.tagsInput.value = state.createTags.join(",");
    }
  }

  function syncCreatePricing() {
    if (refs.freeToggle) {
      refs.freeToggle.classList.toggle("on", state.createFreeEvent);
      refs.freeToggle.setAttribute("aria-pressed", String(state.createFreeEvent));
    }

    if (refs.priceInput) {
      refs.priceInput.disabled = state.createFreeEvent;
      if (state.createFreeEvent) {
        refs.priceInput.value = "";
      }
    }

    if (refs.priceShell) {
      refs.priceShell.classList.toggle("disabled", state.createFreeEvent);
    }
  }

  function resetCreateFormState() {
    state.createTags = [];
    state.createFreeEvent = false;
    syncCreateTags();
    syncCreatePricing();
    updateBannerStatus("No banner selected", "idle");
    if (refs.createSubmit) {
      refs.createSubmit.textContent = "Done";
      refs.createSubmit.disabled = false;
    }
  }

  async function uploadBanner(file) {
    const contentType = String(file.type || "").toLowerCase();
    if (contentType !== "image/png" && contentType !== "image/jpeg") {
      throw new Error("Banner image must be a PNG or JPG file.");
    }

    state.isUploadingBanner = true;
    updateBannerStatus("Uploading banner...", "uploading");

    try {
      const presigned = await teacher.apiRequest("/media/presign", {
        method: "POST",
        body: {
          eventId: state.editingId || createTempEventId(),
          filename: file.name,
          contentType: contentType
        }
      });
      const response = await fetch(presigned.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": contentType },
        body: file
      });
      if (!response.ok) {
        throw new Error("Banner upload failed.");
      }

      updateBannerStatus("Banner ready: " + file.name, "success");
      return presigned.key && teacher.config.mediaBaseUrl
        ? String(teacher.config.mediaBaseUrl).replace(/\/$/, "") + "/" + presigned.key
        : teacher.resolveMediaUrl(presigned.publicUrl || "");
    } finally {
      state.isUploadingBanner = false;
    }
  }

  function openCreateModal(event) {
    state.editingId = event ? event.id : null;
    if (!refs.createModal || !refs.createForm) {
      return;
    }

    refs.createForm.reset();
    resetCreateFormState();

    if (refs.createTitle) {
      refs.createTitle.textContent = event ? "Edit Event" : "Create New Event";
    }
    if (refs.createSubtitle) {
      refs.createSubtitle.textContent = event
        ? "Update the event details here. Changes stay connected to the same shared platform."
        : "Submit a new event to the shared platform. Teacher events go to admin approval after creation.";
    }
    if (refs.createNote) {
      refs.createNote.textContent = event
        ? "Edits stay linked to this shared event and refresh across the connected portals."
        : "Teacher-created events are submitted for admin approval before they become active in every portal.";
    }
    if (refs.createSubmit) {
      refs.createSubmit.textContent = event ? "Save Changes" : "Done";
    }

    if (event) {
      refs.createForm.elements.title.value = event.title || "";
      refs.createForm.elements.description.value = event.description || "";
      refs.createForm.elements.eventType.value = event.category || "Technology";
      refs.createForm.elements.venue.value = event.venue || "";
      refs.createForm.elements.eventDate.value = event.date || "";
      refs.createForm.elements.startTime.value = event.startTime || "";
      refs.createForm.elements.endTime.value = event.endTime || "";
      refs.createForm.elements.maxCapacity.value = event.maxCapacity || "";
      refs.createForm.elements.registrationDeadline.value = event.registrationDeadline ? String(event.registrationDeadline).slice(0, 16) : "";
      refs.createForm.elements.posterUrl.value = event.image || "";
      refs.createForm.elements.isPublic.checked = event.status !== "draft";
      if (refs.departmentInput) {
        refs.departmentInput.value = event.department === "Open" ? "" : (event.department || "");
      }
      state.createTags = Array.isArray(event.tags) ? event.tags.slice(0, 6) : [];
      state.createFreeEvent = Number(event.price || 0) <= 0;
      if (!state.createFreeEvent && refs.priceInput) {
        refs.priceInput.value = String(event.price || "");
      }
      if (event.image) {
        updateBannerStatus("Current banner ready", "success");
      }
    } else if (refs.departmentInput && state.user && state.user.department) {
      refs.departmentInput.value = state.user.department;
    }

    syncCreateTags();
    syncCreatePricing();
    refs.createModal.classList.add("open");
    refs.createModal.setAttribute("aria-hidden", "false");
  }

  function closeCreateModal() {
    if (!refs.createModal) {
      return;
    }
    refs.createModal.classList.remove("open");
    refs.createModal.setAttribute("aria-hidden", "true");
    state.editingId = null;
  }

  function buildCreatePayload(formData) {
    return {
      title: String(formData.get("title") || "").trim(),
      description: String(formData.get("description") || "").trim(),
      eventType: String(formData.get("eventType") || "").trim(),
      price: state.createFreeEvent ? 0 : Number(formData.get("price") || 0),
      venue: String(formData.get("venue") || "").trim(),
      eventDate: String(formData.get("eventDate") || "").trim(),
      startTime: String(formData.get("startTime") || "").trim(),
      endTime: String(formData.get("endTime") || "").trim(),
      maxCapacity: Number(formData.get("maxCapacity") || 0),
      registrationDeadline: String(formData.get("registrationDeadline") || "").trim()
        ? new Date(String(formData.get("registrationDeadline"))).toISOString()
        : undefined,
      posterUrl: String(formData.get("posterUrl") || "").trim() || undefined,
      departmentFilter: String(formData.get("departmentFilter") || "").trim() || undefined,
      isPublic: Boolean(formData.get("isPublic")),
      tags: String(formData.get("tags") || "")
        .split(",")
        .map(function (tag) { return tag.trim(); })
        .filter(Boolean)
    };
  }

  async function submitCreateForm(submitEvent) {
    submitEvent.preventDefault();
    if (!refs.createForm || state.saving) {
      return;
    }

    const formData = new FormData(refs.createForm);
    const payload = buildCreatePayload(formData);
    const bannerFile = refs.bannerFile && refs.bannerFile.files ? refs.bannerFile.files[0] : null;
    const currentEvent = state.editingId
      ? state.events.find(function (item) { return item.id === state.editingId; })
      : null;

    if (!payload.title || !payload.venue || !payload.eventDate || !payload.startTime || !payload.endTime || !payload.maxCapacity) {
      teacher.showMessage("Please complete the required event fields first.", "error");
      return;
    }

    state.saving = true;
    teacher.clearMessage();
    if (refs.createSubmit) {
      refs.createSubmit.disabled = true;
      refs.createSubmit.textContent = currentEvent ? "Saving..." : "Creating...";
    }

    try {
      if (bannerFile) {
        payload.posterUrl = await uploadBanner(bannerFile);
      } else if (currentEvent && currentEvent.image) {
        payload.posterUrl = currentEvent.image;
      }

      const result = currentEvent
        ? await teacher.apiRequest("/events/" + currentEvent.id, { method: "PUT", body: payload })
        : await teacher.apiRequest("/events", { method: "POST", body: payload });
      const normalized = teacher.normalizeEvent(result);
      const existingIndex = state.events.findIndex(function (item) { return item.id === normalized.id; });
      if (existingIndex >= 0) {
        state.events.splice(existingIndex, 1, normalized);
      } else {
        state.events.unshift(normalized);
      }
      teacher.pushNotification(currentEvent ? "Event updated" : "Event created", normalized.title + " synced to the shared portal.");
      refs.createForm.reset();
      resetCreateFormState();
      closeCreateModal();
      renderTabs();
      renderFilters();
      renderGrid();
    } catch (error) {
      teacher.showMessage(error.message || "Event save failed.", "error");
    } finally {
      state.saving = false;
      state.isUploadingBanner = false;
      if (refs.createSubmit) {
        refs.createSubmit.disabled = false;
        refs.createSubmit.textContent = currentEvent ? "Save Changes" : "Done";
      }
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
      const payload = await teacher.retryApi("/events?mine=true", 3, 800);
      state.events = (payload.items || []).map(teacher.normalizeEvent);
      renderTabs();
      renderFilters();
      renderGrid();
    } catch (error) {
      teacher.showMessage(error.message || "My Events could not finish loading yet.", "error");
    }
  }

  document.addEventListener("click", function (event) {
    const tab = event.target.closest("[data-tab]");
    const editButton = event.target.closest("[data-edit-event]");
    if (tab) {
      state.tab = tab.getAttribute("data-tab");
      renderTabs();
      renderGrid();
      return;
    }
    if (editButton) {
      const target = state.events.find(function (item) { return item.id === editButton.getAttribute("data-edit-event"); });
      if (target) {
        openCreateModal(target);
      }
    }
  });

  const searchInput = document.getElementById("my-events-search");
  const statusFilter = document.getElementById("my-events-status-filter");
  const categoryFilter = document.getElementById("my-events-category-filter");

  if (searchInput) {
    searchInput.addEventListener("input", function () {
      state.query = searchInput.value || "";
      renderGrid();
    });
  }
  if (statusFilter) {
    statusFilter.addEventListener("change", function () {
      state.status = statusFilter.value || "all";
      renderGrid();
    });
  }
  if (categoryFilter) {
    categoryFilter.addEventListener("change", function () {
      state.category = categoryFilter.value || "all";
      renderGrid();
    });
  }
  if (refs.createButton) {
    refs.createButton.addEventListener("click", function () {
      openCreateModal(null);
    });
  }
  if (refs.createFab) {
    refs.createFab.addEventListener("click", function () {
      openCreateModal(null);
    });
  }
  if (refs.createClose) {
    refs.createClose.addEventListener("click", closeCreateModal);
  }
  if (refs.createCancel) {
    refs.createCancel.addEventListener("click", closeCreateModal);
  }
  if (refs.createModal) {
    refs.createModal.addEventListener("click", function (event) {
      if (event.target === refs.createModal) {
        closeCreateModal();
      }
    });
  }
  if (refs.createForm) {
    refs.createForm.addEventListener("submit", submitCreateForm);
  }
  if (refs.bannerFile) {
    refs.bannerFile.addEventListener("change", function () {
      const file = refs.bannerFile.files && refs.bannerFile.files[0];
      if (!file) {
        updateBannerStatus("No banner selected", "idle");
        return;
      }
      updateBannerStatus("Selected: " + file.name, "success");
    });
  }
  if (refs.freeToggle) {
    refs.freeToggle.addEventListener("click", function () {
      state.createFreeEvent = !state.createFreeEvent;
      syncCreatePricing();
    });
  }
  if (refs.tagsChipInput) {
    refs.tagsChipInput.addEventListener("keydown", function (event) {
      if (event.key !== "Enter") {
        return;
      }
      event.preventDefault();
      const value = refs.tagsChipInput.value.trim();
      if (!value || state.createTags.length >= 6 || state.createTags.includes(value)) {
        return;
      }
      state.createTags.push(value);
      refs.tagsChipInput.value = "";
      syncCreateTags();
    });
  }
  if (refs.tagsWrap) {
    refs.tagsWrap.addEventListener("click", function (event) {
      const button = event.target.closest("[data-remove-create-tag]");
      if (!button) {
        return;
      }
      event.preventDefault();
      const value = button.getAttribute("data-remove-create-tag");
      state.createTags = state.createTags.filter(function (tag) {
        return tag !== value;
      });
      syncCreateTags();
    });
  }

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      closeCreateModal();
    }
  });

  if (window.EMS_REALTIME) {
    window.EMS_REALTIME.ensureConnection("teacher");
    window.EMS_REALTIME.onMessage(function (message) {
      const type = String(message && message.type || "");
      if (["event_approved", "event_rejected", "new_registration", "seat_updated", "registration_cancelled"].includes(type)) {
        loadPage();
      }
    });
  }
  loadPage();
  resetCreateFormState();
  window.setInterval(loadPage, 15000);
})();
