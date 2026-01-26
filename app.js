// --- Storage keys ---
const STORE_KEY = "moneyGame.v2";

const defaultState = {
  budget: 50,
  monthBudget: 2000,
  // Budget system lock: choose once per month
  budgetMode: "daily", // "daily" | "monthly"
  budgetModeMonth: null, // YYYY-MM; if not equal to current month, user must pick again
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
    totalRedeemed: 0,
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
  monthBudgetInput: document.getElementById("monthBudgetInput"),
  saveMonthBudget: document.getElementById("saveMonthBudget"),
  todayAllowance: document.getElementById("todayAllowance"),
  dailyBudgetSection: document.getElementById("dailyBudgetSection"),
  monthlyBudgetSection: document.getElementById("monthlyBudgetSection"),
  spendSectionTitle: document.getElementById("spendSectionTitle"),
  spendLabel: document.getElementById("spendLabel"),
  todaysBudgetLabel: document.getElementById("todaysBudgetLabel"),
  todaysSavedLabel: document.getElementById("todaysSavedLabel"),
  monthlyTodayInfo: document.getElementById("monthlyTodayInfo"),
  summaryTodayAllowance: document.getElementById("summaryTodayAllowance"),
  summaryMonthRemaining: document.getElementById("summaryMonthRemaining"),
  monthlySummaryTitle: document.getElementById("monthlySummaryTitle"),
  monthlyBudgetLabel: document.getElementById("monthlyBudgetLabel"),
  monthlySpentLabel: document.getElementById("monthlySpentLabel"),
  monthlySavedLabel: document.getElementById("monthlySavedLabel"),
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
  monthlyNetSavings: document.getElementById("monthlyNetSavings"),
  monthLabel: document.getElementById("monthLabel"),
  
  // Wishlist
  wishlistItemInput: document.getElementById("wishlistItemInput"),
  wishlistCostInput: document.getElementById("wishlistCostInput"),
  addWishlistItem: document.getElementById("addWishlistItem"),
  wishlistItems: document.getElementById("wishlistItems"),
  starsAvailable: document.getElementById("starsAvailable"),
  autoStarCalculation: document.getElementById("autoStarCalculation"),
  
  // Detailed Stats
  statsMonthlySpent: document.getElementById("statsMonthlySpent"),
  statsRedeemed: document.getElementById("statsRedeemed"),
  statsStarsAvailable: document.getElementById("statsStarsAvailable"),
  statsWishlistCount: document.getElementById("statsWishlistCount"),
  statsMonthBudget: document.getElementById("statsMonthBudget"),
  statsMonthSpent: document.getElementById("statsMonthSpent"),
  statsMonthRedeemed: document.getElementById("statsMonthRedeemed"),
  statsNetSavings: document.getElementById("statsNetSavings"),
  statsSavingRate: document.getElementById("statsSavingRate"),
  statsTotalSavings: document.getElementById("statsTotalSavings"),
  
  // History
  historyList: document.querySelector("#historyList tbody"),
  exportBtn: document.getElementById("exportBtn"),
  importFile: document.getElementById("importFile"),
  resetBtn: document.getElementById("resetBtn"),
  
  // Overlay
  overlay: document.getElementById("overlay"),
  restartBtn: document.getElementById("restartBtn"),
  modeOverlay: document.getElementById("modeOverlay"),
  chooseDailyMode: document.getElementById("chooseDailyMode"),
  chooseMonthlyMode: document.getElementById("chooseMonthlyMode"),
  
  // Achievements
  achievements: document.querySelector(".achievements-grid"),
  
  // Navigation (will be set in initApp after DOM is ready)
  navButtons: null
};

// --- Init ---
// Wait for DOM to be fully loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

function initApp() {
  // Check for critical missing elements
  const criticalElements = ['day', 'score', 'lives', 'budgetInput', 'spendInput', 'submitSpend'];
  const missing = criticalElements.filter(id => !document.getElementById(id));
  if (missing.length > 0) {
    console.error('Missing critical elements:', missing);
    alert('Error: Some page elements are missing. Please refresh the page.');
    return;
  }
  
  // Re-query navigation buttons now that DOM is ready
  el.navButtons = document.querySelectorAll(".nav-btn");
  
  checkMonthlyReset();
  setupEventListeners();
  setupMobileNavigation();
  ensureBudgetModeLocked();
  setupNotifications();
  render();
  
  if (el.budgetInput) el.budgetInput.value = state.budget;
  if (el.monthBudgetInput) el.monthBudgetInput.value = state.monthBudget;
  updateBudgetModeUI();
}

// ---------- Budget mode helpers ----------
function getCurrentMonthKey(d = new Date()) {
  return d.toISOString().slice(0, 7); // YYYY-MM
}

function daysInMonth(d = new Date()) {
  const year = d.getFullYear();
  const monthIndex = d.getMonth(); // 0-11
  return new Date(year, monthIndex + 1, 0).getDate();
}

function daysLeftIncludingToday(d = new Date()) {
  const total = daysInMonth(d);
  const today = d.getDate();
  return Math.max(1, total - today + 1);
}

function getTodaysEntry() {
  const today = new Date().toISOString().slice(0, 10);
  return state.history.find(entry => entry.date && entry.date.slice(0, 10) === today) || null;
}

function recomputeMonthlyData() {
  const currentMonth = getCurrentMonthKey();
  const thisMonthEntries = state.history.filter(entry => entry.date && entry.date.startsWith(currentMonth));
  const totalSpent = thisMonthEntries.reduce((sum, entry) => sum + (entry.spent || 0), 0);

  let totalBudget = 0;
  if (state.budgetMode === "monthly") {
    totalBudget = state.monthBudget;
  } else {
    // daily mode: sum the daily budgets actually used on each logged day
    totalBudget = thisMonthEntries.reduce((sum, entry) => sum + (Number.isFinite(entry.budget) ? entry.budget : state.budget), 0);
  }

  // Preserve any tracked redeemed total when recomputing (redeemed is tracked separately)
  const prevRedeemed = (state.monthlyData && Number.isFinite(state.monthlyData.totalRedeemed)) ? state.monthlyData.totalRedeemed : 0;

  state.monthlyData = {
    totalBudget: Math.round(totalBudget),
    totalSpent: Math.round(totalSpent),
    totalSaved: Math.max(0, Math.round(totalBudget - totalSpent)),
    totalRedeemed: Math.round(prevRedeemed),
    month: currentMonth
  };
}

function getTodayBudget() {
  if (state.budgetMode === "monthly") {
    const todayEntry = getTodaysEntry();
    if (todayEntry && Number.isFinite(todayEntry.budget)) return Math.max(0, Math.round(todayEntry.budget));

    recomputeMonthlyData();
    const remaining = Math.max(0, state.monthBudget - state.monthlyData.totalSpent);
    const daysLeft = daysLeftIncludingToday();
    return Math.max(0, Math.floor(remaining / daysLeft));
  }

  // daily mode
  return Math.max(0, Math.round(state.budget));
}

function updateBudgetModeUI() {
  const isMonthly = state.budgetMode === "monthly";

  if (el.dailyBudgetSection) el.dailyBudgetSection.classList.toggle("hidden", isMonthly);
  if (el.monthlyBudgetSection) el.monthlyBudgetSection.classList.toggle("hidden", !isMonthly);
  if (el.monthlyTodayInfo) el.monthlyTodayInfo.classList.toggle("hidden", !isMonthly);

  if (el.spendSectionTitle) {
    el.spendSectionTitle.textContent = isMonthly ? "💳 Today's Extra Spending" : "💳 Today's Spending";
  }
  if (el.spendLabel) {
    el.spendLabel.textContent = isMonthly ? "Extra spent today (HKD)" : "Spent today (HKD)";
  }
  if (el.todaysBudgetLabel) {
    el.todaysBudgetLabel.textContent = isMonthly ? "Allowance" : "Budget";
  }
  if (el.todaysSavedLabel) {
    el.todaysSavedLabel.textContent = isMonthly ? "Remaining today" : "Saved";
  }

  if (el.monthlySummaryTitle) {
    el.monthlySummaryTitle.textContent = "📅 Monthly Summary";
  }
  if (el.monthlyBudgetLabel) el.monthlyBudgetLabel.textContent = isMonthly ? "Extra Budget" : "Budget";
  if (el.monthlySpentLabel) el.monthlySpentLabel.textContent = isMonthly ? "Extra Spent" : "Spent";
  if (el.monthlySavedLabel) el.monthlySavedLabel.textContent = isMonthly ? "Remaining" : "Saved";
}

function ensureBudgetModeLocked() {
  const currentMonth = getCurrentMonthKey();

  // If already locked for this month, do nothing
  if (state.budgetModeMonth === currentMonth) return;

  // Show modal overlay and force a choice
  if (!el.modeOverlay) return;
  el.modeOverlay.classList.remove("hidden");

  // Prevent clicking outside to dismiss (lock choice)
  const onOverlayClick = (e) => {
    if (e.target === el.modeOverlay) {
      toast("⚠️ Choose a mode to continue.");
    }
  };
  el.modeOverlay.addEventListener("click", onOverlayClick);

  const finish = (mode) => {
    state.budgetMode = mode;
    state.budgetModeMonth = currentMonth;
    saveState();

    el.modeOverlay.classList.add("hidden");
    el.modeOverlay.removeEventListener("click", onOverlayClick);

    updateBudgetModeUI();
    render();
    toast(mode === "monthly" ? "✅ Monthly mode set for this month." : "✅ Daily budget mode set for this month.");
  };

  // One-shot handlers each time we show modal
  if (el.chooseDailyMode) {
    el.chooseDailyMode.onclick = () => finish("daily");
  }
  if (el.chooseMonthlyMode) {
    el.chooseMonthlyMode.onclick = () => finish("monthly");
  }
}

// Setup event listeners
function setupEventListeners() {
  // Save budget
  if (el.saveBudget) el.saveBudget.addEventListener("click", saveBudget);
  
  // Save monthly budget
  if (el.saveMonthBudget) el.saveMonthBudget.addEventListener("click", saveMonthBudget);
  
  // Submit spending
  if (el.submitSpend) el.submitSpend.addEventListener("click", submitSpending);
  
  // Add wishlist item
  if (el.addWishlistItem) el.addWishlistItem.addEventListener("click", addWishlistItem);
  
  // Auto-calculate stars when cost is entered
  if (el.wishlistCostInput) el.wishlistCostInput.addEventListener("input", calculateStarsFromCost);
  
  // Export
  if (el.exportBtn) el.exportBtn.addEventListener("click", exportData);
  
  // Import
  if (el.importFile) el.importFile.addEventListener("change", importData);
  
  // Reset
  if (el.resetBtn) el.resetBtn.addEventListener("click", resetData);
  
  // Restart
  if (el.restartBtn) el.restartBtn.addEventListener("click", restartGame);
  
  // Adjust spending
  if (el.adjustBtn) el.adjustBtn.addEventListener("click", adjustSpending);
  
  // Allow Enter key to submit spending
  if (el.spendInput) {
    el.spendInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") submitSpending();
    });
  }
  
  // Allow Enter key to add wishlist item
  if (el.wishlistItemInput) {
    el.wishlistItemInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") addWishlistItem();
    });
  }
}

// Switch view based on currentView
function switchView(view) {
  if (!view) {
    console.warn('switchView called with no view');
    return;
  }
  
  const sections = document.querySelectorAll('section[data-view]');
  if (sections.length === 0) {
    console.warn('No sections with data-view found');
    return;
  }
  
  // Detect mobile - check both window width and user agent for reliability
  const isMobile = window.innerWidth <= 767 || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  
  sections.forEach(section => {
    const viewAttr = section.getAttribute('data-view');
    if (!viewAttr) return;
    
    const views = viewAttr.split(' ');
    if (isMobile) {
      // On mobile, only show sections that match the current view
      if (views.includes(view)) {
        section.classList.remove('view-hidden');
      } else {
        section.classList.add('view-hidden');
      }
    } else {
      // On desktop, view switching should not affect layout
      // (do NOT touch `.hidden`, it's used by app logic like today's summary)
      section.classList.remove('view-hidden');
    }
  });
  
  // Scroll to top when switching views on mobile
  if (isMobile) {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

// Setup mobile navigation
function setupMobileNavigation() {
  // Re-query buttons in case they weren't found initially
  if (!el.navButtons || el.navButtons.length === 0) {
    el.navButtons = document.querySelectorAll(".nav-btn");
  }
  
  if (!el.navButtons || el.navButtons.length === 0) {
    console.warn('Navigation buttons not found - retrying...');
    // Retry after a short delay in case DOM is still loading
    setTimeout(() => {
      el.navButtons = document.querySelectorAll(".nav-btn");
      if (el.navButtons && el.navButtons.length > 0) {
        setupMobileNavigation();
      }
    }, 100);
    return;
  }
  
  el.navButtons.forEach((btn, index) => {
    // Remove any existing onclick handlers
    btn.onclick = null;
    
    // Create click handler
    const clickHandler = (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      const target = btn.getAttribute('data-target') || btn.dataset.target;
      if (!target) {
        console.warn('Button missing data-target:', btn, index);
        return;
      }
      
      // Update active state
      el.navButtons.forEach(b => {
        if (b) b.classList.remove("active");
      });
      btn.classList.add("active");
      
      currentView = target;
      switchView(target);
      
      // Haptic feedback on iOS
      if (navigator.vibrate) {
        navigator.vibrate(10);
      }
    };
    
    // Add both click and touchstart for better mobile support
    btn.addEventListener("click", clickHandler, { passive: false });
    btn.addEventListener("touchend", (e) => {
      e.preventDefault();
      clickHandler(e);
    }, { passive: false });
  });
  
  // Initial view setup
  switchView(currentView);
  
  // Handle window resize to show/hide sections appropriately
  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      switchView(currentView);
    }, 100);
  });
}

// Check monthly reset
function checkMonthlyReset() {
  const currentMonth = new Date().toISOString().slice(0, 7);
  
  if (state.lastLifeReset !== currentMonth) {
    state.lives = 3;
    state.lastLifeReset = currentMonth;

    // Force picking a mode for the new month
    state.budgetModeMonth = null;
    
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
    recomputeMonthlyData();
    updateTodaysSummary();
    render();
    vibrate();
  } else {
    toast("⚠️ Enter a valid budget.");
  }
}

function saveMonthBudget() {
  const val = Number(el.monthBudgetInput.value);
  if (Number.isFinite(val) && val >= 0) {
    state.monthBudget = Math.round(val);
    saveState();
    toast("✅ Monthly extra budget saved.");
    recomputeMonthlyData();
    updateTodaysSummary();
    render();
    vibrate();
  } else {
    toast("⚠️ Enter a valid monthly budget.");
  }
}

// Submit spending
function submitSpending() {
  ensureBudgetModeLocked();
  if (state.budgetModeMonth !== getCurrentMonthKey()) return;

  // Check if spending has already been submitted today
  const today = new Date().toISOString().slice(0, 10);
  const todaysEntry = state.history.find(entry => 
    entry.date && entry.date.slice(0, 10) === today
  );
  
  if (todaysEntry) {
    toast("⚠️ You already submitted spending today. Use the Adjust section to make changes.");
    return;
  }

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
    redeemed: false,
    lastTransferTime: null // Track when stars were last transferred to this item
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

    // Ensure new fields exist
    if (!Number.isFinite(state.monthBudget)) {
      state.monthBudget = defaultState.monthBudget;
    }
    if (state.budgetMode !== "daily" && state.budgetMode !== "monthly") {
      state.budgetMode = defaultState.budgetMode;
    }
    
    if (!state.monthlyData) {
      state.monthlyData = defaultState.monthlyData;
    }
    
    // Ensure history entries have budget + saved field
    state.history.forEach(entry => {
      if (!Number.isFinite(entry.budget)) {
        entry.budget = state.budget; // legacy default (daily mode)
      }
      if (entry.saved === undefined) {
        entry.saved = Math.max(0, entry.budget - entry.spent);
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
  // Backward-compatible wrapper: we now recompute from history for accuracy.
  // (Different logic depending on daily vs monthly mode.)
  recomputeMonthlyData();
}

// Update today's summary
function updateTodaysSummary() {
  const today = new Date().toISOString().slice(0, 10);
  const todaysEntry = state.history.find(entry => 
    entry.date && entry.date.slice(0, 10) === today
  );
  
  if (todaysEntry) {
    el.todaysSummary.classList.remove("hidden");
    const b = Number.isFinite(todaysEntry.budget) ? todaysEntry.budget : getTodayBudget();
    el.todaysBudget.textContent = `${Math.round(b)} HKD`;
    el.todaysSpent.textContent = `${todaysEntry.spent} HKD`;
    el.todaysSaved.textContent = `${todaysEntry.saved || 0} HKD`;
    el.todaysPoints.textContent = `${todaysEntry.points || 0}`;
    el.adjustInput.placeholder = `Current: ${todaysEntry.spent}`;

    // Monthly mode extra info (allowance + month remaining)
    if (state.budgetMode === "monthly") {
      if (el.summaryTodayAllowance) el.summaryTodayAllowance.textContent = `${Math.round(b)} HKD`;
      if (el.summaryMonthRemaining) el.summaryMonthRemaining.textContent = `${state.monthlyData.totalSaved} HKD`;
    }
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
  const oldOverspent = oldEntry.overspent || false;
  const oldBonus = oldEntry.bonus || 0;
  const dayBudget = Number.isFinite(oldEntry.budget) ? oldEntry.budget : getTodayBudget();
  
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
  
  // Calculate new values first to know the net star change
  let newPoints = 0;
  let newBonus = 0;
  let newOverspent = false;
  let newSaved = 0;
  
  if (newSpent <= dayBudget) {
    newPoints = Math.round((dayBudget - newSpent) * 2);
    newSaved = dayBudget - newSpent;
    state.score += newPoints;
    
    if (!oldOverspent) {
      state.streak += 1;
    } else {
      state.streak = 1;
    }
    
    state.levelXP = Math.min(100, state.levelXP + Math.min(20, newPoints / 2));
  } else {
    newOverspent = true;
    newSaved = 0;
    if (!oldOverspent) {
      state.lives = Math.max(0, state.lives - 1);
      state.streak = 0;
      state.levelXP = Math.max(0, state.levelXP - 10);
    }
  }
  
  // Handle star changes: we need to "undo" oldStars and "add" newStars
  // If oldStars were transferred to wishlist, we need to reclaim them first
  const oldStars = Math.floor(oldPoints / 10);
  const newStars = Math.floor(newPoints / 10);
  const currentAvailable = state.availableStars;
  const starsFromOldEntry = oldStars;
  
  // If we don't have enough available stars to cover oldStars, they must be in wishlist
  if (currentAvailable < starsFromOldEntry) {
    // Reclaim the stars that were transferred from this entry
    const toReclaim = starsFromOldEntry - currentAvailable;
    const reclaimed = reclaimStarsFromWishlist(toReclaim);
    state.availableStars = currentAvailable + reclaimed;
  }
  
  // Now remove oldStars and add newStars (net change)
  const netStarChange = newStars - oldStars;
  state.availableStars += netStarChange;
  
  // Ensure we don't go negative (shouldn't happen, but safety check)
  state.availableStars = Math.max(0, state.availableStars);
  
  // Handle bonus (preserve if it existed)
  if (oldBonus > 0 && !newOverspent) {
    newBonus = oldBonus;
    state.score += newBonus;
    state.levelXP = Math.min(100, state.levelXP + 10);
  }
  
  // Update the entry
  state.history[todaysIndex] = {
    ...oldEntry,
    spent: Math.round(newSpent),
    points: newPoints,
    bonus: newBonus,
    overspent: newOverspent,
    saved: Math.max(0, Math.round(newSaved)),
    budget: Math.round(dayBudget)
  };
  
  saveState();
  recomputeMonthlyData();
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
  ensureBudgetModeLocked();
  if (state.budgetModeMonth !== getCurrentMonthKey()) return;

  recomputeMonthlyData();
  const todayBudget = getTodayBudget();
  
  let points = 0;
  let bonus = 0;
  let overspent = false;
  let message = "";

  if (spent <= todayBudget) {
    points = Math.round((todayBudget - spent) * 2);
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
      const bonusStars = Math.floor(bonus / 10);
      state.availableStars += bonusStars;
      message += `🎉 Bonus! +${bonus} points (+${bonusStars}⭐). `;
    }
  } else {
    overspent = true;
    state.lives = Math.max(0, state.lives - 1);
    state.streak = 0;
    state.levelXP = Math.max(0, state.levelXP - 10);
    message += `⚠️ Overspent! Lost a life. Lives left: ${state.lives}. `;
  }

  const savedToday = Math.max(0, todayBudget - spent);

  state.history.push({
    date: new Date().toISOString(),
    spent: Math.round(spent),
    points,
    bonus,
    overspent,
    saved: Math.round(savedToday),
    budget: Math.round(todayBudget),
    mode: state.budgetMode
  });

  recomputeMonthlyData();

  if (state.budgetMode === "monthly") {
    message += ` Today: ${todayBudget} - ${spent} = ${savedToday} HKD remaining today.`;
    message += ` Month remaining: ${state.monthBudget} - ${state.monthlyData.totalSpent} = ${state.monthlyData.totalSaved} HKD.`;
  } else {
    message += ` Today: ${todayBudget} - ${spent} = ${savedToday} HKD saved.`;
    message += ` Monthly: ${state.monthlyData.totalBudget} - ${state.monthlyData.totalSpent} = ${state.monthlyData.totalSaved} HKD saved.`;
  }


  // Increase daily budget by 100 every day
  state.budget = (state.budget || 0) + 100;
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
  modalOverlay.className = 'overlay wishlist-confirm-overlay';
  modalOverlay.innerHTML = confirmationHTML;
  document.body.appendChild(modalOverlay);
  
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) {
      modalOverlay.remove();
    }
  });
}

function handleWishlistRemoval(itemId, action) {
  const item = state.wishlist.find(item => item.id === itemId);
  if (!item) return;
  
  const modal = document.querySelector('.wishlist-confirm-overlay');
  if (modal) modal.remove();
  
  if (action === 'redeem') {
    item.redeemed = true;
    item.completed = true;
    
    if (item.starsTransferred > 0) {
      const starsEquivalent = item.starsTransferred * 10;
      toast(`🎉 "${item.name}" redeemed! Cost: ${item.cost} HKD.`);
    } else {
      toast(`🎉 "${item.name}" marked as redeemed!`);
    }
    
    // Track redeemed total separately so it isn't overwritten by recomputeMonthlyData
    state.monthlyData.totalRedeemed = Math.round((state.monthlyData.totalRedeemed || 0) + (item.cost || 0));

    // Remove the redeemed item from the wishlist
    state.wishlist = state.wishlist.filter(w => w.id !== itemId);
    saveState();
    renderWishlist();
    render(); // Re-render to update all displays including monthly summary
    vibrate();
  } else {
    // When canceling: return all stars to available pool
    if (item.starsTransferred > 0) {
      state.availableStars += item.starsTransferred;
      toast(`↩️ Canceled "${item.name}" - returned ${item.starsTransferred} stars.`);
    } else {
      toast(`❌ Canceled "${item.name}"`);
    }
    
    state.wishlist = state.wishlist.filter(w => w.id !== itemId);
    saveState();
    renderWishlist();
    vibrate();
  }
}

// Reclaim stars from wishlist items when needed (e.g., after spending adjustment)
// Returns the amount reclaimed (does NOT modify availableStars - caller handles that)
// Reclaims from LATEST deposits first (most recent transfers first)
function reclaimStarsFromWishlist(needed) {
  if (needed <= 0) return 0;
  
  let reclaimed = 0;
  const reclaimedFrom = [];
  
  // Create a copy of wishlist items that can be reclaimed, sorted by lastTransferTime (most recent first)
  const reclaimableItems = state.wishlist
    .filter(item => {
      // Can't reclaim from redeemed items
      if (item.completed && item.redeemed) return false;
      // Must have stars transferred
      return item.starsTransferred > 0;
    })
    .sort((a, b) => {
      // Sort by lastTransferTime (most recent first)
      // Items with no lastTransferTime go to the end (oldest items)
      const timeA = a.lastTransferTime || 0;
      const timeB = b.lastTransferTime || 0;
      return timeB - timeA; // Descending order (newest first)
    });
  
  // Reclaim from items in order (latest deposits first)
  for (const item of reclaimableItems) {
    if (reclaimed >= needed) break;
    
    const canReclaim = Math.min(item.starsTransferred, needed - reclaimed);
    item.starsTransferred -= canReclaim;
    reclaimed += canReclaim;
    
    // If we reclaimed all stars, reset lastTransferTime
    if (item.starsTransferred === 0) {
      item.lastTransferTime = null;
    }
    
    if (item.completed && !item.redeemed) {
      // If it was completed but not redeemed, un-complete it
      item.completed = false;
    }
    
    if (canReclaim > 0) {
      reclaimedFrom.push({ name: item.name, amount: canReclaim });
    }
  }
  
  if (reclaimed > 0) {
    saveState();
    renderWishlist(); // Update wishlist display immediately
    
    if (reclaimedFrom.length > 0) {
      const names = reclaimedFrom.map(r => `${r.amount}⭐ from "${r.name}"`).join(", ");
      toast(`↩️ Reclaimed ${reclaimed} stars: ${names}`);
    }
  }
  
  return reclaimed;
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
  item.lastTransferTime = Date.now(); // Track when stars were transferred
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
  try {
    if (el.starsAvailable) el.starsAvailable.textContent = `${state.availableStars} ⭐`;
    
    if (!el.wishlistItems) return;
    
    // Filter out redeemed items
    const activeWishlistItems = state.wishlist.filter(item => !item.redeemed);
    
    if (activeWishlistItems.length === 0) {
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
  
    el.wishlistItems.innerHTML = activeWishlistItems.map(item => {
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
  } catch (error) {
    console.error('Error in renderWishlist():', error);
  }
}

function render() {
  try {
    updateBudgetModeUI();
    recomputeMonthlyData();

    // Update main stats
    if (el.day) el.day.textContent = state.day;
    if (el.score) el.score.textContent = state.score;
    if (el.lives) el.lives.textContent = state.lives;
    if (el.streak) el.streak.textContent = state.streak;
    
    // Update mobile stats
    if (el.mobileDay) el.mobileDay.textContent = state.day;
    if (el.mobileScore) el.mobileScore.textContent = state.score;
    if (el.mobileLives) el.mobileLives.textContent = state.lives;
    
    // Update progress bars
    if (el.levelBar) el.levelBar.style.width = `${state.levelXP}%`;
    if (el.levelPercent) el.levelPercent.textContent = `${state.levelXP}%`;
    if (el.livesBar) el.livesBar.style.width = `${(state.lives / 3) * 100}%`;
    if (el.livesPercent) el.livesPercent.textContent = `${Math.round((state.lives / 3) * 100)}%`;
    
    // Update stars
    if (el.starsAvailable) el.starsAvailable.textContent = `${state.availableStars} ⭐`;

    // Update monthly-mode allowance display
    if (el.todayAllowance) {
      el.todayAllowance.textContent = `${getTodayBudget()} HKD`;
    }
    // Monthly-mode extra info block in Today's Summary
    if (state.budgetMode === "monthly") {
      if (el.summaryTodayAllowance) el.summaryTodayAllowance.textContent = `${getTodayBudget()} HKD`;
      if (el.summaryMonthRemaining) el.summaryMonthRemaining.textContent = `${state.monthlyData.totalSaved} HKD`;
    }
    
    // Use tracked redeemed total (persisted in monthlyData)
    const totalRedeemed = Number.isFinite(state.monthlyData.totalRedeemed) ? state.monthlyData.totalRedeemed : 0;
    // Calculate net savings (saved - redeemed)
    const netSavings = Math.max(0, state.monthlyData.totalSaved - (totalRedeemed || 0));

    // Update monthly summary
    if (el.monthlyBudget) el.monthlyBudget.textContent = `${state.monthlyData.totalBudget} HKD`;
    if (el.monthlySpent) el.monthlySpent.textContent = `${state.monthlyData.totalSpent} HKD`;
    // Show net savings as 'Saved' (deducting redeemed)
    if (el.monthlySaved) el.monthlySaved.textContent = `${netSavings} HKD`;
    if (el.monthlyNetSavings) el.monthlyNetSavings.textContent = `${netSavings} HKD`;
    // Update month label
    if (el.monthLabel) el.monthLabel.textContent = state.monthlyData.month;
    
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
    
    if (el.achievements) el.achievements.innerHTML = ach.join("");
    
    // Update detailed stats
    updateDetailedStats();
    
    // Update history
    if (el.historyList) {
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
    }
    
    renderWishlist();
  } catch (error) {
    console.error('Error in render():', error);
  }
}

function badge(label, active) {
  return `<span class="badge ${active ? "active" : ""}">${label}</span>`;
}

function updateDetailedStats() {
  try {
    // Use tracked redeemed total (persisted in monthlyData)
    const totalRedeemed = Number.isFinite(state.monthlyData.totalRedeemed) ? state.monthlyData.totalRedeemed : 0;
    
    // Count active wishlist items
    const activeWishlistItems = state.wishlist.filter(item => !item.redeemed);
    
    // Calculate net savings (total budget - spent - redeemed)
    const netSavings = Math.max(0, state.monthlyData.totalSaved - totalRedeemed);
    
    // Calculate saving rate
    let savingRate = 0;
    if (state.monthlyData.totalBudget > 0) {
      savingRate = Math.round((netSavings / state.monthlyData.totalBudget) * 100);
    }
    
    // Update stats cards
    if (el.statsMonthlySpent) el.statsMonthlySpent.textContent = `${state.monthlyData.totalSpent} HKD`;
    if (el.statsRedeemed) el.statsRedeemed.textContent = `${totalRedeemed} HKD`;
    if (el.statsStarsAvailable) el.statsStarsAvailable.textContent = `${state.availableStars}`;
    if (el.statsWishlistCount) el.statsWishlistCount.textContent = `${activeWishlistItems.length}`;
    
    // Update breakdown section
    if (el.statsMonthBudget) el.statsMonthBudget.textContent = `${state.monthlyData.totalBudget} HKD`;
    if (el.statsMonthSpent) el.statsMonthSpent.textContent = `${state.monthlyData.totalSpent} HKD`;
    if (el.statsMonthRedeemed) el.statsMonthRedeemed.textContent = `${totalRedeemed} HKD`;
    if (el.statsNetSavings) el.statsNetSavings.textContent = `${netSavings} HKD`;
    if (el.statsSavingRate) el.statsSavingRate.textContent = `${savingRate}%`;
    
    // Update total savings at the end
    if (el.statsTotalSavings) el.statsTotalSavings.textContent = `${netSavings} HKD`;
  } catch (error) {
    console.error('Error in updateDetailedStats():', error);
  }
}

function toast(text) {
  if (el.message) {
    el.message.textContent = text;
    // Auto-clear message after 5 seconds
    setTimeout(() => {
      if (el.message && el.message.textContent === text) {
        el.message.textContent = '';
      }
    }, 5000);
  } else {
    console.log('Toast:', text);
  }
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

    // Ensure new fields exist / are valid
    if (!Number.isFinite(loaded.monthBudget)) {
      loaded.monthBudget = defaultState.monthBudget;
    }
    if (loaded.budgetMode !== "daily" && loaded.budgetMode !== "monthly") {
      loaded.budgetMode = defaultState.budgetMode;
    }
    
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
    // Ensure totalRedeemed exists
    if (!loaded.monthlyData) loaded.monthlyData = { ...defaultState.monthlyData };
    if (!Number.isFinite(loaded.monthlyData.totalRedeemed)) {
      loaded.monthlyData.totalRedeemed = 0;
    }
    
    // Ensure history entries have budget + saved field
    loaded.history.forEach(entry => {
      if (!Number.isFinite(entry.budget)) {
        entry.budget = loaded.budget; // legacy default (daily mode)
      }
      if (entry.saved === undefined) {
        entry.saved = Math.max(0, entry.budget - entry.spent);
      }
    });
    
    // Ensure wishlist items have cost field and lastTransferTime for backward compatibility
    loaded.wishlist.forEach(item => {
      if (item.cost === undefined) {
        // Estimate cost from stars (5 HKD per star)
        item.cost = item.starsNeeded * 5;
      }
      if (item.redeemed === undefined) {
        item.redeemed = false;
      }
      // Add lastTransferTime if missing (for items created before this feature)
      if (item.lastTransferTime === undefined) {
        // If item has stars transferred, assume it was transferred when item was created
        // (we can't know the exact time, so use item.id which is a timestamp)
        item.lastTransferTime = item.starsTransferred > 0 ? item.id : null;
      }
    });
    // Migrate totalRedeemed from wishlist if not present
    if (!Number.isFinite(loaded.monthlyData.totalRedeemed)) {
      const redeemedSum = (loaded.wishlist || []).filter(i => i.redeemed).reduce((s, it) => s + (it.cost || 0), 0);
      loaded.monthlyData.totalRedeemed = redeemedSum;
    }
    
    return loaded;
  } catch {
    return { ...defaultState };
  }
}

// ---------- iOS Notification System (every 2 hours, 9am-12am) ----------
function setupNotifications() {
  // Request notification permission (works on iOS Safari when added to home screen)
  if ('Notification' in window) {
    if (Notification.permission === 'default') {
      // Request permission after a short delay (better UX)
      setTimeout(() => {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            scheduleNotifications();
            toast('✅ Notifications enabled! You\'ll be reminded every 2 hours.');
          } else {
            toast('ℹ️ Enable notifications in Settings to get reminders.');
          }
        });
      }, 1000);
    } else if (Notification.permission === 'granted') {
      scheduleNotifications();
    }
  } else {
    // Notifications not supported
    console.log('Notifications not supported in this browser');
  }
  
  // Check periodically (every minute) to show notifications when time matches
  // This is important for iOS since background notifications have limitations
  setInterval(checkNotificationTime, 60000); // Check every minute
}

function scheduleNotifications() {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }
  
  // Schedule notifications for today (9am, 11am, 1pm, 3pm, 5pm, 7pm, 9pm, 11pm)
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const notificationTimes = [9, 11, 13, 15, 17, 19, 21, 23]; // 9am to 11pm (24-hour format)
  
  notificationTimes.forEach(hour => {
    const notificationTime = new Date(today);
    notificationTime.setHours(hour, 0, 0, 0);
    
    // Only schedule if time hasn't passed today
    if (notificationTime > now) {
      const delay = notificationTime.getTime() - now.getTime();
      if (delay > 0 && delay < 86400000) { // Within 24 hours
        setTimeout(() => {
          showNotification();
        }, delay);
      }
    }
  });
}

function checkNotificationTime() {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }
  
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();
  
  // Check if it's exactly on the hour (9, 11, 13, 15, 17, 19, 21, 23) and minute is 0-1
  // (Allow 1 minute window in case check runs slightly late)
  const notificationHours = [9, 11, 13, 15, 17, 19, 21, 23];
  if (notificationHours.includes(hour) && (minute === 0 || minute === 1)) {
    // Check if we already showed notification for this hour today
    const todayKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
    const lastNotificationKey = `lastNotification_${todayKey}_${hour}`;
    const lastNotification = localStorage.getItem(lastNotificationKey);
    
    // Only show if we haven't shown one in the last 5 minutes
    if (!lastNotification) {
      showNotification();
      localStorage.setItem(lastNotificationKey, now.toISOString());
      
      // Clear old entries (older than today)
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('lastNotification_') && !key.includes(todayKey)) {
          localStorage.removeItem(key);
        }
      });
    }
  }
}

function showNotification() {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }
  
  // Close any existing notification first
  if (window.currentNotification) {
    window.currentNotification.close();
  }
  
  const today = new Date().toISOString().slice(0, 10);
  const todaysEntry = state.history.find(entry => entry.date && entry.date.slice(0, 10) === today);
  
  let message = '💰 Time to update your spending!';
  if (todaysEntry) {
    const spent = todaysEntry.spent;
    const budget = todaysEntry.budget || (state.budgetMode === 'monthly' ? getTodayBudget() : state.budget);
    const remaining = Math.max(0, budget - spent);
    message = `💰 Update spending! Today: ${spent} HKD spent, ${remaining} HKD remaining.`;
  } else {
    if (state.budgetMode === 'monthly') {
      const allowance = getTodayBudget();
      message = `💰 Update spending! Today's allowance: ${allowance} HKD.`;
    } else {
      message = `💰 Update spending! Today's budget: ${state.budget} HKD.`;
    }
  }
  
  try {
    const notification = new Notification('Money Game Reminder', {
      body: message,
      icon: '/icon.png',
      badge: '/icon.png',
      tag: 'money-game-reminder',
      requireInteraction: false,
      silent: false
    });
    
    window.currentNotification = notification;
    
    notification.onclick = () => {
      window.focus();
      if (window.currentNotification) {
        window.currentNotification.close();
        window.currentNotification = null;
      }
    };
    
    // Auto-close after 8 seconds (iOS notifications stay longer)
    setTimeout(() => {
      if (window.currentNotification) {
        window.currentNotification.close();
        window.currentNotification = null;
      }
    }, 8000);
  } catch (error) {
    console.error('Error showing notification:', error);
  }
}

// Make functions available globally
window.transferStars = transferStars;
window.removeWishlistItem = removeWishlistItem;
window.handleWishlistRemoval = handleWishlistRemoval;
