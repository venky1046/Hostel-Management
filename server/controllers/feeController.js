const db = require('../config/db');

// GET /api/fees (supports ?search= on student name / register no, ?status=)
exports.getAllFees = async (req, res) => {
  try {
    const { search, status } = req.query;
    let sql = `
      SELECT f.*, s.student_name, s.register_no, s.department
      FROM fees f
      JOIN students s ON f.student_id = s.id
      WHERE 1=1`;
    const params = [];

    if (search) {
      sql += ' AND (s.student_name LIKE ? OR s.register_no LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    if (status) {
      sql += ' AND f.payment_status = ?';
      params.push(status);
    }
    sql += ' ORDER BY f.id DESC';

    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch fees', error: err.message });
  }
};

// GET /api/fees/:studentId -> one student's fee record + payment history
exports.getFeeByStudentId = async (req, res) => {
  try {
    const { studentId } = req.params;
    const [feeRows] = await db.query(
      `SELECT f.*, s.student_name, s.register_no
       FROM fees f JOIN students s ON f.student_id = s.id
       WHERE f.student_id = ?`,
      [studentId]
    );
    if (feeRows.length === 0) {
      return res.status(404).json({ message: 'Fee record not found for this student' });
    }
    const [payments] = await db.query(
      'SELECT * FROM payments WHERE student_id = ? ORDER BY payment_date DESC, id DESC',
      [studentId]
    );
    res.json({ fee: feeRows[0], payments });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch fee details', error: err.message });
  }
};

// GET /api/fees/payments/all -> every payment, for the Payments page
exports.getAllPayments = async (req, res) => {
  try {
    const { search } = req.query;
    let sql = `
      SELECT p.*, s.student_name, s.register_no
      FROM payments p
      JOIN students s ON p.student_id = s.id
      WHERE 1=1`;
    const params = [];
    if (search) {
      sql += ' AND (s.student_name LIKE ? OR s.register_no LIKE ? OR p.transaction_id LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    sql += ' ORDER BY p.payment_date DESC, p.id DESC';
    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch payments', error: err.message });
  }
};

// POST /api/fees/payment  { student_id, amount, payment_date, payment_method, transaction_id, remarks }
exports.addPayment = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const { student_id, amount, payment_date, payment_method, transaction_id, remarks } = req.body;

    if (!student_id || !amount || amount <= 0 || !payment_method) {
      return res.status(400).json({ message: 'student_id, a positive amount and payment_method are required.' });
    }

    await connection.beginTransaction();

    const [feeRows] = await connection.query(
      'SELECT * FROM fees WHERE student_id = ? FOR UPDATE', [student_id]
    );
    if (feeRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'No fee record found for this student.' });
    }
    const fee = feeRows[0];

    const newPaid = parseFloat(fee.paid_amount) + parseFloat(amount);
    if (newPaid > parseFloat(fee.total_fee)) {
      await connection.rollback();
      return res.status(400).json({
        message: `Payment exceeds the remaining balance of ₹${(fee.total_fee - fee.paid_amount).toFixed(2)}.`
      });
    }

    const finalPaymentDate = payment_date || new Date().toISOString().slice(0, 10);

    const [result] = await connection.query(
      `INSERT INTO payments (student_id, fee_id, amount, payment_date, payment_method, transaction_id, remarks)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [student_id, fee.id, amount, finalPaymentDate, payment_method, transaction_id || null, remarks || null]
    );

    // balance and payment_status recalculate automatically (generated columns)
    await connection.query(
      'UPDATE fees SET paid_amount = ?, last_payment_date = ? WHERE id = ?',
      [newPaid, finalPaymentDate, fee.id]
    );

    await connection.commit();
    res.status(201).json({ message: 'Payment recorded successfully', paymentId: result.insertId });
  } catch (err) {
    await connection.rollback();
    console.error(err);
    res.status(500).json({ message: 'Failed to record payment', error: err.message });
  } finally {
    connection.release();
  }
};
