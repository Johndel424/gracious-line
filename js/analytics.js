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

// Variable para sa aktibong month filter ('DEFAULT' o 'YYYY-MM')
let currentMonthFilter = 'DEFAULT';

// ==========================================
// 2. LOAD & FILTER ANALYTICS DATA
// ==========================================
function loadAnalyticsData() {
  const productsRef = ref(db, 'products');

  onValue(productsRef, (snapshot) => {
    const data = snapshot.val();
    productsDataStore = data || {};
    
    // I-render ang talahanayan batay sa kasalukuyang filter
    renderAnalyticsTable();
  });
}

// ==========================================
// 2. LOAD & FILTER ANALYTICS DATA
// ==========================================
// ==========================================
// HELPER: SMART DATE CONVERTER TO "YYYY-MM"
// ==========================================
function getYearMonthString(rawDate) {
  if (!rawDate) return "";

  // 1. Kung number/timestamp (hal. 1723380000000)
  if (typeof rawDate === 'number') {
    const d = new Date(rawDate);
    if (!isNaN(d.getTime())) {
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    }
  }

  // 2. Gawing String kung hindi man string
  const strDate = String(rawDate).trim();

  // 3. Kung naka "YYYY-MM-DD" o ISO string na "2026-08-11T..."
  if (/^\d{4}-\d{2}/.test(strDate)) {
    return strDate.substring(0, 7); // Kukunin lang ang "YYYY-MM"
  }

  // 4. Subukang i-parse gamit ang Javascript Date object
  const parsedDate = new Date(strDate);
  if (!isNaN(parsedDate.getTime())) {
    const yyyy = parsedDate.getFullYear();
    const mm = String(parsedDate.getMonth() + 1).padStart(2, '0');
    return `${yyyy}-${mm}`;
  }

  return "";
}

// ==========================================
// 2. LOAD & FILTER ANALYTICS DATA
// ==========================================
function renderAnalyticsTable() {
  const analyticsListContainer = document.getElementById('analyticsList');
  if (!analyticsListContainer) return;

  if (!productsDataStore || Object.keys(productsDataStore).length === 0) {
    analyticsListContainer.innerHTML = `
      <tr>
        <td colspan="4" style="text-align: center; color: var(--text-muted);">No product records found.</td>
      </tr>`;
    return;
  }

  // Kasalukuyang Buwan ngayon (Format: "YYYY-MM")
  const today = new Date();
  const currentYearMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

  let filteredKeys = Object.keys(productsDataStore).filter((key) => {
    const item = productsDataStore[key];
    const itemStatus = item.status || "Available";

    // Kunin ang Purchase Date (uunahin ang datePurchase)
    const rawPurchaseDate = item.dateSold;
    const itemPurchaseYM = getYearMonthString(rawPurchaseDate);

    // 🔴 1. DEFAULT VIEW (WALA PANG PINILING BUWAN)
    if (currentMonthFilter === 'DEFAULT' || !currentMonthFilter) {
      
      // RULE 1: Kapag AVAILABLE -> Pakita palagi (Kahit anong buwan binili)
      if (itemStatus !== "Sold") {
        return true;
      }
      
      // RULE 2: Kapag SOLD -> Pakita LANG kung ang DATE PURCHASE ay CURRENT MONTH!
      if (itemStatus === "Sold") {
        return itemPurchaseYM === currentYearMonth;
      }

      return false;
    } 
    
    // 🔵 2. SPECIFIC MONTH FILTER (PUMILI NG BUWAN ANG USER)
    else {
      // Basta tumugma ang Month ng Purchase Date -> IPAKITA (SOLD MAN O AVAILABLE)
      return itemPurchaseYM === currentMonthFilter;
    }
  });

  // 📌 SORTING LOGIC: LAGING NASA TAAS ANG "AVAILABLE", NASA IBABA ANG "SOLD"
  filteredKeys.sort((a, b) => {
    const statusA = productsDataStore[a].status || "Available";
    const statusB = productsDataStore[b].status || "Available";

    if (statusA !== "Sold" && statusB === "Sold") {
      return -1; // Unahin si A (Available)
    }
    if (statusA === "Sold" && statusB !== "Sold") {
      return 1;  // Unahin si B (Available)
    }
    return 0; // Kung pareho silang Available o parehong Sold, panatilihin ang pagkakaayos
  });

  // Kapag walang tumugma sa filter
  if (filteredKeys.length === 0) {
    const emptyMsg = (currentMonthFilter === 'DEFAULT' || !currentMonthFilter)
      ? "No available items or items purchased this month."
      : `No items found for month (${currentMonthFilter}).`;

    analyticsListContainer.innerHTML = `
      <tr>
        <td colspan="4" style="text-align: center; color: var(--text-muted); padding: 15px;">
          ${emptyMsg}
        </td>
      </tr>`;
    return;
  }

  let htmlContent = '';

  filteredKeys.forEach((key) => {
    const item = productsDataStore[key];
    const formatCurrency = (val) => (val !== null && val !== undefined && val !== '') ? `₱${Number(val).toLocaleString()}` : '-';

    // const statusBadge = item.status === "Sold" 
    //   ? `<span style="background: rgba(74, 222, 128, 0.15); color: #4ade80; padding: 2px 6px; border-radius: 4px; font-size: 0.7rem; font-weight: 700;">SOLD</span>`
    //   : `<span style="background: rgba(226, 178, 88, 0.15); color: var(--gold-primary); padding: 2px 6px; border-radius: 4px; font-size: 0.7rem; font-weight: 700;">AVAILABLE</span>`;

    // htmlContent += `
    //   <tr style="cursor: pointer;" onclick="openProductDetailModal('${key}')">
    //     <td style="font-weight: 600; color: #fff;">
    //       ${item.productName || 'Unnamed Product'} <br> ${statusBadge}
    //     </td>
    //     <td>${formatCurrency(item.price)}</td>
    //     <td style="color: var(--gold-primary);">${formatCurrency(item.sellingPrice)}</td>
    //     <td style="color: #4ade80; font-weight: 700;">${formatCurrency(item.profit)}</td>
    //   </tr>
    // `;
    const statusBadge = item.status === "Sold" 
  ? `<span style="background: rgba(74, 222, 128, 0.15); color: #4ade80; padding: 1px 4px; border-radius: 3px; font-size: clamp(0.55rem, 1.6vw, 0.62rem); font-weight: 700; letter-spacing: 0.3px; display: inline-block; line-height: 1.1;">SOLD</span>`
  : `<span style="background: rgba(226, 178, 88, 0.15); color: var(--gold-primary); padding: 1px 4px; border-radius: 3px; font-size: clamp(0.55rem, 1.6vw, 0.62rem); font-weight: 700; letter-spacing: 0.3px; display: inline-block; line-height: 1.1;">AVAILABLE</span>`;
    htmlContent += `
  <tr style="cursor: pointer;" onclick="openProductDetailModal('${key}')">
    <td style="padding: clamp(4px, 1.2vw, 8px) clamp(5px, 1.5vw, 10px); font-size: clamp(0.7rem, 2.2vw, 0.82rem); font-weight: 600; color: #fff; vertical-align: middle; max-width: 120px; word-break: break-word;">
      <div style="display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; text-overflow: ellipsis; line-height: 1.2;" title="${item.productName || 'Unnamed Product'}">
        ${item.productName || 'Unnamed Product'}
      </div>
      <div style="margin-top: 2px; font-size: clamp(0.6rem, 1.8vw, 0.7rem); line-height: 1;">
        ${statusBadge}
      </div>
    </td>
    <td style="padding: clamp(4px, 1.2vw, 8px) clamp(5px, 1.5vw, 10px); font-size: clamp(0.7rem, 2.2vw, 0.82rem); vertical-align: middle; white-space: nowrap;">
      ${formatCurrency(item.price)}
    </td>
    <td style="padding: clamp(4px, 1.2vw, 8px) clamp(5px, 1.5vw, 10px); font-size: clamp(0.7rem, 2.2vw, 0.82rem); color: var(--gold-primary); vertical-align: middle; white-space: nowrap;">
      ${formatCurrency(item.sellingPrice)}
    </td>
    <td style="padding: clamp(4px, 1.2vw, 8px) clamp(5px, 1.5vw, 10px); font-size: clamp(0.7rem, 2.2vw, 0.82rem); color: #4ade80; font-weight: 700; vertical-align: middle; white-space: nowrap;">
      ${formatCurrency(item.profit)}
    </td>
  </tr>
`;
  });

  analyticsListContainer.innerHTML = htmlContent;
}
// Function para tawagin kapag nagpalit ng Month Filter sa UI
function filterAnalyticsByMonth(monthValue) {
  // monthValue input string format: '2026-08' o 'DEFAULT'
  currentMonthFilter = monthValue || 'DEFAULT';
  renderAnalyticsTable();
}

// Window binding
window.filterAnalyticsByMonth = filterAnalyticsByMonth;
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
  document.getElementById('modalDateAdded').innerText = `Purchase: ${item.datePurchase || 'N/A'}`;
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
  const sellDateInput = document.getElementById('sellDate');

  // Reset muna ang form
  if (sellForm) sellForm.reset();

  // Auto-set sa petsa ngayon (YYYY-MM-DD)
  if (sellDateInput) {
    const today = new Date().toISOString().split('T')[0];
    sellDateInput.value = today;
  }

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


  // Sa loob ng handleSellSubmit(e):
  const sellDateInput = document.getElementById('sellDate');
  const selectedSellDate = sellDateInput ? sellDateInput.value : new Date().toISOString().split('T')[0];

  // I-update sa product record sa Firebase
  await update(productRef, {
    status: "Sold",
    sellingPrice: sellingPrice,
    expenses: expenses,
    profit: netProfit,
    dateSold: selectedSellDate, // <-- Gagamitin ang piniling date mula sa input

    johndel: johndelShare,
    geremie: geremieShare,
    clicky: clickyShare,
    businessFund: businessShare
  });

  // At sa automatic recording sa Business Fund Logs:
  if (businessShare > 0) {
    const fundRef = ref(db, 'business_fund_logs');
    await push(fundRef, {
      date: selectedSellDate, // <-- Gagamitin din ang piniling date dito
      amount: businessShare,
      details: `Profit for ${prodName}`,
      productId: currentSelectedProduct.id,
      timestamp: Date.now()
    });
  }
      showToast(`Product "${prodName}" marked as SOLD`, 'success');

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