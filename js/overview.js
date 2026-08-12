import { auth, db } from "../firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { ref, get, push, set, onValue, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";

// ==========================================
// GLOBAL DATA STORE & HELPER FUNCTIONS
// ==========================================
let productsDataStore = {};

// Helper Function para gawing "YYYY-MM" ang anumang date format
function getYearMonthString(rawDate) {
  if (!rawDate) return "";
  if (typeof rawDate === "string" && rawDate.includes("-")) {
    const parts = rawDate.split("-");
    if (parts.length >= 2) return `${parts[0]}-${parts[1].padStart(2, '0')}`;
  }
  const d = new Date(rawDate);
  if (isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// ==========================================
// 1. MODAL FUNCTIONS
// ==========================================

// Function para buksan ang Pop-up Modal at i-set ang default date to TODAY
export function openAddProductModal() {
  const modal = document.getElementById('addProductModal');
  const dateInput = document.getElementById('prodDate');

  if (modal) modal.style.display = 'flex';

  // Otomatikong ilagay ang petsa ngayong araw sa date picker
  if (dateInput) {
    const today = new Date().toISOString().split('T')[0];
    dateInput.value = today;
  }
}

// Function para isara ang Pop-up Modal at i-clear ang form
export function closeAddProductModal() {
  const modal = document.getElementById('addProductModal');
  const form = document.getElementById('addProductForm');
  if (modal) modal.style.display = 'none';
  if (form) form.reset();
}

// ==========================================
// 2. CUSTOM TOAST NOTIFICATION FUNCTION
// ==========================================
export function showToast(message, type = 'success') {
  let container = document.getElementById('toastContainer');
  
  // Kung wala pa ang container sa HTML, kusa itong lilikhain
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

  // Trigger smooth enter animation
  setTimeout(() => toast.classList.add('show'), 10);

  // Otomatikong mawawala pagkalipas ng 3.5 segundo
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ==========================================
// 3. SAVE PRODUCT FUNCTION
// ==========================================
export async function handleProductSubmit(e) {
  e.preventDefault();

  const nameInput = document.getElementById('prodName');
  const priceInput = document.getElementById('prodPrice');
  const dateInput = document.getElementById('prodDate');

  const name = nameInput ? nameInput.value.trim() : '';
  const price = priceInput ? Number(priceInput.value) : 0;
  
  const today = new Date().toISOString().split('T')[0];
  const selectedDate = (dateInput && dateInput.value) ? dateInput.value : today;

  try {
    const productsRef = ref(db, 'products');
    const newProductRef = push(productsRef);

    await set(newProductRef, {
      productName: name,
      price: price,
      datePurchase: selectedDate,
      status: "Available",

      dateSold: null,
      sellingPrice: null,
      profit: null,
      expenses: null,
      johndel: null,
      geremie: null,
      clicky: null,
      buyerName: null,
      buyerFbLink: null,
      buyerContactNumber: null
    });

    showToast(`Product "${name}" saved successfully!`, 'success');
    closeAddProductModal();

  } catch (error) {
    console.error("Error saving product to Firebase:", error);
    showToast(`Failed to save: ${error.message}`, 'error');
  }
}

// ==========================================
// 4. FULLY DYNAMIC SALES PERFORMANCE CHART
// ==========================================
// export function renderPerformanceChart() {
//   if (!productsDataStore || Object.keys(productsDataStore).length === 0) return;

//   // 1. Generate Last 6 Months Labels (YYYY-MM & Display Short Name)
//   const last6Months = [];
//   const monthLabels = [];
  
//   for (let i = 5; i >= 0; i--) {
//     let d = new Date();
//     d.setMonth(d.getMonth() - i);
    
//     let yearMonthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
//     let label = d.toLocaleString('default', { month: 'short' }).toUpperCase();
    
//     last6Months.push(yearMonthStr);
//     monthLabels.push(label);
//   }

//   // 2. Aggregate Net Profit & Items Sold Count per Month
//   const monthlyStats = {};
//   last6Months.forEach(m => {
//     monthlyStats[m] = { profit: 0, itemsCount: 0 };
//   });

//   let total6MonthProfit = 0;

//   Object.values(productsDataStore).forEach(item => {
//     if (item.status === "Sold") {
//       const rawDate = item.dateSold || item.datePurchase || item.dateAdded || "";
//       const dateSoldYM = getYearMonthString(rawDate);
      
//       if (monthlyStats[dateSoldYM] !== undefined) {
//         const itemProfit = Number(item.profit) || 0;
//         monthlyStats[dateSoldYM].profit += itemProfit;
//         monthlyStats[dateSoldYM].itemsCount += 1;
//         total6MonthProfit += itemProfit;
//       }
//     }
//   });

//   // 3. Extract Profit Data Points & Determine Max Scale
//   const dataPoints = last6Months.map(m => monthlyStats[m].profit);
//   const itemsCountPoints = last6Months.map(m => monthlyStats[m].itemsCount);
  
//   const maxProfitReal = Math.max(...dataPoints);
//   const maxProfitScale = maxProfitReal > 0 ? Math.ceil(maxProfitReal / 1000) * 1000 : 5000;

//   // Update Total 6-Month Profit Badge
//   const totalBadge = document.getElementById('chartTotalProfitBadge');
//   if (totalBadge) {
//     totalBadge.textContent = `Total 6-Mos: ₱${total6MonthProfit.toLocaleString()}`;
//   }

//   // 4. SVG Dimensions & Padding Settings
//   const svgWidth = 500;
//   const topY = 25;      // Top Peak Line Y Coordinate
//   const bottomY = 135;   // Zero Baseline Y Coordinate
//   const usableHeight = bottomY - topY;

//   // 5. Render Dynamic Y-Axis Grid Lines & Amount Labels
//   const gridGroup = document.getElementById('chartGridLines');
//   if (gridGroup) {
//     const gridLevels = [
//       { y: topY, val: maxProfitScale },
//       { y: topY + (usableHeight / 2), val: maxProfitScale / 2 },
//       { y: bottomY, val: 0 }
//     ];

//     gridGroup.innerHTML = gridLevels.map(level => `
//       <line x1="0" y1="${level.y}" x2="500" y2="${level.y}" stroke="rgba(226,178,88,0.12)" stroke-dasharray="3" />
//       <text x="5" y="${level.y - 4}" fill="rgba(255,255,255,0.3)" font-size="9px" font-weight="600">
//         ₱${Math.round(level.val).toLocaleString()}
//       </text>
//     `).join('');
//   }

//   // 6. Calculate Coordinates for Plotting
//   const points = dataPoints.map((profitValue, index) => {
//     const x = (svgWidth / (last6Months.length - 1)) * index;
//     const y = bottomY - ((profitValue / maxProfitScale) * usableHeight);
//     return { x, y, val: profitValue, count: itemsCountPoints[index] };
//   });

//   // 7. Generate Line & Area SVG Path Strings
//   let pathD = `M${points[0].x},${points[0].y}`;
//   for (let i = 1; i < points.length; i++) {
//     pathD += ` L${points[i].x},${points[i].y}`;
//   }

//   const areaD = `${pathD} L${svgWidth},${bottomY} L0,${bottomY} Z`;

//   // Apply to SVG
//   const chartPath = document.getElementById('chartPath');
//   const chartArea = document.getElementById('chartArea');
//   if (chartPath) chartPath.setAttribute('d', pathD);
//   if (chartArea) chartArea.setAttribute('d', areaD);

//   // 8. Render Dynamic Interactive Dots & X-Axis Labels
//   const dotsGroup = document.getElementById('chartDotsGroup');
//   const labelsContainer = document.getElementById('chartXLabels');
//   const tooltip = document.getElementById('chartTooltip');

//   if (dotsGroup) dotsGroup.innerHTML = '';
//   if (labelsContainer) labelsContainer.innerHTML = '';

//   points.forEach((p, i) => {
//     const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
//     circle.setAttribute('cx', p.x);
//     circle.setAttribute('cy', p.y);
//     circle.setAttribute('r', '6');
//     circle.setAttribute('fill', '#121212');
//     circle.setAttribute('stroke', '#e2b258');
//     circle.setAttribute('stroke-width', '2.5');
//     circle.style.cursor = 'pointer';
//     circle.style.transition = 'transform 0.2s, fill 0.2s';

//     circle.addEventListener('mouseenter', (e) => {
//       circle.setAttribute('r', '8');
//       circle.setAttribute('fill', '#e2b258');
      
//       if (tooltip) {
//         tooltip.innerHTML = `
//           <div style="color: var(--gold-primary); font-size: 0.75rem;">${monthLabels[i]} ${last6Months[i].split('-')[0]}</div>
//           <div>Profit: <span style="color: #4ade80;">₱${p.val.toLocaleString()}</span></div>
//           <div style="color: #aaa; font-weight: normal; font-size: 0.68rem;">${p.count} gadget(s) sold</div>
//         `;
        
//         const containerRect = tooltip.parentElement.getBoundingClientRect();
//         const mouseX = e.clientX - containerRect.left;
//         const mouseY = e.clientY - containerRect.top;

//         tooltip.style.left = `${mouseX}px`;
//         tooltip.style.top = `${mouseY - 15}px`;
//         tooltip.style.opacity = '1';
//       }
//     });

//     circle.addEventListener('mouseleave', () => {
//       circle.setAttribute('r', '6');
//       circle.setAttribute('fill', '#121212');
//       if (tooltip) tooltip.style.opacity = '0';
//     });

//     if (dotsGroup) dotsGroup.appendChild(circle);

//     if (labelsContainer) {
//       const span = document.createElement('span');
//       span.textContent = monthLabels[i];
//       if (i === points.length - 1) {
//         span.style.color = 'var(--gold-primary, #e2b258)';
//         span.style.fontWeight = '800';
//       }
//       labelsContainer.appendChild(span);
//     }
//   });
// }
// ==========================================
// DYNAMIC TIMEFRAME STATE & HANDLER
// ==========================================
let selectedChartMonths = 6; // Default ay 6 Months

window.handleTimeframeChange = function(months) {
  selectedChartMonths = parseInt(months, 10);
  
  // Update ang subtext sa HTML header kung meron
  const subtext = document.getElementById('chartSubtext');
  if (subtext) {
    subtext.textContent = `${selectedChartMonths}-Month Profit Trend & Dynamic Scaling`;
  }

  // Re-render ang chart gamit ang bagong buwan
  renderPerformanceChart();
};


// ==========================================
// MAIN PERFORMANCE CHART RENDERER
// ==========================================
export function renderPerformanceChart() {
  if (!productsDataStore || Object.keys(productsDataStore).length === 0) return;

  // 1. Dynamic Months Generator (Naka-depende sa selectedChartMonths: 3, 6, 9, o 12)
  const timeframeMonths = [];
  const monthLabels = [];
  
  for (let i = selectedChartMonths - 1; i >= 0; i--) {
    let d = new Date();
    d.setMonth(d.getMonth() - i);
    
    let yearMonthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    let label = d.toLocaleString('default', { month: 'short' }).toUpperCase();
    
    timeframeMonths.push(yearMonthStr);
    monthLabels.push(label);
  }

  // 2. Aggregate Net Profit & Items Sold Count per Month
  const monthlyStats = {};
  timeframeMonths.forEach(m => {
    monthlyStats[m] = { profit: 0, itemsCount: 0 };
  });

  let totalPeriodProfit = 0;

  Object.values(productsDataStore).forEach(item => {
    if (item.status === "Sold") {
      const rawDate = item.dateSold || item.datePurchase || item.dateAdded || "";
      const dateSoldYM = getYearMonthString(rawDate);
      
      if (monthlyStats[dateSoldYM] !== undefined) {
        const itemProfit = Number(item.profit) || 0;
        monthlyStats[dateSoldYM].profit += itemProfit;
        monthlyStats[dateSoldYM].itemsCount += 1;
        totalPeriodProfit += itemProfit;
      }
    }
  });

  // 3. Extract Profit Data Points & Determine Max Scale
  const dataPoints = timeframeMonths.map(m => monthlyStats[m].profit);
  const itemsCountPoints = timeframeMonths.map(m => monthlyStats[m].itemsCount);
  
  const maxProfitReal = Math.max(...dataPoints);
  const maxProfitScale = maxProfitReal > 0 ? Math.ceil(maxProfitReal / 1000) * 1000 : 5000;

  // Update Total Profit Badge (Dynamic label base sa napiling buwan)
  const totalBadge = document.getElementById('chartTotalProfitBadge');
  if (totalBadge) {
    totalBadge.textContent = `Total (${selectedChartMonths} Mos): ₱${totalPeriodProfit.toLocaleString()}`;
  }

  // 4. SVG Dimensions & Height Settings (Pinagandang height setup para sa viewBox 0 0 500 220)
  const svgWidth = 500;
  const topY = 30;       // Top Peak Line Y Coordinate
  const bottomY = 180;   // Zero Baseline Y Coordinate
  const usableHeight = bottomY - topY;

  // 5. Render Dynamic Y-Axis Grid Lines & Amount Labels
  const gridGroup = document.getElementById('chartGridLines');
  if (gridGroup) {
    const gridLevels = [
      { y: topY, val: maxProfitScale },
      { y: topY + (usableHeight / 2), val: maxProfitScale / 2 },
      { y: bottomY, val: 0 }
    ];

    gridGroup.innerHTML = gridLevels.map(level => `
      <line x1="0" y1="${level.y}" x2="500" y2="${level.y}" stroke="rgba(226,178,88,0.12)" stroke-dasharray="3" />
      <text x="5" y="${level.y - 4}" fill="rgba(255,255,255,0.3)" font-size="9px" font-weight="600">
        ₱${Math.round(level.val).toLocaleString()}
      </text>
    `).join('');
  }

  // 6. Calculate Coordinates for Plotting
  const points = dataPoints.map((profitValue, index) => {
    const x = (svgWidth / (timeframeMonths.length - 1)) * index;
    const y = bottomY - ((profitValue / maxProfitScale) * usableHeight);
    return { x, y, val: profitValue, count: itemsCountPoints[index] };
  });

  // 7. Generate Line & Area SVG Path Strings
  let pathD = `M${points[0].x},${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    pathD += ` L${points[i].x},${points[i].y}`;
  }

  const areaD = `${pathD} L${svgWidth},${bottomY} L0,${bottomY} Z`;

  // Apply to SVG
  const chartPath = document.getElementById('chartPath');
  const chartArea = document.getElementById('chartArea');
  if (chartPath) chartPath.setAttribute('d', pathD);
  if (chartArea) chartArea.setAttribute('d', areaD);

  // 8. Render Dynamic Interactive Dots & X-Axis Labels
  const dotsGroup = document.getElementById('chartDotsGroup');
  const labelsContainer = document.getElementById('chartXLabels');
  const tooltip = document.getElementById('chartTooltip');

  if (dotsGroup) dotsGroup.innerHTML = '';
  if (labelsContainer) labelsContainer.innerHTML = '';

  points.forEach((p, i) => {
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', p.x);
    circle.setAttribute('cy', p.y);
    circle.setAttribute('r', '6');
    circle.setAttribute('fill', '#121212');
    circle.setAttribute('stroke', '#e2b258');
    circle.setAttribute('stroke-width', '2.5');
    circle.style.cursor = 'pointer';
    circle.style.transition = 'transform 0.2s, fill 0.2s';

    circle.addEventListener('mouseenter', (e) => {
      circle.setAttribute('r', '8');
      circle.setAttribute('fill', '#e2b258');
      
      if (tooltip) {
        tooltip.innerHTML = `
          <div style="color: var(--gold-primary); font-size: 0.75rem;">${monthLabels[i]} ${timeframeMonths[i].split('-')[0]}</div>
          <div>Profit: <span style="color: #4ade80;">₱${p.val.toLocaleString()}</span></div>
          <div style="color: #aaa; font-weight: normal; font-size: 0.68rem;">${p.count} gadget(s) sold</div>
        `;
        
        const containerRect = tooltip.parentElement.getBoundingClientRect();
        const mouseX = e.clientX - containerRect.left;
        const mouseY = e.clientY - containerRect.top;

        tooltip.style.left = `${mouseX}px`;
        tooltip.style.top = `${mouseY - 15}px`;
        tooltip.style.opacity = '1';
      }
    });

    circle.addEventListener('mouseleave', () => {
      circle.setAttribute('r', '6');
      circle.setAttribute('fill', '#121212');
      if (tooltip) tooltip.style.opacity = '0';
    });

    if (dotsGroup) dotsGroup.appendChild(circle);

    if (labelsContainer) {
      const span = document.createElement('span');
      span.textContent = monthLabels[i];
      if (i === points.length - 1) {
        span.style.color = 'var(--gold-primary, #e2b258)';
        span.style.fontWeight = '800';
      }
      labelsContainer.appendChild(span);
    }
  });
}
// ==========================================
// 5. FIREBASE REALTIME LISTENER (AUTOMATIC SYNC)
// ==========================================
const productsRef = ref(db, 'products');
onValue(productsRef, (snapshot) => {
  productsDataStore = snapshot.val() || {};

  // 1. Kapag may renderAnalyticsTable function sa system, ire-render ito
  if (typeof renderAnalyticsTable === 'function') {
    renderAnalyticsTable();
  }

  // 2. Awtomatikong ipoproseso at iguguhit ang Sales Chart sa tuwing may bagong data
  if (typeof renderPerformanceChart === 'function') {
    renderPerformanceChart();
  }

  // 3. Awtomatikong i-uupdate ang mga Stats Cards (Total Sales, Growth, Inventory, & Top Units)
  if (typeof updateDashboardStats === 'function') {
    updateDashboardStats();
  }
});
// Function para alisin ang mga variant specs at makuha ang BASE MODEL lang
function getBaseModelName(fullName) {
  if (!fullName) return "Unknown Product";
  
  let clean = fullName.trim();
  
  // 1. Alisin ang RAM / Storage patterns (halimbawa: 4+4/128, 8+8/256, 8/256, 128GB, 256GB, 1TB)
  clean = clean.replace(/\b\d+(\+\d+)?\s*\/\s*\d+(gb|tb)?\b/gi, ''); 
  clean = clean.replace(/\b\d+\s*(gb|tb|ram|rom)\b/gi, '');           

  // 2. Alisin ang CPU & Gen specs (halimbawa: i3, i5, i7, r3, r5, 10th gen, 11th gen, gen 10)
  clean = clean.replace(/\b(i3|i5|i7|i9|r3|r5|r7|ryzen\s*\d+)\b/gi, '');
  clean = clean.replace(/\b\d+(th|st|nd|rd)\s*(gen)?\b/gi, '');
  clean = clean.replace(/\bgen\s*\d+\b/gi, '');

  // 3. Alisin ang mga sobrang double spaces
  clean = clean.replace(/\s+/g, ' ').trim();

  // Return ang malinis na pangalan, o ang orihinal na pangalan kung nabura man lahat
  return clean || fullName;
}
export function updateDashboardStats() {
  if (!productsDataStore) return;

  const today = new Date();
  const currentYM = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

  const lastMonthDate = new Date();
  lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
  const lastYM = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}`;

  let currentMonthProfit = 0;
  let lastMonthProfit = 0;
  let soldThisMonthCount = 0;
  let totalAvailableCount = 0;

  // Tracker para sa Top Selling at Most Profitable Products
  const productStats = {}; 

  Object.values(productsDataStore).forEach(item => {
    const status = item.status || "Available";

    // 1. COUNT AVAILABLE STOCK
    if (status !== "Sold") {
      totalAvailableCount += 1;
    }

    // 2. PROCESS SOLD ITEMS
    if (status === "Sold") {
      const rawSoldDate = item.dateSold || item.datePurchase || item.dateAdded || "";
      const soldYM = getYearMonthString(rawSoldDate);
      const profit = Number(item.profit) || 0;
      
      const rawName = (item.productName || "Unnamed Product").trim();
      
      // 🟢 DITO TAYO NAGBAGO: KUKUHAIN ANG BASE MODEL (WALA NANG SPECS)
      const baseModel = getBaseModelName(rawName);

      // A. Kung nabenta ngayong buwan
      if (soldYM === currentYM) {
        currentMonthProfit += profit;
        soldThisMonthCount += 1;
      }

      // B. Kung nabenta noong nakaraang buwan
      if (soldYM === lastYM) {
        lastMonthProfit += profit;
      }

      // C. PAG-SAMA-SAMAHIN ANG LAHAT NG VARIANT SA ISANG BASE MODEL
      if (!productStats[baseModel]) {
        productStats[baseModel] = { count: 0, totalProfit: 0 };
      }
      productStats[baseModel].count += 1;
      productStats[baseModel].totalProfit += profit;
    }
  });

  // ==========================================
  // UPDATE CARD 1: TOTAL SALES REVENUE & GROWTH
  // ==========================================
  const totalSalesElem = document.getElementById('statTotalSales');
  const salesGrowthElem = document.getElementById('statSalesGrowth');

  if (totalSalesElem) {
    totalSalesElem.textContent = `₱${currentMonthProfit.toLocaleString()}`;
  }

  if (salesGrowthElem) {
    let growthPercent = 0;

    if (lastMonthProfit === 0) {
      growthPercent = currentMonthProfit > 0 ? 100 : 0;
    } else {
      growthPercent = ((currentMonthProfit - lastMonthProfit) / lastMonthProfit) * 100;
    }

    const isPositive = growthPercent >= 0;
    const sign = isPositive ? '+' : '';
    salesGrowthElem.textContent = `${sign}${growthPercent.toFixed(1)}% vs last mo.`;
    salesGrowthElem.style.background = isPositive ? 'rgba(74, 222, 128, 0.15)' : 'rgba(248, 113, 113, 0.15)';
    salesGrowthElem.style.color = isPositive ? '#4ade80' : '#f87171';
  }

  // ==========================================
  // UPDATE CARD 2: ORDERS OVERVIEW
  // ==========================================
  const newOrdersElem = document.getElementById('statNewOrders');
  const pendingOrdersElem = document.getElementById('statPendingOrders');

  if (newOrdersElem) newOrdersElem.textContent = soldThisMonthCount;
  if (pendingOrdersElem) pendingOrdersElem.textContent = totalAvailableCount;

  // ==========================================
  // UPDATE CARD 3: HIGHLIGHTS (PER UNIT PROFIT VS VOLUME)
  // ==========================================
  let topVolumeProduct = "None Yet";
  let topVolumeCount = 0;

  let topProfitProduct = "None Yet";
  let highestProfitPerUnit = 0; // Kikitain KADA ISANG PIRASO (Avg Profit Per Unit)

  Object.keys(productStats).forEach(model => {
    const totalUnits = productStats[model].count;
    const totalProfit = productStats[model].totalProfit;
    const avgProfitPerUnit = totalProfit / totalUnits; // Profit bawat unit!

    // 1. Top Volume (Sino ang may PINAKAMARAMING NABENTA)
    if (totalUnits > topVolumeCount) {
      topVolumeCount = totalUnits;
      topVolumeProduct = model;
    }

    // 2. Most Profitable (Sino ang PINAKAMALAKI ANG KITA KADA PIRASO)
    if (avgProfitPerUnit > highestProfitPerUnit) {
      highestProfitPerUnit = avgProfitPerUnit;
      topProfitProduct = model;
    }
  });

  // Set Top Volume UI
  const topProdElem = document.getElementById('statTopProduct');
  const topProdDetailElem = document.getElementById('statTopProductDetail');
  if (topProdElem) topProdElem.textContent = topVolumeProduct;
  if (topProdDetailElem) topProdDetailElem.textContent = `${topVolumeCount} unit(s) sold`;

  // Set Top Profit UI (Ipakita ang Average Profit bawat unit)
  const topProfitElem = document.getElementById('statTopProfitProduct');
  const topProfitDetailElem = document.getElementById('statTopProfitDetail');
  if (topProfitElem) topProfitElem.textContent = topProfitProduct;
  if (topProfitDetailElem) topProfitDetailElem.textContent = `₱${Math.round(highestProfitPerUnit).toLocaleString()} profit / unit`;
}

// ==========================================
// 6. WINDOW SCOPE BINDINGS
// ==========================================
window.showToast = showToast;
window.openAddProductModal = openAddProductModal;
window.closeAddProductModal = closeAddProductModal;
window.handleProductSubmit = handleProductSubmit;
window.renderPerformanceChart = renderPerformanceChart;