/**
 * Log it — Complete Toothbrush Reminder & Notification Engine
 * File Path: js/reminders.js
 * 
 * Features:
 * - Customizable morning & evening alert times (defaults: 09:30 & 21:30)
 * - Android Service Worker push notifications + vibration using your custom logo
 * - Web Audio API melodic alert chime
 * - Missed-alarm catch-up logic (fires even if the phone screen was asleep)
 * - Live dynamic countdown timer
 * - One-tap test alert button handler
 * - Google Sheets habit synchronization
 */

// 1. Load custom times from storage (Defaults: 09:30 and 21:30)
let morningTime = localStorage.getItem("logit_morning_time") || "09:30";
let eveningTime = localStorage.getItem("logit_evening_time") || "21:30";

// Helper: Convert 24-hour time "09:30" / "21:30" to "9:30 AM" / "9:30 PM"
function format12Hour(timeStr) {
  if (!timeStr) return "";
  const [hStr, mStr] = timeStr.split(":");
  let h = parseInt(hStr, 10);
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${mStr} ${ampm}`;
}

// 2. Update UI labels, checkboxes, and input pickers across the app
function updateTimeLabels() {
  const mornFormatted = format12Hour(morningTime);
  const eveFormatted = format12Hour(eveningTime);

  const mornLbl = document.getElementById("morningTimeLabel");
  const eveLbl = document.getElementById("eveningTimeLabel");
  const chkMorn = document.getElementById("chkMorningLabel");
  const chkEve = document.getElementById("chkEveningLabel");
  const mornInp = document.getElementById("morningTimeInput");
  const eveInp = document.getElementById("eveningTimeInput");

  if (mornLbl) mornLbl.textContent = mornFormatted;
  if (eveLbl) eveLbl.textContent = eveFormatted;
  if (chkMorn) chkMorn.textContent = `☀️ Morning (${mornFormatted})`;
  if (chkEve) chkEve.textContent = `🌙 Evening (${eveFormatted})`;
  if (mornInp) mornInp.value = morningTime;
  if (eveInp) eveInp.value = eveningTime;
}

// 3. Toggle the custom time picker settings panel
function toggleTimeSettings() {
  const panel = document.getElementById("timeSettingsPanel");
  if (!panel) return;
  panel.style.display = panel.style.display === "none" ? "block" : "none";
}

// 4. Save new custom morning & evening times
function handleSaveCustomTimes(e) {
  e.preventDefault();
  const m = document.getElementById("morningTimeInput").value;
  const ev = document.getElementById("eveningTimeInput").value;

  if (!m || !ev) return;

  morningTime = m;
  eveningTime = ev;
  localStorage.setItem("logit_morning_time", morningTime);
  localStorage.setItem("logit_evening_time", eveningTime);

  updateTimeLabels();
  toggleTimeSettings();
  checkScheduledTimeAndCountdown();
  alert(`Alert times updated to ${format12Hour(morningTime)} and ${format12Hour(eveningTime)}!`);
}

// 5. Request browser notification permissions
async function requestNotificationPermission() {
  if (!("Notification" in window)) {
    return alert("Notifications are not supported on this browser.");
  }

  const perm = await Notification.requestPermission();
  updateNotifyButton();

  if (perm === "granted") {
    sendPushAlert(
      "Reminders Active! 🦷", 
      `Alerts set for ${format12Hour(morningTime)} and ${format12Hour(eveningTime)}.`
    );
  } else {
    alert("Notification permission was denied. Please enable notifications in your browser/site settings.");
  }
}

// Update the top notification status button state
function updateNotifyButton() {
  const btn = document.getElementById("notifyBtn");
  if (!btn) return;

  if (!("Notification" in window)) {
    btn.textContent = "Notifications Unsupported";
    return;
  }

  if (Notification.permission === "granted") {
    btn.textContent = "🔔 Reminders Active";
    btn.classList.remove("btn-outline");
    btn.style.backgroundColor = "#16a34a";
    btn.style.color = "#ffffff";
    btn.style.borderColor = "#16a34a";
  } else {
    btn.textContent = "🔔 Enable Push Reminders";
    btn.classList.add("btn-outline");
    btn.style.backgroundColor = "transparent";
    btn.style.color = "var(--text)";
    btn.style.borderColor = "var(--border)";
  }
}

// 6. Web Audio API alert sound (Dual-tone melodic chime)
function playBrushChime() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = "sine";
    osc2.type = "sine";
    osc1.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc2.frequency.setValueAtTime(880, ctx.currentTime + 0.15); // A5

    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.8);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start();
    osc2.start(ctx.currentTime + 0.15);
    osc1.stop(ctx.currentTime + 0.8);
    osc2.stop(ctx.currentTime + 0.8);
  } catch (e) {
    console.warn("Audio playback was blocked by browser autoplay policy:", e);
  }
}

// 7. Send push notifications (Uses your custom logo for icon & badge)
async function sendPushAlert(title, bodyText) {
  playBrushChime();

  // Try Service Worker notification first (Required for Android/Pixel 8a background alerts)
  if ("serviceWorker" in navigator) {
    try {
      const reg = await navigator.serviceWorker.ready;
      if (reg && reg.showNotification) {
        await reg.showNotification(title, {
          body: bodyText,
          icon: "icons/icon-192x192.png",
          badge: "icons/icon-192x192.png",
          vibrate: [200, 100, 200, 100, 200],
          tag: "brush-reminder",
          renotify: true,
          requireInteraction: true
        });
        return;
      }
    } catch (err) {
      console.warn("Service Worker notification fallback:", err);
    }
  }

  // Fallback to standard Window Notification
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification(title, {
      body: bodyText,
      icon: "icons/icon-192x192.png",
      vibrate: [200, 100, 200]
    });
  } else {
    alert(`⏰ ${title}\n${bodyText}`);
  }
}

// 8. One-Tap Test Alert Handler (Asks for permission automatically if not yet granted)
async function testNotificationNow() {
  if ("Notification" in window && Notification.permission !== "granted") {
    const perm = await Notification.requestPermission();
    updateNotifyButton();
    if (perm !== "granted") {
      alert("⚠️ Notifications are blocked in your browser settings. Please allow notifications in Chrome to receive alerts.");
      playBrushChime();
      return;
    }
  }

  sendPushAlert(
    "Test Alert Working! 🦷✨", 
    `Your sound, vibration, and push notifications are working properly!`
  );
}

// 9. Missed-Alarm Catch-up & Countdown Timer
function getTodayDateString() {
  return new Date().toISOString().split("T")[0];
}

function checkScheduledTimeAndCountdown() {
  const now = new Date();
  const todayStr = getTodayDateString();
  const currentTotalMins = now.getHours() * 60 + now.getMinutes();

  const [mH, mM] = morningTime.split(":").map(Number);
  const morningTotalMins = mH * 60 + mM;

  const [eH, eM] = eveningTime.split(":").map(Number);
  const eveningTotalMins = eH * 60 + eM;

  // Check Morning Alert (Fires if past morning time today and hasn't alerted yet)
  const lastMorningAlert = localStorage.getItem("logit_last_morning_alert");
  if (currentTotalMins >= morningTotalMins && currentTotalMins < morningTotalMins + 120) {
    if (lastMorningAlert !== todayStr) {
      localStorage.setItem("logit_last_morning_alert", todayStr);
      sendPushAlert("Time to Brush! 🦷 (Morning)", `It's time for your ${format12Hour(morningTime)} morning brush.`);
    }
  }

  // Check Evening Alert (Fires if past evening time today and hasn't alerted yet)
  const lastEveningAlert = localStorage.getItem("logit_last_evening_alert");
  if (currentTotalMins >= eveningTotalMins && currentTotalMins < eveningTotalMins + 120) {
    if (lastEveningAlert !== todayStr) {
      localStorage.setItem("logit_last_evening_alert", todayStr);
      sendPushAlert("Time to Brush! 🦷 (Evening)", `It's time for your ${format12Hour(eveningTime)} evening brush.`);
    }
  }

  // Dynamic Countdown Calculation
  const tMorn = new Date(); tMorn.setHours(mH, mM, 0, 0);
  const tEve = new Date(); tEve.setHours(eH, eM, 0, 0);

  let target = tMorn;
  if (now < tMorn) {
    target = tMorn;
  } else if (now >= tMorn && now < tEve) {
    target = tEve;
  } else {
    target = new Date(tMorn.getTime() + 24 * 60 * 60 * 1000);
  }

  const diff = target - now;
  const h = Math.floor(diff / (1000 * 60 * 60));
  const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const s = Math.floor((diff % (1000 * 60)) / 1000);

  const countdownElem = document.getElementById("countdownDisplay");
  if (countdownElem) {
    countdownElem.textContent = `Next alert in: ${h}h ${m}m ${s}s (${target.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})})`;
  }
}

// 10. Sync Morning/Evening Checkbox to Google Sheets
async function toggleBrushStatus(period) {
  if (!currentUser) return;
  const checkbox = document.getElementById(period === "morning" ? "brushMorning" : "brushEvening");
  const isChecked = checkbox.checked;

  try {
    await callApi({
      action: "toggleBrush",
      userId: currentUser.userId,
      date: getTodayDateString(),
      period: period,
      status: isChecked
    });
  } catch (err) {
    // Revert checkmark if cloud sync fails
    checkbox.checked = !isChecked;
  }
}
