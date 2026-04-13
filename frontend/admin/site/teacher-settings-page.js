(function () {
  const teacher = window.EMS_TEACHER;
  const state = {
    activeSection: "account",
    user: null
  };

  function renderNav() {
    const root = document.getElementById("teacher-settings-nav");
    if (!root) {
      return;
    }
    const items = [
      ["account", "manage_accounts", "Account"],
      ["security", "shield_lock", "Security"]
    ];
    root.innerHTML = items.map(function (item) {
      const active = state.activeSection === item[0] ? " active" : "";
      return '<button class="teacher-subnav-item' + active + '" type="button" data-section="' + item[0] + '"><span class="material-symbols-outlined" style="font-size:18px;">' + item[1] + "</span><span>" + item[2] + "</span></button>";
    }).join("");
  }

  function renderAccountSection(root) {
    root.innerHTML = [
      '<div class="teacher-card-head"><div><div class="teacher-card-title">Account Settings</div><div class="teacher-card-sub">Your teacher role and approvals are linked to your email account in the shared backend.</div></div></div>',
      '<div class="teacher-form-grid">',
      '<div class="teacher-field"><label>Email</label><div class="teacher-field-value">' + teacher.escapeHtml(state.user.email || "") + "</div></div>",
      '<div class="teacher-field"><label>Role</label><div class="teacher-field-value">' + teacher.escapeHtml(String(state.user.role || "teacher").toUpperCase()) + "</div></div>",
      '<div class="teacher-field"><label>Approval Status</label><div class="teacher-field-value">' + teacher.escapeHtml(String(state.user.approvalStatus || "approved")) + "</div></div>",
      '<div class="teacher-field"><label>Profile ID</label><div class="teacher-field-value">' + teacher.escapeHtml(state.user.profileId || "") + "</div></div>",
      '<div class="teacher-field full"><label>How access works</label><div class="teacher-field-value" style="min-height:84px;">Teachers can sign in only with the exact role approved for their email. Admin approvals are handled from the admin portal settings page.</div></div>',
      "</div>"
    ].join("");
  }

  function renderSecuritySection(root) {
    root.innerHTML = [
      '<div class="teacher-card-head"><div><div class="teacher-card-title">Security Settings</div><div class="teacher-card-sub">Request a password reset email and confirm it with the code from your inbox.</div></div></div>',
      '<div class="teacher-form-grid">',
      '<div class="teacher-field full"><label>Email</label><div class="teacher-field-value">' + teacher.escapeHtml(state.user.email || "") + "</div></div>",
      '<div class="teacher-field full"><button class="teacher-btn" type="button" id="teacher-password-reset-request">Send Password Reset Email</button></div>',
      '<div class="teacher-field"><label>Verification Code</label><input id="teacher-reset-code" placeholder="Enter code from email" /></div>',
      '<div class="teacher-field"><label>New Password</label><input id="teacher-reset-password" type="password" placeholder="Enter new password" /></div>',
      '<div class="teacher-field full"><button class="teacher-btn-outline" type="button" id="teacher-password-reset-confirm">Confirm New Password</button></div>',
      "</div>"
    ].join("");

    const requestButton = document.getElementById("teacher-password-reset-request");
    const confirmButton = document.getElementById("teacher-password-reset-confirm");
    const codeInput = document.getElementById("teacher-reset-code");
    const passwordInput = document.getElementById("teacher-reset-password");
    const apiBase = String(teacher.config.apiBaseUrl || "").replace(/\/$/, "") + "/";

    if (requestButton) {
      requestButton.addEventListener("click", async function () {
        try {
          teacher.clearMessage();
          await fetch(new URL("auth/password-reset/request", apiBase).toString(), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: state.user.email })
          }).then(async function (response) {
            const payload = await response.json().catch(function () { return {}; });
            if (!response.ok) {
              throw new Error(payload.message || "Password reset request failed");
            }
          });
          teacher.showMessage("Password reset code sent successfully.", "success");
        } catch (error) {
          teacher.showMessage(error.message || "Password reset request failed.", "error");
        }
      });
    }

    if (confirmButton) {
      confirmButton.addEventListener("click", async function () {
        try {
          teacher.clearMessage();
          await fetch(new URL("auth/password-reset/confirm", apiBase).toString(), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: state.user.email,
              confirmationCode: codeInput.value.trim(),
              password: passwordInput.value
            })
          }).then(async function (response) {
            const payload = await response.json().catch(function () { return {}; });
            if (!response.ok) {
              throw new Error(payload.message || "Password reset confirmation failed");
            }
          });
          teacher.showMessage("Password updated successfully.", "success");
          codeInput.value = "";
          passwordInput.value = "";
        } catch (error) {
          teacher.showMessage(error.message || "Password reset confirmation failed.", "error");
        }
      });
    }
  }

  function renderContent() {
    const root = document.getElementById("teacher-settings-content");
    if (!root || !state.user) {
      return;
    }
    if (state.activeSection === "security") {
      renderSecuritySection(root);
      return;
    }
    renderAccountSection(root);
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
      renderNav();
      renderContent();
    } catch (error) {
      teacher.showMessage(error.message || "Teacher settings could not finish loading yet.", "error");
    }
  }

  document.addEventListener("click", function (event) {
    const button = event.target.closest("[data-section]");
    if (!button) {
      return;
    }
    state.activeSection = button.getAttribute("data-section");
    renderNav();
    renderContent();
  });

  loadPage();
})();
