/**
 * Log it AI — Dual Engine (Gemini 10 msgs/day + Unlimited Local AI Fallback)
 * File Path: js/ai.js
 */

const DAILY_GEMINI_LIMIT = 10;

// 1. Quota & Reset Management
function getDailyAiCount() {
  const todayStr = getTodayFormatted();
  const storedDate = localStorage.getItem("logit_ai_daily_date");
  if (storedDate !== todayStr) {
    localStorage.setItem("logit_ai_daily_date", todayStr);
    localStorage.setItem("logit_ai_daily_count", "0");
    return 0;
  }
  return parseInt(localStorage.getItem("logit_ai_daily_count") || "0", 10);
}

function incrementDailyAiCount() {
  const count = getDailyAiCount() + 1;
  localStorage.setItem("logit_ai_daily_count", count.toString());
  updateAiQuotaDisplay();
  return count;
}

function updateAiQuotaDisplay() {
  const badge = document.getElementById("aiDailyQuotaBadge");
  if (!badge) return;
  const count = getDailyAiCount();
  if (count < DAILY_GEMINI_LIMIT) {
    badge.textContent = `⚡ Gemini: ${count}/${DAILY_GEMINI_LIMIT} today`;
    badge.className = "ai-quota-badge ai-quota-active";
  } else {
    badge.textContent = `⚡ Local AI Active (${DAILY_GEMINI_LIMIT}/${DAILY_GEMINI_LIMIT} used)`;
    badge.className = "ai-quota-badge ai-quota-max";
  }
}

// 2. Open / Close Drawer
function toggleAiDrawer() {
  if (!currentUser) {
    alert("Please sign in or create an account to use Log it AI.");
    showView("login");
    return;
  }
  const modal = document.getElementById("aiModal");
  if (!modal) return;
  modal.classList.toggle("open");
  if (modal.classList.contains("open")) {
    document.getElementById("aiChatInput").focus();
    updateAiQuotaDisplay();
  }
}

function handleAiPromptSubmit(e) {
  e.preventDefault();
  const input = document.getElementById("aiChatInput");
  const prompt = input.value.trim();
  if (!prompt) return;

  appendAiMessage("user", prompt);
  input.value = "";

  processAiMessage(prompt);
}

function sendQuickPrompt(promptText) {
  appendAiMessage("user", promptText);
  processAiMessage(promptText);
}

function appendAiMessage(sender, text) {
  const container = document.getElementById("aiChatMessages");
  if (!container) return;

  const msgDiv = document.createElement("div");
  msgDiv.className = `ai-msg ai-msg-${sender}`;
  msgDiv.innerHTML = text.replace(/\n/g, "<br>");

  container.appendChild(msgDiv);
  container.scrollTop = container.scrollHeight;
}

// -------------------------------------------------------------
// HYBRID AI DISPATCHER (GEMINI -> LOCAL FALLBACK)
// -------------------------------------------------------------
async function processAiMessage(prompt) {
  if (!currentUser) {
    appendAiMessage("bot", "👋 Please **Sign In** first so I can log your weights and edit your goals!");
    return;
  }

  const currentDailyCount = getDailyAiCount();

  // IF OVER 10 MESSAGES TODAY -> USE LOCAL BUILT-IN AI
  if (currentDailyCount >= DAILY_GEMINI_LIMIT) {
    appendAiMessage("bot", `⚡ *[Daily Gemini limit of 10 reached for today. Running on Built-in Assistant]*`);
    fallbackLocalExecution(prompt);
    return;
  }

  // UNDER 10 MESSAGES -> USE GOOGLE GEMINI 1.5 FLASH
  appendAiMessage("bot", "🤖 *Thinking & processing with Gemini...*");
  const latestWeight = userWeights.length > 0 ? userWeights[userWeights.length - 1].weight : null;

  try {
    const res = await callApi({
      action: "askAI",
      prompt: prompt,
      context: {
        username: currentUser.username,
        currentWeight: latestWeight ? `${latestWeight} ${currentUnit}` : null,
        goalWeight: goalWeight ? `${goalWeight} ${currentUnit}` : null,
        unit: currentUnit,
        morningTime: morningTime,
        eveningTime: eveningTime,
        todayDate: getTodayFormatted()
      }
    });

    // Remove "Thinking..." indicator
    const msgs = document.querySelectorAll(".ai-msg-bot");
    if (msgs.length > 0 && msgs[msgs.length - 1].textContent.includes("Thinking")) {
      msgs[msgs.length - 1].remove();
    }

    if (res.raw) {
      incrementDailyAiCount();

      let parsed = null;
      try {
        const jsonStart = res.raw.indexOf("{");
        const jsonEnd = res.raw.lastIndexOf("}");
        if (jsonStart > -1 && jsonEnd > -1) {
          parsed = JSON.parse(res.raw.substring(jsonStart, jsonEnd + 1));
        }
      } catch (e) {}

      if (parsed && parsed.action && parsed.action !== "none") {
        await executeAppAction(parsed);
        appendAiMessage("bot", parsed.reply || "Done!");
      } else if (parsed && parsed.reply) {
        appendAiMessage("bot", parsed.reply);
      } else {
        appendAiMessage("bot", res.raw);
      }
    } else {
      fallbackLocalExecution(prompt);
    }
  } catch (err) {
    // If rate limit message
    if (err.message && err.message.includes("Rate limit")) {
      appendAiMessage("bot", `⏳ ${err.message}\n*Switching to Local Assistant for this message:*`);
    }
    fallbackLocalExecution(prompt);
  }
}

// -------------------------------------------------------------
// APP ACTION EXECUTION
// -------------------------------------------------------------
async function executeAppAction(parsed) {
  const act = parsed.action;
  const val = parsed.value;

  if (act === "saveWeight") {
    const weightNum = parseFloat(val);
    if (!isNaN(weightNum)) {
      await callApi({
        action: "saveWeight",
        userId: currentUser.userId,
        date: getTodayFormatted(),
        weight: weightNum,
        unit: currentUnit
      });

      const existingIdx = userWeights.findIndex(w => w.date === getTodayFormatted());
      if (existingIdx > -1) {
        userWeights[existingIdx].weight = weightNum;
        userWeights[existingIdx].unit = currentUnit;
      } else {
        userWeights.push({ id: "W_" + Date.now(), date: getTodayFormatted(), weight: weightNum, unit: currentUnit });
      }
      renderDashboard();
    }
  } else if (act === "setGoal") {
    const goalNum = parseFloat(val);
    if (!isNaN(goalNum)) {
      await callApi({
        action: "setGoal",
        userId: currentUser.userId,
        goalWeight: goalNum
      });
      goalWeight = goalNum;
      currentUser.goalWeight = goalNum;
      localStorage.setItem("logit_user", JSON.stringify(currentUser));
      renderDashboard();
    }
  } else if (act === "setMorningTime") {
    morningTime = String(val);
    localStorage.setItem("logit_morning_time", morningTime);
    updateTimeLabels();
    checkScheduledTimeAndCountdown();
  } else if (act === "setEveningTime") {
    eveningTime = String(val);
    localStorage.setItem("logit_evening_time", eveningTime);
    updateTimeLabels();
    checkScheduledTimeAndCountdown();
  } else if (act === "toggleBrush") {
    const period = parsed.period || "morning";
    const status = val === true || val === "true";
    const chk = document.getElementById(period === "morning" ? "brushMorning" : "brushEvening");
    if (chk) chk.checked = status;
    toggleBrushStatus(period);
  } else if (act === "switchUnit") {
    if (val === "kg" || val === "lbs") {
      switchUnit(val);
    }
  }
}

// -------------------------------------------------------------
// BUILT-IN LOCAL AI ENGINE (UNLIMITED FALLBACK)
// -------------------------------------------------------------
async function fallbackLocalExecution(rawText) {
  const text = rawText.toLowerCase().trim();

  // 1. Log weight
  const weightMatch = text.match(/(?:log|add|record|enter|weigh|weight|weighed)\s*(?:is|my)?\s*([0-9]+(?:\.[0-9]+)?)\s*(kg|lbs|pounds|kilos)?/i);
  if (weightMatch) {
    const weightVal = parseFloat(weightMatch[1]);
    const detectedUnit = weightMatch[2] ? (weightMatch[2].startsWith("p") || weightMatch[2] === "lbs" ? "lbs" : "kg") : currentUnit;
    if (detectedUnit !== currentUnit) switchUnit(detectedUnit);

    await executeAppAction({ action: "saveWeight", value: weightVal });
    appendAiMessage("bot", `✅ I logged **${weightVal} ${currentUnit}** for today (${getTodayFormatted()}) and updated your progress chart!`);
    return;
  }

  // 2. Set goal
  const goalMatch = text.match(/(?:set|change|update|make|my)?\s*(?:goal|target)\s*(?:is|to|weight)?\s*([0-9]+(?:\.[0-9]+)?)\s*(kg|lbs)?/i);
  if (goalMatch && !text.includes("how close")) {
    const goalVal = parseFloat(goalMatch[1]);
    await executeAppAction({ action: "setGoal", value: goalVal });
    appendAiMessage("bot", `🎯 I've updated your target goal to **${goalVal} ${currentUnit}**!`);
    return;
  }

  // 3. Morning alert
  if (text.includes("morning") && (text.includes("reminder") || text.includes("time") || text.includes("alert"))) {
    const t = parseTimeFromText(text);
    if (t) {
      executeAppAction({ action: "setMorningTime", value: t });
      appendAiMessage("bot", `⏰ Set morning toothbrush alert to **${format12Hour(t)}**.`);
      return;
    }
  }

  // 4. Evening alert
  if ((text.includes("evening") || text.includes("night")) && (text.includes("reminder") || text.includes("time") || text.includes("alert"))) {
    const t = parseTimeFromText(text);
    if (t) {
      executeAppAction({ action: "setEveningTime", value: t });
      appendAiMessage("bot", `🌙 Set evening toothbrush alert to **${format12Hour(t)}**.`);
      return;
    }
  }

  // 5. Teeth brushing
  if (text.includes("brush") || text.includes("teeth")) {
    if (text.includes("morning") || text.includes("am")) {
      executeAppAction({ action: "toggleBrush", period: "morning", value: true });
      appendAiMessage("bot", "🦷 Marked your **Morning Brush** as completed! ☀️");
      return;
    }
    if (text.includes("evening") || text.includes("pm") || text.includes("night")) {
      executeAppAction({ action: "toggleBrush", period: "evening", value: true });
      appendAiMessage("bot", "✨ Marked your **Evening Brush** as completed! 🌙");
      return;
    }
  }

  // 6. Unit switch
  if (text.includes("switch") || text.includes("change unit")) {
    if (text.includes("lb") || text.includes("pound")) {
      switchUnit("lbs");
      appendAiMessage("bot", "🔄 Switched weight unit to **Pounds (lbs)**.");
      return;
    }
    if (text.includes("kg") || text.includes("kilo")) {
      switchUnit("kg");
      appendAiMessage("bot", "🔄 Switched weight unit to **Kilograms (kg)**.");
      return;
    }
  }

  // 7. Status & progress
  if (text.includes("how close") || text.includes("progress") || text.includes("status") || text.includes("summary")) {
    if (!currentUser || userWeights.length === 0) {
      appendAiMessage("bot", "📊 You haven't logged any weights yet. Tell me *'Log 70 kg'* to get started!");
      return;
    }
    const start = userWeights[0].weight;
    const current = userWeights[userWeights.length - 1].weight;
    const diff = (current - start).toFixed(1);
    let reply = `📊 **Current Status:**\n• Start: ${start} ${currentUnit}\n• Current: ${current} ${currentUnit}\n• Total Change: ${diff > 0 ? "+" : ""}${diff} ${currentUnit}\n`;
    if (goalWeight) {
      const toGoal = (current - goalWeight).toFixed(1);
      reply += current > goalWeight ? `• Goal: ${goalWeight} ${currentUnit} (⚠️ ${Math.abs(toGoal)} ${currentUnit} remaining)` : `• Goal: ${goalWeight} ${currentUnit} (🎉 Goal Met!)`;
    }
    appendAiMessage("bot", reply);
    return;
  }

  appendAiMessage("bot", `🤖 Ready! You can tell me to log weights (*"Log 70 kg"*), set your goal (*"Set goal to 65 kg"*), change alert times (*"Morning alert 8 AM"*), or check your routines!`);
}

function parseTimeFromText(str) {
  const match = str.match(/([0-9]{1,2})(?::([0-9]{2}))?\s*(am|pm)?/i);
  if (!match) return null;
  let h = parseInt(match[1], 10);
  const m = match[2] ? match[2] : "00";
  const ampm = match[3] ? match[3].toLowerCase() : null;
  if (ampm === "pm" && h < 12) h += 12;
  if (ampm === "am" && h === 12) h = 0;
  const hStr = h < 10 ? "0" + h : "" + h;
  return `${hStr}:${m}`;
}