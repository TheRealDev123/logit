/**
 * Log it - Authentication & Workspace Layout Controller
 * File Path: js/auth.js
 */
let currentUser = JSON.parse(localStorage.getItem("logit_user") || "null");

function updateNav() {
  const loggedOutNav = document.getElementById("loggedOutNav");
  const loggedInNav = document.getElementById("loggedInNav");
  const navUserName = document.getElementById("navUserName");
  const sidebar = document.getElementById("appSidebar");

  if (currentUser) {
    document.body.classList.remove("is-logged-out");
    document.body.classList.add("is-logged-in");
    
    loggedOutNav.style.display = "none";
    loggedInNav.style.display = "flex";
    if (sidebar) sidebar.classList.remove("is-hidden");
    
    if (currentUser.isAdmin) {
      navUserName.innerHTML = `👑 @${currentUser.username} <span class="admin-badge">ADMIN</span>`;
    } else {
      navUserName.textContent = `@${currentUser.username}`;
    }
  } else {
    document.body.classList.remove("is-logged-in");
    document.body.classList.add("is-logged-out");
    
    loggedOutNav.style.display = "flex";
    loggedInNav.style.display = "none";
    if (sidebar) sidebar.classList.add("is-hidden");
  }
}

// 1. SIGNUP
async function handleSignup(e) {
  e.preventDefault();
  const name = document.getElementById("signupName").value.trim();
  const username = document.getElementById("signupUsername").value.trim().toLowerCase();
  const email = document.getElementById("signupEmail").value.trim().toLowerCase();
  const password = document.getElementById("signupPassword").value.trim();
  const btn = document.getElementById("signupBtn");

  btn.disabled = true;
  btn.textContent = "Creating Account...";

  try {
    const data = await callApi({
      action: "signup",
      name: name,
      username: username,
      email: email,
      password: password
    });

    currentUser = data;
    localStorage.setItem("logit_user", JSON.stringify(currentUser));
    updateNav();
    showView("dash");
    initDashboard();
  } catch (err) {
    console.error(err);
  } finally {
    btn.disabled = false;
    btn.textContent = "Create Account";
  }
}

// 2. LOGIN
async function handleLogin(e) {
  e.preventDefault();
  const username = document.getElementById("loginUsername").value.trim().toLowerCase();
  const password = document.getElementById("loginPassword").value.trim();
  const btn = document.getElementById("loginBtn");

  btn.disabled = true;
  btn.textContent = "Signing In...";

  try {
    const data = await callApi({
      action: "login",
      username: username,
      password: password
    });

    currentUser = data;
    localStorage.setItem("logit_user", JSON.stringify(currentUser));
    updateNav();
    showView("dash");
    initDashboard();
  } catch (err) {
    console.error(err);
  } finally {
    btn.disabled = false;
    btn.textContent = "Sign In";
  }
}

// 3. FORGOT PASSWORD
async function handleForgotPassword(e) {
  e.preventDefault();
  const identifier = document.getElementById("forgotIdentifier").value.trim().toLowerCase();
  const btn = document.getElementById("forgotBtn");

  btn.disabled = true;
  btn.textContent = "Sending Code...";

  try {
    const data = await callApi({
      action: "forgotPassword",
      identifier: identifier
    });

    alert(data.message || "A 6-digit code has been sent to your email!");
    
    document.getElementById("resetIdentifier").value = identifier;
    document.getElementById("resetCode").value = "";
    document.getElementById("resetNewPassword").value = "";
    document.getElementById("resetConfirmPassword").value = "";
    showView("reset");
  } catch (err) {
    console.error(err);
  } finally {
    btn.disabled = false;
    btn.textContent = "Send 6-Digit Code";
  }
}

// 4. RESET PASSWORD WITH CODE
async function handleResetPasswordWithCode(e) {
  e.preventDefault();
  const identifier = document.getElementById("resetIdentifier").value.trim().toLowerCase();
  const code = document.getElementById("resetCode").value.trim();
  const newPassword = document.getElementById("resetNewPassword").value.trim();
  const confirmPassword = document.getElementById("resetConfirmPassword").value.trim();
  const btn = document.getElementById("resetBtn");

  if (newPassword !== confirmPassword) {
    return alert("Passwords do not match. Please re-type your new password.");
  }

  if (newPassword.length < 6) {
    return alert("Password must be at least 6 characters long.");
  }

  btn.disabled = true;
  btn.textContent = "Updating Password...";

  try {
    const data = await callApi({
      action: "resetPasswordWithCode",
      identifier: identifier,
      code: code,
      newPassword: newPassword
    });

    alert("🎉 " + (data.message || "Password reset successful! Please sign in with your new password."));
    document.getElementById("loginUsername").value = identifier;
    document.getElementById("loginPassword").value = "";
    showView("login");
  } catch (err) {
    console.error(err);
  } finally {
    btn.disabled = false;
    btn.textContent = "Update Password";
  }
}

function logout() {
  currentUser = null;
  localStorage.removeItem("logit_user");
  updateNav();
  showView("home");
}

function checkAuthAndRedirect() {
  if (currentUser) {
    showView("dash");
    initDashboard();
  } else {
    showView("signup");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  updateNav();
  if (currentUser) {
    showView("dash");
    initDashboard();
  } else {
    showView("home");
  }
});
