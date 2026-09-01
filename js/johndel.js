import { db } from "../firebase.js";
import { ref, onValue, update, push } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";

let allGeremieCache = [];
let currentPendingTotal = 0;

// Safety Helper Fallbacks
const safeFormatCurrency = (val) => {
  if (typeof formatCurrency === 'function') return formatCurrency(val);
  return '₱' + (Number(val) || 0).toLocaleString();
};

const safeFormatDate = (val) => {
  if (typeof formatDate === 'function') return formatDate(val);
  if (!val) return '—';
  const d = new Date(val);
  return isNaN(d) ? val : d.toLocaleDateString();
};

function scrollToTableBottom() {
  const container = document.getElementById('geremieTableContainer');
  if (container) {
    setTimeout(() => {
      container.scrollTop = container.scrollHeight;
    }, 50);
  }
}

// 🟢 HELPER: RENDER SKELETON LOADING
function renderGeremieSkeleton(count = 4) {
  const tbody = document.getElementById('geremieList');
  if (!tbody) return;

  const skeletonRowHTML = `
    <tr class="skeleton-row" style="border-bottom: 1px solid rgba(255,255,255,0.05);">
      <td style="padding: 8px 4px; text-align: center;">
        <div style="width: 70%; height: 10px; background: linear-gradient(90deg, #2a2a2a 25%, #3a3a3a 50%, #2a2a2a 75%); background-size: 200% 100%; animation: skeleton-loading 1.5s infinite; border-radius: 3px; margin: 0 auto;"></div>
      </td>
      <td style="padding: 8px 4px; text-align: center;">
        <div style="width: 60%; height: 10px; background: linear-gradient(90deg, #2a2a2a 25%, #3a3a3a 50%, #2a2a2a 75%); background-size: 200% 100%; animation: skeleton-loading 1.5s infinite; border-radius: 3px; margin: 0 auto;"></div>
      </td>
      <td style="padding: 8px 4px; text-align: center;">
        <div style="width: 80%; height: 10px; background: linear-gradient(90deg, #2a2a2a 25%, #3a3a3a 50%, #2a2a2a 75%); background-size: 200% 100%; animation: skeleton-loading 1.5s infinite; border-radius: 3px; margin: 0 auto;"></div>
      </td>
      <td style="padding: 8px 4px; text-align: center;">
        <div style="width: 45px; height: 16px; background: linear-gradient(90deg, #2a2a2a 25%, #3a3a3a 50%, #2a2a2a 75%); background-size: 200% 100%; animation: skeleton-loading 1.5s infinite; border-radius: 4px; margin: 0 auto;"></div>
      </td>
    </tr>
  `;

  tbody.innerHTML = skeletonRowHTML.repeat(count);
}

// Initial display ng skeleton habang nag-aantay
renderGeremieSkeleton();

// 🔴 1. FIREBASE REALTIME LISTENER
const geremieRef = ref(db, 'johndel_fund_logs');
onValue(geremieRef, (snapshot) => {
  const data = snapshot.val();

  if (data) {
    allGeremieCache = Object.keys(data).map(key => ({
      id: key,
      ...data[key]
    }));
  } else {
    allGeremieCache = [];
  }

  renderGeremieTable();
}, (error) => {
  console.error("❌ Firebase Read Failed:", error);
});

// 🔴 2. RENDER TABLE
export function renderGeremieTable() {
  const tbody = document.getElementById('geremieList');
  const totalEl = document.getElementById('totalGeremieAmount');
  const btnSettle = document.getElementById('btnBatchSettle');

  if (!tbody) return;

  if (!allGeremieCache || allGeremieCache.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:15px; color:#888; font-size:0.75rem;">No records found.</td></tr>`;
    if (totalEl) totalEl.innerText = '₱0';
    if (btnSettle) btnSettle.style.display = 'none';
    return;
  }

  const pendingLogs = allGeremieCache.filter(item => {
    const status = String(item.give || '').toUpperCase();
    return status !== 'YES';
  });

  const paidLogs = allGeremieCache.filter(item => {
    const status = String(item.give || '').toUpperCase();
    return status === 'YES';
  });

  currentPendingTotal = pendingLogs.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  if (totalEl) totalEl.innerText = safeFormatCurrency(currentPendingTotal);

  if (btnSettle) {
    btnSettle.style.display = currentPendingTotal > 0 ? 'inline-block' : 'none';
  }

  let html = '';

  // SETTLED HISTORY (TAAS)
  if (paidLogs.length > 0) {
    const groupedPaid = {};

    paidLogs.forEach(item => {
      const groupKey = item.settledAt ? safeFormatDate(item.settledAt) : 'Previous Batch';
      if (!groupedPaid[groupKey]) groupedPaid[groupKey] = [];
      groupedPaid[groupKey].push(item);
    });

    Object.keys(groupedPaid).forEach((batchDate) => {
      const batchItems = groupedPaid[batchDate];
      const batchTotal = batchItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

      html += `
        <tr style="background: rgba(74, 222, 128, 0.12); border-top: 2px solid rgba(74, 222, 128, 0.3);">
          <td colspan="4" style="padding: 6px 8px; font-size: 0.7rem; font-weight: 700; color: #4ade80; text-align: left;">
            ✓ SETTLED (${batchDate}) — <span style="color: #fff;">TOTAL: ${safeFormatCurrency(batchTotal)}</span>
          </td>
        </tr>`;

      batchItems.forEach(item => {
        html += `
          <tr style="border-bottom: 1px solid rgba(255,255,255,0.05); opacity: 0.75;">
            <td style="padding: 6px 2px; font-size: 0.7rem; color: #aaa; text-align: center;">${safeFormatDate(item.date)}</td>
            <td style="padding: 6px 2px; font-size: 0.72rem; font-weight: 700; color: #aaa; text-align: center;">${safeFormatCurrency(item.amount)}</td>
            <td style="padding: 6px 2px; font-size: 0.7rem; color: #aaa; text-align: center;">${item.details || '—'}</td>
            <td style="padding: 6px 2px; text-align: center;">
              <span style="color: #4ade80; font-size: 0.65rem; font-weight: 700;">✓ YES</span>
            </td>
          </tr>`;
      });
    });
  }

  // UNSETTLED / NOT YET (BABA)
  if (pendingLogs.length > 0) {
    html += `
      <tr style="background: rgba(239, 68, 68, 0.15); border-bottom: 1px solid rgba(239, 68, 68, 0.3); border-top: 2px solid rgba(239, 68, 68, 0.5);">
        <td colspan="4" style="padding: 6px 8px; font-size: 0.7rem; font-weight: 700; color: #ef4444; text-align: left;">
          ⏳ UNSETTLED (NOT YET) — <span style="color: #fff;">TOTAL: ${safeFormatCurrency(currentPendingTotal)}</span>
        </td>
      </tr>`;

    pendingLogs.forEach(item => {
      const itemId = item.id || item.key;
      html += `
        <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
          <td style="padding: 6px 2px; font-size: 0.7rem; color: #ccc; text-align: center;">${safeFormatDate(item.date)}</td>
          <td style="padding: 6px 2px; font-size: 0.72rem; font-weight: 700; color: #4ade80; text-align: center;">${safeFormatCurrency(item.amount)}</td>
          <td style="padding: 6px 2px; font-size: 0.7rem; color: #fff; text-align: center; word-break: break-word;">${item.details || '—'}</td>
          <td style="padding: 6px 2px; text-align: center;">
            <button onclick="toggleSingleGiveStatus('${itemId}', 'YES')" style="background: rgba(239, 68, 68, 0.2); border: 1px solid #ef4444; color: #ef4444; padding: 2px 6px; border-radius: 4px; font-size: 0.62rem; cursor: pointer;">
              NOT YET
            </button>
          </td>
        </tr>`;
    });
  }

  tbody.innerHTML = html;
  scrollToTableBottom();
}

// 🔴 3. BATCH SETTLE MODAL FUNCTIONS
window.settleCurrentBatch = function() {
  const pendingLogs = allGeremieCache.filter(item => String(item.give || '').toUpperCase() !== 'YES');
  if (pendingLogs.length === 0) return;

  const modal = document.getElementById('settleModal');
  const dateInput = document.getElementById('settleDateInput');
  const amountInput = document.getElementById('settleAmountInput');
  const totalDisplay = document.getElementById('settleTotalPendingDisplay');
  const remainingDisplay = document.getElementById('settleRemainingDisplay');

  if (!modal) return;

  const today = new Date().toISOString().split('T')[0];
  dateInput.value = today;

  totalDisplay.innerText = safeFormatCurrency(currentPendingTotal);
  amountInput.value = currentPendingTotal;
  remainingDisplay.innerText = '₱0';

  amountInput.oninput = () => {
    const entered = Number(amountInput.value) || 0;
    const remaining = currentPendingTotal - entered;
    remainingDisplay.innerText = safeFormatCurrency(remaining < 0 ? 0 : remaining);
  };

  modal.style.display = 'flex';
};

window.closeSettleModal = function() {
  const modal = document.getElementById('settleModal');
  if (modal) modal.style.display = 'none';
};

window.confirmBatchSettle = async function() {
  const dateVal = document.getElementById('settleDateInput').value;
  const payAmount = Number(document.getElementById('settleAmountInput').value) || 0;

  if (!dateVal) {
    alert("Mangyaring pumili ng Settlement Date.");
    return;
  }

  if (payAmount <= 0) {
    alert("Mangyaring maglagay ng tamang halaga.");
    return;
  }

  const pendingLogs = allGeremieCache.filter(item => String(item.give || '').toUpperCase() !== 'YES');
  const settledTimestamp = new Date(dateVal).toISOString();

  const updates = {};

  if (payAmount >= currentPendingTotal) {
    pendingLogs.forEach(item => {
      const itemId = item.id || item.key;
      updates[`johndel_fund_logs/${itemId}/give`] = 'YES';
      updates[`johndel_fund_logs/${itemId}/settledAt`] = settledTimestamp;
    });
  } else {
    const remaining = currentPendingTotal - payAmount;

    pendingLogs.forEach(item => {
      const itemId = item.id || item.key;
      updates[`johndel_fund_logs/${itemId}/give`] = 'YES';
      updates[`johndel_fund_logs/${itemId}/settledAt`] = settledTimestamp;
    });

    const newRef = push(ref(db, 'johndel_fund_logs'));
    updates[`johndel_fund_logs/${newRef.key}`] = {
      amount: remaining,
      date: new Date().toISOString().split('T')[0],
      details: 'Carry-over from last payment',
      give: 'NOT YET',
      settledAt: null
    };
  }

  try {
    await update(ref(db), updates);
    closeSettleModal();
  } catch (err) {
    console.error("❌ Error settling batch:", err);
  }
};

window.toggleSingleGiveStatus = async function(itemId, newStatus) {
  try {
    await update(ref(db, `johndel_fund_logs/${itemId}`), {
      give: newStatus,
      settledAt: newStatus.toUpperCase() === 'YES' ? new Date().toISOString() : null
    });
  } catch (err) {
    console.error("❌ Toggle Failed:", err);
  }
};