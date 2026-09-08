async function loadDashboard() {
  try {
    const data = await api('/dashboard');
    renderCards(data.cards);
    renderOccupancyChart(data.occupancyByType);
    renderFeeChart(data.feeCollectionByMonth);
    renderRecentStudents(data.recentStudents);
    renderRecentPayments(data.recentPayments);
    renderRecentAllocations(data.recentAllocations);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function renderCards(c) {
  const cards = [
    { label: 'Total Students', value: c.totalStudents, icon: 'fa-user-graduate', cls: '' },
    { label: 'Total Rooms', value: c.totalRooms, icon: 'fa-door-open', cls: 'accent-blue' },
    { label: 'Available Rooms', value: c.availableRooms, icon: 'fa-door-closed', cls: 'accent-green' },
    { label: 'Full Rooms', value: c.fullRooms, icon: 'fa-bed', cls: 'accent-red' },
    { label: 'Allocated Students', value: c.allocatedStudents, icon: 'fa-people-roof', cls: 'accent-blue' },
    { label: 'Total Fees', value: formatCurrency(c.totalFees), icon: 'fa-sack-dollar', cls: '' },
    { label: 'Total Paid', value: formatCurrency(c.totalPaid), icon: 'fa-circle-check', cls: 'accent-green' },
    { label: 'Total Pending', value: formatCurrency(c.totalPending), icon: 'fa-triangle-exclamation', cls: 'accent-amber' }
  ];

  document.getElementById('statCards').innerHTML = cards.map(card => `
    <div class="col-6 col-lg-3">
      <div class="stat-card ${card.cls}">
        <div class="d-flex justify-content-between align-items-start">
          <div>
            <div class="label">${card.label}</div>
            <div class="value">${card.value}</div>
          </div>
          <i class="fa-solid ${card.icon}" style="color:#B9C2CF;font-size:18px;"></i>
        </div>
      </div>
    </div>
  `).join('');
}

function renderOccupancyChart(rows) {
  const ctx = document.getElementById('occupancyChart');
  const labels = rows.map(r => r.room_type);
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'Occupied', data: rows.map(r => r.occupied), backgroundColor: '#B5652E' },
        { label: 'Capacity', data: rows.map(r => r.capacity), backgroundColor: '#DCE3EA' }
      ]
    },
    options: {
      responsive: true,
      plugins: { legend: { position: 'bottom' } },
      scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
    }
  });
}

function renderFeeChart(rows) {
  const ctx = document.getElementById('feeChart');
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: rows.map(r => r.month),
      datasets: [{
        label: 'Collected',
        data: rows.map(r => r.collected),
        borderColor: '#16283F',
        backgroundColor: 'rgba(22,40,63,.08)',
        fill: true,
        tension: .3
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true } }
    }
  });
}

function renderRecentStudents(rows) {
  const el = document.getElementById('recentStudents');
  if (!rows.length) return el.innerHTML = emptyState('No students yet');
  el.innerHTML = rows.map(s => `
    <div class="d-flex justify-content-between py-2 border-bottom">
      <div>
        <div class="fw-semibold">${s.student_name}</div>
        <div class="text-muted small">${s.register_no} · ${s.department}</div>
      </div>
    </div>
  `).join('');
}

function renderRecentPayments(rows) {
  const el = document.getElementById('recentPayments');
  if (!rows.length) return el.innerHTML = emptyState('No payments yet');
  el.innerHTML = rows.map(p => `
    <div class="d-flex justify-content-between py-2 border-bottom">
      <div>
        <div class="fw-semibold">${p.student_name}</div>
        <div class="text-muted small">${p.register_no} · ${p.payment_method}</div>
      </div>
      <div class="fw-semibold">${formatCurrency(p.amount)}</div>
    </div>
  `).join('');
}

function renderRecentAllocations(rows) {
  const el = document.getElementById('recentAllocations');
  if (!rows.length) return el.innerHTML = emptyState('No allocations yet');
  el.innerHTML = rows.map(a => `
    <div class="d-flex justify-content-between py-2 border-bottom">
      <div>
        <div class="fw-semibold">${a.student_name}</div>
        <div class="text-muted small">${a.register_no} · Room ${a.room_number}</div>
      </div>
      <span class="badge-status ${statusBadgeClass(a.status)}">${a.status}</span>
    </div>
  `).join('');
}

function emptyState(msg) {
  return `<div class="empty-state"><i class="fa-regular fa-folder-open"></i>${msg}</div>`;
}

loadDashboard();
