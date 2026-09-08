document.addEventListener('DOMContentLoaded', () => {
  loadPayments();
  document.getElementById('searchInput').addEventListener('input', debounce(loadPayments, 300));
});

function debounce(fn, delay) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
}

async function loadPayments() {
  const params = new URLSearchParams();
  const search = document.getElementById('searchInput').value.trim();
  if (search) params.set('search', search);

  try {
    const rows = await api('/fees/payments/all?' + params.toString());
    renderPayments(rows);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function renderPayments(rows) {
  const body = document.getElementById('paymentsBody');
  const empty = document.getElementById('paymentsEmpty');

  if (!rows.length) {
    body.innerHTML = '';
    empty.innerHTML = `<div class="empty-state"><i class="fa-regular fa-folder-open"></i>No payments found.</div>`;
    return;
  }
  empty.innerHTML = '';

  body.innerHTML = rows.map(p => `
    <tr>
      <td>${formatDate(p.payment_date)}</td>
      <td>${p.student_name}</td>
      <td>${p.register_no}</td>
      <td>${formatCurrency(p.amount)}</td>
      <td>${p.payment_method}</td>
      <td>${p.transaction_id || '—'}</td>
      <td>${p.remarks || '—'}</td>
    </tr>
  `).join('');
}
