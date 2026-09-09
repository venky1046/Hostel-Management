let occupancyChartInstance = null;
let feeChartInstance = null;

async function loadDashboard() {
  try {
    const data = await api("/dashboard");

    renderCards(data.cards || {});
    renderOccupancyChart(data.occupancyByType || []);
    renderFeeChart(data.feeCollectionByMonth || []);
    renderRecentStudents(data.recentStudents || []);
    renderRecentPayments(data.recentPayments || []);
    renderRecentAllocations(data.recentAllocations || []);
  } catch (err) {
    console.error("Dashboard Error:", err);
    showToast(err.message, "error");
  }
}

// =========================================================
// STAT CARDS
// =========================================================

function renderCards(c) {
  const cards = [
    {
      label: "Total Students",
      value: c.totalStudents || 0,
      icon: "fa-user-graduate",
      cls: "",
    },
    {
      label: "Total Rooms",
      value: c.totalRooms || 0,
      icon: "fa-door-open",
      cls: "accent-blue",
    },
    {
      label: "Available Rooms",
      value: c.availableRooms || 0,
      icon: "fa-door-closed",
      cls: "accent-green",
    },
    {
      label: "Full Rooms",
      value: c.fullRooms || 0,
      icon: "fa-bed",
      cls: "accent-red",
    },
    {
      label: "Allocated Students",
      value: c.allocatedStudents || 0,
      icon: "fa-people-roof",
      cls: "accent-blue",
    },
    {
      label: "Total Fees",
      value: formatCurrency(c.totalFees || 0),
      icon: "fa-sack-dollar",
      cls: "",
    },
    {
      label: "Total Paid",
      value: formatCurrency(c.totalPaid || 0),
      icon: "fa-circle-check",
      cls: "accent-green",
    },
    {
      label: "Total Pending",
      value: formatCurrency(c.totalPending || 0),
      icon: "fa-triangle-exclamation",
      cls: "accent-amber",
    },
  ];

  document.getElementById("statCards").innerHTML = cards
    .map(
      (card) => `
      <div class="col-6 col-lg-3">
        <div class="stat-card ${card.cls}">
          <div class="d-flex justify-content-between align-items-start">

            <div>
              <div class="label">${card.label}</div>
              <div class="value">${card.value}</div>
            </div>

            <i
              class="fa-solid ${card.icon}"
              style="color:#B9C2CF;font-size:18px;">
            </i>

          </div>
        </div>
      </div>
    `,
    )
    .join("");
}

// =========================================================
// ROOM OCCUPANCY CHART
// =========================================================

function renderOccupancyChart(rows) {
  const canvas = document.getElementById("occupancyChart");

  if (!canvas) {
    console.error("occupancyChart canvas not found");
    return;
  }

  if (typeof Chart === "undefined") {
    console.error("Chart.js is not loaded");
    return;
  }

  if (occupancyChartInstance) {
    occupancyChartInstance.destroy();
  }

  const labels = rows.map((row) => row.room_type);

  const occupiedData = rows.map((row) => Number(row.occupied || 0));

  const capacityData = rows.map((row) => Number(row.capacity || 0));

  occupancyChartInstance = new Chart(canvas, {
    type: "bar",

    data: {
      labels: labels,

      datasets: [
        {
          label: "Occupied",
          data: occupiedData,
          backgroundColor: "#B5652E",
          borderRadius: 6,
        },
        {
          label: "Capacity",
          data: capacityData,
          backgroundColor: "#DCE3EA",
          borderRadius: 6,
        },
      ],
    },

    options: {
      responsive: true,

      maintainAspectRatio: false,

      plugins: {
        legend: {
          position: "bottom",
        },
      },

      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1,
          },
        },
      },
    },
  });
}

// =========================================================
// FEE COLLECTION CHART
// =========================================================

function renderFeeChart(rows) {
  const canvas = document.getElementById("feeChart");

  if (!canvas) {
    console.error("feeChart canvas not found");
    return;
  }

  if (typeof Chart === "undefined") {
    console.error("Chart.js is not loaded");
    return;
  }

  if (feeChartInstance) {
    feeChartInstance.destroy();
  }

  const labels = rows.map((row) => row.month);

  const collectedData = rows.map((row) => Number(row.collected || 0));

  feeChartInstance = new Chart(canvas, {
    type: "line",

    data: {
      labels: labels,

      datasets: [
        {
          label: "Collected",

          data: collectedData,

          borderColor: "#16283F",

          backgroundColor: "rgba(22,40,63,.08)",

          fill: true,

          tension: 0.3,

          borderWidth: 2,

          pointRadius: 4,
        },
      ],
    },

    options: {
      responsive: true,

      maintainAspectRatio: false,

      plugins: {
        legend: {
          display: false,
        },
      },

      scales: {
        y: {
          beginAtZero: true,

          ticks: {
            callback: function (value) {
              return "₹" + Number(value).toLocaleString("en-IN");
            },
          },
        },
      },
    },
  });
}

// =========================================================
// RECENT STUDENTS
// =========================================================

function renderRecentStudents(rows) {
  const el = document.getElementById("recentStudents");

  if (!el) return;

  if (!rows.length) {
    el.innerHTML = emptyState("No students yet");
    return;
  }

  el.innerHTML = rows
    .map(
      (student) => `

    <div class="d-flex justify-content-between py-2 border-bottom">

      <div>

        <div class="fw-semibold">
          ${student.student_name}
        </div>

        <div class="text-muted small">
          ${student.register_no} · ${student.department}
        </div>

      </div>

    </div>

  `,
    )
    .join("");
}

// =========================================================
// RECENT PAYMENTS
// =========================================================

function renderRecentPayments(rows) {
  const el = document.getElementById("recentPayments");

  if (!el) return;

  if (!rows.length) {
    el.innerHTML = emptyState("No payments yet");
    return;
  }

  el.innerHTML = rows
    .map(
      (payment) => `

    <div class="d-flex justify-content-between py-2 border-bottom">

      <div>

        <div class="fw-semibold">
          ${payment.student_name || "Unknown Student"}
        </div>

        <div class="text-muted small">
          ${payment.register_no || "-"} ·
          ${payment.payment_method || "-"}
        </div>

      </div>

      <div class="fw-semibold">
        ${formatCurrency(payment.amount || 0)}
      </div>

    </div>

  `,
    )
    .join("");
}

// =========================================================
// RECENT ALLOCATIONS
// =========================================================

function renderRecentAllocations(rows) {
  const el = document.getElementById("recentAllocations");

  if (!el) return;

  if (!rows.length) {
    el.innerHTML = emptyState("No allocations yet");
    return;
  }

  el.innerHTML = rows
    .map(
      (allocation) => `

    <div class="d-flex justify-content-between py-2 border-bottom">

      <div>

        <div class="fw-semibold">
          ${allocation.student_name || "Unknown Student"}
        </div>

        <div class="text-muted small">
          ${allocation.register_no || "-"} ·
          Room ${allocation.room_number || "-"}
        </div>

      </div>

      <span class="badge-status ${statusBadgeClass(allocation.status)}">
        ${allocation.status}
      </span>

    </div>

  `,
    )
    .join("");
}

// =========================================================
// EMPTY STATE
// =========================================================

function emptyState(msg) {
  return `
    <div class="empty-state">
      <i class="fa-regular fa-folder-open"></i>
      ${msg}
    </div>
  `;
}

// =========================================================
// LOAD DASHBOARD
// =========================================================

loadDashboard();
