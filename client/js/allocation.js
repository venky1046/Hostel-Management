let students = [];
let rooms = [];

document.addEventListener('DOMContentLoaded', () => {
  loadFormData();
  loadAllocations();
});

async function loadFormData() {
  try {
    const [allStudents, allocations, allRooms] = await Promise.all([
      api('/students'),
      api('/allocations'),
      api('/rooms')
    ]);

    const activeStudentIds = new Set(
      allocations.filter(a => a.status === 'Active').map(a => a.student_id)
    );
    students = allStudents.filter(s => !activeStudentIds.has(s.id));
    rooms = allRooms.filter(r => r.available_beds > 0 && r.status !== 'Maintenance');

    const studentSelect = document.getElementById('studentSelect');
    studentSelect.innerHTML = '<option value="">Select a student…</option>' +
      students.map(s => `<option value="${s.id}">${s.student_name} (${s.register_no})</option>`).join('');

    const roomSelect = document.getElementById('roomSelect');
    roomSelect.innerHTML = '<option value="">Select a room…</option>' +
      rooms.map(r => `<option value="${r.id}">Room ${r.room_number} — ${r.room_type} (${r.available_beds} bed${r.available_beds > 1 ? 's' : ''} free)</option>`).join('');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function showStudentPreview() {
  const id = Number(document.getElementById('studentSelect').value);
  const s = students.find(x => x.id === id);
  document.getElementById('studentPreview').innerHTML = s
    ? `${s.department} · Year ${s.year} · Prefers <strong>${s.room_preference}</strong>`
    : '';
}

function showRoomPreview() {
  const id = Number(document.getElementById('roomSelect').value);
  const r = rooms.find(x => x.id === id);
  document.getElementById('roomPreview').innerHTML = r
    ? `Capacity ${r.capacity} · Occupied ${r.occupied} · Fee ${formatCurrency(r.fee)}`
    : '';
}

async function confirmAllocate() {
  const studentId = document.getElementById('studentSelect').value;
  const roomId = document.getElementById('roomSelect').value;
  if (!studentId || !roomId) {
    showToast('Please select both a student and a room.', 'error');
    return;
  }
  const s = students.find(x => x.id === Number(studentId));
  const r = rooms.find(x => x.id === Number(roomId));

  if (!confirm(`Allocate Room ${r.room_number} (${r.room_type}) to ${s.student_name} (${s.register_no})?`)) return;

  try {
    await api('/allocations', { method: 'POST', body: JSON.stringify({ student_id: studentId, room_id: roomId }) });
    showToast('Room allocated successfully');
    document.getElementById('studentSelect').value = '';
    document.getElementById('roomSelect').value = '';
    document.getElementById('studentPreview').innerHTML = '';
    document.getElementById('roomPreview').innerHTML = '';
    loadFormData();
    loadAllocations();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function loadAllocations() {
  try {
    const rows = await api('/allocations');
    renderAllocations(rows);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function renderAllocations(rows) {
  const body = document.getElementById('allocationsBody');
  const empty = document.getElementById('allocationsEmpty');

  if (!rows.length) {
    body.innerHTML = '';
    empty.innerHTML = `<div class="empty-state"><i class="fa-regular fa-folder-open"></i>No allocations yet.</div>`;
    return;
  }
  empty.innerHTML = '';

  body.innerHTML = rows.map(a => `
    <tr>
      <td>
        <div class="fw-semibold">${a.student_name}</div>
        <div class="text-muted small">${a.register_no} · ${a.department}</div>
      </td>
      <td>${a.room_number} <span class="text-muted small">(${a.room_type})</span></td>
      <td>${formatDate(a.allocated_date)}</td>
      <td><span class="badge-status ${statusBadgeClass(a.status)}">${a.status}</span></td>
      <td class="text-end">
        ${a.status === 'Active'
          ? `<button class="btn btn-sm btn-outline-danger" onclick="cancelAllocation(${a.id})">Cancel</button>`
          : ''}
      </td>
    </tr>
  `).join('');
}

async function cancelAllocation(id) {
  if (!confirm('Cancel this allocation? The room bed will become available again.')) return;
  try {
    await api(`/allocations/${id}/cancel`, { method: 'PUT' });
    showToast('Allocation cancelled');
    loadFormData();
    loadAllocations();
  } catch (err) {
    showToast(err.message, 'error');
  }
}
