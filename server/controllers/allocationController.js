const db = require('../config/db');

// GET /api/allocations -> full history, newest first, with student & room info
exports.getAllAllocations = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT a.id, a.allocated_date, a.status,
              s.id AS student_id, s.student_name, s.register_no, s.department,
              r.id AS room_id, r.room_number, r.room_type
       FROM allocations a
       JOIN students s ON a.student_id = s.id
       JOIN rooms r ON a.room_id = r.id
       ORDER BY a.id DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch allocations', error: err.message });
  }
};

// POST /api/allocations  { student_id, room_id }
exports.createAllocation = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const { student_id, room_id } = req.body;
    if (!student_id || !room_id) {
      return res.status(400).json({ message: 'student_id and room_id are required.' });
    }

    await connection.beginTransaction();

    // Lock the room row so two simultaneous requests can't both squeeze into the last bed
    const [roomRows] = await connection.query(
      'SELECT * FROM rooms WHERE id = ? FOR UPDATE', [room_id]
    );
    if (roomRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Room not found' });
    }
    const room = roomRows[0];

    if (room.occupied >= room.capacity) {
      await connection.rollback();
      return res.status(400).json({ message: 'Room is already full.' });
    }
    if (room.status === 'Maintenance') {
      await connection.rollback();
      return res.status(400).json({ message: 'Room is under maintenance.' });
    }

    const [studentRows] = await connection.query('SELECT id FROM students WHERE id = ?', [student_id]);
    if (studentRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Student not found' });
    }

    const [activeAlloc] = await connection.query(
      "SELECT id FROM allocations WHERE student_id = ? AND status = 'Active'", [student_id]
    );
    if (activeAlloc.length > 0) {
      await connection.rollback();
      return res.status(400).json({ message: 'This student already has an active room allocation.' });
    }

    const [result] = await connection.query(
      "INSERT INTO allocations (student_id, room_id, allocated_date, status) VALUES (?, ?, CURDATE(), 'Active')",
      [student_id, room_id]
    );

    const newOccupied = room.occupied + 1;
    const newStatus = newOccupied >= room.capacity ? 'Full' : 'Available';
    await connection.query(
      'UPDATE rooms SET occupied = ?, status = ? WHERE id = ?',
      [newOccupied, newStatus, room_id]
    );

    await connection.commit();
    res.status(201).json({ message: 'Room allocated successfully', allocationId: result.insertId });
  } catch (err) {
    await connection.rollback();
    console.error(err);
    res.status(500).json({ message: 'Failed to allocate room', error: err.message });
  } finally {
    connection.release();
  }
};

// PUT /api/allocations/:id/cancel
exports.cancelAllocation = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const { id } = req.params;
    await connection.beginTransaction();

    const [allocRows] = await connection.query(
      "SELECT * FROM allocations WHERE id = ? AND status = 'Active'", [id]
    );
    if (allocRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Active allocation not found' });
    }
    const allocation = allocRows[0];

    await connection.query("UPDATE allocations SET status = 'Cancelled' WHERE id = ?", [id]);

    const [roomRows] = await connection.query('SELECT * FROM rooms WHERE id = ? FOR UPDATE', [allocation.room_id]);
    const room = roomRows[0];
    const newOccupied = Math.max(0, room.occupied - 1);
    const newStatus = room.status === 'Maintenance'
      ? 'Maintenance'
      : (newOccupied >= room.capacity ? 'Full' : 'Available');

    await connection.query('UPDATE rooms SET occupied = ?, status = ? WHERE id = ?', [newOccupied, newStatus, allocation.room_id]);

    await connection.commit();
    res.json({ message: 'Allocation cancelled successfully' });
  } catch (err) {
    await connection.rollback();
    console.error(err);
    res.status(500).json({ message: 'Failed to cancel allocation', error: err.message });
  } finally {
    connection.release();
  }
};
