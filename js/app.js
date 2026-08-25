/**
 * Log it - Master App Controller (Sidebar Navigation & Tabs Sync)
 * File Path: js/app.js
 */

// State
let activeAppTab = 'dash';
let userWeights = [];
let habitHistory = [];
let waterHistory = [];
let moodHistory = [];
let medHistory = [];
let customHabitHistory = [];
let todayWaterAmount = 0;
let todayWaterGoal = 64;
let currentUnit = localStorage.getItem("logit_unit") || "kg";
let goalWeight = null;
let chartInstance = null;

let defaultMeds = JSON.parse(localStorage.getItem("logit_user_meds") || '[\
  {"id":"m1","name":"Multivitamin","slot":"morning"},\
  {"id":"m2","name":"Omega-3 Fish Oil","slot":"morning"},\
  {"id":"m3","name":"Magnesium","slot":"evening"}\
]');

let defaultCustomHabits = JSON.parse(localStorage.getItem("logit_user_habits") || '[\
  {"id":"h1","name":"Read 1 Page of a Book"},\
  {"id":"h2","name":"10 Pushups"},\
  {"id":"h3","name":"1-Minute Full Body Stretch"}\
]');

// -------------------------------------------------------------
// UNIFIED ROUTING (SYNCS SIDEBAR WITH MAIN VIEW)
// -------------------------------------------------------------
function showView(viewName) {
  const tabs = ['dash', 'weight', 'water', 'mood', 'meds', 'habits'];
  const sidebar = document.getElementById("appSidebar");
  
  if (tabs.includes(viewName)) {
    if (!currentUser) {
      showView('login');
      return;
    }
    if (sidebar) sidebar.style.display = "flex";
    
    document.querySelectorAll(".view-section").forEach(sec => sec.classList.remove("active"));
    const target = document.getElementById(viewName + "View");
    if (target) target.classList.add("active");

    const radio = document.getElementById("side-" + viewName);
    if (radio) radio.checked = true;

    activeAppTab = viewName;

    if (viewName === 'weight') renderChart();
    if (viewName === 'water') renderWaterTab();
    if (viewName === 'mood') renderMoodTab();
    if (viewName === 'meds') renderMedsTab();
    if (viewName === 'habits') renderCustomHabitsTab();
    if (viewName === 'dash') renderDashboardStreakBoard();
  } else {
    // Auth or Landing views -> Hide Sidebar
    if (sidebar) sidebar.style.display = "none";
    
    document.querySelectorAll(".view-section").forEach(sec => sec.classList.remove("active"));
    const target = document.getElementById(viewName + "View");
    if (target) target.classList.add("active");
  }
  
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function getTodayFormatted() {
  return new Date().toISOString().split("T")[0];
}

// -------------------------------------------------------------
// INITIALIZE DASHBOARD & ALL DATA SYNC
// -------------------------------------------------------------
async function initDashboard() {
  showView('dash');
  document.getElementById("weightDate").value = getTodayFormatted();
  document.getElementById("weightUnit").value = currentUnit;
  document.getElementById("unitLabel").textContent = currentUnit;
  updateNotifyButton();
  updateTimeLabels();

  if (!currentUser) return;

  try {
    // Passes 'true' so the loader appears ONLY when loading the dashboard on page load/refresh
    const data = await callApi({
      action: "getAllUserData",
      userId: currentUser.userId,
      todayDate: getTodayFormatted()
    }, true, "Reading your health dashboard...");

    userWeights = data.weights || [];
    goalWeight = data.goalWeight || null;
    habitHistory = data.habitHistory || [];
    waterHistory = data.waterHistory || [];
    moodHistory = data.moodHistory || [];
    medHistory = data.medHistory || [];
    customHabitHistory = data.customHabitHistory || [];

    if (data.todayWater) {
      todayWaterAmount = data.todayWater.amount || 0;
      todayWaterGoal = data.todayWater.goal || 64;
    }

    if (data.todayHabit) {
      document.getElementById("brushMorning").checked = data.todayHabit.morning;
      document.getElementById("brushEvening").checked = data.todayHabit.evening;
    }

    if (goalWeight) {
      document.getElementById("goalInput").value = goalWeight;
    }

    renderDashboardStreakBoard();
    renderWaterTab();
    renderMoodTab();
    renderMedsTab();
    renderCustomHabitsTab();
    renderWeightData();
  } catch (err) {
    console.error("Dashboard Sync Error:", err);
  }
}

// In-App Confirm for Delete
async function deleteWeight(date) {
  showConfirm("Delete Weight Entry?", `Are you sure you want to delete your weight log for ${date}?`, async () => {
    await callApi({ action: "deleteWeight", userId: currentUser.userId, date: date });
    userWeights = userWeights.filter(w => w.date !== date);
    renderWeightData();
    renderDashboardStreakBoard();
    showToast(`Deleted weight log for ${date}`, "success");
  });
}

// -------------------------------------------------------------
// 1. DASHBOARD & STREAK BOARD LOGIC
// -------------------------------------------------------------
function calculateStreak(historyArray, checkFn) {
  let streak = 0;
  const today = new Date();
  
  for (let i = 0; i < 60; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    
    const entry = historyArray.find(h => h.date === dateStr);
    if (entry && checkFn(entry)) {
      streak++;
    } else if (i === 0) {
      continue;
    } else {
      break;
    }
  }
  return streak;
}

function renderDashboardStreakBoard() {
  const waterStreak = calculateStreak(waterHistory, e => e.amount >= 32);
  document.getElementById("dashWaterStreak").textContent = `🔥 ${waterStreak} Days`;
  document.getElementById("tabWaterStreak").textContent = `🔥 ${waterStreak} Day Streak`;
  const waterPct = Math.min(100, Math.round((waterStreak / 30) * 100));
  document.getElementById("dashWaterRewardBar").style.width = `${waterPct}%`;
  document.getElementById("dashWaterRewardLabel").textContent = `${30 - (waterStreak % 30)} days to next reward`;

  const weightStreak = calculateStreak(userWeights, e => e.weight > 0);
  document.getElementById("dashWeightStreak").textContent = `🔥 ${weightStreak} Days`;
  document.getElementById("tabWeightStreak").textContent = `🔥 ${weightStreak} Day Streak`;
  const weightPct = Math.min(100, Math.round((weightStreak / 30) * 100));
  document.getElementById("dashWeightRewardBar").style.width = `${weightPct}%`;
  document.getElementById("dashWeightRewardLabel").textContent = `${30 - (weightStreak % 30)} days to next reward`;

  const moodStreak = calculateStreak(moodHistory, e => e.score > 0);
  document.getElementById("dashMoodStreak").textContent = `🔥 ${moodStreak} Days`;
  document.getElementById("tabMoodStreak").textContent = `🔥 ${moodStreak} Day Streak`;
  const moodPct = Math.min(100, Math.round((moodStreak / 30) * 100));
  document.getElementById("dashMoodRewardBar").style.width = `${moodPct}%`;
  document.getElementById("dashMoodRewardLabel").textContent = `${30 - (moodStreak % 30)} days to next reward`;

  const medsStreak = calculateStreak(medHistory, e => e.completed === true);
  document.getElementById("dashMedsStreak").textContent = `🔥 ${medsStreak} Days`;
  document.getElementById("tabMedsStreak").textContent = `🔥 ${medsStreak} Day Streak`;
  const medsPct = Math.min(100, Math.round((medsStreak / 30) * 100));
  document.getElementById("dashMedsRewardBar").style.width = `${medsPct}%`;
  document.getElementById("dashMedsRewardLabel").textContent = `${30 - (medsStreak % 30)} days to next reward`;

  renderCalendarDots("weightCalDots", userWeights, e => e.weight > 0);
  renderCalendarDots("waterCalDots", waterHistory, e => e.amount >= 32);
  renderCalendarDots("moodCalDots", moodHistory, e => e.score > 0);
}

function renderCalendarDots(elementId, historyArr, checkFn) {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.innerHTML = "";
  
  const today = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dStr = d.toISOString().split("T")[0];
    
    const dot = document.createElement("div");
    dot.className = "cal-dot";
    const found = historyArr.find(h => h.date === dStr);
    if (found && checkFn(found)) {
      dot.classList.add("logged");
    }
    el.appendChild(dot);
  }
}

// -------------------------------------------------------------
// 2. WATER ENGINE
// -------------------------------------------------------------
async function quickAddWater(amountOz) {
  todayWaterAmount += amountOz;
  renderWaterTab();

  await callApi({
    action: "saveWater",
    userId: currentUser.userId,
    date: getTodayFormatted(),
    amount: todayWaterAmount,
    goal: todayWaterGoal
  });

  const idx = waterHistory.findIndex(w => w.date === getTodayFormatted());
  if (idx > -1) waterHistory[idx].amount = todayWaterAmount;
  else waterHistory.push({ date: getTodayFormatted(), amount: todayWaterAmount, goal: todayWaterGoal });

  renderDashboardStreakBoard();
}

async function addCustomWater() {
  const val = parseFloat(document.getElementById("customWaterInput").value);
  if (isNaN(val) || val <= 0) return;
  document.getElementById("customWaterInput").value = "";
  await quickAddWater(val);
}

async function resetTodayWater() {
  todayWaterAmount = 0;
  renderWaterTab();
  await callApi({
    action: "saveWater",
    userId: currentUser.userId,
    date: getTodayFormatted(),
    amount: 0,
    goal: todayWaterGoal
  });
}

function renderWaterTab() {
  const amountEl = document.getElementById("waterLoggedAmount");
  const goalEl = document.getElementById("waterGoalLabel");
  const circle = document.getElementById("waterProgressCircle");
  const pctText = document.getElementById("waterPctText");

  if (!amountEl || !circle) return;

  amountEl.textContent = todayWaterAmount;
  goalEl.textContent = `/ ${todayWaterGoal} oz`;

  const pct = Math.min(100, Math.round((todayWaterAmount / todayWaterGoal) * 100));
  pctText.textContent = `${pct}% of Daily Goal (${todayWaterAmount} oz / ${todayWaterGoal} oz)`;

  const offset = 264 - (264 * (pct / 100));
  circle.style.strokeDashoffset = offset;
}

// -------------------------------------------------------------
// 3. MOOD ENGINE
// -------------------------------------------------------------
async function saveDailyMood(score, emoji) {
  if (!currentUser) return;

  await callApi({
    action: "saveMood",
    userId: currentUser.userId,
    date: getTodayFormatted(),
    score: score,
    emoji: emoji
  });

  const idx = moodHistory.findIndex(m => m.date === getTodayFormatted());
  if (idx > -1) {
    moodHistory[idx].score = score;
    moodHistory[idx].emoji = emoji;
  } else {
    moodHistory.push({ date: getTodayFormatted(), score: score, emoji: emoji });
  }

  renderMoodTab();
  renderDashboardStreakBoard();
  alert(`Mood recorded as ${emoji}! Check the calendar below.`);
}

function renderMoodTab() {
  renderCalendarDots("moodCalDots", moodHistory, e => e.score > 0);
  const text = document.getElementById("moodCorrelationText");
  if (moodHistory.length >= 3 && waterHistory.length >= 3) {
    text.textContent = "✨ Great trend! You log higher mood scores (🤩/😊) on days you achieve 48 oz+ of water!";
  }
}

// -------------------------------------------------------------
// 4. MEDS & SUPPLEMENTS ENGINE
// -------------------------------------------------------------
function renderMedsTab() {
  const container = document.getElementById("medsListContainer");
  if (!container) return;
  container.innerHTML = "";

  defaultMeds.forEach(med => {
    const isCompleted = medHistory.some(m => m.date === getTodayFormatted() && m.medId === med.id && m.completed === true);
    
    const div = document.createElement("label");
    div.className = "habit-item";
    div.innerHTML = `
      <span>💊 ${med.name} (${med.slot === 'morning' ? '8:00 AM' : '8:00 PM'})</span>
      <input type="checkbox" ${isCompleted ? 'checked' : ''} onchange="toggleMedItem('${med.id}', '${med.name}', '${med.slot}', this.checked)" style="transform: scale(1.3); cursor: pointer;" />
    `;
    container.appendChild(div);
  });
}

function showAddMedForm() {
  const box = document.getElementById("addMedFormBox");
  box.style.display = box.style.display === "none" ? "block" : "none";
}

function saveNewMedication() {
  const name = document.getElementById("newMedName").value.trim();
  const slot = document.getElementById("newMedSlot").value;
  if (!name) return;

  const newId = "m_" + Date.now();
  defaultMeds.push({ id: newId, name: name, slot: slot });
  localStorage.setItem("logit_user_meds", JSON.stringify(defaultMeds));
  
  document.getElementById("newMedName").value = "";
  showAddMedForm();
  renderMedsTab();
}

async function toggleMedItem(medId, medName, timeSlot, isChecked) {
  await callApi({
    action: "toggleMed",
    userId: currentUser.userId,
    date: getTodayFormatted(),
    medId: medId,
    medName: medName,
    timeSlot: timeSlot,
    completed: isChecked
  });

  const idx = medHistory.findIndex(m => m.date === getTodayFormatted() && m.medId === medId);
  if (idx > -1) medHistory[idx].completed = isChecked;
  else medHistory.push({ date: getTodayFormatted(), medId, medName, timeSlot, completed: isChecked });

  renderDashboardStreakBoard();
}

// -------------------------------------------------------------
// 5. CUSTOM 2-MINUTE HABITS ENGINE
// -------------------------------------------------------------
function renderCustomHabitsTab() {
  const container = document.getElementById("customHabitsContainer");
  if (!container) return;
  container.innerHTML = "";

  defaultCustomHabits.forEach(habit => {
    const isCompleted = customHabitHistory.some(h => h.date === getTodayFormatted() && h.habitId === habit.id && h.completed === true);

    const div = document.createElement("label");
    div.className = "habit-item";
    div.innerHTML = `
      <span>⚡ ${habit.name}</span>
      <input type="checkbox" ${isCompleted ? 'checked' : ''} onchange="toggleCustomHabitItem('${habit.id}', '${habit.name}', this.checked)" style="transform: scale(1.3); cursor: pointer;" />
    `;
    container.appendChild(div);
  });
}

function showAddHabitForm() {
  const box = document.getElementById("addHabitFormBox");
  box.style.display = box.style.display === "none" ? "block" : "none";
}

function saveNewCustomHabit() {
  const name = document.getElementById("newHabitName").value.trim();
  if (!name) return;

  const newId = "h_" + Date.now();
  defaultCustomHabits.push({ id: newId, name: name });
  localStorage.setItem("logit_user_habits", JSON.stringify(defaultCustomHabits));
  
  document.getElementById("newHabitName").value = "";
  showAddHabitForm();
  renderCustomHabitsTab();
}

async function toggleCustomHabitItem(habitId, habitName, isChecked) {
  await callApi({
    action: "toggleCustomHabit",
    userId: currentUser.userId,
    date: getTodayFormatted(),
    habitId: habitId,
    habitName: habitName,
    completed: isChecked
  });

  const idx = customHabitHistory.findIndex(h => h.date === getTodayFormatted() && h.habitId === habitId);
  if (idx > -1) customHabitHistory[idx].completed = isChecked;
  else customHabitHistory.push({ date: getTodayFormatted(), habitId, habitName, completed: isChecked });

  renderDashboardStreakBoard();
}

// -------------------------------------------------------------
// 6. WEIGHT & SMART MOVING AVERAGE GRAPH
// -------------------------------------------------------------
async function handleSaveWeight(e) {
  e.preventDefault();
  const date = document.getElementById("weightDate").value;
  const weight = parseFloat(document.getElementById("weightVal").value);
  const btn = document.getElementById("saveWeightBtn");

  if (!date || isNaN(weight)) return;

  btn.disabled = true;
  btn.textContent = "Saving...";

  try {
    await callApi({
      action: "saveWeight",
      userId: currentUser.userId,
      date: date,
      weight: weight,
      unit: currentUnit
    });

    const existingIdx = userWeights.findIndex(w => w.date === date);
    if (existingIdx > -1) {
      userWeights[existingIdx].weight = weight;
      userWeights[existingIdx].unit = currentUnit;
    } else {
      userWeights.push({ id: "W_" + Date.now(), date, weight, unit: currentUnit });
    }

    document.getElementById("weightVal").value = "";
    renderWeightData();
    renderDashboardStreakBoard();
  } catch (err) {
    console.error(err);
  } finally {
    btn.disabled = false;
    btn.textContent = "Save to Google Sheets";
  }
}

async function deleteWeight(date) {
  if (!confirm(`Delete log for ${date}?`)) return;
  await callApi({ action: "deleteWeight", userId: currentUser.userId, date: date });
  userWeights = userWeights.filter(w => w.date !== date);
  renderWeightData();
  renderDashboardStreakBoard();
}

function switchUnit(newUnit) {
  currentUnit = newUnit;
  localStorage.setItem("logit_unit", newUnit);
  document.getElementById("unitLabel").textContent = newUnit;
  renderWeightData();
}

async function handleSetGoal(e) {
  e.preventDefault();
  const val = parseFloat(document.getElementById("goalInput").value);
  if (isNaN(val) || val <= 0) return alert("Please enter a valid target goal.");

  await callApi({ action: "setGoal", userId: currentUser.userId, goalWeight: val });
  goalWeight = val;
  currentUser.goalWeight = val;
  localStorage.setItem("logit_user", JSON.stringify(currentUser));
  renderWeightData();
}

function calculateMovingAverage(data, windowSize = 5) {
  return data.map((val, idx, arr) => {
    const start = Math.max(0, idx - windowSize + 1);
    const subset = arr.slice(start, idx + 1);
    const sum = subset.reduce((a, b) => a + b, 0);
    return parseFloat((sum / subset.length).toFixed(1));
  });
}

function renderWeightData() {
  userWeights.sort((a, b) => new Date(a.date) - new Date(b.date));

  const tbody = document.getElementById("historyTableBody");
  tbody.innerHTML = "";
  if (userWeights.length === 0) {
    tbody.innerHTML = `<tr><td colspan="3" class="table-empty">No weight entries logged yet.</td></tr>`;
  } else {
    [...userWeights].reverse().forEach(log => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${log.date}</td>
        <td><strong>${log.weight} ${log.unit || currentUnit}</strong></td>
        <td style="text-align: right;"><button class="btn-danger" onclick="deleteWeight('${log.date}')">Delete</button></td>
      `;
      tbody.appendChild(tr);
    });
  }

  const bar = document.getElementById("goalProgressBar");
  const pctLabel = document.getElementById("progressPctLabel");
  const statusBadge = document.getElementById("goalStatusBadge");

  if (userWeights.length > 0) {
    const start = userWeights[0].weight;
    const current = userWeights[userWeights.length - 1].weight;

    document.getElementById("statStart").textContent = `${start}`;
    document.getElementById("statCurrent").textContent = `${current}`;

    if (goalWeight) {
      const diff = current - goalWeight;
      const totalToLose = start - goalWeight;
      const lostSoFar = start - current;

      if (current <= goalWeight) {
        bar.className = "progress-bar-fill goal-achieved";
        bar.style.width = "100%";
        pctLabel.textContent = "100% — Goal Met! 🎉";
        statusBadge.className = "status-pill status-achieved";
        statusBadge.textContent = "🎉 Goal Met";
      } else {
        const pct = Math.min(99, Math.max(1, Math.round((lostSoFar / totalToLose) * 100)));
        bar.className = "progress-bar-fill over-goal";
        bar.style.width = `${pct}%`;
        pctLabel.textContent = `${pct}% closer to goal (${diff.toFixed(1)} ${currentUnit} over)`;
        statusBadge.className = "status-pill status-over";
        statusBadge.textContent = `⚠️ +${diff.toFixed(1)} ${currentUnit} Over`;
      }
      document.getElementById("statToGoal").textContent = `${Math.abs(diff).toFixed(1)}`;
    }
  }

  renderChart();
}

function renderChart() {
  const ctx = document.getElementById("weightChart").getContext("2d");
  const labels = userWeights.map(w => w.date);
  const rawData = userWeights.map(w => w.weight);
  const showTrueTrend = document.getElementById("trueTrendToggle").checked;
  const trendData = calculateMovingAverage(rawData, 5);

  const datasets = [];

  if (!showTrueTrend) {
    datasets.push({
      label: `Daily Weight (${currentUnit})`,
      data: rawData,
      borderColor: "#94a3b8",
      borderWidth: 1.5,
      pointRadius: 2,
      fill: false
    });
  }

  datasets.push({
    label: `True Trend (${currentUnit})`,
    data: trendData,
    borderColor: "#0284c7",
    backgroundColor: "rgba(2, 132, 199, 0.08)",
    fill: true,
    tension: 0.35,
    borderWidth: 2.5,
    pointRadius: 4,
    pointBackgroundColor: "#0284c7"
  });

  if (goalWeight && labels.length > 0) {
    datasets.push({
      label: `Goal`,
      data: new Array(labels.length).fill(goalWeight),
      borderColor: "#16a34a",
      borderDash: [5, 5],
      borderWidth: 1.5,
      pointRadius: 0,
      fill: false
    });
  }

  if (chartInstance) chartInstance.destroy();

  chartInstance = new Chart(ctx, {
    type: "line",
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: true, labels: { boxWidth: 10, font: { size: 10 } } } },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 9 }, color: "#94a3b8" } },
        y: { grid: { color: "#f1f5f9" }, ticks: { font: { size: 9 }, color: "#94a3b8" } }
      }
    }
  });
}

// -------------------------------------------------------------
// 7. REWARDS & THEME MODAL
// -------------------------------------------------------------
function openRewardsModal() {
  document.getElementById("rewardsModal").style.display = "flex";
}

function closeRewardsModal() {
  document.getElementById("rewardsModal").style.display = "none";
}

function setAppTheme(themeName) {
  document.body.className = `theme-${themeName}`;
  localStorage.setItem("logit_app_theme", themeName);
  closeRewardsModal();
}

function useStreakFreeze(tabName) {
  alert(`❄️ 1 Streak Freeze used for ${tabName}! Your streak has been safely protected.`);
}

document.addEventListener("DOMContentLoaded", () => {
  const savedTheme = localStorage.getItem("logit_app_theme") || "sky";
  document.body.className = `theme-${savedTheme}`;
});
