// --- Storage keys ---
const STORE_KEY = "moneyGame.v1";

const defaultState = {
  budget: 50,
  score: 0,
  lives: 3,
  day: 1,
  streak: 0,
  levelXP: 0,          // 0–100 for level progress bar
  history: []          // {date, spent, points, bonus, overspent}
};

let state = loadState();

// --- Elements ---
const el = {
  day: document.getElementById("day"),
  score: document.getElementById("score"),
  lives: document.getElementById("lives"),
  streak: document.getElementById("streak"),
  levelBar: document.getElementById("levelBar"),
  livesBar: document.getElementById("livesBar"),
  budgetInput: document.getElementById("budgetInput"),
  saveBudget: document.getElementById("saveBudget"),
  spendInput: document.getElementById("spendInput"),
  submitSpend: document.getElementById("submitSpend"),
  message: document.getElementById("message"),
  historyList: document.getElementById("historyList"),
  exportBtn: document.getElementById("exportBtn"),
  importFile: document.getElementById("importFile"),
  resetBtn: document.getElementById("resetBtn"),
  overlay: document.getElementById("overlay"),
  restartBtn: document.getElementById("restartBtn"),
  achievements: document.getElementById("achievements")
};

// --- Init ---
render();
el.budgetInput.value = state.budget;

// Save budget
el.saveBudget.addEventListener("click", () => {
  const val = Number(el.budgetInput.value);
  if (Number.isFinite(val) && val >= 0) {
    state.budget = Math.round(val);
    saveState();
    toast("✅ Budget saved.");
  } else {
    toast("⚠️ Enter a valid budget.");
  }
});

// Submit spending
el.submitSpend.addEventListener("click", () => {
  const spent = Number(el.spendInput.value);
  if (!Number.isFinite(spent) || spent < 0) {
    toast("⚠️ Enter a valid amount.");
    return;
  }
  processDay(spent);
  el.spendInput.value = "";
});

// Export JSON
el.exportBtn.addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "money-game-backup.json";
  a.click();
  URL.revokeObjectURL(url);
});

// Import JSON
el.importFile.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    // Minimal validation
    if (!data || typeof data !== "object" || !Array.isArray(data.history)) throw new Error("Invalid file");
    state = { ...defaultState, ...data };
    saveState();
    render();
    toast("✅ Import successful.");
  } catch {
    toast("⚠️ Invalid backup file.");
  } finally {
    e.target.value = "";
  }
});

// Reset
el.resetBtn.addEventListener("click", () => {
  if (confirm("Reset all progress? This cannot be undone.")) {
    state = { ...defaultState };
    saveState();
    render();
    toast("🔁 Progress reset.");
  }
});

// Restart after game over
el.restartBtn.addEventListener("click", () => {
  el.overlay.classList.add("hidden");
  state.lives = 3;
  state.score = 0;
  state.streak = 0;
  state.levelXP = 0;
  state.day = 1;
  state.history = [];
  saveState();
  render();
});

// --- Core logic ---
function processDay(spent) {
  let points = 0;
  let bonus = 0;
  let overspent = false;
  let message = "";

  if (spent <= state.budget) {
    points = Math.round((state.budget - spent) * 2);
    state.score += points;
    state.streak += 1;
    state.levelXP = Math.min(100, state.levelXP + Math.min(20, points / 2)); // grow level bar based on performance
    message += `✅ Under budget! +${points} points. `;

    // Random bonus (20% chance)
    if (Math.random() < 0.2) {
      bonus = 50;
      state.score += bonus;
      state.levelXP = Math.min(100, state.levelXP + 10);
      message += `🎉 Bonus unlocked! +${bonus} points. `;
    }
  } else {
    overspent = true;
    state.lives = Math.max(0, state.lives - 1);
    state.streak = 0;
    state.levelXP = Math.max(0, state.levelXP - 10);
    message += `⚠️ Overspent! You lost a life. Lives left: ${state.lives}. `;
  }

  // Achievements
  const badges = [];
  if (state.streak >= 3) badges.push("🔥 3-day streak");
  if (state.streak >= 7) badges.push("💪 7-day streak");
  if (state.streak >= 14) badges.push("🏆 14-day streak");
  if (points >= 50) badges.push("🥇 Big saver");

  // Append history
  state.history.push({
    date: new Date().toISOString(),
    spent: Math.round(spent),
    points,
    bonus,
    overspent
  });

  // Advance day
  state.day += 1;

  // Persist and render
  saveState();
  el.message.textContent = message.trim();
  render();

  // Game over overlay
  if (state.lives <= 0) {
    el.overlay.classList.remove("hidden");
  }
}

function render() {
  el.day.textContent = state.day;
  el.score.textContent = state.score;
  el.lives.textContent = state.lives;
  el.streak.textContent = state.streak;
  el.levelBar.style.width = `${state.levelXP}%`;
  el.livesBar.style.width = `${(state.lives / 3) * 100}%`;

  // Achievements
  const ach = [];
  ach.push(badge("🎯 Budget master", state.streak >= 3));
  ach.push(badge("🌱 Consistency", state.streak >= 7));
  ach.push(badge("🏆 Elite saver", state.streak >= 14));
  ach.push(badge("💡 Smart choices", state.score >= 500));
  el.achievements.innerHTML = ach.join("");

  // History list
  el.historyList.innerHTML = state.history
    .slice()
    .reverse()
    .map(item => {
      const d = new Date(item.date);
      const dateStr = d.toLocaleDateString() + " " + d.toLocaleTimeString();
      return `
        <li>
          <span>${dateStr}</span>
          <span>${item.spent} HKD</span>
          <span>${item.points} pts</span>
          <span>${item.bonus ? `+${item.bonus} 🎉` : "-"}</span>
          <span>${item.overspent ? "❌" : "✅"}</span>
        </li>
      `;
    })
    .join("");
}

function badge(label, active) {
  return `<span class="badge ${active ? "active" : ""}">${label}</span>`;
}

function toast(text) {
  el.message.textContent = text;
}

function saveState() {
  localStorage.setItem(STORE_KEY, JSON.stringify(state));
}

function loadState() {
  const raw = localStorage.getItem(STORE_KEY);
  if (!raw) return { ...defaultState };
  try {
    const parsed = JSON.parse(raw);
    return { ...defaultState, ...parsed };
  } catch {
    return { ...defaultState };
  }
}
