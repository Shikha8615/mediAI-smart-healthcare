# 🏥 MediAI v3.0 — AI-Powered Smart Healthcare System

## ✨ Features Added in v3.0
- ✅ **MongoDB** — Persistent data storage (all users, appointments, predictions, reports)
- ✅ **JWT Authentication** — Access token (24h) + Refresh token (7d) with auto-refresh
- ✅ **Real WebRTC Video** — Peer-to-peer encrypted video via Socket.io signaling
- ✅ **HTTPS Support** — SSL/TLS in production via Node.js https module
- ✅ **Admin Portal** — Full user management, analytics, system monitoring
- ✅ **Rate Limiting** — Brute-force protection on all endpoints
- ✅ **bcryptjs** — Passwords hashed with salt rounds = 12
- ✅ **Helmet.js** — 14 HTTP security headers
- ✅ **RBAC** — Role-Based Access Control (Patient / Doctor / Admin)

---

## 📁 Project Structure

```
mediAI-full/
├── backend/
│   ├── config/
│   │   └── db.js              # MongoDB connection + admin seed
│   ├── middleware/
│   │   └── auth.js            # JWT protect + authorize + generateTokens
│   ├── models/
│   │   ├── User.js            # User schema (bcrypt pre-save hook)
│   │   ├── Appointment.js     # Appointment schema
│   │   └── Medical.js         # Prediction + Report schemas
│   ├── routes/
│   │   ├── auth.js            # Register, Login, Refresh, Logout, Me
│   │   ├── appointments.js    # CRUD appointments
│   │   ├── medical.js         # Predictions + Reports
│   │   └── admin.js           # Admin-only routes
│   ├── socket/
│   │   └── webrtc.js          # Socket.io WebRTC signaling server
│   ├── .env                   # Environment variables
│   ├── package.json
│   └── server.js              # Express + Socket.io + HTTPS server
│
├── frontend/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── App.jsx            # Complete React app (all pages + components)
│   │   └── index.js
│   └── package.json
│
└── README.md
```

---

## 🚀 Setup & Installation

### Prerequisites
- **Node.js** v16+ → https://nodejs.org
- **MongoDB** v4+ → https://mongodb.com or use MongoDB Atlas (free cloud)
- **Anthropic API Key** → https://console.anthropic.com

---

### Step 1 — Install Backend Dependencies

```bash
cd mediAI-full/backend
npm install
```

---

### Step 2 — Configure Environment Variables

Edit `backend/.env`:

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/mediAI

JWT_SECRET=mediAI_jwt_secret_change_in_production_2024
JWT_REFRESH_SECRET=mediAI_refresh_secret_change_in_production_2024
JWT_EXPIRE=24h
JWT_REFRESH_EXPIRE=7d

ADMIN_EMAIL=admin@mediai.com
ADMIN_PASSWORD=Admin@123456

ANTHROPIC_API_KEY=your_anthropic_api_key_here
FRONTEND_URL=http://localhost:3000
```

**For MongoDB Atlas (cloud):**
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/mediAI
```

---

### Step 3 — Start MongoDB (if using local)

```bash
# Windows
net start MongoDB

# Mac
brew services start mongodb-community

# Linux
sudo systemctl start mongod
```

---

### Step 4 — Start Backend Server

```bash
cd backend
npm run dev
```

Expected output:
```
✅ MongoDB Connected
✅ Admin seeded: admin@mediai.com
🚀 MediAI Server → http://localhost:5000
📡 WebRTC Socket.io ready
```

---

### Step 5 — Install & Start Frontend

```bash
cd ../frontend
npm install
npm start
```

Opens at **http://localhost:3000**

---

## 🔑 Default Login Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@mediai.com | Admin@123456 |
| Doctor | Register as Doctor | Your choice |
| Patient | Register as Patient | Your choice |

---

## 🎥 WebRTC Video Consultation

1. Patient books appointment → gets **Video Room ID** in confirmed appointment
2. Both Patient and Doctor go to **Video Consult** page
3. Enter the same **Room ID** → click **Join Room**
4. WebRTC peer connection established via Socket.io signaling
5. Real encrypted P2P video call begins

**To test locally:**
- Open two browser tabs/windows
- Login as patient in one, doctor in the other
- Use the same Room ID in both

---

## 🔒 HTTPS Setup (Production)

```bash
# Generate self-signed certificate (dev/testing)
mkdir backend/ssl
openssl req -x509 -newkey rsa:4096 -keyout backend/ssl/key.pem -out backend/ssl/cert.pem -days 365 -nodes

# Update .env
NODE_ENV=production
SSL_KEY_PATH=./ssl/key.pem
SSL_CERT_PATH=./ssl/cert.pem
```

---

## 📡 API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/auth/register | Public | Register new user |
| POST | /api/auth/login | Public | Login, get JWT tokens |
| POST | /api/auth/refresh | Public | Refresh access token |
| POST | /api/auth/logout | JWT | Logout |
| GET | /api/auth/me | JWT | Current user |
| POST | /api/appointments | Patient | Book appointment |
| GET | /api/appointments/my | Patient | My appointments |
| GET | /api/appointments/doctor | Doctor | Doctor appointments |
| PATCH | /api/appointments/:id/status | Doctor | Update status |
| PATCH | /api/appointments/:id/cancel | Patient | Cancel |
| GET | /api/appointments/all | Admin | All appointments |
| POST | /api/medical/predict | Patient | Save prediction |
| GET | /api/medical/predictions/my | Patient | My predictions |
| POST | /api/medical/reports | Doctor | Issue prescription |
| GET | /api/medical/reports/my | Patient | My reports |
| GET | /api/medical/reports/doctor | Doctor | Issued reports |
| GET | /api/admin/stats | Admin | System stats |
| GET | /api/admin/users | Admin | All users |
| PATCH | /api/admin/users/:id/toggle | Admin | Activate/deactivate |
| DELETE | /api/admin/users/:id | Admin | Delete user |
| GET | /api/admin/analytics | Admin | Analytics data |
| POST | /api/ai/predict | Any | AI proxy (Claude) |
| GET | /api/health | Public | Health check |

---

## 🌐 Deployment

### Deploy Backend (Railway / Render / Heroku)
```bash
# Set environment variables in dashboard
# MONGODB_URI = MongoDB Atlas URI
# JWT_SECRET = strong random string
# ANTHROPIC_API_KEY = your key
# FRONTEND_URL = your frontend URL
# NODE_ENV = production
```

### Deploy Frontend (Vercel / Netlify)
```bash
cd frontend
npm run build
# Upload build/ folder to Vercel/Netlify
# Set API proxy to your backend URL
```

---

## 🛡 Security Features

| Feature | Implementation |
|---------|---------------|
| Password Hashing | bcryptjs, salt=12 |
| Authentication | JWT Access (24h) + Refresh (7d) |
| Authorization | RBAC — Patient/Doctor/Admin |
| HTTP Headers | Helmet.js (14 headers) |
| Rate Limiting | 200 req/15min general, 15 req/15min auth |
| CORS | Whitelist frontend origin only |
| Input Validation | express-validator on all endpoints |
| Transport | HTTPS in production |
| WebRTC Auth | Socket.io JWT middleware |
| Data Isolation | MongoDB queries scoped to user |

---

**Made with ❤️ — MediAI v3.0 Final Year Project**
