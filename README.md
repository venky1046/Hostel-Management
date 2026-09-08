# Hostel Management System

A full-stack college hostel management web app: student records, room allocation,
room availability, fee management, payments, and a live admin dashboard — all backed
by MySQL through a Node.js/Express REST API.

## Tech Stack

- **Frontend:** HTML5, CSS3, vanilla JavaScript, Bootstrap 5, Font Awesome, Chart.js
- **Backend:** Node.js, Express.js
- **Database:** MySQL (via `mysql2`)
- **Other:** dotenv, cors

## Project Structure

```
hostel-management-system/
├── client/            # Frontend (served statically by Express)
│   ├── css/style.css
│   ├── js/            # common.js + one file per page
│   └── *.html          # login, dashboard, students, rooms, allocation, fees, payments
├── server/            # Backend
│   ├── config/db.js    # MySQL connection pool
│   ├── controllers/    # Business logic per resource
│   ├── routes/         # Express route definitions
│   ├── .env             # DB credentials (edit this)
│   ├── package.json
│   └── server.js        # App entry point
└── database/
    └── hostel_management.sql   # Full schema + sample data
```

## 1. Install prerequisites

- Node.js v18+ (`node -v`)
- MySQL Server 8.x
- MySQL Workbench (recommended, for running the SQL script)

## 2. Set up the database

1. Open **MySQL Workbench**, connect to your local MySQL instance.
2. **File → Open SQL Script** → select `database/hostel_management.sql`.
3. Click the ⚡ **Execute** icon (or `Ctrl+Shift+Enter`).
4. Refresh **Schemas** — you should see `hostel_management` with 5 tables and sample data.

## 3. Configure and run the backend

```bash
cd server
npm install
```

Edit `server/.env` and put your real MySQL root password in `DB_PASSWORD`:

```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_actual_mysql_password
DB_NAME=hostel_management
PORT=5000
```

Start the server:

```bash
npm run dev     # auto-restarts on changes (nodemon)
# or
npm start       # plain node
```

You should see:

```
🚀 Hostel Management server running at http://localhost:5000
✅ Connected to MySQL database: hostel_management
```

## 4. Open the app

The Express server also serves the frontend, so just open your browser to:

```
http://localhost:5000
```

**Demo login:** `admin` / `admin123` (this is a simple front-end-only demo login —
there's no backend authentication table in this project).

## How the data flows

```
MySQL Database  →  Node.js + Express API  →  JavaScript fetch()  →  HTML/CSS Frontend
```

- All CRUD operations (students, rooms, allocations, fees, payments) go through
  REST endpoints under `/api/...` and are persisted in MySQL.
- Room `occupied`/`status`, fee `balance`/`payment_status` are recalculated
  automatically — you never edit them directly.
- Refreshing any page re-fetches from MySQL, so nothing is hardcoded.

## Key automatic behaviors

| Action | What happens automatically |
|---|---|
| Add a student | A fee record is created based on their room preference |
| Allocate a room | Room `occupied` +1; room `status` flips to `Full` if at capacity |
| Cancel an allocation | Room `occupied` −1; room `status` flips back to `Available` |
| Record a payment | `paid_amount` increases; `balance` and `payment_status` (Pending/Partial/Paid) recompute via generated columns |
| Delete a student | Their allocation, fee, and payment rows are removed (cascading foreign keys); their room bed is freed first |

## Business rules enforced by the API

- Register numbers and room numbers must be unique.
- A student can only have one **active** room allocation at a time.
- A room can never be over-allocated beyond its capacity.
- A payment can never push `paid_amount` above `total_fee`.
- A room with active allocations can't be deleted.

## API Reference

| Resource | Endpoints |
|---|---|
| Students | `GET/POST /api/students`, `GET/PUT/DELETE /api/students/:id` |
| Rooms | `GET/POST /api/rooms`, `GET/PUT/DELETE /api/rooms/:id` |
| Allocations | `GET/POST /api/allocations`, `PUT /api/allocations/:id/cancel` |
| Fees | `GET /api/fees`, `GET /api/fees/:studentId`, `POST /api/fees/payment`, `GET /api/fees/payments/all` |
| Dashboard | `GET /api/dashboard` |

## Troubleshooting

- **"Could not connect to MySQL"** on server start → check `DB_PASSWORD` in `.env`
  matches your actual MySQL root password, and that MySQL is running.
- **Login loops back to login.html** → the demo login stores a flag in
  `localStorage`; make sure your browser isn't blocking it.
- **CORS errors** → shouldn't happen if you open the app via `http://localhost:5000`
  (served by Express itself) rather than opening the HTML files directly from disk.
