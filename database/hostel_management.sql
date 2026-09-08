-- ============================================================
-- HOSTEL MANAGEMENT SYSTEM - DATABASE SCHEMA
-- ============================================================
-- How to use this file (MySQL Workbench):
-- 1. Open MySQL Workbench and connect to your local MySQL server.
-- 2. Open this file: File -> Open SQL Script -> select hostel_management.sql
-- 3. Click the lightning bolt icon (Execute the entire script) or press Ctrl+Shift+Enter.
-- 4. Refresh the "SCHEMAS" panel on the left. You should see "hostel_management" appear.
-- ============================================================

-- Create the database and switch to it
CREATE DATABASE IF NOT EXISTS hostel_management;
USE hostel_management;

-- ------------------------------------------------------------
-- TABLE 1: students
-- ------------------------------------------------------------
CREATE TABLE students (
    id                INT AUTO_INCREMENT PRIMARY KEY,
    register_no       VARCHAR(20)  NOT NULL UNIQUE,
    student_name      VARCHAR(100) NOT NULL,
    gender            ENUM('Male', 'Female', 'Other') NOT NULL,
    department        VARCHAR(50)  NOT NULL,
    year              INT          NOT NULL,
    mobile            VARCHAR(15)  NOT NULL,
    parent_mobile     VARCHAR(15),
    email             VARCHAR(100),
    address           TEXT,
    reservation_7_5    BOOLEAN DEFAULT FALSE,
    room_preference   ENUM('Normal4', 'Normal2', 'NRI2') NOT NULL,
    created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------
-- TABLE 2: rooms
-- ------------------------------------------------------------
CREATE TABLE rooms (
    id             INT AUTO_INCREMENT PRIMARY KEY,
    room_number    VARCHAR(10) NOT NULL UNIQUE,
    room_type      ENUM('Normal4', 'Normal2', 'NRI2') NOT NULL,
    capacity       INT NOT NULL,
    occupied       INT NOT NULL DEFAULT 0,
    bathroom_type  ENUM('Common', 'Attached') NOT NULL,
    ac_available   BOOLEAN NOT NULL DEFAULT FALSE,
    fee            DECIMAL(10,2) NOT NULL,
    status         ENUM('Available', 'Full', 'Maintenance') NOT NULL DEFAULT 'Available',
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------
-- TABLE 3: allocations
-- ------------------------------------------------------------
CREATE TABLE allocations (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    student_id      INT NOT NULL,
    room_id         INT NOT NULL,
    allocated_date  DATE NOT NULL DEFAULT (CURRENT_DATE),
    status          ENUM('Active', 'Cancelled') NOT NULL DEFAULT 'Active',
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- TABLE 4: fees
-- balance and payment_status are GENERATED (computed automatically
-- by MySQL every time total_fee or paid_amount changes -- no extra
-- code needed on our side).
-- ------------------------------------------------------------
CREATE TABLE fees (
    id                INT AUTO_INCREMENT PRIMARY KEY,
    student_id        INT NOT NULL,
    total_fee         DECIMAL(10,2) NOT NULL,
    paid_amount       DECIMAL(10,2) NOT NULL DEFAULT 0,
    balance           DECIMAL(10,2) GENERATED ALWAYS AS (total_fee - paid_amount) STORED,
    payment_status    VARCHAR(10) GENERATED ALWAYS AS (
                          CASE
                              WHEN paid_amount <= 0 THEN 'Pending'
                              WHEN paid_amount >= total_fee THEN 'Paid'
                              ELSE 'Partial'
                          END
                      ) STORED,
    last_payment_date DATE NULL,
    created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- TABLE 5: payments
-- ------------------------------------------------------------
CREATE TABLE payments (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    student_id      INT NOT NULL,
    fee_id          INT NOT NULL,
    amount          DECIMAL(10,2) NOT NULL,
    payment_date    DATE NOT NULL DEFAULT (CURRENT_DATE),
    payment_method  ENUM('Cash', 'UPI', 'Bank Transfer', 'Card') NOT NULL,
    transaction_id  VARCHAR(100),
    remarks         VARCHAR(255),
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (fee_id) REFERENCES fees(id) ON DELETE CASCADE
);

-- ============================================================
-- SAMPLE DATA (for testing only -- NOT used by the final app logic)
-- ============================================================

-- 5 Normal4 rooms: capacity 4, common bathroom, no AC, fee 100000
INSERT INTO rooms (room_number, room_type, capacity, occupied, bathroom_type, ac_available, fee, status) VALUES
('101', 'Normal4', 4, 0, 'Common', FALSE, 100000, 'Available'),
('102', 'Normal4', 4, 0, 'Common', FALSE, 100000, 'Available'),
('103', 'Normal4', 4, 0, 'Common', FALSE, 100000, 'Available'),
('104', 'Normal4', 4, 0, 'Common', FALSE, 100000, 'Available'),
('105', 'Normal4', 4, 0, 'Common', FALSE, 100000, 'Available');

-- 5 Normal2 rooms: capacity 2, attached bathroom, no AC, fee 120000
INSERT INTO rooms (room_number, room_type, capacity, occupied, bathroom_type, ac_available, fee, status) VALUES
('201', 'Normal2', 2, 0, 'Attached', FALSE, 120000, 'Available'),
('202', 'Normal2', 2, 0, 'Attached', FALSE, 120000, 'Available'),
('203', 'Normal2', 2, 0, 'Attached', FALSE, 120000, 'Available'),
('204', 'Normal2', 2, 0, 'Attached', FALSE, 120000, 'Available'),
('205', 'Normal2', 2, 0, 'Attached', FALSE, 120000, 'Available');

-- 5 NRI2 rooms: capacity 2, attached bathroom, AC, fee 140000
INSERT INTO rooms (room_number, room_type, capacity, occupied, bathroom_type, ac_available, fee, status) VALUES
('301', 'NRI2', 2, 0, 'Attached', TRUE, 140000, 'Available'),
('302', 'NRI2', 2, 0, 'Attached', TRUE, 140000, 'Available'),
('303', 'NRI2', 2, 0, 'Attached', TRUE, 140000, 'Available'),
('304', 'NRI2', 2, 0, 'Attached', TRUE, 140000, 'Available'),
('305', 'NRI2', 2, 0, 'Attached', TRUE, 140000, 'Available');

-- 2 sample students (just for testing the API/frontend later)
INSERT INTO students (register_no, student_name, gender, department, year, mobile, parent_mobile, email, address, reservation_7_5, room_preference) VALUES
('CS2023001', 'Arun Kumar', 'Male', 'CSE', 2, '9876543210', '9876500000', 'arun@example.com', 'Chennai, Tamil Nadu', FALSE, 'Normal4'),
('EC2023002', 'Divya Sri', 'Female', 'ECE', 1, '9876512345', '9876511111', 'divya@example.com', 'Madurai, Tamil Nadu', TRUE, 'Normal2');

-- A fee record is normally auto-created by the backend when a student is
-- added (Step 1 covers the database only, so we insert it manually here
-- just so the fees table has something to look at).
INSERT INTO fees (student_id, total_fee, paid_amount) VALUES
(1, 100000, 0),
(2, 120000, 40000);

-- Quick check queries you can run to confirm everything loaded correctly:
-- SELECT * FROM students;
-- SELECT * FROM rooms;
-- SELECT * FROM fees;
