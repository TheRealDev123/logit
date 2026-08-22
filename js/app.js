/**
 * Log it - Main Controller (Accurate Goal Math & Red Bar Calculation)
 */
let userWeights = [];
let currentUnit = localStorage.getItem("logit_unit") || "kg";
let goalWeight = null;
let chartInstance = null;

function showView(viewName) {
  document.querySelectorAll(".view-section").forEach(sec => sec.classList.remove("active"));
  const target = document.getElementById(viewName + "View");
  if (target) target.classList.add("active");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function getTodayFormatted() {
  return new Date().toISOString().split("T")[0];
}

async function initDashboard() {
  document.getElementById("weightDate").value = getTodayFormatted();
  document.getElementById("weightUnit").value = currentUnit;
  document.getElementById("unitLabel").textContent = currentUnit;
  updateNotifyButton();
  updateTimeLabels();

  if (!currentUser) return;

  try {
    const data = await callApi({
      action: "getUserData",
      userId: currentUser.userId,
      todayDate: getTodayFormatted()
    });

    userWeights = data.weights || [];
    goalWeight = data.goalWeight || null;

    if (goalWeight) {
      document.getElementById("goalInput").value = goalWeight;
    }

    document.getElementById("brushMorning").checked = data.todayHabit.morning;
    document.getElementById("brushEvening").checked = data.todayHabit.evening;
    renderDashboard();
  } catch (err) {
    console.error(err);
  }
}

async function handleSetGoal(e) {
  e.preventDefault();
  const val = parseFloat(document.getElementById("goalInput").value);
  if (isNaN(val) || val <= 0) return alert("Please enter a valid target goal.");

  const btn = document.getElementById("saveGoalBtn");
  btn.disabled = true;
  btn.textContent = "Saving...";

  try {
    await callApi({
      action: "setGoal",
      userId: currentUser.userId,
      goalWeight: val
    });

    goalWeight = val;
    currentUser.goalWeight = val;
    localStorage.setItem("logit_user", JSON.stringify(currentUser));
    renderDashboard();
  } catch (err) {
    console.error(err);
  } finally {
    btn.disabled = false;
    btn.textContent = "Set Goal";
  }
}

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
    renderDashboard();
  } catch (err) {
    console.error(err);
  } finally {
    btn.disabled = false;
    btn.textContent = "Save Entry";
  }
}

async function deleteWeight(date) {
  if (!confirm(`Delete log for ${date}?`)) return;

  try {
    await callApi({
      action: "deleteWeight",
      userId: currentUser.userId,
      date: date
    });

    userWeights = userWeights.filter(w => w.date !== date);
    renderDashboard();
  } catch (err) {
    console.error(err);
  }
}

function switchUnit(newUnit) {
  currentUnit = newUnit;
  localStorage.setItem("logit_unit", newUnit);
  document.getElementById("unitLabel").textContent = newUnit;
  renderDashboard();
}

function renderDashboard() {
  userWeights.sort((a, b) => new Date(a.date) - new Date(b.date));

  // 1. History Table
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
        <td style="text-align: right;">
          <button class="btn-danger" onclick="deleteWeight('${log.date}')">Delete</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  // 2. Goal & Red Progress Bar Logic (Directionally Accurate)
  const bar = document.getElementById("goalProgressBar");
  const pctLabel = document.getElementById("progressPctLabel");
  const statusBadge = document.getElementById("goalStatusBadge");
  const summaryText = document.getElementById("goalSummaryText");

  if (userWeights.length > 0) {
    const start = userWeights[0].weight;
    const current = userWeights[userWeights.length - 1].weight;

    document.getElementById("statStart").textContent = `${start}`;
    document.getElementById("statCurrent").textContent = `${current}`;

    if (goalWeight) {
      const diff = current - goalWeight;
      const isOver = diff > 0;
      document.getElementById("progressStartLabel").textContent = `Start: ${start}`;
      document.getElementById("progressGoalLabel").textContent = `Goal: ${goalWeight}`;

      if (start > goalWeight) {
        // CASE A: Weight Loss Goal (e.g. Start 200 -> Goal 150)
        const totalToLose = start - goalWeight;
        const lostSoFar = start - current;

        if (current <= goalWeight) {
          // Goal Achieved (Green)
          bar.className = "progress-bar-fill goal-achieved";
          bar.style.width = "100%";
          pctLabel.textContent = "100% — Goal Achieved! 🎉";
          pctLabel.style.color = "var(--success)";
          statusBadge.className = "status-pill status-achieved";
          statusBadge.textContent = "🎉 Goal Met";
          summaryText.textContent = `Goal reached! Target was ${goalWeight} ${currentUnit}.`;
          document.getElementById("statToGoal").textContent = `0.0`;
          document.getElementById("statToGoal").style.color = "var(--success)";
        } else if (current >= start) {
          // Gained weight instead of losing (Red)
          bar.className = "progress-bar-fill over-goal";
          bar.style.width = "100%";
          pctLabel.textContent = `0% closer (+${(current - start).toFixed(1)} ${currentUnit} above start)`;
          pctLabel.style.color = "var(--danger)";
          statusBadge.className = "status-pill status-over";
          statusBadge.textContent = `⚠️ +${diff.toFixed(1)} ${currentUnit} Over Goal`;
          summaryText.textContent = `Target: ${goalWeight} ${currentUnit} — Currently ${diff.toFixed(1)} ${currentUnit} above target.`;
          document.getElementById("statToGoal").textContent = `+${diff.toFixed(1)}`;
          document.getElementById("statToGoal").style.color = "var(--danger)";
        } else {
          // Losing weight towards goal (Red bar indicates still over goal)
          const pct = Math.min(99, Math.max(1, Math.round((lostSoFar / totalToLose) * 100)));
          bar.className = "progress-bar-fill over-goal";
          bar.style.width = `${pct}%`;
          pctLabel.textContent = `${pct}% closer to goal (${diff.toFixed(1)} ${currentUnit} remaining)`;
          pctLabel.style.color = "var(--danger)";
          statusBadge.className = "status-pill status-over";
          statusBadge.textContent = `⚠️ +${diff.toFixed(1)} ${currentUnit} Over Goal`;
          summaryText.textContent = `Target: ${goalWeight} ${currentUnit} — ${diff.toFixed(1)} ${currentUnit} remaining to reach goal.`;
          document.getElementById("statToGoal").textContent = `+${diff.toFixed(1)}`;
          document.getElementById("statToGoal").style.color = "var(--danger)";
        }
      } else {
        // CASE B: Weight Gain / General Goal (e.g. Start 12 -> Goal 45)
        if (current === goalWeight) {
          bar.className = "progress-bar-fill goal-achieved";
          bar.style.width = "100%";
          pctLabel.textContent = "100% — Goal Achieved! 🎉";
          pctLabel.style.color = "var(--success)";
          statusBadge.className = "status-pill status-achieved";
          statusBadge.textContent = "🎉 Goal Met";
          summaryText.textContent = `Goal reached! Target was ${goalWeight} ${currentUnit}.`;
          document.getElementById("statToGoal").textContent = `0.0`;
          document.getElementById("statToGoal").style.color = "var(--success)";
        } else if (current > goalWeight) {
          // Overshot goal (Red Bar)
          bar.className = "progress-bar-fill over-goal";
          bar.style.width = "100%";
          pctLabel.textContent = `+${diff.toFixed(1)} ${currentUnit} over target goal`;
          pctLabel.style.color = "var(--danger)";
          statusBadge.className = "status-pill status-over";
          statusBadge.textContent = `⚠️ +${diff.toFixed(1)} ${currentUnit} Over Goal`;
          summaryText.textContent = `Target: ${goalWeight} ${currentUnit} — Currently ${diff.toFixed(1)} ${currentUnit} above goal.`;
          document.getElementById("statToGoal").textContent = `+${diff.toFixed(1)}`;
          document.getElementById("statToGoal").style.color = "var(--danger)";
        } else {
          // Gaining weight towards goal
          const totalToGain = goalWeight - start;
          const gainedSoFar = current - start;
          const pct = totalToGain > 0 ? Math.min(99, Math.max(0, Math.round((gainedSoFar / totalToGain) * 100))) : 0;
          bar.className = "progress-bar-fill";
          bar.style.width = `${pct}%`;
          pctLabel.textContent = `${pct}% closer to goal (${Math.abs(diff).toFixed(1)} ${currentUnit} remaining)`;
          pctLabel.style.color = "var(--primary)";
          statusBadge.className = "status-pill status-neutral";
          statusBadge.textContent = "In Progress";
          summaryText.textContent = `Target: ${goalWeight} ${currentUnit} — ${Math.abs(diff).toFixed(1)} ${currentUnit} to go.`;
          document.getElementById("statToGoal").textContent = `${diff.toFixed(1)}`;
          document.getElementById("statToGoal").style.color = "var(--primary)";
        }
      }
    } else {
      bar.className = "progress-bar-fill";
      bar.style.width = "0%";
      pctLabel.textContent = "No goal set";
      pctLabel.style.color = "var(--text-muted)";
      statusBadge.className = "status-pill status-neutral";
      statusBadge.textContent = "No Goal Set";
      summaryText.textContent = "Set a target goal to track your progress.";
      document.getElementById("statToGoal").textContent = "--";
      document.getElementById("statToGoal").style.color = "var(--primary)";
    }
  } else {
    document.getElementById("statStart").textContent = "--";
    document.getElementById("statCurrent").textContent = "--";
    document.getElementById("statToGoal").textContent = "--";
    bar.style.width = "0%";
  }

  renderChart();
}

function renderChart() {
  const ctx = document.getElementById("weightChart").getContext("2d");
  const labels = userWeights.map(w => w.date);
  const data = userWeights.map(w => w.weight);

  const datasets = [{
    label: `Weight (${currentUnit})`,
    data: data,
    borderColor: "#0284c7",
    backgroundColor: "rgba(2, 132, 199, 0.08)",
    fill: true,
    tension: 0.35,
    borderWidth: 2,
    pointRadius: 3,
    pointBackgroundColor: "#0284c7"
  }];

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
      plugins: {
        legend: {
          display: !!goalWeight,
          labels: { boxWidth: 10, font: { size: 11 }, color: "#64748b" }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { font: { size: 10 }, color: "#94a3b8", maxRotation: 0, autoSkip: true, maxTicksLimit: 5 }
        },
        y: {
          grid: { color: "#f1f5f9" },
          ticks: { font: { size: 10 }, color: "#94a3b8" }
        }
      }
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  updateNav();
  updateTimeLabels();

  if (currentUser) {
    showView("dash");
    initDashboard();
  } else {
    showView("home");
  }

  setInterval(checkScheduledTimeAndCountdown, 1000);
  checkScheduledTimeAndCountdown();
});
