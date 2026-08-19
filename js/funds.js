import { db } from "../firebase.js";
import { ref, onValue, push, update } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";

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

  // 2. Pagination Slicing
  const totalCount = allBusinessFundsCache.length;
  const startIndex = Math.max(0, totalCount - itemsToShow);
  const visibleItems = allBusinessFundsCache.slice(startIndex);

  let htmlContent = '';

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
    const itemId = item.id || item.key;
    const amount = Number(item.amount) || 0;
    const dateDisplay = formatDate(item.date || item.createdAt);
    const logDetails = item.details || item.log || item.remarks || '—';
    const amountColor = amount >= 0 ? '#4ade80' : '#ef4444';

    // 🔴 CONDITION: LALABAS LANG ANG NOTE BUTTON KAPAG NEGATIVE ANG AMOUNT (< 0)
    let noteBtnHTML = '';

    if (amount < 0) {
      const hasNotes = Array.isArray(item.itemizedNotes) && item.itemizedNotes.length > 0;
      
      if (hasNotes) {
        const notePreviewText = item.itemizedNotes.map(n => `${n.label}: ₱${n.amount}`).join(', ');
        noteBtnHTML = `
          <button onclick="openFundNoteModal('${itemId}')" style="background: rgba(226, 178, 88, 0.15); border: 1px solid var(--gold-primary, #e2b258); color: var(--gold-primary, #e2b258); padding: 2px 7px; border-radius: 4px; font-size: 0.62rem; font-weight: 700; cursor: pointer; margin-top: 4px; display: inline-flex; align-items: center; gap: 3px;">
            📝 View Breakdown
          </button>`;
      } else {
        noteBtnHTML = `
          <button onclick="openFundNoteModal('${itemId}')" style="background: transparent; border: 1px dashed rgba(255,255,255,0.25); color: #aaa; padding: 2px 7px; border-radius: 4px; font-size: 0.62rem; cursor: pointer; margin-top: 4px; display: inline-flex; align-items: center; gap: 3px;">
            + Add Note
          </button>`;
      }
    }

    htmlContent += `
      <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
        <!-- Col 1: Date -->
        <td style="width: 30%; padding: 8px 4px; font-size: clamp(0.65rem, 1.8vw, 0.75rem); color: #ccc; text-align: center; vertical-align: middle; white-space: nowrap;">
          ${dateDisplay}
        </td>

        <!-- Col 2: Amount -->
        <td style="width: 35%; padding: 8px 2px; font-size: clamp(0.68rem, 2vw, 0.78rem); font-weight: 700; color: ${amountColor}; text-align: center; vertical-align: middle; white-space: nowrap;">
          ${formatCurrency(amount)}
        </td>

        <!-- Col 3: Details & Notes (Conditional) -->
        <td style="width: 35%; padding: 8px 4px; font-size: clamp(0.65rem, 1.8vw, 0.75rem); color: #fff; text-align: center; vertical-align: middle; word-break: break-word;">
          <div>${logDetails}</div>
          ${noteBtnHTML}
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = htmlContent;

  if (isInitialRender) {
    scrollToBottom();
    isInitialRender = false;
  }
}
let currentNoteLogId = null;
let currentTargetAmount = 0;
let tempNoteItems = [];

// 1. OPEN MODAL
export function openFundNoteModal(logId) {
  currentNoteLogId = logId;
  const item = allBusinessFundsCache.find(f => (f.id || f.key) === logId);
  if (!item) return;

  // Kunin ang target amount (kinukuha ang positive value para sa matching)
  currentTargetAmount = Math.abs(Number(item.amount) || 0);

  // Kuhanin ang nakaimbak na items o mag-set ng 1 empty row sa simula
  if (Array.isArray(item.itemizedNotes) && item.itemizedNotes.length > 0) {
    tempNoteItems = JSON.parse(JSON.stringify(item.itemizedNotes));
  } else {
    tempNoteItems = [{ label: '', amount: '' }];
  }

  const targetEl = document.getElementById('modalTargetAmount');
  if (targetEl) targetEl.textContent = `₱${currentTargetAmount.toLocaleString()}`;

  renderNoteItemRows();
  
  const modal = document.getElementById('fundNoteModal');
  if (modal) modal.style.display = 'flex';
}

// 2. RENDER Dynamic Input Rows
function renderNoteItemRows() {
  const container = document.getElementById('noteItemsContainer');
  if (!container) return;

  let html = '';
  tempNoteItems.forEach((item, index) => {
    html += `
      <div style="display: flex; gap: 2%; align-items: center; width: 100%; box-sizing: border-box; margin-bottom: 6px;">
        
        <!-- Column 1: Item Label (40%) -->
        <input 
          type="text" 
          placeholder="Item label" 
          value="${item.label || ''}" 
          oninput="updateNoteItemData(${index}, 'label', this.value)"
          style="width: 45%; background: #222; border: 1px solid rgba(255,255,255,0.15); color: #fff; padding: 5px 6px; border-radius: 6px; font-size: 0.7rem; outline: none; box-sizing: border-box;"
        />

        <!-- Column 2: Amount (40%) -->
        <input 
          type="number" 
          placeholder="Amount" 
          value="${item.amount !== '' ? item.amount : ''}" 
          oninput="updateNoteItemData(${index}, 'amount', this.value)"
          style="width: 45%; background: #222; border: 1px solid rgba(255,255,255,0.15); color: #4ade80; padding: 5px 6px; border-radius: 6px; font-size: 0.7rem; font-weight: 700; outline: none; box-sizing: border-box;"
        />

        <!-- Column 3: Remove Button (10%) -->
        <div style="width: 10%; display: flex; justify-content: center; align-items: center;">
          ${tempNoteItems.length > 1 ? `
            <button type="button" onclick="removeNoteRow(${index})" style="background: rgba(239, 68, 68, 0.15); border: 1px solid #ef4444; color: #ef4444; width: 24px; height: 24px; border-radius: 4px; font-size: 0.65rem; cursor: pointer; display: flex; align-items: center; justify-content: center; padding: 0;">
              ✕
            </button>
          ` : `
            <span style="opacity: 0.2; font-size: 0.65rem; color: #aaa;">—</span>
          `}
        </div>

      </div>
    `;
  });

  container.innerHTML = html;
  checkNoteTotalValidation();
}

// 3. ROW MANAGEMENT
window.addNoteRow = function() {
  tempNoteItems.push({ label: '', amount: '' });
  renderNoteItemRows();
};

window.removeNoteRow = function(index) {
  tempNoteItems.splice(index, 1);
  renderNoteItemRows();
};

window.updateNoteItemData = function(index, field, value) {
  if (field === 'amount') {
    tempNoteItems[index].amount = value === '' ? '' : Number(value);
  } else {
    tempNoteItems[index].label = value;
  }
  checkNoteTotalValidation();
};

// 4. LIVE TOTAL & VALIDATION CHECKER
function checkNoteTotalValidation() {
  const currentTotal = tempNoteItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const statusEl = document.getElementById('noteTotalStatus');
  const saveBtn = document.getElementById('btnSaveFundNote');

  const isValid = currentTotal === currentTargetAmount && currentTotal > 0;

  if (statusEl) {
    if (isValid) {
      statusEl.style.background = 'rgba(74, 222, 128, 0.15)';
      statusEl.style.color = '#4ade80';
      statusEl.style.border = '1px solid #4ade80';
      statusEl.innerHTML = `✓ Total: ₱${currentTotal.toLocaleString()} (Matched!)`;
    } else {
      statusEl.style.background = 'rgba(239, 68, 68, 0.15)';
      statusEl.style.color = '#ef4444';
      statusEl.style.border = '1px solid #ef4444';
      statusEl.innerHTML = `✕ Total: ₱${currentTotal.toLocaleString()} / Target: ₱${currentTargetAmount.toLocaleString()}`;
    }
  }

  if (saveBtn) {
    saveBtn.style.opacity = isValid ? '1' : '0.5';
    saveBtn.style.cursor = isValid ? 'pointer' : 'not-allowed';
  }

  return isValid;
}

// 5. SAVE TO FIREBASE (Direct sa specific child node ng business_fund_logs)
export function saveFundNote() {
  // Clean empty inputs
  const cleanedItems = tempNoteItems.filter(item => item.label.trim() !== '' || Number(item.amount) > 0);
  const currentTotal = cleanedItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

  // STRICT VALIDATION: Pag hindi magkapareho sa click amount, bawal i-save
  if (currentTotal !== currentTargetAmount) {
  if (typeof showToast === 'function') {
    showToast(`Cannot save! The total (₱${currentTotal.toLocaleString()}) must match ₱${currentTargetAmount.toLocaleString()}`);
  } else {
    alert(`Cannot save!\nThe total (₱${currentTotal.toLocaleString()}) must equal ₱${currentTargetAmount.toLocaleString()}`);
  }
  return;
}

  if (!currentNoteLogId) return;

  // 🔴 DITO PAPASOK SA SPECIFIC NODE NA CLINICK UNDER 'business_fund_logs'
  const targetNodeRef = ref(db, `business_fund_logs/${currentNoteLogId}`);

  update(targetNodeRef, { itemizedNotes: cleanedItems })
    .then(() => {
      // Update local cache
      const item = allBusinessFundsCache.find(f => (f.id || f.key) === currentNoteLogId);
      if (item) item.itemizedNotes = cleanedItems;

      renderBusinessFundTable();
      closeFundNoteModal();
      if (typeof showToast === 'function') showToast('Breakdown Note saved successfully!');
    })
    .catch((err) => {
      console.error('Error saving note:', err);
      if (typeof showToast === 'function') showToast('Failed to save breakdown note.');
    });
}

// CLOSE MODAL
export function closeFundNoteModal() {
  const modal = document.getElementById('fundNoteModal');
  if (modal) modal.style.display = 'none';
  currentNoteLogId = null;
}

// Window Bindings
window.openFundNoteModal = openFundNoteModal;
window.closeFundNoteModal = closeFundNoteModal;
window.saveFundNote = saveFundNote;
// ==========================================
// ELEGANT SKELETON LOADING HELPER
// ==========================================
function showAnalyticsLoading() {
  const tbody = document.getElementById('businessFundList');
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
// 4. FIREBASE REAL-TIME LISTENER
// ==========================================
export function loadBusinessFunds() {
  showAnalyticsLoading();
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

  const chkPositive = document.getElementById('fundIsPositive');
  const chkNegative = document.getElementById('fundIsNegative');

  // Toggle behavior: Siguraduhing isa lang ang pwedeng mai-check
  if (chkPositive && chkNegative) {
    chkPositive.addEventListener('change', () => {
      if (chkPositive.checked) chkNegative.checked = false;
      else chkNegative.checked = true; // Fallback para laging may napili
    });

    chkNegative.addEventListener('change', () => {
      if (chkNegative.checked) chkPositive.checked = false;
      else chkPositive.checked = true;
    });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const dateVal = document.getElementById('fundDate').value;
    let amountVal = parseFloat(document.getElementById('fundAmount').value);
    const detailsVal = document.getElementById('fundDetails').value.trim();

    if (!dateVal || isNaN(amountVal) || !detailsVal) {
      alert("Please fill in all fields correctly.");
      return;
    }

    // Siguraduhing positive muna ang kinuhang number
    amountVal = Math.abs(amountVal);

    // Kapag naka-check ang Negative, imumultiply sa -1 para maging negative
    const isNegative = chkNegative ? chkNegative.checked : true;
    if (isNegative) {
      amountVal = -amountVal;
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
      form.reset();

      // I-reset pabalik sa DEFAULT (Negative = checked, Positive = unchecked)
      if (chkNegative) chkNegative.checked = true;
      if (chkPositive) chkPositive.checked = false;

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