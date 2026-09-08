let paymentModal, feeDetailsModal;

document.addEventListener('DOMContentLoaded', () => {
  paymentModal = new bootstrap.Modal(document.getElementById('paymentModal'));
  feeDetailsModal = new bootstrap.Modal(document.getElementById('feeDetailsModal'));

  loadFees();

  document.getElementById('searchInput').addEventListener('input', debounce(loadFees, 300));
  document.getElementById('statusFilter').addEventListener('change', loadFees);
  document.getElementById('paymentForm').addEventListener('submit', savePayment);
});

function debounce(fn, delay) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
}

async function loadFees() {
  const params = new URLSearchParams();
  const search = document.getElementById('searchInput').value.trim();
  const status = document.getElementById('statusFilter').value;
  if (search) params.set('search', search);
  if (status) params.set('status', status);

  try {
    const rows = await api('/fees?' + params.toString());
    renderFees(rows);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function renderFees(rows) {
  const body = document.getElementById('feesBody');
  const empty = document.getElementById('feesEmpty');

  if (!rows.length) {
    body.innerHTML = '';
    empty.innerHTML = `<div class="empty-state"><i class="fa-regular fa-folder-open"></i>No fee records found.</div>`;
    return;
  }
  empty.innerHTML = '';

  body.innerHTML = rows.map(f => `
    <tr>
      <td>${f.register_no}</td>
      <td><a href="#" class="fw-semibold text-dark" onclick="viewFee(${f.student_id});return false;">${f.student_name}</a></td>
      <td>${formatCurrency(f.total_fee)}</td>
      <td>${formatCurrency(f.paid_amount)}</td>
      <td>${formatCurrency(f.balance)}</td>
      <td><span class="badge-status ${statusBadgeClass(f.payment_status)}">${f.payment_status}</span></td>
      <td>${formatDate(f.last_payment_date)}</td>
      <td class="text-end">
        <button class="btn btn-sm btn-accent" ${f.payment_status === 'Paid' ? 'disabled' : ''}
          onclick="openPayment(${f.student_id}, '${escapeQuote(f.student_name)}', '${f.register_no}')">
          <i class="fa-solid fa-plus me-1"></i>Pay
        </button>
      </td>
    </tr>
  `).join('');
}

function escapeQuote(str) { return String(str).replace(/'/g, "\\'"); }

function openPayment(studentId, name, regNo) {
  document.getElementById('paymentForm').reset();
  document.getElementById('paymentStudentId').value = studentId;
  document.getElementById('paymentStudentInfo').innerHTML = `Paying for <strong>${name}</strong> (${regNo})`;
  document.getElementById('payment_date').value = new Date().toISOString().slice(0, 10);
  paymentModal.show();
}

async function savePayment(e) {
  e.preventDefault();
  const payload = {
    student_id: document.getElementById('paymentStudentId').value,
    amount: Number(document.getElementById('amount').value),
    payment_date: document.getElementById('payment_date').value,
    payment_method: document.getElementById('payment_method').value,
    transaction_id: document.getElementById('transaction_id').value.trim(),
    remarks: document.getElementById('remarks').value.trim()
  };

  try {
    await api('/fees/payment', { method: 'POST', body: JSON.stringify(payload) });
    showToast('Payment recorded successfully');
    paymentModal.hide();
    loadFees();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function viewFee(studentId) {
  try {
    const data = await api('/fees/' + studentId);
    const { fee, payments } = data;

    document.getElementById('feeDetailsBody').innerHTML = `
      <div class="row g-3 mb-3">
        <div class="col-md-3"><div class="text-muted small">Student</div><div class="fw-semibold">${fee.student_name}</div></div>
        <div class="col-md-3"><div class="text-muted small">Total Fee</div><div class="fw-semibold">${formatCurrency(fee.total_fee)}</div></div>
        <div class="col-md-3"><div class="text-muted small">Paid</div><div class="fw-semibold">${formatCurrency(fee.paid_amount)}</div></div>
        <div class="col-md-3"><div class="text-muted small">Balance</div><div class="fw-semibold">${formatCurrency(fee.balance)}</div></div>
      </div>
      <h6 class="text-muted mb-2">Payment History</h6>
      ${payments.length ? `
        <div class="table-wrap">
          <table class="app-table">
            <thead><tr><th>Date</th><th>Amount</th><th>Method</th><th>Txn ID</th><th>Remarks</th></tr></thead>
            <tbody>
              ${payments.map(p => `
                <tr>
                  <td>${formatDate(p.payment_date)}</td><td>${formatCurrency(p.amount)}</td>
                  <td>${p.payment_method}</td><td>${p.transaction_id || '—'}</td><td>${p.remarks || '—'}</td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>` : `<p class="text-muted small">No payments recorded yet.</p>`}
    `;
    feeDetailsModal.show();
  } catch (err) {
    showToast(err.message, 'error');
  }
}
