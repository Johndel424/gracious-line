import { db } from "../firebase.js";
import { ref, onValue, update, remove, push } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";

// Global cache for fast local searching and analytics calculations
let allProductsCache = [];
let currentFilteredProducts = [];

// ==========================================
// 1. CUSTOM TOAST NOTIFICATION SYSTEM
// ==========================================
export function showToast(message, type = 'success') {
  let container = document.getElementById('toastContainer');
  
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  const icon = type === 'success' ? '✨' : '⚠️';
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span class="toast-icon">${icon}</span> <span>${message}</span>`;

  container.appendChild(toast);

  setTimeout(() => toast.classList.add('show'), 10);

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ==========================================
// 2. HELPER FUNCTIONS (Currency & Date Diff)
// ==========================================
const formatCurrency = (amount) => {
  if (amount === undefined || amount === null || amount === "" || isNaN(amount)) return "—";
  return `₱${Number(amount).toLocaleString('en-PH')}`;
};

// Compute days difference between Date Purchased and Date Sold
const calculateDaysDifference = (datePurchase, dateSold) => {
  if (!datePurchase || !dateSold) return "—";
  
  const start = new Date(datePurchase);
  const end = new Date(dateSold);
  
  if (isNaN(start) || isNaN(end)) return "—";

  const diffTime = end - start;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) return "0 days";
  return diffDays === 1 ? "1 day" : `${diffDays} days`;
};

// ==========================================
// 3. RENDER TABLE FUNCTION
// ==========================================
function renderAnalyticsTable(productsList) {
  const tbody = document.getElementById('analyticsList');
  if (!tbody) return;

  if (!productsList || productsList.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; color: var(--text-muted); padding: 15px; font-size: 0.8rem;">
          No records found.
        </td>
      </tr>`;
    return;
  }

  let htmlContent = '';

  productsList.forEach(item => {
    const key = item.id;
    const productName = item.productName || 'Unnamed Product';
    const buyerName = item.buyerName || '—';
    const avgSoldDays = calculateDaysDifference(item.datePurchase, item.dateSold);

    // Status Badge Component
    const statusBadge = item.status === "Sold" 
      ? `<span style="background: rgba(74, 222, 128, 0.15); color: #4ade80; padding: 1px 4px; border-radius: 3px; font-size: clamp(0.55rem, 1.6vw, 0.62rem); font-weight: 700; display: inline-block;">SOLD</span>`
      : `<span style="background: rgba(226, 178, 88, 0.15); color: var(--gold-primary); padding: 1px 4px; border-radius: 3px; font-size: clamp(0.55rem, 1.6vw, 0.62rem); font-weight: 700; display: inline-block;">AVAILABLE</span>`;

    htmlContent += `
      <tr style="cursor: pointer; border-bottom: 1px solid rgba(255,255,255,0.05);" onclick="openProductDetailModal('${key}')">
        <!-- 1. Product Name & Status Badge -->
        <td style="width: 20%; padding: 6px 4px; vertical-align: middle; word-break: break-word; overflow-wrap: break-word; white-space: normal;">
          <div style="font-size: clamp(0.68rem, 2.2vw, 0.8rem); font-weight: 600; color: #fff; line-height: 1.2;" title="${productName}">
            ${productName}
          </div>
          <div style="margin-top: 2px;">
            ${statusBadge}
          </div>
        </td>

        <!-- 2. Capital / Price -->
        <td style="width: 20%; padding: 6px 2px; font-size: clamp(0.65rem, 2vw, 0.78rem); vertical-align: middle; text-align: center; white-space: nowrap;">
          ${formatCurrency(item.price)}
        </td>

        <!-- 3. Selling Price -->
        <td style="width: 20%; padding: 6px 2px; font-size: clamp(0.65rem, 2vw, 0.78rem); color: var(--gold-primary); vertical-align: middle; text-align: center; white-space: nowrap;">
          ${formatCurrency(item.sellingPrice)}
        </td>

        <!-- 4. Customer / Buyer Name -->
        <td style="width: 20%; padding: 6px 2px; font-size: clamp(0.65rem, 2vw, 0.78rem); color: #fff; vertical-align: middle; text-align: center; word-break: break-word;">
          ${buyerName}
        </td>

        <!-- 5. Average Days Sold -->
        <td style="width: 20%; padding: 6px 2px; font-size: clamp(0.65rem, 2vw, 0.78rem); color: #4ade80; font-weight: 700; vertical-align: middle; text-align: center; white-space: nowrap;">
          ${avgSoldDays}
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = htmlContent;
}


// ==========================================
// ELEGANT SKELETON LOADING HELPER
// ==========================================
function showAnalyticsLoading() {
  const tbody = document.getElementById('analyticsList');
  if (!tbody) return;

  // Nagre-render ng 5 skeleton rows para punan ang table habang nag-aantay
  let skeletonRows = '';
  for (let i = 0; i < 5; i++) {
    skeletonRows += `
      <tr style="border-bottom: 1px solid rgba(255,255,255,0.03);">
        <td style="padding: 10px 4px; text-align: center;">
          <span class="skeleton-box" style="width: 80%;"></span>
        </td>
        <td style="padding: 10px 4px; text-align: center;">
          <span class="skeleton-box" style="width: 60%;"></span>
        </td>
        <td style="padding: 10px 4px; text-align: center;">
          <span class="skeleton-box" style="width: 60%;"></span>
        </td>
        <td style="padding: 10px 4px; text-align: center;">
          <span class="skeleton-box" style="width: 70%;"></span>
        </td>
        <td style="padding: 10px 4px; text-align: center;">
          <span class="skeleton-box" style="width: 50%;"></span>
        </td>
      </tr>
    `;
  }

  tbody.innerHTML = skeletonRows;
}

// ==========================================
// FIREBASE REAL-TIME LISTENER WITH LOADING
// ==========================================
export function loadAnalyticsProducts() {
  // 1. Ipakita ang Gold Shimmer Skeleton
  showAnalyticsLoading();

  const productsRef = ref(db, 'products');

  onValue(productsRef, (snapshot) => {
    if (!snapshot.exists()) {
      allProductsCache = [];
      currentFilteredProducts = [];
      renderAnalyticsTable([]);
      return;
    }

    const data = snapshot.val();
    allProductsCache = Object.keys(data).map(key => ({
      id: key,
      ...data[key]
    }));

    currentFilteredProducts = [...allProductsCache];
    
    // 2. I-render ang mga totoong produkto (Papalitan agad nito ang skeleton rows)
    renderAnalyticsTable(allProductsCache);

  }, (error) => {
    console.error("Firebase fetch error:", error);
    const tbody = document.getElementById('analyticsList');
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; color: #ef4444; padding: 20px; font-size: 0.75rem;">
            ⚠️ Failed to load analytics data.
          </td>
        </tr>`;
    }
  });
}

// ==========================================
// 5. SEARCH & STRICT SPEC MATCHING TOGGLE
// ==========================================
export function filterProductsBySearch(query) {
  const searchTerm = query.toLowerCase().trim();
  const analyzeBtn = document.getElementById('analyzeSearchBtn');

  if (!searchTerm) {
    currentFilteredProducts = [...allProductsCache];
    renderAnalyticsTable(allProductsCache);
    if (analyzeBtn) analyzeBtn.style.display = "none";
    return;
  }

  // 1. Filter products for table rendering
  currentFilteredProducts = allProductsCache.filter(item => {
    const pName = (item.productName || '').toLowerCase();
    const bName = (item.buyerName || '').toLowerCase();
    return pName.includes(searchTerm) || bName.includes(searchTerm);
  });

  renderAnalyticsTable(currentFilteredProducts);

  // 2. CHECK SPECIFIC VARIANT CRITERIA
  const tokens = searchTerm.split(/\s+/).filter(t => t.length > 0);

  // Expanded Spec Modifier Check:
  // - Processors: i3, i5, i7, i9, r3, r5, r7
  // - RAM/Storage Combinations: 8+8/256, 8/128, 12+12/512, etc.
  // - Pure Storage/RAM numbers: 64, 128, 256, 512, 1tb
  // - Model codes with numbers: hot60i, note30, d15, etc.
  const hasSpecificSpec = tokens.some(token => {
    return /^i[3579]$/.test(token) ||                     // i3, i5, i7, i9
           /^r[3579]$/.test(token) ||                     // r3, r5, r7
           /^\d+(\+\d+)?\/\d+$/.test(token) ||            // 8+8/256, 8/128, 12+12/512
           /^(64|128|256|512|1tb)$/.test(token) ||        // 64, 128, 256, 512, 1tb
           /^[a-z]+\d+[a-z]*$/.test(token) ||             // hot60i, d15, note30, y20
           /^\d{2,4}$/.test(token);                       // 11, 70, 15 (2 to 4 digit series)
  });

  // Strict Rule Check:
  // - Dapat may kahit 2 or more tokens (e.g. "Infinix hot60i 8+8/256" or "hot60i 8+8/256")
  // - Dapat nag-match ang lahat ng tokens sa mismong Product Name
  const isExactVariantMatch = tokens.length >= 2 && hasSpecificSpec && allProductsCache.some(item => {
    const pName = (item.productName || '').toLowerCase();
    return tokens.every(token => pName.includes(token));
  });

  if (analyzeBtn) {
    analyzeBtn.style.display = isExactVariantMatch ? "inline-block" : "none";
  }
}
// ==========================================
// 6. ANALYTICS ENGINE & POPUP MODAL SYSTEM
// ==========================================
function ensureAnalyticsModalExists() {
  if (document.getElementById('analyticsSummaryModal')) return;

  const modalHTML = `
    <div id="analyticsSummaryModal" style="display: none; position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.8); z-index: 9999; justify-content: center; align-items: center; padding: 15px; box-sizing: border-box;">
      <div style="background: #181818; border: 1px solid rgba(226, 178, 88, 0.4); border-radius: 12px; max-width: 440px; width: 100%; padding: 20px; color: #fff; box-shadow: 0 10px 30px rgba(0,0,0,0.8); position: relative;">
        <button onclick="window.closeAnalyticsModal()" style="position: absolute; top: 12px; right: 12px; background: transparent; border: none; color: #aaa; font-size: 1.2rem; cursor: pointer;">✕</button>
        
        <h3 id="analyticsModalTitle" style="margin-top: 0; color: var(--gold-primary, #e2b258); font-size: 1.05rem; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 8px;">
          📊 Product Intelligence Analytics
        </h3>

        <div id="analyticsModalBody" style="font-size: 0.82rem; line-height: 1.6; margin-top: 10px;">
          <!-- Dynamic Content -->
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHTML);
}

window.openSearchAnalyticsModal = function() {
  ensureAnalyticsModalExists();

  if (!currentFilteredProducts || currentFilteredProducts.length === 0) {
    showToast("No data available to analyze.", "warning");
    return;
  }

  const searchInput = document.getElementById('tableSearchInput');
  const query = searchInput ? searchInput.value.trim() : 'Product';

  // 1. Compute Capital Stats
  const capitals = currentFilteredProducts.map(p => Number(p.price)).filter(v => !isNaN(v) && v > 0);
  
  // 2. Compute Selling Stats
  const sellingPrices = currentFilteredProducts.map(p => Number(p.sellingPrice)).filter(v => !isNaN(v) && v > 0);
  
  // 3. Compute Profit Stats (Selling Price - Capital)
  const profits = currentFilteredProducts
    .filter(p => Number(p.sellingPrice) > 0 && Number(p.price) > 0)
    .map(p => Number(p.sellingPrice) - Number(p.price));

  // 4. Compute Days Sold (Sold items only)
  const soldDaysArray = currentFilteredProducts
    .filter(p => p.status === "Sold" && p.datePurchase && p.dateSold)
    .map(p => {
      const start = new Date(p.datePurchase);
      const end = new Date(p.dateSold);
      const diffDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
      return diffDays >= 0 ? diffDays : 0;
    });

  // Math Utilities
  const avg = arr => arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length) : 0;
  const min = arr => arr.length ? Math.min(...arr) : 0;
  const max = arr => arr.length ? Math.max(...arr) : 0;

  const avgCapital = avg(capitals);
  const minCapital = min(capitals);
  const maxCapital = max(capitals);

  const avgSelling = avg(sellingPrices);
  const minSelling = min(sellingPrices);
  const maxSelling = max(sellingPrices);

  const avgProfit = avg(profits);
  const minProfit = min(profits);
  const maxProfit = max(profits);

  const minDays = soldDaysArray.length ? min(soldDaysArray) : "N/A";
  const maxDays = soldDaysArray.length ? max(soldDaysArray) : "N/A";
  const avgDays = soldDaysArray.length ? Math.round(avg(soldDaysArray)) : "N/A";

  // 5. English Recommendation Engine Logic
  let priorityBadge = "";
  let suggestionText = "";

  if (avgProfit >= 1500 && (avgDays !== "N/A" && avgDays <= 15)) {
    priorityBadge = `<span style="background: rgba(74, 222, 128, 0.2); color: #4ade80; padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 0.75rem;">🔥 HIGH PRIORITY ITEM</span>`;
    suggestionText = `High profitability (Avg Profit: ₱${Math.round(avgProfit).toLocaleString()}) with fast turnaround time (Avg: ${avgDays} days). Highly recommended to restock this unit.`;
  } else if (avgDays !== "N/A" && avgDays > 25) {
    priorityBadge = `<span style="background: rgba(239, 68, 68, 0.2); color: #ef4444; padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 0.75rem;">⚠️ SLOW MOVING STOCK</span>`;
    suggestionText = `Takes longer to sell (Avg: ${avgDays} days). Avoid holding excessive inventory to prevent capital lockup.`;
  } else {
    priorityBadge = `<span style="background: rgba(226, 178, 88, 0.2); color: var(--gold-primary, #e2b258); padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 0.75rem;">⚖️ MODERATE PERFORMER</span>`;
    suggestionText = `Steady market performer with standard sales turnaround and predictable margin.`;
  }

  // Render Modal Content in Full English
  document.getElementById('analyticsModalTitle').innerText = `📊 Analytics: "${query}" (${currentFilteredProducts.length} units)`;
  document.getElementById('analyticsModalBody').innerHTML = `
    <div style="margin-bottom: 12px;">${priorityBadge}</div>
    
    <div style="margin: 0 0 12px 0; color: #ddd; font-style: italic; background: rgba(255,255,255,0.03); padding: 8px 10px; border-radius: 6px; border-left: 3px solid var(--gold-primary, #e2b258);">
      💡 <b>Recommendation:</b> ${suggestionText}
    </div>
    
    <hr style="border: 0; border-top: 1px solid rgba(255,255,255,0.1); margin: 10px 0;">

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
      <div>
        <strong style="color: var(--gold-primary, #e2b258);">Capital Overview:</strong><br>
        • Avg Capital: <b>₱${Math.round(avgCapital).toLocaleString()}</b><br>
        • Lowest: <b>₱${minCapital.toLocaleString()}</b><br>
        • Highest: <b>₱${maxCapital.toLocaleString()}</b>
      </div>
      <div>
        <strong style="color: #60a5fa;">Selling Price Overview:</strong><br>
        • Avg Selling: <b>₱${Math.round(avgSelling).toLocaleString()}</b><br>
        • Lowest: <b>₱${minSelling.toLocaleString()}</b><br>
        • Highest: <b>₱${maxSelling.toLocaleString()}</b>
      </div>
    </div>

    <hr style="border: 0; border-top: 1px solid rgba(255,255,255,0.1); margin: 10px 0;">

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
      <div>
        <strong style="color: #4ade80;">Profit Margin:</strong><br>
        • Avg Profit: <b>₱${Math.round(avgProfit).toLocaleString()}</b><br>
        • Lowest Profit: <b>₱${minProfit.toLocaleString()}</b><br>
        • Highest Profit: <b>₱${maxProfit.toLocaleString()}</b>
      </div>
      <div>
        <strong style="color: #f43f5e;">Turnaround Time:</strong><br>
        • Fastest Sold: <b style="color: #4ade80;">${minDays === "N/A" ? "N/A" : minDays + " days"}</b><br>
        • Slowest Sold: <b style="color: #ef4444;">${maxDays === "N/A" ? "N/A" : maxDays + " days"}</b><br>
        • Average Days: <b>${avgDays === "N/A" ? "N/A" : avgDays + " days"}</b>
      </div>
    </div>
  `;

  document.getElementById('analyticsSummaryModal').style.display = 'flex';
};

window.closeAnalyticsModal = function() {
  const modal = document.getElementById('analyticsSummaryModal');
  if (modal) modal.style.display = 'none';
};

// ==========================================
// 7. INITIALIZATION
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
  loadAnalyticsProducts();

  const searchInput = document.getElementById('tableSearchInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      filterProductsBySearch(e.target.value);
    });
  }
});

