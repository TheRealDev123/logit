/**
 * Log it - Customizable Toothbrush Reminder System
 */

// Load custom times (Defaults: 09:30 and 21:30)
let morningTime = localStorage.getItem("logit_morning_time") || "09:30";
let eveningTime = localStorage.getItem("logit_evening_time") || "21:30";

function format12Hour(timeStr) {
  const [hStr, mStr] = timeStr.split(":");
  let h = parseInt(hStr, 10);
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${mStr} ${ampm}`;
}

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

function toggleTimeSettings() {
  const panel = document.getElementById("timeSettingsPanel");
  if (!panel) return;
  panel.style.display = panel.style.display === "none" ? "block" : "none";
}

function handleSaveCustomTimes(e) {
  e.preventDefault();
  const m = document.getElementById("morningTimeInput").value;
  const ev = document.getElementById("eveningTimeInput").value;

  if (!m || !ev) return;

  morningTime = m;
  eveningTime = ev;
  localStorage.setItem("logit_morning_time", morningTime);
  localStorage.setItem("logit_evening_time", eveningTime);

  // Reset triggers
  triggeredAlerts = { morning: false, evening: false };
  updateTimeLabels();
  toggleTimeSettings();
  checkScheduledTimeAndCountdown();
  alert(`Reminder times updated to ${format12Hour(morningTime)} & ${format12Hour(eveningTime)}!`);
}

function requestNotificationPermission() {
  if (!("Notification" in window)) {
    return alert("Desktop notifications are not supported in this browser.");
  }
  Notification.requestPermission().then((perm) => {
    updateNotifyButton();
    if (perm === "granted") {
      new Notification("Log it Reminders Enabled! 🪥", {
        body: `You will receive alerts at ${format12Hour(morningTime)} and ${format12Hour(eveningTime)}.`,
      });
    }
  });
}

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
  } else {
    btn.textContent = "🔔 Enable Push Reminders";
    btn.classList.add("btn-outline");
  }
}

function playBrushChime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(587.33, ctx.currentTime);
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.7);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.7);
  } catch (e) {}
}

function notifyBrush(periodTimeFormatted) {
  playBrushChime();
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification("Time to Brush Your Teeth! 🪥", {
      body: `It is ${periodTimeFormatted}! Keep your smile clean and healthy.`,
    });
  } else {
    alert(`⏰ ${periodTimeFormatted}: Time to brush your teeth! 🪥`);
  }
}

let triggeredAlerts = { morning: false, evening: false };

function checkScheduledTimeAndCountdown() {
  const now = new Date();
  const hours = now.getHours();
  const mins = now.getMinutes();

  if (hours === 0 && mins === 0) {
    triggeredAlerts.morning = false;
    triggeredAlerts.evening = false;
  }

  const [mH, mM] = morningTime.split(":").map(Number);
  const [eH, eM] = eveningTime.split(":").map(Number);

  // Trigger Morning Alert
  if (hours === mH && mins === mM && !triggeredAlerts.morning) {
    triggeredAlerts.morning = true;
    notifyBrush(format12Hour(morningTime));
  }

  // Trigger Evening Alert
  if (hours === eH && mins === eM && !triggeredAlerts.evening) {
    triggeredAlerts.evening = true;
    notifyBrush(format12Hour(eveningTime));
  }

  // Dynamic Countdown calculation
  const tMorn = new Date(); tMorn.setHours(mH, mM, 0, 0);
  const tEve = new Date(); tEve.setHours(eH, eM, 0, 0);

  let target = tMorn;
  if (tMorn < tEve) {
    if (now > tMorn && now <= tEve) target = tEve;
    else if (now > tEve) target = new Date(tMorn.getTime() + 24 * 60 * 60 * 1000);
  } else {
    if (now > tEve && now <= tMorn) target = tMorn;
    else if (now > tMorn) target = new Date(tEve.getTime() + 24 * 60 * 60 * 1000);
  }

  const diff = target - now;
  const h = Math.floor(diff / (1000 * 60 * 60));
  const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const s = Math.floor((diff % (1000 * 60)) / 1000);

  const countdownElem = document.getElementById("countdownDisplay");
  if (countdownElem) {
    countdownElem.textContent = `Next reminder in: ${h}h ${m}m ${s}s (${target.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})})`;
  }
}

async function toggleBrushStatus(period) {
  if (!currentUser) return;
  const checkbox = document.getElementById(period === "morning" ? "brushMorning" : "brushEvening");
  const isChecked = checkbox.checked;

  try {
    await callApi({
      action: "toggleBrush",
      userId: currentUser.userId,
      date: new Date().toISOString().split("T")[0],
      period: period,
      status: isChecked
    });
  } catch (err) {
    checkbox.checked = !isChecked;
  }
}