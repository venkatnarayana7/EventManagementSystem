(function () {
  const student = window.EMS_STUDENT;
  const state = {
    user: null
  };

  async function sendPasswordReset() {
    try {
      await student.apiRequest("/auth/password-reset/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: { email: state.user.email }
      });
      student.showMessage("Password reset email sent. Your current password stays active until you complete the reset.", "success");
    } catch (error) {
      student.showMessage(error.message || "Password reset email could not be sent.", "error");
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

      const emailNode = document.getElementById("student-settings-email");
      if (emailNode) {
        emailNode.value = state.user.email || "";
      }
    } catch (error) {
      student.showMessage(error.message || "Settings could not finish loading yet.", "error");
    }
  }

  const sendResetButton = document.getElementById("student-send-reset");
  if (sendResetButton) {
    sendResetButton.addEventListener("click", sendPasswordReset);
  }

  loadPage();
})();
