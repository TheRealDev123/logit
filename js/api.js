/**
 * Log it - API Communication Layer
 */
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxfFXo52t9SyHupf0XjNopG8pbllZC4CruOeKsIqAiwUufR44QRtUp04OuARF_C5MA/exec";

async function callApi(payload) {
  setSyncStatus(true, "Syncing with Google Sheets...");
  
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
    alert(err.message || "Unable to communicate with the database.");
    throw err;
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