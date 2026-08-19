import { db } from "../firebase.js";
import { ref, onValue, push, remove } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";

// Global references
let deleteTargetItem = null;

/**
 * Render Skeleton Loading Placeholder Rows
 */
function renderSkeletonLoader(containerId, count = 3) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const skeletonRowHTML = `
    <div style="display: flex; padding: 6px 4px; border-bottom: 1px solid rgba(255,255,255,0.05); align-items: center; justify-content: space-between; gap: 4px;">
      <div class="skeleton-box" style="width: 30%; height: 10px; background: linear-gradient(90deg, #2a2a2a 25%, #3a3a3a 50%, #2a2a2a 75%); background-size: 200% 100%; animation: skeleton-loading 1.5s infinite; border-radius: 3px;"></div>
      <div class="skeleton-box" style="width: 55%; height: 10px; background: linear-gradient(90deg, #2a2a2a 25%, #3a3a3a 50%, #2a2a2a 75%); background-size: 200% 100%; animation: skeleton-loading 1.5s infinite; border-radius: 3px;"></div>
      <div style="width: 11px; height: 10px; background: #2a2a2a; border-radius: 2px;"></div>
    </div>
  `;

  container.innerHTML = skeletonRowHTML.repeat(count);
}

/**
 * Initialize Realtime Firebase Database Listeners
 */
function initPaluwalListeners() {
  // 1. Display Skeleton Loaders Initial State
  renderSkeletonLoader('geremieProductMoneyList', 4);
  renderSkeletonLoader('geremieCapitalMoneyList', 3);
  renderSkeletonLoader('johndelProductMoneyList', 4);
  renderSkeletonLoader('johndelCapitalMoneyList', 3);

  // Listener for Geremie's logs
  const geremieRef = ref(db, 'paluwal_geremie_logs');
  onValue(geremieRef, (snapshot) => {
    const data = snapshot.val();
    const productList = [];
    const capitalList = [];

    if (data) {
      Object.keys(data).forEach((key) => {
        const item = { id: key, person: 'Geremie', ...data[key] };
        if (item.category === 'less') {
          capitalList.push(item);
        } else {
          productList.push(item);
        }
      });
    }

    renderPaluwalTables(
      'geremieProductMoneyList', 'totalGeremieProductMoney',
      'geremieCapitalMoneyList', 'totalGeremieCapitalMoney',
      productList, capitalList
    );
  });

  // Listener for Johndel's logs
  const johndelRef = ref(db, 'paluwal_johndel_logs');
  onValue(johndelRef, (snapshot) => {
    const data = snapshot.val();
    const productList = [];
    const capitalList = [];

    if (data) {
      Object.keys(data).forEach((key) => {
        const item = { id: key, person: 'Johndel', ...data[key] };
        if (item.category === 'less') {
          capitalList.push(item);
        } else {
          productList.push(item);
        }
      });
    }

    renderPaluwalTables(
      'johndelProductMoneyList', 'totalJohndelProductMoney',
      'johndelCapitalMoneyList', 'totalJohndelCapitalMoney',
      productList, capitalList
    );
  });
}

/**
 * Render Data Tables & Auto-Balance Cash Allocation
 */
function renderPaluwalTables(prodContainerId, prodTotalId, capContainerId, capTotalId, productItems, capitalItems) {
  const prodContainer = document.getElementById(prodContainerId);
  const prodTotalEl = document.getElementById(prodTotalId);
  const capContainer = document.getElementById(capContainerId);
  const capTotalEl = document.getElementById(capTotalId);

  if (!prodContainer || !capContainer) return;

  const trashIconSVG = `
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#f87171" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="3 6 5 6 21 6"></polyline>
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
    </svg>
  `;

  // 1. Capital Money Table (LESS Category)
  let capitalTotal = 0;
  const capitalHTML = capitalItems.map(item => {
    const amount = Number(item.amount) || 0;
    capitalTotal += amount;

    const titleText = item.product || item.details || '-';
    const amountColor = amount < 0 ? '#f87171' : '#4ade80';
    const formattedAmount = amount < 0 ? `-₱${Math.abs(amount).toLocaleString()}` : `₱${amount.toLocaleString()}`;
    const safeTitle = encodeURIComponent(titleText);

    return `
      <div onclick="window.viewPaluwalDetails('${safeTitle}', '${formattedAmount}', '${item.person}', '${item.date || ''}')" style="display: flex; padding: 3px 4px; font-size: 0.62rem; border-bottom: 1px solid rgba(255,255,255,0.05); align-items: center; justify-content: space-between; gap: 4px; cursor: pointer;">
        <div style="width: 32%; color: ${amountColor}; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${formattedAmount}</div>
        <div style="width: 58%; color: #fff; text-align: right; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${titleText}</div>
        <button onclick="event.stopPropagation(); window.confirmDeletePaluwal('${item.person.toLowerCase()}', '${item.id}')" style="background: transparent; border: none; cursor: pointer; padding: 0 2px; display: flex; align-items: center; flex-shrink: 0;" title="Delete Entry">
          ${trashIconSVG}
        </button>
      </div>
    `;
  }).join('');

  capContainer.innerHTML = capitalItems.length === 0 
    ? `<div style="padding: 10px 4px; font-size: 0.60rem; color: #666; text-align: center;">No records found.</div>` 
    : capitalHTML;

  if (capTotalEl) {
    capTotalEl.style.color = capitalTotal < 0 ? '#f87171' : '#e2b258';
    capTotalEl.textContent = capitalTotal < 0 ? `-₱${Math.abs(capitalTotal).toLocaleString()}` : `₱${capitalTotal.toLocaleString()}`;
  }

  // 2. Product Money Table (ADD Category)
  let baseProductTotal = 0;
  let productHTML = productItems.map(item => {
    const amount = Number(item.amount) || 0;
    baseProductTotal += amount;

    const titleText = item.product || item.details || '-';
    const amountColor = amount < 0 ? '#f87171' : '#4ade80';
    const formattedAmount = amount < 0 ? `-₱${Math.abs(amount).toLocaleString()}` : `₱${amount.toLocaleString()}`;
    const safeTitle = encodeURIComponent(titleText);

    return `
      <div onclick="window.viewPaluwalDetails('${safeTitle}', '${formattedAmount}', '${item.person}', '${item.date || ''}')" style="display: flex; padding: 3px 4px; font-size: 0.62rem; border-bottom: 1px solid rgba(255,255,255,0.05); align-items: center; justify-content: space-between; gap: 4px; cursor: pointer;">
        <div style="width: 58%; color: #fff; text-align: left; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${titleText}</div>
        <div style="width: 32%; color: ${amountColor}; text-align: right; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${formattedAmount}</div>
        <button onclick="event.stopPropagation(); window.confirmDeletePaluwal('${item.person.toLowerCase()}', '${item.id}')" style="background: transparent; border: none; cursor: pointer; padding: 0 2px; display: flex; align-items: center; flex-shrink: 0;" title="Delete Entry">
          ${trashIconSVG}
        </button>
      </div>
    `;
  }).join('');

  // 3. Automated Cash Allocation Balance
  const cashAmount = capitalTotal - baseProductTotal;
  const cashColor = cashAmount < 0 ? '#f87171' : '#4ade80';
  const formattedCash = cashAmount < 0 ? `-₱${Math.abs(cashAmount).toLocaleString()}` : `₱${cashAmount.toLocaleString()}`;

  const cashRowHTML = `
    <div style="display: flex; padding: 3px 4px; font-size: 0.62rem; border-bottom: 1px solid rgba(255,255,255,0.05); align-items: center; background: rgba(255,255,255,0.02); gap: 4px;">
      <div style="width: 58%; color: #e2b258; text-align: left; font-weight: 700;">CASH</div>
      <div style="width: 32%; color: ${cashColor}; text-align: right; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${formattedCash}</div>
      <div style="width: 15px; flex-shrink: 0;"></div>
    </div>
  `;

  prodContainer.innerHTML = productHTML + cashRowHTML;

  // 4. Product Money Total
  if (prodTotalEl) {
    prodTotalEl.style.color = capitalTotal < 0 ? '#f87171' : '#e2b258';
    prodTotalEl.textContent = capitalTotal < 0 ? `-₱${Math.abs(capitalTotal).toLocaleString()}` : `₱${capitalTotal.toLocaleString()}`;
  }
}

// View Item Details Modal Controls
window.viewPaluwalDetails = function(encodedTitle, amount, person, date) {
  const title = decodeURIComponent(encodedTitle);
  
  const detailModal = document.getElementById('viewDetailModal');
  const nameEl = document.getElementById('viewItemName');
  const amountEl = document.getElementById('viewItemAmount');
  const personEl = document.getElementById('viewItemPerson');
  const dateEl = document.getElementById('viewItemDate');

  if (nameEl) nameEl.textContent = title;
  if (amountEl) amountEl.textContent = amount;
  if (personEl) personEl.textContent = person;
  if (dateEl) dateEl.textContent = date || 'N/A';

  if (detailModal) {
    detailModal.style.display = 'flex';
  }
};

window.closeViewDetailModal = function() {
  const detailModal = document.getElementById('viewDetailModal');
  if (detailModal) {
    detailModal.style.display = 'none';
  }
};

// Modal Form Controls
window.openPaluwalModal = function() {
  const modal = document.getElementById('addPaluwalModal');
  const dateInput = document.getElementById('paluwalDate');
  if (modal) {
    if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];
    modal.style.display = 'flex';
  }
};

window.closePaluwalModal = function() {
  const modal = document.getElementById('addPaluwalModal');
  if (modal) {
    modal.style.display = 'none';
    const form = document.getElementById('addPaluwalForm');
    if (form) form.reset();
  }
};

// Deletion Management
window.confirmDeletePaluwal = function(person, itemId) {
  deleteTargetItem = { person, itemId };
  const modal = document.getElementById('deleteConfirmModal');
  if (modal) {
    modal.style.display = 'flex';
  }
};

window.closeDeleteModal = function() {
  deleteTargetItem = null;
  const modal = document.getElementById('deleteConfirmModal');
  if (modal) {
    modal.style.display = 'none';
  }
};

window.executeDeletePaluwal = async function() {
  if (!deleteTargetItem) return;

  const { person, itemId } = deleteTargetItem;
  const itemRef = ref(db, `paluwal_${person}_logs/${itemId}`);

  try {
    await remove(itemRef);
    window.closeDeleteModal();
    
    if (typeof showToast === 'function') {
      showToast("Record deleted successfully.", "success");
    }
  } catch (err) {
    console.error("❌ Deletion error:", err);
    if (typeof showToast === 'function') {
      showToast("Failed to delete the record.", "error");
    }
  }
};

// Save Record to Firebase
window.savePaluwalEntry = async function(event) {
  event.preventDefault();

  const person = document.getElementById('paluwalPerson')?.value || 'geremie'; 
  const category = document.getElementById('paluwalCategory')?.value || 'add'; 
  const isLessCheckbox = document.getElementById('paluwalIsLess')?.checked || false; 
  
  let rawAmount = Math.abs(Number(document.getElementById('paluwalAmount')?.value) || 0);
  
  if (isLessCheckbox) {
    rawAmount = -rawAmount;
  }

  const date = document.getElementById('paluwalDate')?.value || new Date().toISOString().split('T')[0];
  const productOrDetails = document.getElementById('paluwalProduct')?.value || 
                           document.getElementById('paluwalDetails')?.value || 
                           '';

  const nodePath = `paluwal_${person}_logs`;

  const payload = {
    category: category, 
    amount: rawAmount,
    product: productOrDetails,
    date: date,
    createdAt: new Date().toISOString()
  };

  try {
    await push(ref(db, nodePath), payload);
    closePaluwalModal();
    
    if (typeof showToast === 'function') {
      showToast("Record saved successfully.", "success");
    }
  } catch (err) {
    console.error("❌ Submission error:", err);
    if (typeof showToast === 'function') {
      showToast("Failed to save the record.", "error");
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  initPaluwalListeners();
});