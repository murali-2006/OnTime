# ONTIME — College Late-Arrival & Fine Management System

> Professional, full-stack, responsive web application for automated college late-arrival tracking, student ID barcode scanning, configurable rules-based fine calculation, and secure online fine payments.

---

## 1. Overview & Workflow

**OnTime** addresses gate attendance enforcement and transparent fine management in academic institutions. Instead of manual paper slips or ad-hoc cash registers, OnTime implements an automated end-to-end digital lifecycle:

```mermaid
graph TD
    A[Student Arrives at College Gate] --> B[Gate Staff Scans ID Card Barcode]
    B --> C[PostgreSQL Retrieves Student By ID Code]
    C --> D[Backend Server Evaluates Server Time vs Reporting Time]
    D --> E{Is Student Late?}
    E -- No (On Time) --> F[Record Arrival with Fine = ₹0]
    E -- Yes (Late) --> G[Match Active Fine Rule Bracket]
    G --> H[Staff Previews Details & Clicks 'Confirm Entry']
    H --> I[Late Record Saved with Status PENDING]
    I --> J[Student Logs into Portal & Views Pending Fine]
    J --> K[Student Initiates Online Payment]
    K --> L[Backend Cryptographically Verifies HMAC Signature]
    L --> M[Fine Status Becomes PAID]
    M --> N[Student Downloads Official Verified Receipt]
```

---

## 2. Technology Stack

- **Frontend:**
  - React 18
  - Vite (high-performance bundler)
  - React Router DOM v6
  - Vanilla CSS (custom design system with glassmorphism, HSL color tokens, dark mode, responsive breakpoints)
  - Axios with JWT bearer interceptors and centralized error handling
  - Pure SVG vector barcode generator (Code 39 standard)
  - HTML5 Camera Barcode Scanner (using `BarcodeDetector` API & WebRTC stream with fallback manual test simulator)
  - Lucide React icons
- **Backend:**
  - Node.js & Express.js
  - RESTful modular architecture (controllers, routes, services, middleware, validators)
  - PostgreSQL database with native `pg` connection pool
  - Password hashing with `bcryptjs`
  - Stateless authentication with `jsonwebtoken` (JWT)
  - Payment gateway signature verification with Node.js `crypto` HMAC-SHA256
- **Database:**
  - PostgreSQL with primary keys, foreign key constraints, indexes, and triggers

---

## 3. Project Structure

```
OnTime/
├── backend/
│   ├── src/
│   │   ├── config/             # Centralized environment configuration
│   │   │   └── index.js
│   │   ├── controllers/        # Business logic controllers
│   │   │   ├── adminController.js
│   │   │   ├── authController.js
│   │   │   ├── lateRecordController.js
│   │   │   ├── paymentController.js
│   │   │   ├── scanController.js
│   │   │   ├── studentController.js
│   │   │   └── studentPortalController.js
│   │   ├── db/                 # PostgreSQL pool and migration/seed scripts
│   │   │   ├── index.js
│   │   │   ├── migrate.js
│   │   │   └── seed.js
│   │   ├── middleware/         # Security & error middlewares
│   │   │   ├── authMiddleware.js
│   │   │   ├── errorMiddleware.js
│   │   │   └── roleMiddleware.js
│   │   ├── routes/             # Express API routes
│   │   │   ├── adminRoutes.js
│   │   │   ├── authRoutes.js
│   │   │   ├── lateRecordRoutes.js
│   │   │   ├── paymentRoutes.js
│   │   │   ├── scanRoutes.js
│   │   │   ├── studentPortalRoutes.js
│   │   │   └── studentRoutes.js
│   │   ├── services/           # Calculation & payment verification services
│   │   │   ├── fineService.js
│   │   │   └── paymentService.js
│   │   ├── validators/         # Input validation & overlap prevention
│   │   │   ├── authValidator.js
│   │   │   ├── fineRuleValidator.js
│   │   │   ├── scanValidator.js
│   │   │   └── studentValidator.js
│   │   └── server.js           # Server entry point
│   ├── .env.example
│   ├── .env
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/         # Reusable UI components
│   │   │   ├── Badge.jsx
│   │   │   ├── BarcodeRenderer.jsx
│   │   │   ├── CameraScanner.jsx
│   │   │   ├── Modal.jsx
│   │   │   ├── Navbar.jsx
│   │   │   ├── ProtectedRoute.jsx
│   │   │   ├── Sidebar.jsx
│   │   │   ├── StatCard.jsx
│   │   │   └── Toast.jsx
│   │   ├── context/            # AuthContext provider
│   │   │   └── AuthContext.jsx
│   │   ├── pages/              # Portal pages
│   │   │   ├── admin/
│   │   │   │   ├── AdminDashboard.jsx
│   │   │   │   ├── FineRulesManagement.jsx
│   │   │   │   ├── LateRecordsManagement.jsx
│   │   │   │   ├── PaymentsManagement.jsx
│   │   │   │   ├── SettingsPage.jsx
│   │   │   │   └── StudentsManagement.jsx
│   │   │   ├── staff/
│   │   │   │   ├── ScanPage.jsx
│   │   │   │   ├── StaffDashboard.jsx
│   │   │   │   └── StaffLateRecords.jsx
│   │   │   ├── student/
│   │   │   │   ├── PaymentReceipt.jsx
│   │   │   │   ├── StudentDashboard.jsx
│   │   │   │   ├── StudentFines.jsx
│   │   │   │   ├── StudentPayments.jsx
│   │   │   │   └── StudentProfile.jsx
│   │   │   ├── LandingPage.jsx
│   │   │   └── LoginPage.jsx
│   │   ├── services/           # Centralized API service
│   │   │   └── api.js
│   │   ├── App.jsx             # Main router
│   │   ├── index.css           # Global design system
│   │   └── main.jsx            # React root mount
│   ├── .env.example
│   ├── .env
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
│
├── database/
│   ├── schema.sql              # PostgreSQL DDL
│   └── seed.sql                # Initial data & accounts
├── .gitignore
└── README.md
```

---

## 4. User Roles & Permissions

| Role | Access Scope | Capabilities |
| :--- | :--- | :--- |
| **ADMIN** | System-wide (`/admin/*`) | View institution analytics; enroll/edit/deactivate students; configure college reporting baseline time; define dynamic fine bracket rules (with interval overlap prevention); audit late logs; audit payment transactions. |
| **STAFF** | Entry Gate (`/staff/*`) | Operate camera barcode scanner; identify students; view server-calculated late duration & fine preview; confirm entry records; view today's scans log. |
| **STUDENT** | Self-Service (`/student/*`) | View digital student ID badge with scannable barcode; monitor gate arrival history; view pending late fines; initiate secure online payment; view payment history; print official payment receipt. |

---

## 5. Development & Demo Accounts

Pre-seeded accounts available for testing:

| Role | Email | Password | Identifier / Barcode |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin@ontime.college` | `Admin@123` | N/A |
| **Attendance Staff** | `staff@ontime.college` | `Staff@123` | Employee ID: `EMP202401` |
| **Student (John Doe)** | `stu001@ontime.college` | `Student@123` | Barcode Code: `STU001` (Reg: `REG2023001`) |
| **Student (Jane Smith)** | `stu002@ontime.college` | `Student@123` | Barcode Code: `STU002` (Reg: `REG2023002`) |
| **Student (Alex Kumar)** | `stu003@ontime.college` | `Student@123` | Barcode Code: `STU003` (Reg: `REG2023003`) |

> **Note:** The homepage (`/`) and login page (`/login`) include 1-click demo buttons that immediately sign in with any of these accounts.

---

## 6. Installation & Setup

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- [PostgreSQL](https://www.postgresql.org/) (v14 or higher)

### Step 1: Database Setup
1. Create a PostgreSQL database named `ontime_db`:
   ```bash
   psql -U postgres
   CREATE DATABASE ontime_db;
   \q
   ```
2. Run database migration and seed:
   ```bash
   # From root directory:
   cd backend
   npm install
   npm run migrate
   npm run seed
   ```
   *Alternatively, load the SQL files directly using psql:*
   ```bash
   psql -U postgres -d ontime_db -f ../database/schema.sql
   psql -U postgres -d ontime_db -f ../database/seed.sql
   ```

### Step 2: Configure Environment Variables
- In `backend/.env`:
  ```env
  PORT=5000
  NODE_ENV=development
  DATABASE_URL=postgres://postgres:postgres@localhost:5432/ontime_db
  JWT_SECRET=ontime_college_super_secure_jwt_secret_key_2026_dev
  JWT_EXPIRES_IN=7d
  PAYMENT_MODE=test
  PAYMENT_KEY_ID=rzp_test_college_ontime_key_1234
  PAYMENT_KEY_SECRET=rzp_test_secret_college_ontime_9876
  FRONTEND_URL=http://localhost:5173
  ```

- In `frontend/.env`:
  ```env
  VITE_API_URL=http://localhost:5000/api
  ```

### Step 3: Run the Application

1. **Start the Backend API Server:**
   ```bash
   cd backend
   npm run dev
   ```
   *Backend starts on `http://localhost:5000` with health check at `http://localhost:5000/api/health`.*

2. **Start the Frontend Client:**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   *Frontend starts on `http://localhost:5173`.*

---

## 7. Key Business Logic Implementations

### Accurate Server-Side Late Calculation
The arrival timestamp is obtained strictly from server time upon scanning at the gate:
- Baseline reporting time is queried dynamically from `college_settings` (e.g. `09:00:00`).
- If `arrival_time <= reporting_time`, late minutes = 0, fine = ₹0, status = `WAIVED`.
- If `arrival_time > reporting_time`, the system evaluates the difference in minutes against active `fine_rules` brackets:
  - 1–10 minutes → ₹10
  - 11–20 minutes → ₹20
  - 21–30 minutes → ₹30
  - 31–60 minutes → ₹50
  - 61+ minutes → ₹100
- Overlapping active fine rules are strictly blocked at validation time.

### Duplicate Scan Protection
- Both the application controller and PostgreSQL enforce duplicate prevention via unique constraints:
  `CONSTRAINT uq_student_date UNIQUE (student_id, date)`.
- If a student is scanned twice on the same day, the scanner responds with:
  *"Today's arrival has already been recorded for this student."* and prevents duplicate fine records.

### Mandatory Staff Confirmation
Per system requirements, scanning an ID does **not** instantly insert a fine record. The staff officer inspects the student details and late calculations first, and must click **Confirm Entry** to commit the record to PostgreSQL.

### Cryptographic Payment Verification
- The frontend never marks a fine as `PAID`.
- When a student settles a fine, the backend creates an authenticated order.
- Upon completion, the backend verifies the cryptographic HMAC SHA-256 signature using `PAYMENT_KEY_SECRET`.
- Only after successful server signature verification is the payment status set to `SUCCESS` and the late record marked as `PAID` inside an atomic transaction.

---

## 8. License
MIT License. Developed for college late-arrival and automated fine management demonstration.
