# OfficeLink — Internal Air-Gapped Company Communication & File Transfer Platform

**OfficeLink** is a self-hosted internal communication and file-transfer application designed for office environments connected over a local network (LAN) where internet access is unavailable or restricted.

---

## Key Features

- 🔒 **100% Air-Gapped & Offline Operation**: Zero reliance on external CDNs, internet APIs, or cloud services.
- 💬 **Real-Time Messaging**: Socket.IO powered 1-on-1 and Group chats with typing indicators, read receipts, and unread badges.
- 📁 **Chunked LAN File Transfer**: Transfer files up to several GBs with real-time upload progress bars, checksums, and strict permission verification (`403 Forbidden` for unauthorized downloads).
- 📹 **WebRTC Audio & Video Calls**: 1-on-1 peer-to-peer calls with camera toggle, microphone mute, and screen sharing.
- 🎤 **In-App Voice Messages**: Browser MediaRecorder audio recording and interactive waveform playback.
- 🛡️ **Admin Suite & Audit Logs**: Dashboard stats (storage MB used, online users count), employee management, department manager, security audit logging, and one-click database snapshot backups.

---

## Quick Start (Development)

### 1. Backend Setup
```bash
cd backend
npm install
npm run seed    # Seeds default demo employees & departments
npm run dev     # Starts backend on http://0.0.0.0:5000
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev     # Starts frontend on http://0.0.0.0:5173
```

---

## Production LAN Docker Deployment (`192.168.0.26`)

Deploy all services (MongoDB, Redis, Node.js Backend, React Frontend) on the local office PC (`192.168.0.26`):

```bash
docker compose up --build -d
```

Employees can then open their browsers to:
`http://192.168.0.26`

The frontend is served through nginx and proxies `/api` and `/socket.io` to the backend automatically, so all machines on the local network can access the same app without changing the browser URL.

---

## Default Seeded Employee Test Accounts

| Role | Employee ID | Password | Full Name | Department |
| :--- | :--- | :--- | :--- | :--- |
| **ADMIN** | `EMP001` | `Admin@123` | System Admin | Management |
| **EMPLOYEE** | `EMP102` | `Pass@123` | Rahul Sharma | Development |
| **EMPLOYEE** | `EMP103` | `Pass@123` | Aman Kumar | Development |
| **EMPLOYEE** | `EMP104` | `Pass@123` | Priya Singh | Testing & QA |
| **EMPLOYEE** | `EMP105` | `Pass@123` | Herish Patel | HR |
