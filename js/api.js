/**
 * Log it - API Communication Layer, In-App Toast & Alert Engine
 * File Path: js/api.js
 */

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxfFXo52t9SyHupf0XjNopG8pbllZC4CruOeKsIqAiwUufR44QRtUp04OuARF_C5MA/exec";

// =============================================================
// 1. IN-APP TOAST NOTIFICATION SYSTEM (REPLACES JS ALERT)
// =============================================================
function showToast(message, type = "info") {
  const container = document.getElementById("appToastContainer");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `app-toast toast-${type}`;

  let icon = "ℹ️";
  if (type === "success") icon = "✅";
  if (type === "error") icon = "⚠️";
  if (type === "warning") icon = "🔔";

  toast.innerHTML = `
    <span class="toast-icon">${icon}</span>
    <div class="toast-content">${message.replace(/\n/g, "<br>")}</div>
    <button class="toast-close" onclick="this.parentElement.remove()">&times;</button>
  `;

  container.appendChild(toast);

  // Auto dismiss in 3.5 seconds
  setTimeout(() => {
    toast.classList.add("fade-out");
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// =============================================================
// 2. IN-APP CONFIRMATION MODAL (REPLACES JS CONFIRM)
// =============================================================
function showConfirm(title, message, onConfirm) {
  const modal = document.getElementById("appConfirmModal");
  const tEl = document.getElementById("confirmModalTitle");
  const mEl = document.getElementById("confirmModalText");
  const okBtn = document.getElementById("confirmOkBtn");
  const cancelBtn = document.getElementById("confirmCancelBtn");

  if (!modal) return;

  if (tEl) tEl.textContent = title;
  if (mEl) mEl.textContent = message;
  modal.style.display = "flex";

  const cleanUp = () => {
    modal.style.display = "none";
    okBtn.onclick = null;
    cancelBtn.onclick = null;
  };

  okBtn.onclick = () => {
    cleanUp();
    if (onConfirm) onConfirm();
  };

  cancelBtn.onclick = cleanUp;
}

// Override default browser window.alert with our clean in-app toast
window.alert = function(msg) {
  showToast(String(msg), "info");
};

// =============================================================
// 3. FULL-SCREEN LOADER (ONLY FOR INITIAL LOAD & LOGIN)
// =============================================================
function showGlobalLoader(title = "Reading Google Sheet", subtitle = "Please wait a moment...") {
  const overlay = document.getElementById("globalLoader");
  const titleEl = document.getElementById("loaderTitle");
  const subEl = document.getElementById("loaderSubtitle");
  if (!overlay) return;

  if (titleEl) titleEl.textContent = title;
  if (subEl) subEl.textContent = subtitle;
  overlay.style.display = "flex";
  setTimeout(() => overlay.classList.add("active"), 10);
}

function hideGlobalLoader() {
  const overlay = document.getElementById("globalLoader");
  if (!overlay) return;
  overlay.classList.remove("active");
  setTimeout(() => {
    if (!overlay.classList.contains("active")) {
      overlay.style.display = "none";
    }
  }, 250);
}

// =============================================================
// 4. API CALLER (SILENT FOR QUICK CLICKS, LOADER FOR PAGE LOADS)
// =============================================================
async function callApi(payload, showLoader = false, loaderMessage = "Reading Google Sheet...") {
  setSyncStatus(true, "Syncing with Google Sheets...");
  if (showLoader) showGlobalLoader(loaderMessage);
  
  try {
    const response = await fetch(SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    setSyncStatus(false, "Synced to Google Sheets");

    if (result.status === "error") {
      throw new Error(result.message || "An error occurred.");
    }
    return result.data;
  } catch (err) {
    setSyncStatus(false, "Sync Error");
    showToast(err.message || "Unable to communicate with Google Sheets.", "error");
    throw err;
  } finally {
    if (showLoader) hideGlobalLoader();
  }
}

function setSyncStatus(isLoading, text) {
  const dot = document.getElementById("syncDot");
  const label = document.getElementById("syncText");
  if (!dot || !label) return;

  if (isLoading) {
    dot.classList.add("loading");
  } else {
    dot.classList.remove("loading");
  }
  label.textContent = text;
}
