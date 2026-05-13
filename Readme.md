# PR Warehouse Security - Backend

A scalable Node.js backend powering the PR Warehouse Security Platform with Multi-Tenant Architecture, Role-Based Access Control (RBAC), Firebase Realtime Database integration, WebSocket communication, and centralized tenant management.

---

# 🚀 Tech Stack

- Node.js
- Express.js
- Firebase Admin SDK
- Firebase Realtime Database
- WebSockets
- Render Deployment
- REST APIs
- RBAC Authorization Middleware

---

# 📦 Project Setup

## 1. Clone Repository

```bash
git clone https://github.com/Atharva759/PR-Backend
cd PR-Backend
```

---

## 2. Install Dependencies

```bash
npm install
```

---

# 🔐 Environment Variables Setup

Create a `.env` file in the root directory.

```env
FIREBASE_DB_URL="<YOUR_FIREBASE_REALTIME_DATABASE_URL>"

FIREBASE_SERVICE_ACCOUNT='{"type":"service_account","project_id":"your-project-id","private_key_id":"your-private-key-id","private_key":"-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY\n-----END PRIVATE KEY-----\n","client_email":"firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com","client_id":"xxxxxxxxxxxxxxxx","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-xxxxx%40your-project.iam.gserviceaccount.com","universe_domain":"googleapis.com"}'
```

---

# 🔥 Firebase Admin SDK Setup

Create a file:

```bash
config/firebase.js
```

Add the following configuration:

```javascript
const admin = require("firebase-admin");

const serviceAccount = JSON.parse(
  process.env.FIREBASE_SERVICE_ACCOUNT
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DB_URL,
});

const db = admin.database();

module.exports = {
  admin,
  db,
};
```

---

# 📁 Recommended Project Structure

```bash
project-root/
│
├── config/
│   └── firebase.js
│
├── controllers/
│
├── middleware/
│
├── routes/
│
├── services/
│
├── websocket/
│
├── server.js
│
├── package.json
└── .env
```

---

# 👥 Role-Based Access Control (RBAC)

The backend supports hierarchical system access:

| Role | Permissions |
|---|---|
| Super Admin | Full system access |
| Tenant Admin | Manage tenant facilities, devices, and users |
| Facility Admin | Manage facility-level devices |
| User | Read-only access to assigned resources |

---

# 🏢 Multi-Tenant Architecture

The platform supports:

- Multiple Tenants
- Multiple Facilities per Tenant
- Centralized Tenant Management
- Device Registry Management
- Facility-Level Isolation
- Secure Role-Based Authorization

---

# ⚡ Features

- Secure REST APIs
- Firebase Realtime Database Integration
- WebSocket Device Communication
- Multi-Tenant Access Control
- Role-Based Middleware Authorization
- Live Device Monitoring
- Tenant Management Dashboard APIs
- Facility & Device Registry APIs

---

# 🌐 WebSocket Support

The backend includes WebSocket services for:

- Real-time telemetry
- Device communication
- Live dashboard updates
- Instant device status changes
- Real-time monitoring events

Example WebSocket folder:

```bash
websocket/
└── device.socket.js
```

---

# 🔐 Middleware Features

The middleware layer supports:

- JWT/Firebase Token Verification
- Role Validation
- Tenant Isolation
- Facility Access Validation
- Request Authentication
- API Security

Example middleware structure:

```bash
middleware/
├── auth.middleware.js
└── rbac.middleware.js
```

---

# 🚀 Running the Project

## Development Mode

```bash
npm run dev
```

---

## Production Mode

```bash
npm start
```

---

# 🌍 API Architecture

The backend follows a modular API structure:

```bash
routes/
├── device.routes.js
├── facility.routes.js
├── monitor.routes.js
├── tenant.routes.js
└── user.routes.js
```

Controllers handle business logic separately from routes for better scalability and maintainability.

---

# ☁️ Deployment

Recommended Deployment Platform:

- Backend → Render
- Database → Firebase Realtime Database
- Authentication → Firebase Admin SDK

---

# 🔐 Security Notes

- Never expose service account credentials publicly
- Keep `.env` file private
- Use HTTPS and WSS in production
- Implement proper RBAC checks
- Validate all API requests
- Restrict Firebase Admin permissions

