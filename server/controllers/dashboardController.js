const db = require('../config/db');

// GET /api/dashboard
exports.getDashboardStats = async (req, res) => {
  try {
    const [[{ totalStudents }]] = await db.query('SELECT COUNT(*) AS totalStudents FROM students');
    const [[{ totalRooms }]] = await db.query('SELECT COUNT(*) AS totalRooms FROM rooms');
    const [[{ availableRooms }]] = await db.query("SELECT COUNT(*) AS availableRooms FROM rooms WHERE status = 'Available'");
    const [[{ fullRooms }]] = await db.query("SELECT COUNT(*) AS fullRooms FROM rooms WHERE status = 'Full'");
    const [[{ allocatedStudents }]] = await db.query("SELECT COUNT(*) AS allocatedStudents FROM allocations WHERE status = 'Active'");

    const [[feeTotals]] = await db.query(
      `SELECT COALESCE(SUM(total_fee),0) AS totalFees,
              COALESCE(SUM(paid_amount),0) AS totalPaid,
              COALESCE(SUM(balance),0) AS totalPending
       FROM fees`
    );

    const [occupancyByType] = await db.query(
      `SELECT room_type, SUM(capacity) AS capacity, SUM(occupied) AS occupied
       FROM rooms GROUP BY room_type`
    );

    const [feeCollectionByMonth] = await db.query(
      `SELECT DATE_FORMAT(payment_date, '%Y-%m') AS ym,
              DATE_FORMAT(payment_date, '%b %Y') AS month,
              SUM(amount) AS collected
       FROM payments
       GROUP BY DATE_FORMAT(payment_date, '%Y-%m'), DATE_FORMAT(payment_date, '%b %Y')
       ORDER BY ym ASC
       LIMIT 6`
    );

    const [recentStudents] = await db.query(
      'SELECT id, student_name, register_no, department, created_at FROM students ORDER BY id DESC LIMIT 5'
    );
    const [recentPayments] = await db.query(
      `SELECT p.id, p.amount, p.payment_date, p.payment_method, s.student_name, s.register_no
       FROM payments p JOIN students s ON p.student_id = s.id
       ORDER BY p.id DESC LIMIT 5`
    );
    const [recentAllocations] = await db.query(
      `SELECT a.id, a.allocated_date, a.status, s.student_name, s.register_no, r.room_number
       FROM allocations a
       JOIN students s ON a.student_id = s.id
       JOIN rooms r ON a.room_id = r.id
       ORDER BY a.id DESC LIMIT 5`
    );

    res.json({
      cards: {
        totalStudents,
        totalRooms,
        availableRooms,
        fullRooms,
        allocatedStudents,
        totalFees: feeTotals.totalFees,
        totalPaid: feeTotals.totalPaid,
        totalPending: feeTotals.totalPending
      },
      occupancyByType,
      feeCollectionByMonth,
      recentStudents,
      recentPayments,
      recentAllocations
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to load dashboard data', error: err.message });
  }
};
