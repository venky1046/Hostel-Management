let roomModal, roomDetailsModal;

const ROOM_TYPE_DEFAULTS = {
  Normal4: { capacity: 4, fee: 100000, bathroom_type: 'Common', ac_available: false },
  Normal2: { capacity: 2, fee: 120000, bathroom_type: 'Attached', ac_available: false },
  NRI2: { capacity: 2, fee: 140000, bathroom_type: 'Attached', ac_available: true }
};

document.addEventListener('DOMContentLoaded', () => {
  roomModal = new bootstrap.Modal(document.getElementById('roomModal'));
  roomDetailsModal = new bootstrap.Modal(document.getElementById('roomDetailsModal'));

  loadRooms();

  document.getElementById('searchInput').addEventListener('input', debounce(loadRooms, 300));
  document.getElementById('typeFilter').addEventListener('change', loadRooms);
  document.getElementById('statusFilter').addEventListener('change', loadRooms);
  document.getElementById('roomForm').addEventListener('submit', saveRoom);
});

function debounce(fn, delay) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
}

function applyRoomTypeDefaults() {
  const type = document.getElementById('room_type').value;
  const d = ROOM_TYPE_DEFAULTS[type];
  if (!d) return;
  document.getElementById('capacity').value = d.capacity;
  document.getElementById('fee').value = d.fee;
  document.getElementById('bathroom_type').value = d.bathroom_type;
  document.getElementById('ac_available').checked = d.ac_available;
}

async function loadRooms() {
  const params = new URLSearchParams();
  const search = document.getElementById('searchInput').value.trim();
  const type = document.getElementById('typeFilter').value;
  const status = document.getElementById('statusFilter').value;
  if (search) params.set('search', search);
  if (type) params.set('room_type', type);
  if (status) params.set('status', status);

  try {
    const rows = await api('/rooms?' + params.toString());
    renderRooms(rows);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function renderRooms(rows) {
  const body = document.getElementById('roomsBody');
  const empty = document.getElementById('roomsEmpty');

  if (!rows.length) {
    body.innerHTML = '';
    empty.innerHTML = `<div class="empty-state"><i class="fa-regular fa-folder-open"></i>No rooms found.</div>`;
    return;
  }
  empty.innerHTML = '';

  body.innerHTML = rows.map(r => `
    <tr>
      <td><a href="#" class="fw-semibold text-dark" onclick="viewRoom(${r.id});return false;">${r.room_number}</a></td>
      <td>${r.room_type}</td>
      <td>${r.capacity}</td>
      <td>${r.occupied}</td>
      <td>${r.available_beds}</td>
      <td>${r.bathroom_type}</td>
      <td>${r.ac_available ? 'Yes' : 'No'}</td>
      <td>${formatCurrency(r.fee)}</td>
      <td><span class="badge-status ${statusBadgeClass(r.status)}">${r.status}</span></td>
      <td class="text-end">
        <button class="btn btn-sm btn-outline-navy me-1" onclick="editRoom(${r.id})"><i class="fa-solid fa-pen"></i></button>
        <button class="btn btn-sm btn-outline-danger" onclick="deleteRoom(${r.id}, '${r.room_number}')"><i class="fa-solid fa-trash"></i></button>
      </td>
    </tr>
  `).join('');
}

function openAddRoom() {
  document.getElementById('roomModalTitle').textContent = 'Add Room';
  document.getElementById('roomForm').reset();
  document.getElementById('roomId').value = '';
  roomModal.show();
}

async function editRoom(id) {
  try {
    const data = await api('/rooms/' + id);
    const r = data.room;
    document.getElementById('roomModalTitle').textContent = 'Edit Room';
    document.getElementById('roomId').value = r.id;
    document.getElementById('room_number').value = r.room_number;
    document.getElementById('room_type').value = r.room_type;
    document.getElementById('capacity').value = r.capacity;
    document.getElementById('fee').value = r.fee;
    document.getElementById('bathroom_type').value = r.bathroom_type;
    document.getElementById('status').value = r.status;
    document.getElementById('ac_available').checked = !!r.ac_available;
    roomModal.show();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function saveRoom(e) {
  e.preventDefault();
  const id = document.getElementById('roomId').value;
  const payload = {
    room_number: document.getElementById('room_number').value.trim(),
    room_type: document.getElementById('room_type').value,
    capacity: Number(document.getElementById('capacity').value),
    fee: Number(document.getElementById('fee').value),
    bathroom_type: document.getElementById('bathroom_type').value,
    status: document.getElementById('status').value || 'Available',
    ac_available: document.getElementById('ac_available').checked
  };

  try {
    if (id) {
      await api('/rooms/' + id, { method: 'PUT', body: JSON.stringify(payload) });
      showToast('Room updated successfully');
    } else {
      await api('/rooms', { method: 'POST', body: JSON.stringify(payload) });
      showToast('Room added successfully');
    }
    roomModal.hide();
    loadRooms();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function deleteRoom(id, roomNumber) {
  if (!confirm(`Delete room ${roomNumber}?`)) return;
  try {
    await api('/rooms/' + id, { method: 'DELETE' });
    showToast('Room deleted');
    loadRooms();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function viewRoom(id) {
  try {
    const data = await api('/rooms/' + id);
    const { room, students } = data;

    document.getElementById('roomDetailsBody').innerHTML = `
      <div class="row g-3 mb-3">
        <div class="col-md-3"><div class="text-muted small">Room Number</div><div class="fw-semibold">${room.room_number}</div></div>
        <div class="col-md-3"><div class="text-muted small">Type</div><div class="fw-semibold">${room.room_type}</div></div>
        <div class="col-md-3"><div class="text-muted small">Capacity</div><div class="fw-semibold">${room.capacity}</div></div>
        <div class="col-md-3"><div class="text-muted small">Occupied</div><div class="fw-semibold">${room.occupied}</div></div>
        <div class="col-md-3"><div class="text-muted small">Available</div><div class="fw-semibold">${room.available_beds}</div></div>
        <div class="col-md-3"><div class="text-muted small">Bathroom</div><div class="fw-semibold">${room.bathroom_type}</div></div>
        <div class="col-md-3"><div class="text-muted small">AC</div><div class="fw-semibold">${room.ac_available ? 'Yes' : 'No'}</div></div>
        <div class="col-md-3"><div class="text-muted small">Fee</div><div class="fw-semibold">${formatCurrency(room.fee)}</div></div>
      </div>
      <h6 class="text-muted mb-2">Allocated Students</h6>
      ${students.length ? `
        <div class="table-wrap">
          <table class="app-table">
            <thead><tr><th>Name</th><th>Register No.</th><th>Department</th><th>Allocated</th><th>Status</th></tr></thead>
            <tbody>
              ${students.map(s => `
                <tr>
                  <td>${s.student_name}</td><td>${s.register_no}</td><td>${s.department}</td>
                  <td>${formatDate(s.allocated_date)}</td>
                  <td><span class="badge-status ${statusBadgeClass(s.status)}">${s.status}</span></td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>` : `<p class="text-muted small">No students currently allocated to this room.</p>`}
    `;
    roomDetailsModal.show();
  } catch (err) {
    showToast(err.message, 'error');
  }
}
