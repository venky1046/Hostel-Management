const db = require("../config/db");

// GET /api/dashboard
exports.getDashboardStats = async (req, res) => {
  try {
    // =========================================================
    // 1. DASHBOARD CARDS
    // =========================================================

    const [[{ totalStudents }]] = await db.query(`
      SELECT COUNT(*) AS totalStudents
      FROM students
    `);

    const [[{ totalRooms }]] = await db.query(`
      SELECT COUNT(*) AS totalRooms
      FROM rooms
    `);

    const [[{ availableRooms }]] = await db.query(`
      SELECT COUNT(*) AS availableRooms
      FROM rooms
      WHERE status = 'Available'
    `);

    const [[{ fullRooms }]] = await db.query(`
      SELECT COUNT(*) AS fullRooms
      FROM rooms
      WHERE status = 'Full'
    `);

    const [[{ allocatedStudents }]] = await db.query(`
      SELECT COUNT(*) AS allocatedStudents
      FROM allocations
      WHERE status = 'Active'
    `);

    // =========================================================
    // 2. FEE SUMMARY
    // =========================================================

    const [[feeTotals]] = await db.query(`
      SELECT
        COALESCE(SUM(total_fee), 0) AS totalFees,
        COALESCE(SUM(paid_amount), 0) AS totalPaid,
        COALESCE(SUM(balance), 0) AS totalPending
      FROM fees
    `);

    // =========================================================
    // 3. ROOM OCCUPANCY BY TYPE
    // =========================================================

    const [occupancyByType] = await db.query(`
      SELECT
        room_type,
        COUNT(*) AS totalRooms,
        COALESCE(SUM(capacity), 0) AS capacity,
        COALESCE(SUM(occupied), 0) AS occupied,
        COALESCE(SUM(capacity - occupied), 0) AS available
      FROM rooms
      GROUP BY room_type
      ORDER BY room_type
    `);

    // =========================================================
    // 4. FEE COLLECTION - LAST 6 MONTHS
    // =========================================================

    const [feeCollectionRows] = await db.query(`
      SELECT
        DATE_FORMAT(payment_date, '%Y-%m') AS ym,
        DATE_FORMAT(payment_date, '%b %Y') AS month,
        COALESCE(SUM(amount), 0) AS collected
      FROM payments
      WHERE payment_date >= DATE_FORMAT(
        DATE_SUB(CURDATE(), INTERVAL 5 MONTH),
        '%Y-%m-01'
      )
      GROUP BY
        DATE_FORMAT(payment_date, '%Y-%m'),
        DATE_FORMAT(payment_date, '%b %Y')
      ORDER BY ym ASC
    `);

    // Create all 6 months even when there are no payments
    const feeCollectionByMonth = [];

    const today = new Date();

    for (let i = 5; i >= 0; i--) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);

      const year = date.getFullYear();

      const monthNumber = String(date.getMonth() + 1).padStart(2, "0");

      const ym = `${year}-${monthNumber}`;

      const found = feeCollectionRows.find((row) => row.ym === ym);

      feeCollectionByMonth.push({
        ym: ym,
        month: date.toLocaleDateString("en-US", {
          month: "short",
          year: "numeric",
        }),
        collected: found ? Number(found.collected) : 0,
      });
    }

    // =========================================================
    // 5. RECENT STUDENTS
    // =========================================================

    const [recentStudents] = await db.query(`
      SELECT
        id,
        student_name,
        register_no,
        department,
        year,
        room_preference,
        created_at
      FROM students
      ORDER BY id DESC
      LIMIT 5
    `);

    // =========================================================
    // 6. RECENT PAYMENTS
    // =========================================================

    const [recentPayments] = await db.query(`
      SELECT
        p.id,
        p.amount,
        p.payment_date,
        p.payment_method,
        p.transaction_id,
        s.student_name,
        s.register_no
      FROM payments p
      LEFT JOIN students s
        ON p.student_id = s.id
      ORDER BY p.id DESC
      LIMIT 5
    `);

    // =========================================================
    // 7. RECENT ALLOCATIONS
    // =========================================================

    const [recentAllocations] = await db.query(`
      SELECT
        a.id,
        a.allocated_date,
        a.status,
        s.student_name,
        s.register_no,
        r.room_number,
        r.room_type
      FROM allocations a
      LEFT JOIN students s
        ON a.student_id = s.id
      LEFT JOIN rooms r
        ON a.room_id = r.id
      ORDER BY a.id DESC
      LIMIT 5
    `);

    // =========================================================
    // 8. SEND DASHBOARD DATA
    // =========================================================

    res.json({
      success: true,

      cards: {
        totalStudents: Number(totalStudents),
        totalRooms: Number(totalRooms),
        availableRooms: Number(availableRooms),
        fullRooms: Number(fullRooms),
        allocatedStudents: Number(allocatedStudents),

        totalFees: Number(feeTotals.totalFees),
        totalPaid: Number(feeTotals.totalPaid),
        totalPending: Number(feeTotals.totalPending),
      },

      occupancyByType,

      feeCollectionByMonth,

      recentStudents,

      recentPayments,

      recentAllocations,
    });
  } catch (err) {
    console.error("❌ Dashboard Error:", err);

    res.status(500).json({
      success: false,
      message: "Failed to load dashboard data",
      error: err.message,
    });
  }
};
