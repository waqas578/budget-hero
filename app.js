// --- Storage keys ---
const STORE_KEY = "moneyGame.v2";

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
  lastLifeReset: new Date().toISOString().slice(0, 7),
  monthlyData: {
    totalBudget: 0,
    totalSpent: 0,
    totalSaved: 0,
    month: new Date().toISOString().slice(0, 7)
  }
};

let state = loadState();
let currentView = 'main';

// --- Elements ---
const el = {
  // Main stats
  day: document.getElementById("day"),
  score: document.getElementById("score"),
  lives: document.getElementById("lives"),
  streak: document.getElementById("streak"),
  levelBar: document.getElementById("levelBar"),
  levelPercent: document.getElementById("levelPercent"),
  livesBar: document.getElementById("livesBar"),
  livesPercent: document.getElementById("livesPercent"),
  
  // Mobile stats
  mobileDay: document.getElementById("mobileDay"),
  mobileScore: document.getElementById("mobileScore"),
  mobileLives: document.getElementById("mobileLives"),
  
  // Inputs
  budgetInput: document.getElementById("budgetInput"),
  saveBudget: document.getElementById("saveBudget"),
  spendInput: document.getElementById("spendInput"),
  submitSpend: document.getElementById("submitSpend"),
  message: document.getElementById("message"),
  
  // Today's summary
  todaysSummary: document.getElementById("todaysSummary"),
  todaysBudget: document.getElementById("todaysBudget"),
  todaysSpent: document.getElementById("todaysSpent"),
  todaysSaved: document.getElementById("todaysSaved"),
  todaysPoints: document.getElementById("todaysPoints"),
  adjustInput: document.getElementById("adjustInput"),
  adjustBtn: document.getElementById("adjustBtn"),
  
  // Monthly summary
  monthlyBudget: document.getElementById("monthlyBudget"),
  monthlySpent: document.getElementById("monthlySpent"),
  monthlySaved: document.getElementById("monthlySaved"),
  monthLabel: document.getElementById("monthLabel"),
  
  // Wishlist
  wishlistItemInput: document.getElementById("wishlistItemInput"),
  wishlistCostInput: document.getElementById("wishlistCostInput"),
  addWishlistItem: document.getElementById("addWishlistItem"),
  wishlistItems: document.getElementById("wishlistItems"),
  starsAvailable: document.getElementById("starsAvailable"),
  autoStarCalculation: document.getElementById("autoStarCalculation"),
  
  // History
  historyList: document.querySelector("#historyList tbody"),
  exportBtn: document.getElementById("exportBtn"),
  importFile: document.getElementById("importFile"),
  resetBtn: document.getElementById("resetBtn"),
  
  // Overlay
  overlay: document.getElementById("overlay"),
  restartBtn: document.getElementById("restartBtn"),
  
  // Achievements
  achievements: document.querySelector(".achievements-grid"),
  
  // Navigation
  navButtons: document.querySelectorAll(".nav-btn")
};

// --- Init ---
checkMonthlyReset();
setupEventListeners();
setupMobileNavigation();
render();
el.budgetInput.value = state.budget;

// Setup event listeners
function setupEventListeners() {
  // Save budget
  el.saveBudget.addEventListener("click", saveBudget);
  
  // Submit spending
  el.submitSpend.addEventListener("click", submitSpending);
  
  // Add wishlist item
  el.addWishlistItem.addEventListener("click", addWishlistItem);
  
  // Auto-calculate stars when cost is entered
  el.wishlistCostInput.addEventListener("input", calculateStarsFromCost);
  
  // Export
  el.exportBtn.addEventListener("click", exportData);
  
  // Import
  el.importFile.addEventListener("change", importData);
  
  // Reset
  el.resetBtn.addEventListener("click", resetData);
  
  // Restart
  el.restartBtn.addEventListener("click", restartGame);
  
  // Adjust spending
  el.adjustBtn.addEventListener("click", adjustSpending);
  
  // Allow Enter key to submit spending
  el.spendInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") submitSpending();
  });
  
  // Allow Enter key to add wishlist item
  el.wishlistItemInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") addWishlistItem();
  });
}

// Setup mobile navigation
function setupMobileNavigation() {
  el.navButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.target;
      
      el.navButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      
      currentView = target;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });
}

// Check monthly reset
function checkMonthlyReset() {
  const currentMonth = new Date().toISOString().slice(0, 7);
  
  if (state.lastLifeReset !== currentMonth) {
    state.lives = 3;
    state.lastLifeReset = currentMonth;
    
    state.monthlyData = {
      totalBudget: 0,
      totalSpent: 0,
      totalSaved: 0,
      month: currentMonth
    };
    
    toast("✨ New month! Lives and stats reset.");
    saveState();
    render();
  }
}

// Calculate stars from cost with smart adjustments
function calculateStarsFromCost() {
  const cost = Number(el.wishlistCostInput.value);
  
  if (!Number.isFinite(cost) || cost <= 0) {
    el.autoStarCalculation.textContent = "Enter cost to calculate stars needed";
    return;
  }
  
  // Base calculation: 1 star = 10 points = roughly 5 HKD saved
  // (since 2 points per HKD saved, and 10 points = 1 star)
  let baseStars = Math.ceil(cost / 5);
  
  // Smart adjustments based on user's spending behavior
  let adjustment = 0;
  let adjustmentReason = "";
  
  // Adjust based on monthly savings rate
  if (state.monthlyData.totalBudget > 0) {
    const savingsRate = state.monthlyData.totalSaved / state.monthlyData.totalBudget;
    
    if (savingsRate > 0.3) {
      // Good saver - reduce stars needed (reward)
      adjustment = -Math.floor(baseStars * 0.2); // 20% reduction
      adjustmentReason = "Great savings! ";
    } else if (savingsRate < 0.1) {
      // Poor saver - increase stars needed (encourage saving)
      adjustment = Math.ceil(baseStars * 0.1); // 10% increase
      adjustmentReason = "Need more savings. ";
    }
  }
  
  // Adjust based on streak
  if (state.streak >= 7) {
    // Good streak - small reduction
    adjustment -= Math.floor(baseStars * 0.1);
    adjustmentReason += "Great streak! ";
  }
  
  // Adjust based on available stars
  if (state.availableStars > 50) {
    // Has many stars - small reduction
    adjustment -= Math.floor(baseStars * 0.05);
    adjustmentReason += "Star rich! ";
  } else if (state.availableStars < 10) {
    // Has few stars - small increase
    adjustment += Math.ceil(baseStars * 0.05);
    adjustmentReason += "Star poor. ";
  }
  
  // Random small adjustment (-10 to +10 stars)
  const randomAdjustment = Math.floor(Math.random() * 21) - 10;
  adjustment += randomAdjustment;
  
  // Ensure adjustment is reasonable (not more than 30% of base)
  const maxAdjustment = Math.floor(baseStars * 0.3);
  if (Math.abs(adjustment) > maxAdjustment) {
    adjustment = adjustment > 0 ? maxAdjustment : -maxAdjustment;
  }
  
  // Calculate final stars
  let finalStars = baseStars + adjustment;
  
  // Ensure minimum of 1 star
  finalStars = Math.max(1, finalStars);
  
  // Calculate days to save (assuming 10 points/day average = 1 star/day)
  const daysToSave = Math.ceil(finalStars / 1.5); // Slightly optimistic estimate
  
  // Build message
  let message = `Base: ${baseStars} stars`;
  if (adjustment !== 0) {
    message += ` ${adjustment >= 0 ? '+' : ''}${adjustment} (${adjustmentReason.trim()})`;
  }
  message += ` = ${finalStars} stars total`;
  message += ` (~${daysToSave} days to save)`;
  
  el.autoStarCalculation.textContent = message;
  
  return finalStars;
}

// Save budget
function saveBudget() {
  const val = Number(el.budgetInput.value);
  if (Number.isFinite(val) && val >= 0) {
    state.budget = Math.round(val);
    saveState();
    toast("✅ Budget saved.");
    updateTodaysSummary();
    vibrate();
  } else {
    toast("⚠️ Enter a valid budget.");
  }
}

// Submit spending
function submitSpending() {
  const spent = Number(el.spendInput.value);
  if (!Number.isFinite(spent) || spent < 0) {
    toast("⚠️ Enter a valid amount.");
    return;
  }
  processDay(spent);
  el.spendInput.value = "";
  vibrate();
}

// Add wishlist item
function addWishlistItem() {
  const name = el.wishlistItemInput.value.trim();
  const cost = Number(el.wishlistCostInput.value);
  
  if (!name) {
    toast("⚠️ Enter an item name.");
    return;
  }
  
  if (!Number.isFinite(cost) || cost <= 0) {
    toast("⚠️ Enter valid cost (minimum 1 HKD).");
    return;
  }
  
  // Calculate stars needed with smart adjustments
  const starsNeeded = calculateStarsFromCost();
  
  if (!starsNeeded) {
    toast("⚠️ Could not calculate stars needed.");
    return;
  }
  
  const newItem = {
    id: Date.now(),
    name: name,
    cost: Math.round(cost),
    starsNeeded: Math.round(starsNeeded),
    starsTransferred: 0,
    completed: false,
    redeemed: false
  };
  
  state.wishlist.push(newItem);
  saveState();
  renderWishlist();
  
  el.wishlistItemInput.value = "";
  el.wishlistCostInput.value = "";
  el.autoStarCalculation.textContent = "Enter cost to calculate stars needed";
  
  toast(`✅ Added "${name}" - ${starsNeeded} stars needed ($${cost} HKD)`);
  vibrate();
}

// Export JSON
function exportData() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `money-game-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  toast("✅ Backup downloaded.");
  vibrate();
}

// Import JSON
async function importData(e) {
  const file = e.target.files[0];
  if (!file) return;
  
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    
    if (!data || typeof data !== "object" || !Array.isArray(data.history)) {
      throw new Error("Invalid file");
    }
    
    state = { ...defaultState, ...data };
    
    if (!state.monthlyData) {
      state.monthlyData = defaultState.monthlyData;
    }
    
    // Ensure history entries have saved field
    state.history.forEach(entry => {
      if (entry.saved === undefined) {
        entry.saved = Math.max(0, state.budget - entry.spent);
      }
    });
    
    // Ensure wishlist items have cost field for backward compatibility
    state.wishlist.forEach(item => {
      if (item.cost === undefined) {
        // Estimate cost from stars (5 HKD per star)
        item.cost = item.starsNeeded * 5;
      }
      if (item.redeemed === undefined) {
        item.redeemed = false;
      }
    });
    
    saveState();
    render();
    toast("✅ Import successful.");
    vibrate();
  } catch {
    toast("⚠️ Invalid backup file.");
  } finally {
    e.target.value = "";
  }
}

// Reset data
function resetData() {
  if (confirm("Reset all progress? This cannot be undone.")) {
    state = { ...defaultState };
    saveState();
    render();
    toast("🔁 Progress reset.");
    vibrate();
  }
}

// Restart game
function restartGame() {
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
  toast("🔄 Game restarted!");
  vibrate();
}

// Adjust spending
function adjustSpending() {
  const newSpent = Number(el.adjustInput.value);
  if (!Number.isFinite(newSpent) || newSpent < 0) {
    toast("⚠️ Enter a valid amount.");
    return;
  }
  
  adjustTodaysSpending(newSpent);
  el.adjustInput.value = "";
  vibrate();
}

// Update monthly data
function updateMonthlyData(spent) {
  const currentMonth = new Date().toISOString().slice(0, 7);
  
  if (state.monthlyData.month !== currentMonth) {
    state.monthlyData = {
      totalBudget: state.budget,
      totalSpent: spent,
      totalSaved: Math.max(0, state.budget - spent),
      month: currentMonth
    };
    return;
  }
  
  state.monthlyData.totalBudget += state.budget;
  state.monthlyData.totalSpent += spent;
  state.monthlyData.totalSaved = Math.max(0, state.monthlyData.totalBudget - state.monthlyData.totalSpent);
}

// Update today's summary
function updateTodaysSummary() {
  const today = new Date().toISOString().slice(0, 10);
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
  const today = new Date().toISOString().slice(0, 10);
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
  
  if (!oldOverspent) {
    state.streak = Math.max(0, state.streak - 1);
  }
  
  state.levelXP = Math.max(0, state.levelXP - Math.min(20, oldPoints / 2));
  if (oldBonus > 0) {
    state.levelXP = Math.max(0, state.levelXP - 10);
  }
  
  const oldStars = Math.floor(oldPoints / 10);
  if (oldStars > 0) {
    state.availableStars = Math.max(0, state.availableStars - oldStars);
  }
  
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
    
    if (!oldOverspent) {
      state.streak += 1;
    } else {
      state.streak = 1;
    }
    
    state.levelXP = Math.min(100, state.levelXP + Math.min(20, newPoints / 2));
    
    const newStars = Math.floor(newPoints / 10);
    if (newStars > 0) {
      state.availableStars += newStars;
    }
    
    if (oldBonus > 0) {
      newBonus = oldBonus;
      state.score += newBonus;
      state.levelXP = Math.min(100, state.levelXP + 10);
    }
  } else {
    newOverspent = true;
    newSaved = 0;
    if (!oldOverspent) {
      state.lives = Math.max(0, state.lives - 1);
      state.streak = 0;
      state.levelXP = Math.max(0, state.levelXP - 10);
    }
  }
  
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
  
  saveState();
  render();
  
  const diff = newSpent - oldSpent;
  const diffText = diff > 0 ? `+${diff}` : diff;
  toast(`✅ Today's spending adjusted from ${oldSpent} to ${newSpent} (${diffText} HKD).`);
  
  if (state.lives <= 0) {
    el.overlay.classList.remove("hidden");
  }
}

// Process day
function processDay(spent) {
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
    
    const starsEarned = Math.floor(points / 10);
    if (starsEarned > 0) {
      state.availableStars += starsEarned;
      message += `✅ Under budget! +${points} points (+${starsEarned}⭐). `;
    } else {
      message += `✅ Under budget! +${points} points. `;
    }

    if (Math.random() < 0.2) {
      bonus = 50;
      state.score += bonus;
      state.levelXP = Math.min(100, state.levelXP + 10);
      message += `🎉 Bonus! +${bonus} points. `;
    }
  } else {
    overspent = true;
    state.lives = Math.max(0, state.lives - 1);
    state.streak = 0;
    state.levelXP = Math.max(0, state.levelXP - 10);
    message += `⚠️ Overspent! Lost a life. Lives left: ${state.lives}. `;
  }

  updateMonthlyData(spent);
  
  const savedToday = Math.max(0, state.budget - spent);
  message += ` Today: ${state.budget} - ${spent} = ${savedToday} HKD saved.`;
  
  const monthlySaved = state.monthlyData.totalSaved;
  message += ` Monthly: ${state.monthlyData.totalBudget} - ${state.monthlyData.totalSpent} = ${monthlySaved} HKD saved.`;

  state.history.push({
    date: new Date().toISOString(),
    spent: Math.round(spent),
    points,
    bonus,
    overspent,
    saved: savedToday
  });

  state.day += 1;

  saveState();
  el.message.textContent = message.trim();
  render();

  if (state.lives <= 0) {
    el.overlay.classList.remove("hidden");
  }
}

// Wishlist confirmation
function confirmRemoveWishlistItem(itemId) {
  const item = state.wishlist.find(item => item.id === itemId);
  if (!item) return;
  
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
  
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) {
      document.body.removeChild(modalOverlay);
    }
  });
}

function handleWishlistRemoval(itemId, action) {
  const item = state.wishlist.find(item => item.id === itemId);
  if (!item) return;
  
  const modal = document.querySelector('.overlay:not(#overlay)');
  if (modal) document.body.removeChild(modal);
  
  if (action === 'redeem') {
    item.redeemed = true;
    item.completed = true;
    
    if (item.starsTransferred > 0) {
      const starsEquivalent = item.starsTransferred * 10;
      toast(`🎉 "${item.name}" redeemed! Cost: ${starsEquivalent} points of savings.`);
    } else {
      toast(`🎉 "${item.name}" marked as redeemed!`);
    }
    
    saveState();
    renderWishlist();
    vibrate();
  } else {
    if (!item.completed && item.starsTransferred > 0) {
      state.availableStars += item.starsTransferred;
      toast(`↩️ Canceled "${item.name}" - returned ${item.starsTransferred} stars.`);
    } else {
      toast(`❌ Canceled "${item.name}"`);
    }
    
    state.wishlist = state.wishlist.filter(item => item.id !== itemId);
    saveState();
    renderWishlist();
    vibrate();
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
    item.starsTransferred = item.starsNeeded;
    toast(`🎉 "${item.name}" completed! Ready to redeem!`);
  } else {
    toast(`⭐ Transferred ${actualTransfer} stars to "${item.name}"`);
  }
  
  saveState();
  renderWishlist();
  vibrate();
  return true;
}

function removeWishlistItem(itemId) {
  confirmRemoveWishlistItem(itemId);
}

function renderWishlist() {
  el.starsAvailable.textContent = `${state.availableStars} ⭐`;
  
  if (state.wishlist.length === 0) {
    el.wishlistItems.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🎯</div>
        <p class="empty-title">No wishlist items yet</p>
        <p class="empty-subtitle">Add something you want to save for!</p>
        <p class="empty-subtitle">Earn 1 star for every 10 points</p>
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
          <div>
            <span class="wishlist-item-name">${item.name}</span>
            <div class="wishlist-item-cost">Cost: $${item.cost} HKD</div>
          </div>
          <button class="btn danger small" onclick="removeWishlistItem(${item.id})">×</button>
        </div>
        <div class="wishlist-progress">
          <div class="wishlist-progress-bar">
            <div class="wishlist-progress-fill" style="width: ${progressPercent}%"></div>
          </div>
          <span class="wishlist-progress-text">
            ${item.starsTransferred}/${item.starsNeeded} ⭐
            ${item.completed ? 
              (item.redeemed ? '🛒 REDEEMED' : '✓ READY') : 
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
  // Update main stats
  el.day.textContent = state.day;
  el.score.textContent = state.score;
  el.lives.textContent = state.lives;
  el.streak.textContent = state.streak;
  
  // Update mobile stats
  el.mobileDay.textContent = state.day;
  el.mobileScore.textContent = state.score;
  el.mobileLives.textContent = state.lives;
  
  // Update progress bars
  el.levelBar.style.width = `${state.levelXP}%`;
  el.levelPercent.textContent = `${state.levelXP}%`;
  el.livesBar.style.width = `${(state.lives / 3) * 100}%`;
  el.livesPercent.textContent = `${Math.round((state.lives / 3) * 100)}%`;
  
  // Update stars
  el.starsAvailable.textContent = `${state.availableStars} ⭐`;
  
  // Update monthly summary
  el.monthlyBudget.textContent = `${state.monthlyData.totalBudget} HKD`;
  el.monthlySpent.textContent = `${state.monthlyData.totalSpent} HKD`;
  el.monthlySaved.textContent = `${state.monthlyData.totalSaved} HKD`;
  
  // Update month label
  el.monthLabel.textContent = state.monthlyData.month;
  
  // Update today's summary
  updateTodaysSummary();
  
  // Update achievements
  const ach = [];
  if (state.streak >= 3) ach.push(badge("🔥 3-day streak", true));
  else ach.push(badge("🔥 3-day streak", false));
  
  if (state.streak >= 7) ach.push(badge("💪 7-day streak", true));
  else ach.push(badge("💪 7-day streak", false));
  
  if (state.streak >= 14) ach.push(badge("🏆 14-day streak", true));
  else ach.push(badge("🏆 14-day streak", false));
  
  if (state.score >= 500) ach.push(badge("💡 Smart choices", true));
  else ach.push(badge("💡 Smart choices", false));
  
  if (state.levelXP >= 50) ach.push(badge("🚀 Level master", true));
  else ach.push(badge("🚀 Level master", false));
  
  if (state.availableStars >= 20) ach.push(badge("⭐ Star saver", true));
  else ach.push(badge("⭐ Star saver", false));
  
  el.achievements.innerHTML = ach.join("");
  
  // Update history
  const historyHTML = state.history
    .slice()
    .reverse()
    .map(item => {
      const d = new Date(item.date);
      const dateStr = d.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      return `
        <tr>
          <td>${dateStr}</td>
          <td>${item.spent} HKD</td>
          <td>${item.points} ${item.bonus ? `+${item.bonus} 🎉` : ''}</td>
          <td>${item.bonus ? '🎉' : '-'}</td>
          <td><span class="status ${item.overspent ? 'danger' : 'success'}">${item.overspent ? '❌ Overspent' : '✅ Saved'}</span></td>
          <td class="muted">${item.saved || 0} HKD</td>
        </tr>
      `;
    })
    .join("");
    
  el.historyList.innerHTML = historyHTML;
    
  renderWishlist();
}

function badge(label, active) {
  return `<span class="badge ${active ? "active" : ""}">${label}</span>`;
}

function toast(text) {
  el.message.textContent = text;
  // Auto-clear message after 5 seconds
  setTimeout(() => {
    if (el.message.textContent === text) {
      el.message.textContent = '';
    }
  }, 5000);
}

function vibrate() {
  // Simple haptic feedback for mobile
  if (navigator.vibrate) {
    navigator.vibrate(50);
  }
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
    
    // Ensure monthlyData exists
    if (!loaded.monthlyData) {
      loaded.monthlyData = defaultState.monthlyData;
      
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
    
    // Ensure wishlist items have cost field for backward compatibility
    loaded.wishlist.forEach(item => {
      if (item.cost === undefined) {
        // Estimate cost from stars (5 HKD per star)
        item.cost = item.starsNeeded * 5;
      }
      if (item.redeemed === undefined) {
        item.redeemed = false;
      }
    });
    
    return loaded;
  } catch {
    return { ...defaultState };
  }
}

// Make functions available globally
window.transferStars = transferStars;
window.removeWishlistItem = removeWishlistItem;
window.handleWishlistRemoval = handleWishlistRemoval;