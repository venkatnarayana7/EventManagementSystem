(function () {
  const config = window.EMS_CONFIG || {};
  const apiBaseUrl = String(config.apiBaseUrl || window.location.origin).replace(/\/$/, "") + "/";
  const dashboardPath = config.dashboardPath || "/dashboard.html";
  const teacherDashboardPath = config.teacherDashboardPath || "/teacher-dashboard.html";
  const studentDashboardPath = config.studentDashboardPath || "/student-dashboard.html";
  const storageKey = "ems.auth.tokens";

  function getRoleStorageKey(role) {
    return storageKey + "." + String(role || "admin").toLowerCase();
  }

  const signInButton = document.getElementById("signin-submit");
  const signUpButton = document.getElementById("signup-submit");
  const forgotPasswordLink = document.getElementById("signin-forgot-password");
  const signInEmailInput = document.getElementById("signin-email");

  function getUiUrl(path) {
    return /^https?:\/\//i.test(path) ? path : new URL(path, window.location.origin).toString();
  }

  function getApiUrl(path) {
    return new URL(path.replace(/^\//, ""), apiBaseUrl).toString();
  }

  function showToast(message, isError) {
    let toast = document.getElementById("ems-auth-toast");

    if (!toast) {
      toast = document.createElement("div");
      toast.id = "ems-auth-toast";
      toast.style.position = "fixed";
      toast.style.top = "20px";
      toast.style.right = "20px";
      toast.style.zIndex = "9999";
      toast.style.padding = "12px 16px";
      toast.style.borderRadius = "12px";
      toast.style.fontFamily = "Sora, 'DM Sans', sans-serif";
      toast.style.fontSize = "14px";
      toast.style.fontWeight = "600";
      toast.style.boxShadow = "0 10px 35px rgba(0,0,0,0.18)";
      toast.style.maxWidth = "340px";
      toast.style.transition = "opacity 0.2s ease";
      document.body.appendChild(toast);
    }

    toast.style.background = isError ? "#ef4444" : "#1a1a2e";
    toast.style.color = "#ffffff";
    toast.textContent = message;
    toast.style.opacity = "1";

    clearTimeout(window.__emsToastTimer);
    window.__emsToastTimer = setTimeout(function () {
      toast.style.opacity = "0";
    }, 4000);
  }

  function decodeJwt(token) {
    const parts = String(token || "").split(".");
    if (parts.length < 2) {
      return null;
    }

    try {
      const normalized = parts[1].replace(/-/g, "+").replace(/_/g, "/");
      return JSON.parse(atob(normalized));
    } catch (_error) {
      return null;
    }
  }

  function saveTokens(authenticationResult, role) {
    const payload = {
      accessToken: authenticationResult.AccessToken,
      idToken: authenticationResult.IdToken,
      refreshToken: authenticationResult.RefreshToken || null,
      expiresIn: authenticationResult.ExpiresIn || 3600,
      issuedAt: Date.now()
    };

    window.localStorage.setItem(storageKey, JSON.stringify(payload));
    window.localStorage.setItem(getRoleStorageKey(role), JSON.stringify(payload));
    return payload;
  }

  function loadTokens() {
    try {
      const raw = window.localStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : null;
    } catch (_error) {
      return null;
    }
  }

  function clearTokens() {
    window.localStorage.removeItem(storageKey);
  }

  function getValidIdToken() {
    const tokens = loadTokens();
    if (!tokens || !tokens.idToken) {
      return null;
    }

    const claims = decodeJwt(tokens.idToken);
    if (!claims || !claims.exp || Date.now() >= claims.exp * 1000) {
      clearTokens();
      return null;
    }

    return tokens.idToken;
  }

  async function postApi(path, body) {
    const response = await fetch(getApiUrl(path), {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    const payload = await response.json().catch(function () {
      return {};
    });

    if (!response.ok) {
      throw new Error(payload.message || "Request failed");
    }

    return payload;
  }

  function getRoleHomePath(role) {
    const normalized = String(role || "").toLowerCase();
    if (normalized === "teacher") {
      return teacherDashboardPath;
    }
    if (normalized === "student") {
      return studentDashboardPath;
    }
    return dashboardPath;
  }

  function handleApprovedSignIn(authenticationResult, email) {
    const claims = decodeJwt(authenticationResult.IdToken) || {};
    const role = String(claims["custom:role"] || "admin").toLowerCase();
    const tokens = saveTokens(authenticationResult, role);

    if (role === "admin" || role === "teacher" || role === "student") {
      showToast("Welcome " + (claims.name || email) + ". Redirecting to your dashboard.", false);
      setTimeout(function () {
        window.location.assign(getUiUrl(getRoleHomePath(role)));
      }, 300);
      return;
    }

    showToast("Your " + role + " account is approved. This portal section will be connected next.", false);
  }

  async function handlePasswordReset(event) {
    event.preventDefault();

    const email = window.prompt("Enter your account email to receive a password reset code.", (signInEmailInput && signInEmailInput.value.trim()) || "");
    if (!email) {
      return;
    }

    try {
      await postApi("/auth/password-reset/request", { email: email.trim().toLowerCase() });
      showToast("Password reset code sent to your email.", false);

      const confirmationCode = window.prompt("Enter the verification code from your email.");
      if (!confirmationCode) {
        return;
      }

      const newPassword = window.prompt("Enter your new password.");
      if (!newPassword) {
        return;
      }

      await postApi("/auth/password-reset/confirm", {
        email: email.trim().toLowerCase(),
        confirmationCode: confirmationCode.trim(),
        password: newPassword
      });

      showToast("Password changed successfully. Use the new password from now on.", false);
    } catch (error) {
      showToast(error.message, true);
    }
  }

  async function checkSession() {
    const idToken = getValidIdToken();
    if (!idToken) {
      clearTokens();
      return;
    }

    const claims = decodeJwt(idToken) || {};
    showToast("Active session found for " + (claims.email || "this account") + ".", false);
  }

  if (signUpButton) {
    signUpButton.addEventListener("click", async function () {
      const fullName = document.getElementById("signup-name").value.trim();
      const email = document.getElementById("signup-email").value.trim().toLowerCase();
      const password = document.getElementById("signup-password").value;
      const role = document.getElementById("signup-role").value.trim().toLowerCase();
      const termsAccepted = document.getElementById("signup-terms").checked;

      if (!termsAccepted) {
        showToast("Please accept the terms to continue.", true);
        return;
      }

      signUpButton.disabled = true;
      const originalLabel = signUpButton.textContent;
      signUpButton.textContent = "Creating...";

      try {
        const response = await postApi("/auth/signup", {
          fullName: fullName,
          email: email,
          password: password,
          role: role
        });

        if (response.tokens) {
          handleApprovedSignIn(response.tokens, email);
        } else {
          showToast(response.message || "Signup submitted successfully.", false);
        }
      } catch (error) {
        showToast(error.message, true);
      } finally {
        signUpButton.disabled = false;
        signUpButton.textContent = originalLabel;
      }
    });
  }

  if (signInButton) {
    signInButton.addEventListener("click", async function () {
      const email = document.getElementById("signin-email").value.trim().toLowerCase();
      const password = document.getElementById("signin-password").value;
      const role = document.getElementById("signin-role").value.trim().toLowerCase();

      signInButton.disabled = true;
      const originalLabel = signInButton.textContent;
      signInButton.textContent = "Signing In...";

      try {
        const response = await postApi("/auth/signin", {
          email: email,
          password: password,
          role: role
        });

        handleApprovedSignIn(response.tokens, email);
      } catch (error) {
        clearTokens();
        showToast(error.message, true);
      } finally {
        signInButton.disabled = false;
        signInButton.textContent = originalLabel;
      }
    });
  }

  if (forgotPasswordLink) {
    forgotPasswordLink.addEventListener("click", handlePasswordReset);
  }

  checkSession();
})();
