/**
 * Log it - Username Authentication & User State
 */
let currentUser = JSON.parse(localStorage.getItem("logit_user") || "null");

function updateNav() {
  const loggedOutNav = document.getElementById("loggedOutNav");
  const loggedInNav = document.getElementById("loggedInNav");
  const navUserName = document.getElementById("navUserName");

  if (currentUser) {
    loggedOutNav.style.display = "none";
    loggedInNav.style.display = "flex";
    navUserName.textContent = `@${currentUser.username}`;
  } else {
    loggedOutNav.style.display = "flex";
    loggedInNav.style.display = "none";
  }
}

async function handleSignup(e) {
  e.preventDefault();
  const name = document.getElementById("signupName").value.trim();
  const username = document.getElementById("signupUsername").value.trim().toLowerCase();
  const password = document.getElementById("signupPassword").value;
  const btn = document.getElementById("signupBtn");

  btn.disabled = true;
  btn.textContent = "Creating Account...";

  try {
    const data = await callApi({
      action: "signup",
      name: name,
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
    btn.textContent = "Create Account";
  }
}

async function handleLogin(e) {
  e.preventDefault();
  const username = document.getElementById("loginUsername").value.trim().toLowerCase();
  const password = document.getElementById("loginPassword").value;
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
