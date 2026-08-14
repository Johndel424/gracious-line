import { db } from "../firebase.js";
import { ref, onValue, push } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";

// Global state
let allBusinessFundsCache = [];
let itemsToShow = 15; // Unang papakita: 15 latest entries
let isInitialRender = true;

// ==========================================
// 1. HELPER FUNCTIONS
// ==========================================
const formatCurrency = (amount) => {
  if (amount === undefined || amount === null || amount === "" || isNaN(amount)) return "₱0";
  return `₱${Number(amount).toLocaleString('en-PH', { minimumFractionDigits: 0 })}`;
};

const formatDate = (rawDate) => {
  if (!rawDate) return "—";
  const d = new Date(rawDate);
  if (isNaN(d)) return rawDate;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

// AUTO-SCROLL SAGAD SA BABA
function scrollToBottom() {
  setTimeout(() => {
    const container = document.getElementById('fundTableContainer');
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, 120);
}

// ==========================================
// 2. LOAD MORE HANDLER (WINDOW SCOPED)
// ==========================================
window.loadMoreFundLogs = function() {
  const container = document.getElementById('fundTableContainer');
  const previousScrollHeight = container ? container.scrollHeight : 0;

  itemsToShow += 10; // Dagdag 10 lumang entries
  renderBusinessFundTable();

  // I-maintain ang scroll position para hindi lumukso pabalik sa ibaba
  if (container) {
    setTimeout(() => {
      const newScrollHeight = container.scrollHeight;
      container.scrollTop = newScrollHeight - previousScrollHeight;
    }, 50);
  }
};

// ==========================================
// 3. RENDER TABLE & CALCULATE TOTAL
// ==========================================
function renderBusinessFundTable() {
  const tbody = document.getElementById('businessFundList');
  const totalAmountEl = document.getElementById('totalBusinessFundAmount');

  if (!tbody) return;

  if (!allBusinessFundsCache || allBusinessFundsCache.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="3" style="text-align: center; color: #888; padding: 15px; font-size: 0.8rem;">
          No Business Fund transactions logged yet.
        </td>
      </tr>`;
    if (totalAmountEl) totalAmountEl.innerText = "₱0";
    return;
  }

  // 1. Calculate overall grand total
  const overallTotal = allBusinessFundsCache.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  if (totalAmountEl) totalAmountEl.innerText = formatCurrency(overallTotal);

  // 2. Pagination Slicing (Oldest to Newest order)
  const totalCount = allBusinessFundsCache.length;
  const startIndex = Math.max(0, totalCount - itemsToShow);
  const visibleItems = allBusinessFundsCache.slice(startIndex);

  let htmlContent = '';

  // Kung may hindi pa nai-load na lumang entries, maglagay ng LOAD MORE BUTTON sa pinakataas
  if (startIndex > 0) {
    const remainingCount = startIndex;
    htmlContent += `
      <tr id="loadMoreRow">
        <td colspan="3" style="text-align: center; padding: 10px; background: rgba(226, 178, 88, 0.05); border-bottom: 1px solid rgba(226, 178, 88, 0.2);">
          <button 
            onclick="loadMoreFundLogs()" 
            style="background: transparent; border: 1px solid var(--gold-primary, #e2b258); color: var(--gold-primary, #e2b258); padding: 5px 14px; border-radius: 20px; font-size: 0.75rem; font-weight: 700; cursor: pointer;">
            ⬆ Load More Older Logs (${remainingCount} remaining)
          </button>
        </td>
      </tr>
    `;
  }

  // Render rows
  visibleItems.forEach(item => {
    const amount = Number(item.amount) || 0;
    const dateDisplay = formatDate(item.date || item.createdAt);
    const logDetails = item.details || item.log || item.remarks || '—';
    const amountColor = amount >= 0 ? '#4ade80' : '#ef4444';

    htmlContent += `
      <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
        <td style="width: 30%; padding: 8px 4px; font-size: clamp(0.65rem, 1.8vw, 0.75rem); color: #ccc; text-align: center; vertical-align: middle; white-space: nowrap;">
          ${dateDisplay}
        </td>
        <td style="width: 35%; padding: 8px 2px; font-size: clamp(0.68rem, 2vw, 0.78rem); font-weight: 700; color: ${amountColor}; text-align: center; vertical-align: middle; white-space: nowrap;">
          ${formatCurrency(amount)}
        </td>
        <td style="width: 35%; padding: 8px 4px; font-size: clamp(0.65rem, 1.8vw, 0.75rem); color: #fff; text-align: center; vertical-align: middle; word-break: break-word;">
          ${logDetails}
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = htmlContent;

  // 3. Sagad sa baba pag-load lang sa simula
  if (isInitialRender) {
    scrollToBottom();
    isInitialRender = false;
  }
}

// ==========================================
// 4. FIREBASE REAL-TIME LISTENER
// ==========================================
export function loadBusinessFunds() {
  const fundRef = ref(db, 'business_fund_logs');

  onValue(fundRef, (snapshot) => {
    if (!snapshot.exists()) {
      allBusinessFundsCache = [];
      renderBusinessFundTable();
      return;
    }

    const data = snapshot.val();
    allBusinessFundsCache = Object.keys(data).map(key => ({
      id: key,
      ...data[key]
    }));

    // SORTING: OLDEST AT TOP (0) -> LATEST AT BOTTOM (End)
    allBusinessFundsCache.sort((a, b) => new Date(a.date || a.createdAt) - new Date(b.date || b.createdAt));

    isInitialRender = true;
    renderBusinessFundTable();
  });
}

// ==========================================
// 5. MODAL & ADD FUND LOGIC
// ==========================================
window.openAddFundModal = function() {
  const modal = document.getElementById('addFundModal');
  const dateInput = document.getElementById('fundDate');

  if (dateInput) {
    const today = new Date().toISOString().split('T')[0];
    dateInput.value = today;
  }

  if (modal) modal.style.display = 'flex';
};

window.closeAddFundModal = function() {
  const modal = document.getElementById('addFundModal');
  const form = document.getElementById('addFundForm');
  if (form) form.reset();
  if (modal) modal.style.display = 'none';
};

function setupAddFundForm() {
  const form = document.getElementById('addFundForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const dateVal = document.getElementById('fundDate').value;
    const amountVal = parseFloat(document.getElementById('fundAmount').value);
    const detailsVal = document.getElementById('fundDetails').value.trim();

    if (!dateVal || isNaN(amountVal) || !detailsVal) {
      alert("Please fill in all fields correctly.");
      return;
    }

    try {
      const fundRef = ref(db, 'business_fund_logs');
      await push(fundRef, {
        date: dateVal,
        amount: amountVal,
        details: detailsVal,
        createdAt: new Date().toISOString()
      });

      window.closeAddFundModal();
    } catch (err) {
      console.error("Error adding business fund:", err);
      alert("Failed to save entry. Please try again.");
    }
  });
}

// ==========================================
// 6. INITIALIZATION
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
  loadBusinessFunds();
  setupAddFundForm();
});