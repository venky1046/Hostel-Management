const db = require("../config/db");

// Fee amount is decided by the room preference the student picks
// (must match the "fee" values used in the rooms table / database/hostel_management.sql).
const FEE_BY_PREFERENCE = {
  Normal4: 100000,
  Normal2: 120000,
  NRI2: 140000,
};

// GET /api/students  (supports ?search=&department=&year=&gender=)
exports.getAllStudents = async (req, res) => {
  try {
    const { search, department, year, gender } = req.query;
    let sql = "SELECT * FROM students WHERE 1=1";
    const params = [];

    if (search) {
      sql += " AND (student_name LIKE ? OR register_no LIKE ?)";
      params.push(`%${search}%`, `%${search}%`);
    }
    if (department) {
      sql += " AND department = ?";
      params.push(department);
    }
    if (year) {
      sql += " AND year = ?";
      params.push(year);
    }
    if (gender) {
      sql += " AND gender = ?";
      params.push(gender);
    }
    sql += " ORDER BY id DESC";

    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ message: "Failed to fetch students", error: err.message });
  }
};

// GET /api/students/:id  -> full profile: student + room + fee + payments
exports.getStudentById = async (req, res) => {
  try {
    const { id } = req.params;

    const [studentRows] = await db.query(
      "SELECT * FROM students WHERE id = ?",
      [id],
    );
    if (studentRows.length === 0) {
      return res.status(404).json({ message: "Student not found" });
    }

    const [allocationRows] = await db.query(
      `SELECT a.id AS allocation_id, a.allocated_date, a.status AS allocation_status,
              r.id AS room_id, r.room_number, r.room_type, r.fee AS room_fee
       FROM allocations a
       JOIN rooms r ON a.room_id = r.id
       WHERE a.student_id = ? AND a.status = 'Active'`,
      [id],
    );

    const [feeRows] = await db.query(
      "SELECT * FROM fees WHERE student_id = ?",
      [id],
    );

    const [paymentRows] = await db.query(
      "SELECT * FROM payments WHERE student_id = ? ORDER BY payment_date DESC, id DESC",
      [id],
    );

    res.json({
      student: studentRows[0],
      room: allocationRows[0] || null,
      fee: feeRows[0] || null,
      payments: paymentRows,
    });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ message: "Failed to fetch student details", error: err.message });
  }
};

// POST /api/students  -> creates student AND its fee record automatically
exports.createStudent = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const {
      register_no,
      student_name,
      gender,
      department,
      year,
      mobile,
      parent_mobile,
      email,
      address,
      reservation_7_5,
      room_preference,
    } = req.body;

    if (
      !register_no ||
      !student_name ||
      !gender ||
      !department ||
      !year ||
      !mobile ||
      !room_preference
    ) {
      return res
        .status(400)
        .json({ message: "Please fill all required fields." });
    }
    if (!FEE_BY_PREFERENCE[room_preference]) {
      return res.status(400).json({ message: "Invalid room preference." });
    }

    await connection.beginTransaction();

    const [existing] = await connection.query(
      "SELECT id FROM students WHERE register_no = ?",
      [register_no],
    );
    if (existing.length > 0) {
      await connection.rollback();
      return res
        .status(409)
        .json({ message: `Register number ${register_no} already exists.` });
    }

    const [result] = await connection.query(
      `INSERT INTO students
        (register_no, student_name, gender, department, year, mobile, parent_mobile, email, address, reservation_7_5, room_preference)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        register_no,
        student_name,
        gender,
        department,
        year,
        mobile,
        parent_mobile || null,
        email || null,
        address || null,
        reservation_7_5 ? 1 : 0,
        room_preference,
      ],
    );

    const studentId = result.insertId;
    const totalFee = FEE_BY_PREFERENCE[room_preference];

    const paidAmount = 0;
    const balance = totalFee - paidAmount;
    const paymentStatus = "Pending";

    await connection.query(
      `INSERT INTO fees
    (student_id, total_fee, paid_amount, balance, payment_status)
   VALUES (?, ?, ?, ?, ?)`,
      [studentId, totalFee, paidAmount, balance, paymentStatus],
    );

    await connection.commit();
    res.status(201).json({ message: "Student added successfully", studentId });
  } catch (err) {
    await connection.rollback();
    console.error(err);
    res
      .status(500)
      .json({ message: "Failed to add student", error: err.message });
  } finally {
    connection.release();
  }
};

// PUT /api/students/:id
exports.updateStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      register_no,
      student_name,
      gender,
      department,
      year,
      mobile,
      parent_mobile,
      email,
      address,
      reservation_7_5,
      room_preference,
    } = req.body;

    const [existing] = await db.query(
      "SELECT id FROM students WHERE register_no = ? AND id != ?",
      [register_no, id],
    );
    if (existing.length > 0) {
      return res
        .status(409)
        .json({
          message: `Register number ${register_no} is already used by another student.`,
        });
    }

    const [result] = await db.query(
      `UPDATE students SET register_no=?, student_name=?, gender=?, department=?, year=?,
       mobile=?, parent_mobile=?, email=?, address=?, reservation_7_5=?, room_preference=?
       WHERE id=?`,
      [
        register_no,
        student_name,
        gender,
        department,
        year,
        mobile,
        parent_mobile || null,
        email || null,
        address || null,
        reservation_7_5 ? 1 : 0,
        room_preference,
        id,
      ],
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Student not found" });
    }
    res.json({ message: "Student updated successfully" });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ message: "Failed to update student", error: err.message });
  }
};

// DELETE /api/students/:id
// The foreign keys in allocations/fees/payments use ON DELETE CASCADE,
// so deleting a student also removes their allocation, fee and payment rows.
// If the student currently occupies a room, we free that room first.
exports.deleteStudent = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const { id } = req.params;
    await connection.beginTransaction();

    const [activeAllocs] = await connection.query(
      "SELECT room_id FROM allocations WHERE student_id = ? AND status = 'Active'",
      [id],
    );
    for (const alloc of activeAllocs) {
      await connection.query(
        "UPDATE rooms SET occupied = occupied - 1 WHERE id = ?",
        [alloc.room_id],
      );
      await connection.query(
        "UPDATE rooms SET status = IF(occupied >= capacity, 'Full', 'Available') WHERE id = ?",
        [alloc.room_id],
      );
    }

    const [result] = await connection.query(
      "DELETE FROM students WHERE id = ?",
      [id],
    );
    if (result.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({ message: "Student not found" });
    }

    await connection.commit();
    res.json({ message: "Student deleted successfully" });
  } catch (err) {
    await connection.rollback();
    console.error(err);
    res
      .status(500)
      .json({ message: "Failed to delete student", error: err.message });
  } finally {
    connection.release();
  }
};
