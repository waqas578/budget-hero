// --- Storage keys ---
const STORE_KEY = "moneyGame.v1";

const defaultState = {
  budget: 50,
  score: 0,
  lives: 3,
  day: 1,
  streak: 0,
  levelXP: 0,
  history: [],
  wishlist: [],
  availableStars: 0,
  lastLifeReset: new Date().toISOString().slice(0, 7) // YYYY-MM format
};

let state = loadState();

// Check if we need to reset lives for new month
function checkMonthlyReset() {
  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
  if (state.lastLifeReset !== currentMonth) {
    state.lives = 3;
    state.lastLifeReset = currentMonth;
    toast("✨ Lives refreshed for new month!");
    saveState();
    render();
  }
}

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
  achievements: document.getElementById("achievements"),
  // New wishlist elements
  wishlistItemInput: document.getElementById("wishlistItemInput"),
  wishlistStarsInput: document.getElementById("wishlistStarsInput"),
  addWishlistItem: document.getElementById("addWishlistItem"),
  wishlistItems: document.getElementById("wishlistItems"),
  starsAvailable: document.getElementById("starsAvailable")
};

// --- Init ---
checkMonthlyReset(); // Check for monthly life reset
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

// Add wishlist item
el.addWishlistItem.addEventListener("click", () => {
  const name = el.wishlistItemInput.value.trim();
  const starsNeeded = Number(el.wishlistStarsInput.value);
  
  if (!name) {
    toast("⚠️ Enter an item name.");
    return;
  }
  
  if (!Number.isFinite(starsNeeded) || starsNeeded <= 0) {
    toast("⚠️ Enter valid stars needed (minimum 1).");
    return;
  }
  
  const newItem = {
    id: Date.now(),
    name: name,
    starsNeeded: Math.round(starsNeeded),
    starsTransferred: 0,
    completed: false
  };
  
  state.wishlist.push(newItem);
  saveState();
  renderWishlist();
  
  el.wishlistItemInput.value = "";
  el.wishlistStarsInput.value = "";
  toast(`✅ Added "${name}" to wishlist (needs ${starsNeeded} stars)`);
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
  state.wishlist = [];
  state.availableStars = 0;
  state.lastLifeReset = new Date().toISOString().slice(0, 7);
  saveState();
  render();
});

// --- Core logic ---
function processDay(spent) {
  // Check monthly reset
  checkMonthlyReset();
  
  let points = 0;
  let bonus = 0;
  let overspent = false;
  let message = "";

  if (spent <= state.budget) {
    points = Math.round((state.budget - spent) * 2);
    state.score += points;
    state.streak += 1;
    state.levelXP = Math.min(100, state.levelXP + Math.min(20, points / 2));
    
    // Earn stars based on points (10 points = 1 star)
    const starsEarned = Math.floor(points / 10);
    if (starsEarned > 0) {
      state.availableStars += starsEarned;
      message += `✅ Under budget! +${points} points (+${starsEarned}⭐). `;
    } else {
      message += `✅ Under budget! +${points} points. `;
    }

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

function transferStars(itemId, amount) {
  const item = state.wishlist.find(item => item.id === itemId);
  if (!item || item.completed) return false;
  
  if (amount > state.availableStars) {
    toast("⚠️ Not enough stars available!");
    return false;
  }
  
  const maxTransfer = item.starsNeeded - item.starsTransferred;
  const actualTransfer = Math.min(amount, maxTransfer);
  
  item.starsTransferred += actualTransfer;
  state.availableStars -= actualTransfer;
  
  if (item.starsTransferred >= item.starsNeeded) {
    item.completed = true;
    item.starsTransferred = item.starsNeeded; // Cap it
    toast(`🎉 "${item.name}" completed!`);
  } else {
    toast(`⭐ Transferred ${actualTransfer} stars to "${item.name}"`);
  }
  
  saveState();
  renderWishlist();
  return true;
}

function removeWishlistItem(itemId) {
  const item = state.wishlist.find(item => item.id === itemId);
  if (item && !item.completed && item.starsTransferred > 0) {
    if (confirm(`Return ${item.starsTransferred} stars from "${item.name}"?`)) {
      state.availableStars += item.starsTransferred;
    }
  }
  
  state.wishlist = state.wishlist.filter(item => item.id !== itemId);
  saveState();
  renderWishlist();
}

function renderWishlist() {
  el.starsAvailable.textContent = `Stars: ${state.availableStars}⭐`;
  
  if (state.wishlist.length === 0) {
    el.wishlistItems.innerHTML = `
      <div class="wishlist-empty">
        <p>No wishlist items yet. Add something you want to save for!</p>
        <p>You earn 1 star for every 10 points you get from staying under budget.</p>
      </div>
    `;
    return;
  }
  
  el.wishlistItems.innerHTML = state.wishlist.map(item => {
    const progressPercent = (item.starsTransferred / item.starsNeeded) * 100;
    const remaining = item.starsNeeded - item.starsTransferred;
    
    return `
      <div class="wishlist-item ${item.completed ? 'completed' : ''}">
        <div class="wishlist-item-header">
          <span class="wishlist-item-name">${item.name}</span>
          <button class="btn danger small" onclick="removeWishlistItem(${item.id})">×</button>
        </div>
        <div class="wishlist-progress">
          <div class="wishlist-progress-bar">
            <div class="wishlist-progress-fill" style="width: ${progressPercent}%"></div>
          </div>
          <span class="wishlist-progress-text">
            ${item.starsTransferred}/${item.starsNeeded} ⭐
            ${item.completed ? '✓ COMPLETED' : `(${remaining} left)`}
          </span>
        </div>
        ${!item.completed ? `
        <div class="wishlist-actions">
          <span class="transfer-label">Transfer stars:</span>
          <button class="btn small" onclick="transferStars(${item.id}, 1)">+1⭐</button>
          <button class="btn small" onclick="transferStars(${item.id}, 5)">+5⭐</button>
          <button class="btn small primary" onclick="transferStars(${item.id}, 10)">+10⭐</button>
          <button class="btn small accent" onclick="transferStars(${item.id}, ${remaining})">ALL⭐</button>
        </div>
        ` : ''}
      </div>
    `;
  }).join('');
}

function render() {
  el.day.textContent = state.day;
  el.score.textContent = state.score;
  el.lives.textContent = state.lives;
  el.streak.textContent = state.streak;
  el.levelBar.style.width = `${state.levelXP}%`;
  el.livesBar.style.width = `${(state.lives / 3) * 100}%`;
  el.starsAvailable.textContent = `Stars: ${state.availableStars}⭐`;

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
    
  // Wishlist
  renderWishlist();
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

// Make functions available globally for onclick handlers
window.transferStars = transferStars;
window.removeWishlistItem = removeWishlistItem;