# ResolveAI

<div align="center">
  <img src="https://img.icons8.com/color/96/000000/bot.png" alt="ResolveAI Logo" width="100" />
  <h1>🤖 ResolveAI</h1>
  <p><strong>Enterprise-grade AI customer support platform for modern SaaS businesses</strong></p>

  [![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react)](https://reactjs.org/)
  [![Node.js](https://img.shields.io/badge/Node.js-Express-339933?style=for-the-badge&logo=nodedotjs)](https://nodejs.org/)
  [![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=for-the-badge&logo=mongodb)](https://www.mongodb.com/)
  [![Redis](https://img.shields.io/badge/Redis-Cache-DC382D?style=for-the-badge&logo=redis)](https://redis.io/)
  [![Socket.io](https://img.shields.io/badge/Socket.io-Realtime-010101?style=for-the-badge&logo=socketdotio)](https://socket.io/)
</div>

---

## Overview

ResolveAI is a full-stack, AI-powered customer support platform designed to help organizations deliver instant, intelligent, and human-assisted support experiences across web and chat channels. It combines a real-time support dashboard, an embeddable widget, AI-driven ticket resolution, and analytics into a single cohesive SaaS workflow.

The platform is built to support:
- automated first-response support using AI
- seamless escalation to human agents
- ticket and conversation lifecycle management
- analytics-driven operational visibility
- multi-tenant SaaS onboarding and team collaboration

---

## Key Features

### Customer Experience
- Real-time chat widget for websites and customer portals
- AI-first response handling with grounded knowledge-base context
- Automatic escalation to human agents when confidence is low
- Conversation memory and contextual support
- Support for contact-form intake and chat-based ticket creation

### Operations & Team Management
- Admin and agent dashboards for ticket resolution
- Team member invitation and role-based access
- Conversation ownership and takeover workflows
- Internal notes and ticket-level collaboration
- Email notifications for escalations and ticket updates

### Intelligence & Analytics
- AI-powered training content ingestion from URLs and manual content
- Dashboard metrics such as tickets, resolution rates, response times, and status trends
- Sentiment, category, and agent performance insights
- Redis-backed caching for improved performance and lower latency

---

## Tech Stack

| Layer | Technologies |
| --- | --- |
| Frontend | React 19, Vite, React Router, Socket.IO Client, Framer Motion, GSAP, Recharts |
| Backend | Node.js, Express.js, Socket.IO, JWT, Helmet, CORS, Express Rate Limit |
| Database | MongoDB with Mongoose |
| Cache & Session Layer | Redis via ioredis |
| AI Services | Google Gemini with Mistral fallback support |
| Email & Notifications | Nodemailer |
| Deployment | Vercel for frontend, Render/Railway/DigitalOcean for backend, MongoDB Atlas + Redis cloud |

---

## Project Structure

```text
resolve_ai/
├── backend/
│   ├── config/               # DB, Redis, and environment configuration
│   ├── controllers/          # Auth, chat, widget, analytics, AI, ticket logic
│   ├── middleware/           # Auth, validation, rate limiting
│   ├── models/               # Mongoose schemas for users, tickets, conversations, messages
│   ├── routes/               # REST API route definitions
│   ├── services/             # AI, crawler, email, assignment services
│   ├── sockets/              # Socket.IO event handling
│   └── server.js             # Application entry point
├── frontend/
│   ├── public/               # Static assets and widget bundle
│   ├── src/
│   │   ├── context/          # Auth and Socket state providers
│   │   ├── layouts/          # Layout containers and dashboard shell
│   │   ├── pages/            # Landing, login, dashboard, tickets, analytics, settings
│   │   ├── services/         # API integration layer
│   │   └── App.jsx           # Route configuration
│   └── package.json
├── architecture.md           # System design and architecture notes
├── Plan.md                   # Product implementation plan
└── README.md                 # Project documentation
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- MongoDB instance or MongoDB Atlas
- Redis instance or managed Redis service
- API credentials for Gemini or Mistral

### Installation

```bash
git clone <repository-url>
cd resolve_ai

cd backend
npm install

cd ../frontend
npm install
```

### Environment Variables

Create environment files for both backend and frontend as needed.

Backend example:

```env
PORT=5000
MONGODB_URI=your_mongodb_uri
REDIS_URL=your_redis_url
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_secret
GEMINI_API_KEY=your_gemini_key
MISTRAL_API_KEY=your_mistral_key
FRONTEND_URL=http://localhost:5173
```

### Run Locally

Terminal 1:

```bash
cd backend
npm run dev
```

Terminal 2:

```bash
cd frontend
npm run dev
```

Application URLs:
- Frontend: http://localhost:5173
- Backend API: http://localhost:5000

---

## API Documentation

Base URL: http://localhost:5000/api

### Authentication

| Method | Endpoint | Description |
| --- | --- | --- |
| POST | /auth/register | Register a new organization owner |
| POST | /auth/login | Authenticate user and return JWT |
| GET | /auth/me | Fetch authenticated user profile |
| POST | /auth/refresh | Refresh access token |
| POST | /auth/invite | Invite team member to organization |

### Organization

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | /organization | Fetch current organization details |
| PUT | /organization | Update organization settings |
| GET | /organization/members | List organization members |
| PUT | /organization/members/:memberId | Update team member role |
| DELETE | /organization/members/:memberId | Remove team member |
| GET | /organization/widget/:slug | Fetch widget configuration |
| GET | /organization/email/status | Check email configuration status |
| POST | /organization/email/test | Send a test email |

### Tickets & Conversations

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | /tickets | List tickets for the authenticated organization |
| GET | /tickets/stats | Fetch ticket statistics |
| GET | /tickets/:id | Get a single ticket |
| POST | /tickets | Create a new ticket |
| PUT | /tickets/:id | Update ticket status, priority, or owner |
| POST | /tickets/:id/notes | Add an internal note |
| GET | /tickets/:id/ai-summary | Generate an AI-powered summary |
| GET | /chat | List conversations |
| GET | /chat/:id/messages | Fetch conversation history |
| POST | /chat/:id/messages | Send a new message |
| POST | /chat/:id/takeover | Take over a conversation |
| POST | /chat/:id/resolve | Resolve a conversation |

### Analytics & AI Training

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | /analytics/dashboard | Fetch dashboard analytics |
| GET | /analytics/detailed | Fetch detailed and segmented analytics |
| GET | /training | List training data |
| POST | /training | Add training content manually |
| PUT | /training/:id | Update training entry |
| DELETE | /training/:id | Delete training entry |
| POST | /training/crawl | Crawl a website for knowledge-base ingestion |
| POST | /training/test | Test AI responses using current context |

### Widget Endpoints

| Method | Endpoint | Description |
| --- | --- | --- |
| POST | /widget/start | Start a widget-based conversation |
| POST | /widget/message | Send a message through the widget |
| POST | /widget/contact | Submit a contact form message |

### Health

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | /health | Health check endpoint |

---

## Deployment

### Recommended Production Setup
- Frontend: Deploy the React app on Vercel or Netlify
- Backend: Deploy the Express service on Render, Railway, Fly.io, or AWS ECS
- Database: Use MongoDB Atlas for managed NoSQL storage
- Cache: Use Redis Cloud or Upstash for session and query caching
- File and asset delivery: Use a CDN for static assets where needed

### Production Checklist
- Configure environment variables securely
- Enable HTTPS and domain-based CORS rules
- Set up structured logging and alerts
- Use rate limiting and API protection middleware
- Configure backups, monitoring, and autoscaling policies

---

## Scaling for Millions of Users

To support very large traffic volumes, the architecture should evolve from a single-service deployment to a horizontally scalable platform.

### Recommended Scale Strategy
- Deploy the backend behind a load balancer with multiple stateless instances
- Use Redis Cluster for distributed caching and session coordination
- Move AI inference and long-running workflows to background workers or queues
- Introduce message brokers such as RabbitMQ or Kafka for decoupling real-time events and AI tasks
- Use MongoDB sharding and index optimization for large datasets and high write throughput
- Separate read-heavy workloads using read replicas or aggregated analytics pipelines
- Use WebSocket gateway clustering for real-time chat at scale
- Add observability with OpenTelemetry, Prometheus, Grafana, and centralized logging

### Architectural Improvements for Scale
- Introduce an API gateway for authentication, routing, throttling, and request tracing
- Adopt containerization with Docker and orchestration using Kubernetes or ECS
- Add edge caching and CDN support for static frontend assets
- Implement asynchronous AI processing for knowledge ingestion and summarization
- Use database connection pooling and request batching for high concurrency
- Introduce tenant-aware partitioning for multi-organization workloads

---

## Contributing

Contributions are welcome. Please follow a clean, maintainable development workflow:

1. Fork the repository
2. Create a feature branch
3. Commit your changes with clear messages
4. Open a pull request with a detailed summary

---

<div align="center">
  <p><strong>Built with precision, scalability, and AI-first product thinking.</strong></p>
</div>
