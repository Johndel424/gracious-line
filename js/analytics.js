import { db } from "../firebase.js";
import { ref, onValue, update, remove, push } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";

let productsDataStore = {};
let currentSelectedProduct = null;

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
// 2. LOAD ANALYTICS DATA FROM FIREBASE
// ==========================================
function loadAnalyticsData() {
  const analyticsListContainer = document.getElementById('analyticsList');
  if (!analyticsListContainer) return;

  const productsRef = ref(db, 'products');

  onValue(productsRef, (snapshot) => {
    const data = snapshot.val();
    productsDataStore = data || {};

    if (!data) {
      analyticsListContainer.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; color: var(--text-muted);">No product records found.</td>
        </tr>`;
      return;
    }

    let htmlContent = '';

    Object.keys(data).forEach((key) => {
      const item = data[key];
      const formatCurrency = (val) => (val !== null && val !== undefined && val !== '') ? `₱${Number(val).toLocaleString()}` : '-';

      const statusBadge = item.status === "Sold" 
        ? `<span style="background: rgba(74, 222, 128, 0.15); color: #4ade80; padding: 3px 8px; border-radius: 6px; font-size: 0.75rem; font-weight: 700;">SOLD</span>`
        : `<span style="background: rgba(226, 178, 88, 0.15); color: var(--gold-primary); padding: 3px 8px; border-radius: 6px; font-size: 0.75rem; font-weight: 700;">AVAILABLE</span>`;

      htmlContent += `
        <tr style="cursor: pointer;" onclick="openProductDetailModal('${key}')">
          <td style="font-weight: 600; color: #fff;">
            ${item.productName || 'Unnamed Product'} <br> ${statusBadge}
          </td>
          <td>${formatCurrency(item.price)}</td>
          <td style="color: var(--gold-primary);">${formatCurrency(item.sellingPrice)}</td>
          <td style="color: #4ade80; font-weight: 700;">${formatCurrency(item.profit)}</td>
        </tr>
      `;
    });

    analyticsListContainer.innerHTML = htmlContent;
  });
}

// ==========================================
// 3. OPEN & DISPLAY PRODUCT DETAIL MODAL
// ==========================================
function openProductDetailModal(key) {
  const item = productsDataStore[key];
  if (!item) return;

  currentSelectedProduct = { ...item, id: key };

  const formatCurrency = (val) => (val !== null && val !== undefined && val !== '') ? `₱${Number(val).toLocaleString()}` : '-';
  const formatText = (val) => val ? val : 'N/A';

  // Base Info
  document.getElementById('modalProdName').innerText = item.productName || 'Unnamed Product';
  document.getElementById('modalDateAdded').innerText = `Date Purchase: ${item.datePurchase || 'N/A'}`;
  document.getElementById('modalBuyPrice').innerText = formatCurrency(item.price);
  document.getElementById('modalSellingPrice').innerText = formatCurrency(item.sellingPrice);
  document.getElementById('modalProfit').innerText = formatCurrency(item.profit);
  document.getElementById('modalExpenses').innerText = formatCurrency(item.expenses);
  document.getElementById('modalDateSold').innerText = formatText(item.dateSold);

  // Profit Split
  document.getElementById('modalJohndel').innerText = formatCurrency(item.johndel);
  document.getElementById('modalGeremie').innerText = formatCurrency(item.geremie);
  document.getElementById('modalClicky').innerText = formatCurrency(item.clicky);
  document.getElementById('modalBusinessFund').innerText = formatCurrency(item.businessFund);
  // ✏️ MINIMALIST EDITABLE BUYER FIELDS
  renderEditableText('modalBuyerName', item.buyerName, 'buyerName', 'Enter Buyer Name');
  renderEditableText('modalBuyerContact', item.buyerContactNumber, 'buyerContactNumber', 'Enter Contact No.');
  renderEditableFb('modalBuyerFb', item.buyerFbLink);

  // Mark as Sold Button State
  const btnMark = document.getElementById('btnMarkAsSold');
  if (btnMark) {
    if (item.status === "Sold") {
      btnMark.disabled = true;
      btnMark.innerText = "✓ ALREADY SOLD";
      btnMark.style.opacity = "0.5";
      btnMark.style.cursor = "not-allowed";
    } else {
      btnMark.disabled = false;
      btnMark.innerText = "🏷️ MARK AS SOLD";
      btnMark.style.opacity = "1";
      btnMark.style.cursor = "pointer";
    }
  }

  // Security Check: Hide Delete Button if SOLD
  const btnDelete = document.querySelector("button[onclick='handleDeleteProduct()']");
  if (btnDelete) {
    btnDelete.style.display = item.status === "Sold" ? "none" : "inline-block";
  }

  document.getElementById('productDetailModal').style.display = 'flex';
}

function closeProductDetailModal() {
  document.getElementById('productDetailModal').style.display = 'none';
  currentSelectedProduct = null;
}

// ==========================================
// 4. MINIMALIST EDITING & TRUNCATION LOGIC
// ==========================================

// Helper para sa Buyer Name at Contact (Na may Auto-Truncate para sa Mahahabang Pangalan)
function renderEditableText(elementId, value, fieldName, placeholder) {
  const target = document.getElementById(elementId);
  if (!target) return;

  const hasValue = value && value.trim() !== '';

  // Minimalist + Text Truncation Rule
  if (hasValue) {
    target.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; max-width: 100%; overflow: hidden;">
        <span style="color: #fff; cursor: pointer; font-size: 0.85rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 180px;" title="${value} (Click to edit)">
          ${value}
        </span>
        <small style="color: var(--gold-primary, #e2b258); font-size: 0.7rem; opacity: 0.6; cursor: pointer; margin-left: 6px;" title="Edit">✏️</small>
      </div>`;
  } else {
    target.innerHTML = `
      <span style="color: var(--gold-primary, #e2b258); cursor: pointer; font-size: 0.75rem; text-decoration: underline; opacity: 0.85;">
        click here
      </span>`;
  }

  target.onclick = (e) => {
    e.stopPropagation();
    if (target.querySelector('input')) return;

    const currentVal = value || '';
    target.innerHTML = `
      <input type="text" id="input_${fieldName}" value="${currentVal}" placeholder="${placeholder}" 
        style="background: #151515; border: 1px solid var(--border-gold, #e2b258); color: #fff; padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; width: 100%; box-sizing: border-box; outline: none;">
    `;

    const input = document.getElementById(`input_${fieldName}`);
    input.focus();

    const saveAction = async () => {
      const newVal = input.value.trim();
      if (newVal === (value || '')) {
        renderEditableText(elementId, value, fieldName, placeholder);
        return;
      }

      try {
        const productRef = ref(db, `products/${currentSelectedProduct.id}`);
        await update(productRef, { [fieldName]: newVal || null });

        currentSelectedProduct[fieldName] = newVal || null;
        if (productsDataStore[currentSelectedProduct.id]) {
          productsDataStore[currentSelectedProduct.id][fieldName] = newVal || null;
        }

        showToast("Updated successfully!", "success");
        renderEditableText(elementId, newVal, fieldName, placeholder);
      } catch (err) {
        console.error("Save error:", err);
        showToast("Failed to save!", "error");
        renderEditableText(elementId, value, fieldName, placeholder);
      }
    };

    input.onblur = saveAction;
    input.onkeydown = (evt) => {
      if (evt.key === 'Enter') {
        evt.preventDefault();
        input.blur();
      }
    };
  };
}

// Helper para sa FB Link (Na may Pop-up & Copy Command)
function renderEditableFb(elementId, value) {
  const target = document.getElementById(elementId);
  if (!target) return;

  const hasValue = value && value.trim() !== '';

  if (hasValue) {
    target.innerHTML = `
      <div style="display: flex; gap: 8px; align-items: center;">
        <span onclick="openFbLinkModal('${value}')" style="color: var(--gold-primary, #e2b258); text-decoration: underline; font-size: 0.85rem; cursor: pointer;">View Link</span>
        <span id="btnEditFb" style="color: var(--text-muted); cursor: pointer; font-size: 0.7rem; opacity: 0.7;" title="Edit FB Link">✏️</span>
      </div>`;
  } else {
    target.innerHTML = `
      <span style="color: var(--gold-primary, #e2b258); cursor: pointer; font-size: 0.75rem; text-decoration: underline; opacity: 0.85;">
        click here
      </span>`;
  }

  const startEditFb = (e) => {
    e.stopPropagation();
    if (target.querySelector('input')) return;

    const currentVal = value || '';
    target.innerHTML = `
      <input type="url" id="input_buyerFbLink" value="${currentVal}" placeholder="https://facebook.com/..." 
        style="background: #151515; border: 1px solid var(--border-gold, #e2b258); color: #fff; padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; width: 100%; box-sizing: border-box; outline: none;">
    `;

    const input = document.getElementById('input_buyerFbLink');
    input.focus();

    const saveAction = async () => {
      const newVal = input.value.trim();
      if (newVal === (value || '')) {
        renderEditableFb(elementId, value);
        return;
      }

      try {
        const productRef = ref(db, `products/${currentSelectedProduct.id}`);
        await update(productRef, { buyerFbLink: newVal || null });

        currentSelectedProduct.buyerFbLink = newVal || null;
        if (productsDataStore[currentSelectedProduct.id]) {
          productsDataStore[currentSelectedProduct.id].buyerFbLink = newVal || null;
        }

        showToast("FB Link saved!", "success");
        renderEditableFb(elementId, newVal);
      } catch (err) {
        console.error("Save error:", err);
        showToast("Failed to save FB link!", "error");
        renderEditableFb(elementId, value);
      }
    };

    input.onblur = saveAction;
    input.onkeydown = (evt) => {
      if (evt.key === 'Enter') {
        evt.preventDefault();
        input.blur();
      }
    };
  };

  const btnEditFb = target.querySelector('#btnEditFb');
  if (btnEditFb) {
    btnEditFb.onclick = startEditFb;
  } else {
    target.onclick = startEditFb;
  }
}

// ==========================================
// 5. FB POPUP MODAL & COPY COMMANDS
// ==========================================
function openFbLinkModal(url) {
  const modal = document.getElementById('fbLinkModal');
  const input = document.getElementById('fbModalInput');
  const visitBtn = document.getElementById('fbModalOpenBtn');

  if (modal && input && visitBtn) {
    input.value = url;
    visitBtn.href = url;
    modal.style.display = 'flex';
  }
}

function closeFbLinkModal() {
  const modal = document.getElementById('fbLinkModal');
  if (modal) modal.style.display = 'none';
}

function copyFbLinkFromModal() {
  const input = document.getElementById('fbModalInput');
  if (!input || !input.value) return;

  navigator.clipboard.writeText(input.value).then(() => {
    showToast("FB Link copied to clipboard!", "success");
  }).catch((err) => {
    console.error("Copy error:", err);
    showToast("Failed to copy link", "error");
  });
}

// ==========================================
// 6. MARK AS SOLD MODAL LOGIC & PROFIT SPLIT
// ==========================================
function openSellModal() {
  if (!currentSelectedProduct) return;
  if (currentSelectedProduct.status === "Sold") {
    showToast("This product is already sold!", "error");
    return;
  }

  const sellModal = document.getElementById('sellProductModal');
  const sellForm = document.getElementById('sellProductForm');

  if (sellForm) sellForm.reset();
  if (sellModal) sellModal.style.display = 'flex';
}

function closeSellModal() {
  const sellModal = document.getElementById('sellProductModal');
  if (sellModal) sellModal.style.display = 'none';
}

// ==========================================
// 5. MARK AS SOLD & AUTOMATIC BUSINESS FUND RECORDING
// ==========================================
async function handleSellSubmit(e) {
  e.preventDefault();

  if (!currentSelectedProduct || !currentSelectedProduct.id) {
    showToast("No product selected!", "error");
    return;
  }

  const sellingPriceInput = document.getElementById('sellPrice');
  const expensesInput = document.getElementById('sellExpenses');

  const sellingPrice = Number(sellingPriceInput.value);
  const expenses = (expensesInput && expensesInput.value !== '') ? Number(expensesInput.value) : 0;
  const buyPrice = Number(currentSelectedProduct.price || 0);

  if (!sellingPriceInput.value || isNaN(sellingPrice) || sellingPrice <= 0) {
    showToast("Please enter a valid Selling Price!", "error");
    return;
  }

  const todayDate = new Date().toISOString().split('T')[0];

  // Total Net Profit
  const netProfit = sellingPrice - buyPrice - expenses;

  // Profit Split Calculation (30% Johndel, 30% Geremie, 30% Business, 10% Clicky)
  const johndelShare = netProfit * 0.30;
  const geremieShare = netProfit * 0.30;
  const businessShare = netProfit * 0.30;
  const clickyShare = netProfit * 0.10;

  const prodName = currentSelectedProduct.productName || 'Unnamed Product';

  try {
    const productRef = ref(db, `products/${currentSelectedProduct.id}`);

    // 1. I-update ang Status at Shares ng Product
    await update(productRef, {
      status: "Sold",
      sellingPrice: sellingPrice,
      expenses: expenses,
      profit: netProfit,
      dateSold: todayDate,

      // Auto-calculated Shares
      johndel: johndelShare,
      geremie: geremieShare,
      clicky: clickyShare,
      businessFund: businessShare
    });

    // 2. AUTOMATIC RECORDING SA BUSINESS FUND LOGS (Kung may kitang Business Fund)
    if (businessShare > 0) {
      const fundRef = ref(db, 'business_fund_logs');
      await push(fundRef, {
        date: todayDate,
        amount: businessShare,
        details: `Profit for ${prodName}`,
        productId: currentSelectedProduct.id,
        timestamp: Date.now()
      });
    }

    showToast(`Product "${prodName}" marked as SOLD & Business Fund recorded!`, 'success');

    closeSellModal();
    closeProductDetailModal();

  } catch (err) {
    console.error("Error marking product as sold:", err);
    showToast(`Failed: ${err.message}`, 'error');
  }
}

// ==========================================
// 7. DELETE PRODUCT FUNCTION
// ==========================================
async function handleDeleteProduct() {
  if (!currentSelectedProduct || !currentSelectedProduct.id) return;

  if (currentSelectedProduct.status === "Sold") {
    showToast("Cannot delete a product that is already SOLD!", "error");
    return;
  }

  try {
    const productRef = ref(db, `products/${currentSelectedProduct.id}`);
    await remove(productRef);

    showToast(`Product "${currentSelectedProduct.productName}" deleted successfully!`, 'success');
    closeProductDetailModal();

  } catch (err) {
    console.error("Error deleting product:", err);
    showToast(`Delete failed: ${err.message}`, 'error');
  }
}

// ==========================================
// 8. WINDOW BINDINGS
// ==========================================
window.showToast = showToast;
window.openProductDetailModal = openProductDetailModal;
window.closeProductDetailModal = closeProductDetailModal;
window.openSellModal = openSellModal;
window.closeSellModal = closeSellModal;
window.handleSellSubmit = handleSellSubmit;
window.handleDeleteProduct = handleDeleteProduct;

// FB Modal Global Functions
window.openFbLinkModal = openFbLinkModal;
window.closeFbLinkModal = closeFbLinkModal;
window.copyFbLinkFromModal = copyFbLinkFromModal;

document.addEventListener('DOMContentLoaded', loadAnalyticsData);