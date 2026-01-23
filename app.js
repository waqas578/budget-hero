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
  lastLifeReset: new Date().toISOString().slice(0, 7), // YYYY-MM format
  // NEW: Monthly spending tracking
  monthlyData: {
    totalBudget: 0,
    totalSpent: 0,
    totalSaved: 0,
    month: new Date().toISOString().slice(0, 7) // Current month
  }
};

let state = loadState();

// Check if we need to reset lives AND monthly data for new month
function checkMonthlyReset() {
  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
  
  if (state.lastLifeReset !== currentMonth) {
    // Reset lives
    state.lives = 3;
    state.lastLifeReset = currentMonth;
    
    // Reset monthly data for new month
    state.monthlyData = {
      totalBudget: 0,
      totalSpent: 0,
      totalSaved: 0,
      month: currentMonth
    };
    
    toast("✨ New month! Lives refreshed and monthly stats reset!");
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
  // Wishlist elements
  wishlistItemInput: document.getElementById("wishlistItemInput"),
  wishlistStarsInput: document.getElementById("wishlistStarsInput"),
  addWishlistItem: document.getElementById("addWishlistItem"),
  wishlistItems: document.getElementById("wishlistItems"),
  starsAvailable: document.getElementById("starsAvailable"),
  // Monthly summary elements
  monthlyBudget: document.getElementById("monthlyBudget"),
  monthlySpent: document.getElementById("monthlySpent"),
  monthlySaved: document.getElementById("monthlySaved"),
  // Today's summary elements
  todaysSummary: document.getElementById("todaysSummary"),
  todaysBudget: document.getElementById("todaysBudget"),
  todaysSpent: document.getElementById("todaysSpent"),
  todaysSaved: document.getElementById("todaysSaved"),
  todaysPoints: document.getElementById("todaysPoints"),
  adjustInput: document.getElementById("adjustInput"),
  adjustBtn: document.getElementById("adjustBtn")
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
    updateTodaysSummary();
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
    completed: false,
    redeemed: false // Track if item was redeemed
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
    
    // Ensure monthlyData exists
    if (!state.monthlyData) {
      state.monthlyData = defaultState.monthlyData;
    }
    
    // Ensure history entries have saved field
    state.history.forEach(entry => {
      if (entry.saved === undefined) {
        entry.saved = Math.max(0, state.budget - entry.spent);
      }
    });
    
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
  state.monthlyData = defaultState.monthlyData;
  saveState();
  render();
});

// Adjust today's spending
el.adjustBtn.addEventListener("click", () => {
  const newSpent = Number(el.adjustInput.value);
  if (!Number.isFinite(newSpent) || newSpent < 0) {
    toast("⚠️ Enter a valid amount.");
    return;
  }
  
  adjustTodaysSpending(newSpent);
  el.adjustInput.value = "";
});

// Update monthly data
function updateMonthlyData(spent) {
  const currentMonth = new Date().toISOString().slice(0, 7);
  
  // If month changed, reset data (should already be handled by checkMonthlyReset)
  if (state.monthlyData.month !== currentMonth) {
    state.monthlyData = {
      totalBudget: state.budget,
      totalSpent: spent,
      totalSaved: Math.max(0, state.budget - spent),
      month: currentMonth
    };
    return;
  }
  
  // Update current month's data
  state.monthlyData.totalBudget += state.budget;
  state.monthlyData.totalSpent += spent;
  state.monthlyData.totalSaved = Math.max(0, state.monthlyData.totalBudget - state.monthlyData.totalSpent);
}

// Update today's summary display
function updateTodaysSummary() {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const todaysEntry = state.history.find(entry => 
    entry.date && entry.date.slice(0, 10) === today
  );
  
  if (todaysEntry) {
    el.todaysSummary.classList.remove("hidden");
    el.todaysBudget.textContent = `${state.budget} HKD`;
    el.todaysSpent.textContent = `${todaysEntry.spent} HKD`;
    el.todaysSaved.textContent = `${todaysEntry.saved || 0} HKD`;
    el.todaysPoints.textContent = `${todaysEntry.points || 0}`;
    el.adjustInput.placeholder = `Current: ${todaysEntry.spent}`;
  } else {
    el.todaysSummary.classList.add("hidden");
  }
}

// Adjust today's spending
function adjustTodaysSpending(newSpent) {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const todaysIndex = state.history.findIndex(entry => 
    entry.date && entry.date.slice(0, 10) === today
  );
  
  if (todaysIndex === -1) {
    toast("⚠️ No entry found for today.");
    return;
  }
  
  const oldEntry = state.history[todaysIndex];
  const oldSpent = oldEntry.spent;
  const oldPoints = oldEntry.points || 0;
  const oldSaved = oldEntry.saved || 0;
  const oldOverspent = oldEntry.overspent || false;
  const oldBonus = oldEntry.bonus || 0;
  
  // Remove old impact
  state.score -= oldPoints;
  state.score -= oldBonus;
  
  // Adjust streak based on old entry
  if (!oldOverspent) {
    state.streak = Math.max(0, state.streak - 1);
  }
  
  // Adjust level XP
  state.levelXP = Math.max(0, state.levelXP - Math.min(20, oldPoints / 2));
  if (oldBonus > 0) {
    state.levelXP = Math.max(0, state.levelXP - 10);
  }
  
  // Remove old stars (10 points = 1 star)
  const oldStars = Math.floor(oldPoints / 10);
  if (oldStars > 0) {
    state.availableStars = Math.max(0, state.availableStars - oldStars);
  }
  
  // Adjust monthly data
  state.monthlyData.totalSpent -= oldSpent;
  state.monthlyData.totalSaved = Math.max(0, state.monthlyData.totalBudget - state.monthlyData.totalSpent);
  
  // Calculate new values
  let newPoints = 0;
  let newBonus = 0;
  let newOverspent = false;
  let newSaved = 0;
  
  if (newSpent <= state.budget) {
    newPoints = Math.round((state.budget - newSpent) * 2);
    newSaved = state.budget - newSpent;
    state.score += newPoints;
    
    // Restore streak if not overspent
    if (!oldOverspent) {
      state.streak += 1;
    } else {
      state.streak = 1;
    }
    
    state.levelXP = Math.min(100, state.levelXP + Math.min(20, newPoints / 2));
    
    // Earn stars based on new points
    const newStars = Math.floor(newPoints / 10);
    if (newStars > 0) {
      state.availableStars += newStars;
    }
    
    // Keep old bonus if it exists
    if (oldBonus > 0) {
      newBonus = oldBonus;
      state.score += newBonus;
      state.levelXP = Math.min(100, state.levelXP + 10);
    }
  } else {
    newOverspent = true;
    newSaved = 0;
    if (!oldOverspent) {
      // Only lose life if previously wasn't overspent
      state.lives = Math.max(0, state.lives - 1);
      state.streak = 0;
      state.levelXP = Math.max(0, state.levelXP - 10);
    }
  }
  
  // Update monthly data with new spent
  state.monthlyData.totalSpent += newSpent;
  state.monthlyData.totalSaved = Math.max(0, state.monthlyData.totalBudget - state.monthlyData.totalSpent);
  
  // Update the entry
  state.history[todaysIndex] = {
    ...oldEntry,
    spent: Math.round(newSpent),
    points: newPoints,
    bonus: newBonus,
    overspent: newOverspent,
    saved: newSaved
  };
  
  // Save and render
  saveState();
  render();
  
  // Show adjustment message
  const diff = newSpent - oldSpent;
  const diffText = diff > 0 ? `+${diff}` : diff;
  toast(`✅ Today's spending adjusted from ${oldSpent} to ${newSpent} (${diffText} HKD). Score recalculated.`);
  
  // Game over check
  if (state.lives <= 0) {
    el.overlay.classList.remove("hidden");
  }
}

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

  // Update monthly data
  updateMonthlyData(spent);
  
  // Calculate today's summary
  const savedToday = Math.max(0, state.budget - spent);
  message += ` Today: ${state.budget} - ${spent} = ${savedToday} HKD saved.`;
  
  // Calculate monthly summary
  const monthlySaved = state.monthlyData.totalSaved;
  message += ` Monthly: ${state.monthlyData.totalBudget} - ${state.monthlyData.totalSpent} = ${monthlySaved} HKD saved.`;

  // Append history
  state.history.push({
    date: new Date().toISOString(),
    spent: Math.round(spent),
    points,
    bonus,
    overspent,
    saved: savedToday
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

// Show confirmation when removing wishlist item
function confirmRemoveWishlistItem(itemId) {
  const item = state.wishlist.find(item => item.id === itemId);
  if (!item) return;
  
  // Create confirmation modal
  const confirmationHTML = `
    <div class="modal confirmation-modal">
      <h3>Remove "${item.name}"</h3>
      <p>Did you redeem this item or are you just canceling it?</p>
      <div class="confirmation-options">
        <button class="btn" onclick="handleWishlistRemoval(${itemId}, 'cancel')">Just Cancel</button>
        <button class="btn primary" onclick="handleWishlistRemoval(${itemId}, 'redeem')">Redeemed It</button>
      </div>
    </div>
  `;
  
  const modalOverlay = document.createElement('div');
  modalOverlay.className = 'overlay';
  modalOverlay.innerHTML = confirmationHTML;
  document.body.appendChild(modalOverlay);
  
  // Close modal on click outside
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) {
      document.body.removeChild(modalOverlay);
    }
  });
}

// Handle wishlist removal with option
function handleWishlistRemoval(itemId, action) {
  const item = state.wishlist.find(item => item.id === itemId);
  if (!item) return;
  
  // Remove the confirmation modal
  const modal = document.querySelector('.overlay:not(#overlay)');
  if (modal) document.body.removeChild(modal);
  
  if (action === 'redeem') {
    // Mark as redeemed
    item.redeemed = true;
    item.completed = true;
    
    // If it was completed with stars, deduct from total spent
    if (item.starsTransferred > 0) {
      // Calculate equivalent money value (1 star = ? HKD saved)
      // This is approximate since stars come from points, not direct money
      const starsEquivalent = item.starsTransferred * 10; // 10 points per star
      toast(`🎉 "${item.name}" marked as redeemed! It cost you ${starsEquivalent} points worth of savings.`);
    } else {
      toast(`🎉 "${item.name}" marked as redeemed!`);
    }
    
    saveState();
    renderWishlist();
  } else {
    // Cancel - return stars if any were transferred
    if (!item.completed && item.starsTransferred > 0) {
      state.availableStars += item.starsTransferred;
      toast(`↩️ Canceled "${item.name}" and returned ${item.starsTransferred} stars.`);
    } else {
      toast(`❌ Canceled "${item.name}"`);
    }
    
    state.wishlist = state.wishlist.filter(item => item.id !== itemId);
    saveState();
    renderWishlist();
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
    toast(`🎉 "${item.name}" completed! Ready to redeem!`);
  } else {
    toast(`⭐ Transferred ${actualTransfer} stars to "${item.name}"`);
  }
  
  saveState();
  renderWishlist();
  return true;
}

function removeWishlistItem(itemId) {
  confirmRemoveWishlistItem(itemId);
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
          <span class="wishlist-item-name">
            ${item.name}
            ${item.redeemed ? ' 🛒' : ''}
          </span>
          <button class="btn danger small" onclick="removeWishlistItem(${item.id})">×</button>
        </div>
        <div class="wishlist-progress">
          <div class="wishlist-progress-bar">
            <div class="wishlist-progress-fill" style="width: ${progressPercent}%"></div>
          </div>
          <span class="wishlist-progress-text">
            ${item.starsTransferred}/${item.starsNeeded} ⭐
            ${item.completed ? 
              (item.redeemed ? '🛒 REDEEMED' : '✓ READY TO REDEEM') : 
              `(${remaining} left)`}
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
        ${item.completed && !item.redeemed ? `
        <div class="wishlist-actions">
          <button class="btn small primary" onclick="handleWishlistRemoval(${item.id}, 'redeem')">
            🛒 Mark as Redeemed
          </button>
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

  // Update monthly summary
  if (el.monthlyBudget) {
    el.monthlyBudget.textContent = `${state.monthlyData.totalBudget} HKD`;
    el.monthlySpent.textContent = `${state.monthlyData.totalSpent} HKD`;
    el.monthlySaved.textContent = `${state.monthlyData.totalSaved} HKD`;
  }

  // Update monthly summary header with current month
  const monthlyHeader = document.querySelector('.monthly-summary-header h3');
  if (monthlyHeader) {
    monthlyHeader.textContent = `📅 Monthly Summary (${state.monthlyData.month})`;
  }

  // Update today's summary
  updateTodaysSummary();

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
    .map((item, index) => {
      const d = new Date(item.date);
      const dateStr = d.toLocaleDateString() + " " + d.toLocaleTimeString();
      const isToday = item.date && item.date.slice(0, 10) === new Date().toISOString().slice(0, 10);
      
      return `
        <li>
          <span>${dateStr}</span>
          <span>${item.spent} HKD</span>
          <span>${item.points} pts</span>
          <span>${item.bonus ? `+${item.bonus} 🎉` : "-"}</span>
          <span>${item.overspent ? "❌" : "✅"}</span>
          <span class="muted">Saved: ${item.saved || 0} HKD</span>
          ${isToday ? '<span class="muted">📝 Today</span>' : '<span></span>'}
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
    const loaded = { ...defaultState, ...parsed };
    
    // Ensure monthlyData exists in old saves
    if (!loaded.monthlyData) {
      loaded.monthlyData = defaultState.monthlyData;
      
      // Try to calculate from history if available
      if (loaded.history && loaded.history.length > 0) {
        const currentMonth = new Date().toISOString().slice(0, 7);
        const thisMonthHistory = loaded.history.filter(entry => 
          entry.date && entry.date.startsWith(currentMonth)
        );
        
        if (thisMonthHistory.length > 0) {
          loaded.monthlyData.totalBudget = loaded.budget * thisMonthHistory.length;
          loaded.monthlyData.totalSpent = thisMonthHistory.reduce((sum, entry) => sum + (entry.spent || 0), 0);
          loaded.monthlyData.totalSaved = Math.max(0, loaded.monthlyData.totalBudget - loaded.monthlyData.totalSpent);
        }
        loaded.monthlyData.month = currentMonth;
      }
    }
    
    // Ensure history entries have saved field
    loaded.history.forEach(entry => {
      if (entry.saved === undefined) {
        entry.saved = Math.max(0, loaded.budget - entry.spent);
      }
    });
    
    // Ensure wishlist items have redeemed field
    loaded.wishlist.forEach(item => {
      if (item.redeemed === undefined) {
        item.redeemed = false;
      }
    });
    
    return loaded;
  } catch {
    return { ...defaultState };
  }
}

// Make functions available globally for onclick handlers
window.transferStars = transferStars;
window.removeWishlistItem = removeWishlistItem;
window.handleWishlistRemoval = handleWishlistRemoval;
