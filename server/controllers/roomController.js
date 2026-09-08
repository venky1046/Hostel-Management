const db = require("../config/db");

// ==========================================================
// DEFAULT ROOMS
// Automatically creates these rooms if the rooms table is empty
// ==========================================================
const DEFAULT_ROOMS = [
  // Normal4 - 4 members, Common Bathroom, No AC
  {
    room_number: "101",
    room_type: "Normal4",
    capacity: 4,
    bathroom_type: "Common",
    ac_available: false,
    fee: 100000,
  },
  {
    room_number: "102",
    room_type: "Normal4",
    capacity: 4,
    bathroom_type: "Common",
    ac_available: false,
    fee: 100000,
  },
  {
    room_number: "103",
    room_type: "Normal4",
    capacity: 4,
    bathroom_type: "Common",
    ac_available: false,
    fee: 100000,
  },
  {
    room_number: "104",
    room_type: "Normal4",
    capacity: 4,
    bathroom_type: "Common",
    ac_available: false,
    fee: 100000,
  },

  // Normal2 - 2 members, Attached Bathroom, No AC
  {
    room_number: "201",
    room_type: "Normal2",
    capacity: 2,
    bathroom_type: "Attached",
    ac_available: false,
    fee: 120000,
  },
  {
    room_number: "202",
    room_type: "Normal2",
    capacity: 2,
    bathroom_type: "Attached",
    ac_available: false,
    fee: 120000,
  },
  {
    room_number: "203",
    room_type: "Normal2",
    capacity: 2,
    bathroom_type: "Attached",
    ac_available: false,
    fee: 120000,
  },

  // NRI2 - 2 members, Attached Bathroom, AC
  {
    room_number: "301",
    room_type: "NRI2",
    capacity: 2,
    bathroom_type: "Attached",
    ac_available: true,
    fee: 140000,
  },
  {
    room_number: "302",
    room_type: "NRI2",
    capacity: 2,
    bathroom_type: "Attached",
    ac_available: true,
    fee: 140000,
  },
  {
    room_number: "303",
    room_type: "NRI2",
    capacity: 2,
    bathroom_type: "Attached",
    ac_available: true,
    fee: 140000,
  },
];

// ==========================================================
// CREATE DEFAULT ROOMS IF TABLE IS EMPTY
// ==========================================================
async function ensureDefaultRooms() {
  try {
    const [countRows] = await db.query("SELECT COUNT(*) AS total FROM rooms");

    const totalRooms = Number(countRows[0].total);

    // If rooms already exist, don't create duplicates
    if (totalRooms > 0) {
      return;
    }

    console.log("No rooms found. Creating default rooms...");

    for (const room of DEFAULT_ROOMS) {
      await db.query(
        `INSERT INTO rooms
        (
          room_number,
          room_type,
          capacity,
          occupied,
          bathroom_type,
          ac_available,
          fee,
          status
        )
        VALUES (?, ?, ?, 0, ?, ?, ?, 'Available')`,
        [
          room.room_number,
          room.room_type,
          room.capacity,
          room.bathroom_type,
          room.ac_available ? 1 : 0,
          room.fee,
        ],
      );
    }

    console.log("✅ 10 default rooms created successfully.");
  } catch (err) {
    console.error("❌ Error creating default rooms:", err.message);
  }
}

// ==========================================================
// GET ALL ROOMS
// GET /api/rooms
// ==========================================================
exports.getAllRooms = async (req, res) => {
  try {
    // Automatically create default rooms if no rooms exist
    await ensureDefaultRooms();

    const { search, room_type, status } = req.query;

    let sql = `
      SELECT
        id,
        room_number,
        room_type,
        capacity,
        occupied,
        (capacity - occupied) AS available_beds,
        bathroom_type,
        ac_available,
        fee,
        status,
        created_at
      FROM rooms
      WHERE 1=1
    `;

    const params = [];

    // Search by room number
    if (search) {
      sql += " AND room_number LIKE ?";
      params.push(`%${search}%`);
    }

    // Filter by room type
    if (room_type) {
      sql += " AND room_type = ?";
      params.push(room_type);
    }

    // Filter by status
    if (status) {
      sql += " AND status = ?";
      params.push(status);
    }

    sql += `
      ORDER BY
        CAST(room_number AS UNSIGNED) ASC
    `;

    const [rows] = await db.query(sql, params);

    res.json(rows);
  } catch (err) {
    console.error("GET ROOMS ERROR:", err);

    res.status(500).json({
      message: "Failed to fetch rooms",
      error: err.message,
    });
  }
};

// ==========================================================
// GET SINGLE ROOM
// GET /api/rooms/:id
// ==========================================================
exports.getRoomById = async (req, res) => {
  try {
    const { id } = req.params;

    const [roomRows] = await db.query(
      `
      SELECT
        *,
        (capacity - occupied) AS available_beds
      FROM rooms
      WHERE id = ?
      `,
      [id],
    );

    if (roomRows.length === 0) {
      return res.status(404).json({
        message: "Room not found",
      });
    }

    const [students] = await db.query(
      `
      SELECT
        s.id,
        s.student_name,
        s.register_no,
        s.department,
        a.id AS allocation_id,
        a.allocated_date,
        a.status
      FROM allocations a
      JOIN students s
        ON a.student_id = s.id
      WHERE
        a.room_id = ?
        AND a.status = 'Active'
      ORDER BY a.allocated_date DESC
      `,
      [id],
    );

    res.json({
      room: roomRows[0],
      students,
    });
  } catch (err) {
    console.error("GET ROOM ERROR:", err);

    res.status(500).json({
      message: "Failed to fetch room details",
      error: err.message,
    });
  }
};

// ==========================================================
// ADD ROOM
// POST /api/rooms
// ==========================================================
exports.createRoom = async (req, res) => {
  try {
    const {
      room_number,
      room_type,
      capacity,
      bathroom_type,
      ac_available,
      fee,
      status,
    } = req.body;

    if (
      !room_number ||
      !room_type ||
      !capacity ||
      !bathroom_type ||
      fee === undefined
    ) {
      return res.status(400).json({
        message: "Please fill all required fields.",
      });
    }

    // Check duplicate room number
    const [existing] = await db.query(
      "SELECT id FROM rooms WHERE room_number = ?",
      [room_number],
    );

    if (existing.length > 0) {
      return res.status(409).json({
        message: `Room number ${room_number} already exists.`,
      });
    }

    const [result] = await db.query(
      `
      INSERT INTO rooms
      (
        room_number,
        room_type,
        capacity,
        occupied,
        bathroom_type,
        ac_available,
        fee,
        status
      )
      VALUES (?, ?, ?, 0, ?, ?, ?, ?)
      `,
      [
        room_number,
        room_type,
        Number(capacity),
        bathroom_type,
        ac_available ? 1 : 0,
        Number(fee),
        status || "Available",
      ],
    );

    res.status(201).json({
      message: "Room added successfully",
      roomId: result.insertId,
    });
  } catch (err) {
    console.error("CREATE ROOM ERROR:", err);

    res.status(500).json({
      message: "Failed to add room",
      error: err.message,
    });
  }
};

// ==========================================================
// UPDATE ROOM
// PUT /api/rooms/:id
// ==========================================================
exports.updateRoom = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      room_number,
      room_type,
      capacity,
      bathroom_type,
      ac_available,
      fee,
      status,
    } = req.body;

    // Check duplicate room number
    const [existing] = await db.query(
      `
      SELECT id
      FROM rooms
      WHERE room_number = ?
      AND id != ?
      `,
      [room_number, id],
    );

    if (existing.length > 0) {
      return res.status(409).json({
        message: `Room number ${room_number} is already used by another room.`,
      });
    }

    const [result] = await db.query(
      `
      UPDATE rooms
      SET
        room_number = ?,
        room_type = ?,
        capacity = ?,
        bathroom_type = ?,
        ac_available = ?,
        fee = ?,
        status = ?
      WHERE id = ?
      `,
      [
        room_number,
        room_type,
        Number(capacity),
        bathroom_type,
        ac_available ? 1 : 0,
        Number(fee),
        status || "Available",
        id,
      ],
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "Room not found",
      });
    }

    res.json({
      message: "Room updated successfully",
    });
  } catch (err) {
    console.error("UPDATE ROOM ERROR:", err);

    res.status(500).json({
      message: "Failed to update room",
      error: err.message,
    });
  }
};

// ==========================================================
// DELETE ROOM
// DELETE /api/rooms/:id
// ==========================================================
exports.deleteRoom = async (req, res) => {
  try {
    const { id } = req.params;

    // Don't delete if students are allocated
    const [activeAllocs] = await db.query(
      `
      SELECT id
      FROM allocations
      WHERE room_id = ?
      AND status = 'Active'
      `,
      [id],
    );

    if (activeAllocs.length > 0) {
      return res.status(400).json({
        message: "Cannot delete room: students are currently allocated to it.",
      });
    }

    const [result] = await db.query("DELETE FROM rooms WHERE id = ?", [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "Room not found",
      });
    }

    res.json({
      message: "Room deleted successfully",
    });
  } catch (err) {
    console.error("DELETE ROOM ERROR:", err);

    res.status(500).json({
      message: "Failed to delete room",
      error: err.message,
    });
  }
};
