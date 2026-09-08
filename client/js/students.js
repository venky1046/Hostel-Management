let studentModal, detailsModal;

document.addEventListener('DOMContentLoaded', () => {
  studentModal = new bootstrap.Modal(document.getElementById('studentModal'));
  detailsModal = new bootstrap.Modal(document.getElementById('detailsModal'));

  loadStudents();

  document.getElementById('searchInput').addEventListener('input', debounce(loadStudents, 300));
  document.getElementById('departmentFilter').addEventListener('change', loadStudents);
  document.getElementById('yearFilter').addEventListener('change', loadStudents);
  document.getElementById('genderFilter').addEventListener('change', loadStudents);
  document.getElementById('studentForm').addEventListener('submit', saveStudent);
});

function debounce(fn, delay) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
}

async function loadStudents() {
  const params = new URLSearchParams();
  const search = document.getElementById('searchInput').value.trim();
  const department = document.getElementById('departmentFilter').value;
  const year = document.getElementById('yearFilter').value;
  const gender = document.getElementById('genderFilter').value;
  if (search) params.set('search', search);
  if (department) params.set('department', department);
  if (year) params.set('year', year);
  if (gender) params.set('gender', gender);

  try {
    const rows = await api('/students?' + params.toString());
    renderStudents(rows);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function renderStudents(rows) {
  const body = document.getElementById('studentsBody');
  const empty = document.getElementById('studentsEmpty');

  if (!rows.length) {
    body.innerHTML = '';
    empty.innerHTML = `<div class="empty-state"><i class="fa-regular fa-folder-open"></i>No students found.</div>`;
    return;
  }
  empty.innerHTML = '';

  body.innerHTML = rows.map(s => `
    <tr>
      <td>${s.register_no}</td>
      <td><a href="#" onclick="viewStudent(${s.id});return false;" class="fw-semibold text-dark">${s.student_name}</a></td>
      <td>${s.gender}</td>
      <td>${s.department}</td>
      <td>${s.year}</td>
      <td>${s.mobile}</td>
      <td>${s.room_preference}</td>
      <td>${s.reservation_7_5 ? 'Yes' : 'No'}</td>
      <td class="text-end">
        <button class="btn btn-sm btn-outline-navy me-1" onclick="editStudent(${s.id})"><i class="fa-solid fa-pen"></i></button>
        <button class="btn btn-sm btn-outline-danger" onclick="deleteStudent(${s.id}, '${escapeQuote(s.student_name)}')"><i class="fa-solid fa-trash"></i></button>
      </td>
    </tr>
  `).join('');
}

function escapeQuote(str) { return String(str).replace(/'/g, "\\'"); }

function openAddStudent() {
  document.getElementById('studentModalTitle').textContent = 'Add Student';
  document.getElementById('studentForm').reset();
  document.getElementById('studentId').value = '';
  document.getElementById('feeNote').textContent = 'A fee record is created automatically based on room preference.';
}

async function editStudent(id) {
  try {
    const data = await api('/students/' + id);
    const s = data.student;
    document.getElementById('studentModalTitle').textContent = 'Edit Student';
    document.getElementById('studentId').value = s.id;
    document.getElementById('register_no').value = s.register_no;
    document.getElementById('student_name').value = s.student_name;
    document.getElementById('gender').value = s.gender;
    document.getElementById('department').value = s.department;
    document.getElementById('year').value = s.year;
    document.getElementById('mobile').value = s.mobile;
    document.getElementById('parent_mobile').value = s.parent_mobile || '';
    document.getElementById('email').value = s.email || '';
    document.getElementById('room_preference').value = s.room_preference;
    document.getElementById('address').value = s.address || '';
    document.getElementById('reservation_7_5').checked = !!s.reservation_7_5;
    document.getElementById('feeNote').textContent = 'Note: changing room preference here does not change an already-generated fee record.';
    studentModal.show();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function saveStudent(e) {
  e.preventDefault();
  const id = document.getElementById('studentId').value;
  const payload = {
    register_no: document.getElementById('register_no').value.trim(),
    student_name: document.getElementById('student_name').value.trim(),
    gender: document.getElementById('gender').value,
    department: document.getElementById('department').value,
    year: document.getElementById('year').value,
    mobile: document.getElementById('mobile').value.trim(),
    parent_mobile: document.getElementById('parent_mobile').value.trim(),
    email: document.getElementById('email').value.trim(),
    address: document.getElementById('address').value.trim(),
    reservation_7_5: document.getElementById('reservation_7_5').checked,
    room_preference: document.getElementById('room_preference').value
  };

  try {
    if (id) {
      await api('/students/' + id, { method: 'PUT', body: JSON.stringify(payload) });
      showToast('Student updated successfully');
    } else {
      await api('/students', { method: 'POST', body: JSON.stringify(payload) });
      showToast('Student added successfully');
    }
    studentModal.hide();
    loadStudents();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function deleteStudent(id, name) {
  if (!confirm(`Delete student "${name}"? This also removes their allocation, fee and payment records.`)) return;
  try {
    await api('/students/' + id, { method: 'DELETE' });
    showToast('Student deleted');
    loadStudents();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function viewStudent(id) {
  try {
    const data = await api('/students/' + id);
    const { student, room, fee, payments } = data;

    document.getElementById('detailsBody').innerHTML = `
      <div class="row g-4">
        <div class="col-md-6">
          <h6 class="text-muted mb-2">Personal & Academic</h6>
          <p class="mb-1"><strong>${student.student_name}</strong> (${student.register_no})</p>
          <p class="mb-1 small">${student.gender} · ${student.department} · Year ${student.year}</p>
          <p class="mb-1 small">7.5% Reservation: ${student.reservation_7_5 ? 'Yes' : 'No'}</p>
        </div>
        <div class="col-md-6">
          <h6 class="text-muted mb-2">Contact</h6>
          <p class="mb-1 small"><i class="fa-solid fa-phone me-1"></i> ${student.mobile}</p>
          <p class="mb-1 small"><i class="fa-solid fa-user-shield me-1"></i> Parent: ${student.parent_mobile || '—'}</p>
          <p class="mb-1 small"><i class="fa-solid fa-envelope me-1"></i> ${student.email || '—'}</p>
          <p class="mb-1 small"><i class="fa-solid fa-location-dot me-1"></i> ${student.address || '—'}</p>
        </div>
        <div class="col-md-6">
          <h6 class="text-muted mb-2">Room</h6>
          ${room
            ? `<p class="mb-1">Room <strong>${room.room_number}</strong> (${room.room_type})</p>
               <p class="mb-1 small">Allocated: ${formatDate(room.allocated_date)}</p>`
            : `<p class="text-muted small">Not currently allocated a room.</p>`}
        </div>
        <div class="col-md-6">
          <h6 class="text-muted mb-2">Fee</h6>
          ${fee
            ? `<p class="mb-1">Total: ${formatCurrency(fee.total_fee)} · Paid: ${formatCurrency(fee.paid_amount)}</p>
               <p class="mb-1">Balance: ${formatCurrency(fee.balance)} — <span class="badge-status ${statusBadgeClass(fee.payment_status)}">${fee.payment_status}</span></p>`
            : `<p class="text-muted small">No fee record.</p>`}
        </div>
        <div class="col-12">
          <h6 class="text-muted mb-2">Payment History</h6>
          ${payments.length ? `
            <div class="table-wrap">
              <table class="app-table">
                <thead><tr><th>Date</th><th>Amount</th><th>Method</th><th>Txn ID</th></tr></thead>
                <tbody>
                  ${payments.map(p => `<tr><td>${formatDate(p.payment_date)}</td><td>${formatCurrency(p.amount)}</td><td>${p.payment_method}</td><td>${p.transaction_id || '—'}</td></tr>`).join('')}
                </tbody>
              </table>
            </div>` : `<p class="text-muted small">No payments recorded yet.</p>`}
        </div>
      </div>
    `;
    detailsModal.show();
  } catch (err) {
    showToast(err.message, 'error');
  }
}
