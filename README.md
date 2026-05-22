<div align="center">
  <img src="https://img.icons8.com/color/96/000000/bot.png" alt="ResolveAI Logo" width="100"/>
  <h1>🤖 ResolveAI</h1>
  <p><strong>Next-Generation AI-Powered Customer Support SaaS</strong></p>

  [![React](https://img.shields.io/badge/React-19-blue.svg?style=for-the-badge&logo=react)](https://reactjs.org/)
  [![Node.js](https://img.shields.io/badge/Node.js-Backend-green.svg?style=for-the-badge&logo=nodedotjs)](https://nodejs.org/)
  [![MongoDB](https://img.shields.io/badge/MongoDB-Database-47A248.svg?style=for-the-badge&logo=mongodb)](https://www.mongodb.com/)
  [![Redis](https://img.shields.io/badge/Redis-Cache-DC382D.svg?style=for-the-badge&logo=redis)](https://redis.io/)
  [![Socket.io](https://img.shields.io/badge/Socket.io-Real--Time-black.svg?style=for-the-badge&logo=socketdotio)](https://socket.io/)
</div>

---

## 🌟 Overview

**ResolveAI** is a comprehensive, full-stack customer support platform that leverages the power of advanced AI (Google Gemini) to automate support tickets, handle user inquiries in real-time, and seamlessly escalate complex issues to human agents. Designed with a premium, dynamic UI and a highly scalable backend architecture.

## ✨ Key Features

- 💬 **Real-time Communication:** Instant messaging powered by Socket.IO between users, AI agents, and human support staff.
- 🧠 **AI-Driven Automation:** Smart ticketing and query resolution using the Gemini API. The AI retains conversational memory and resolves context (e.g., coreferences) efficiently.
- ⚡ **Lightning Fast Caching:** Redis caching for fast response times and optimized database queries.
- 📊 **Analytics Dashboard:** Real-time metrics, ticketing insights, and charts using Recharts.
- 🔒 **Secure Auth & Data:** JWT-based authentication, bcrypt hashing, and helmet integration for robust API security.
- 🔄 **Automated Escalations:** Smart handoffs from AI to human agents with automated email notifications to staff.
- ⏳ **Session Management:** Intelligent 2-hour inactivity session expiry and auto-clearing history for privacy.

## 🛠️ Tech Stack

### Frontend
- **Framework:** React 19 + Vite
- **Styling:** Tailwind CSS
- **Animations:** Framer Motion & GSAP
- **Icons & Charts:** Lucide React, React Icons, Recharts
- **Real-time:** Socket.IO Client

### Backend
- **Server:** Node.js, Express.js
- **Database:** MongoDB (Mongoose)
- **Caching:** Redis (ioredis)
- **Real-time:** Socket.IO
- **AI Integration:** Google Generative AI (Gemini)
- **Utilities:** JWT, bcryptjs, Nodemailer, Multer

---

## 🚀 Getting Started

Follow these steps to run ResolveAI locally on your machine.

### Prerequisites
- [Node.js](https://nodejs.org/en/) (v18 or higher)
- [MongoDB](https://www.mongodb.com/) (Local or Atlas)
- [Redis](https://redis.io/) (Local or Upstash)

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/resolveai.git
cd resolveai
```

### 2. Install Dependencies

**For Backend:**
```bash
cd backend
npm install
```

**For Frontend:**
```bash
cd ../frontend
npm install
```

### 3. Environment Configuration

Create a `.env` file in the `backend` directory and add the following keys:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database & Cache
MONGODB_URI=your_mongodb_connection_string
REDIS_URL=your_redis_connection_string

# Authentication
JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRE=30d

# AI Integration
GEMINI_API_KEY=your_google_gemini_api_key

# Email/Nodemailer Setup (For agent notifications)
SMTP_HOST=your_smtp_host
SMTP_PORT=587
SMTP_USER=your_email@example.com
SMTP_PASS=your_email_password
```

Create a `.env` file in the `frontend` directory:
```env
VITE_API_URL=http://localhost:5000
VITE_SOCKET_URL=http://localhost:5000
```

### 4. Run the Application

You'll need two terminal windows/tabs to run both ends concurrently.

**Terminal 1 (Backend):**
```bash
cd backend
npm run dev
```

**Terminal 2 (Frontend):**
```bash
cd frontend
npm run dev
```

Your app should now be running! 
- **Frontend:** `http://localhost:5173`
- **Backend API:** `http://localhost:5000`

---

## 📂 Project Structure

```text
resolve_ai/
│
├── backend/                  # Express/Node.js Server
│   ├── controllers/          # Route controllers (auth, chat, tickets)
│   ├── models/               # Mongoose schemas (User, Message, Ticket)
│   ├── routes/               # Express API routes
│   ├── services/             # Business logic (AI service, Email service)
│   ├── socket/               # Socket.io event handlers
│   └── server.js             # Entry point
│
└── frontend/                 # React/Vite Client
    ├── src/
    │   ├── components/       # Reusable UI components
    │   ├── pages/            # Page layouts (Dashboard, Chat widget)
    │   ├── hooks/            # Custom React hooks
    │   ├── context/          # State management context
    │   └── App.jsx           # Main React component
    └── package.json
```

---

## 🌍 Deployment

ResolveAI is configured for modern cloud deployment:
- **Frontend:** Ready for [Vercel](https://vercel.com/)
- **Backend:** Optimized for [Render](https://render.com/)
- **Cache:** Configured for [Upstash (Redis)](https://upstash.com/)

Ensure that you add your `.env` variables to the respective hosting platforms before deploying.

---

## 🤝 Contributing

Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

<div align="center">
  <p>Built with ❤️ by Harish Kushwaha</p>
</div>
