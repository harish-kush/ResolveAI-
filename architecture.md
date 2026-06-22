# 🤖 ResolveAI: High-Level System Architecture & Design

This document details the high-level system architecture, design decisions, database layout, and interaction patterns of **ResolveAI**—a next-generation, full-stack customer support platform that integrates real-time communications with generative AI automation.

---

## 🏛️ High-Level Design (HLD) Perspectives

To fully understand ResolveAI, we look at the system from two distinct operational viewpoints: the **User (Customer) Perspective** and the **Company (SaaS Tenant) Perspective**.

---

### 1️⃣ User (Customer) Perspective HLD
This perspective describes how a customer visiting an external website interacts with the embedded chat widget.

```mermaid
graph TD
    %% Styling
    classDef browser fill:#e1f5fe,stroke:#01579b,stroke-width:2px;
    classDef server fill:#efebe9,stroke:#4e342e,stroke-width:2px;
    classDef db fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px;
    classDef ext fill:#fffde7,stroke:#f57f17,stroke-width:2px;

    %% Components
    ThirdPartySite[🌐 Company Website<br>Client Domain]:::browser
    Widget[💬 Embedded Chat Widget<br>ResolveAI JS Bundle]:::browser

    subgraph "ResolveAI Cloud Gateway"
        CORS[🔒 Dynamic CORS Guard]:::server
        SocketIO[⚡ Socket.IO Server]:::server
        Express[🚀 Express Backend]:::server
    end

    subgraph "External AI Engine"
        Gemini[🧠 Google Gemini API]:::ext
    end

    subgraph "Data Storage"
        SessionCache[(⚡ Redis Session Cache)]:::db
        Mongo[(🍃 MongoDB Database)]:::db
    end

    %% Connections
    ThirdPartySite -->|Embeds| Widget
    Widget -->|Handshake Request| CORS
    CORS -->|Verify Allowed Origins| Mongo
    
    Widget <-->|Real-time Socket Connection| SocketIO
    SocketIO <--> Express
    
    Express <-->|Fetch Org Config & History| SessionCache
    Express <-->|Persist Chat Records| Mongo
    
    Express <-->|Generate AI Response| Gemini
```

#### Key Flows for the Customer:
1.  **Widget Loading:** The widget is embedded on the company's website. The browser sends a connection request to ResolveAI.
2.  **CORS Verification:** The backend dynamically checks the HTTP `Origin` header against database records of registered organizations.
3.  **Chat Session:** The customer sends messages over WebSockets. They receive instant responses either from the **Gemini AI** (using training context) or from a **Live Agent** (if escalated).

---

### 2️⃣ Company (SaaS Tenant) Perspective HLD
This perspective shows how a registered customer support organization signs up, trains the AI, logs into the dashboard, and handles escalated tickets.

```mermaid
graph TD
    %% Styling
    classDef admin fill:#f3e5f5,stroke:#4a148c,stroke-width:2px;
    classDef server fill:#efebe9,stroke:#4e342e,stroke-width:2px;
    classDef db fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px;
    classDef ext fill:#fffde7,stroke:#f57f17,stroke-width:2px;

    %% Components
    Dashboard[📊 Admin Dashboard<br>React 19 / Vite]:::admin
    Agent[🧑‍💻 Support Agent Console]:::admin

    subgraph "ResolveAI Application Core"
        ExpressApp[🚀 Express REST API]:::server
        SocketRouter[⚡ Socket.IO Room Manager]:::server
        Crawler[🕸️ Document Web Crawler]:::server
    end

    subgraph "Notification Gateway"
        SMTP[📧 Nodemailer / SMTP Service]:::ext
    end

    subgraph "Datastores"
        DBStore[(🍃 MongoDB Atlas)]:::db
    end

    %% Connections
    Dashboard <-->|REST API Config / Auth| ExpressApp
    Dashboard <-->|Socket.IO events| SocketRouter
    
    ExpressApp -->|Initiate crawl target URL| Crawler
    Crawler -->|Extract & write training data| DBStore
    
    ExpressApp <-->|CRUD Operations / Analytics| DBStore
    ExpressApp -->|Send Escalation Alerts| SMTP
    
    SocketRouter <-->|Join org_id Room| Agent
```

#### Key Flows for the Company:
1.  **Onboarding & Configuration:** The company registers, enters their website domain, and configures brand settings.
2.  **AI Training & Ingestion:** The company inputs their documentation URLs. The backend runs the `crawlerService.js` to scrape text, saving it directly to MongoDB as training data.
3.  **Real-Time Handoff:** Agents log into the Console and join their organization's socket room. When a customer's conversation is escalated, the socket server notifies all active agents, and Nodemailer sends email alerts.
4.  **Analytics:** The dashboard aggregates conversation metrics and charts using the analytics API, reporting ticket trends.

---


## 📦 Subsystems & Architecture Components

### 1. Frontend Clients
*   **Support & Admin Dashboard (`/frontend`):** Built with React 19 and Vite. It serves as the portal for support agents to manage organizations, train AI models (by crawling websites), configure settings, view analytics charts (Recharts), and chat in real-time with customers.
*   **Embeddable Chat Widget:** A lightweight chat client injected into third-party customer websites. It handles connection establishment, session tracking, and real-time messaging.

### 2. Express.js Backend Server (`/backend`)
*   **Entry Point (`server.js`):** Bootstraps the Node.js process, establishes connections to MongoDB and Redis, configures Express middlewares (Helmet, CORS, Rate Limiters), routes endpoints, and initializes Socket.IO.
*   **Dynamic CORS Middleware:** Evaluates incoming origin domains against database organizations to allow dynamic chat widget rendering on external client websites while blocking unauthorized domains.

### 3. Real-Time Socket Layer (`backend/sockets`)
*   **SocketHandler (`socketHandler.js`):** Manages event-driven communication. Uses room partitioning to isolate conversations.
    *   *Rooms:* Customers join rooms keyed by conversation ID. Agents join rooms keyed by organization ID to monitor active tickets.
    *   *Status Shifts:* Manages transitions when the chat status shifts from `AI` (handled by Gemini) to `Agent` (escalated to humans).

### 4. AI & Integration Services (`backend/services`)
*   **AI Service (`aiService.js`):** Encapsulates the Google Generative AI (Gemini) SDK. Implements:
    *   *System Prompts:* Restricts Gemini to answering based *only* on ingested organization training data.
    *   *Context Management:* Resolves coreferences (e.g., matching "it" or "they" to products mentioned previously) and passes short-term memory back to the model.
*   **Web Crawler Service (`crawlerService.js`):** Crawls specified target domains (using Axios and Cheerio) to extract raw text content, sanitizing HTML tags and extracting structured documentation for AI training data.
*   **Email Service (`emailService.js`):** Integrates SMTP settings configured per organization to notify support staff of escalations.

### 5. Storage & Caching Layer
*   **MongoDB Atlas:** Stores schema-validated entities such as Organizations, Users, Tickets, Conversations, Messages, and AI training datasets.
*   **Redis (ioredis):** Leveraged for caching frequently accessed settings and tracking inactive chat sessions. Uses Redis TTL (Time-To-Live) keys to trigger automatic session-expiry operations.

---

## 🔄 Core Data & Message Flows

### 1. The Real-Time Chat Loop (AI Mode)
```mermaid
sequenceDiagram
    autonumber
    actor Customer
    participant SocketIO as Socket.IO Server
    participant Express as Express App
    participant Redis as Redis Cache
    participant Gemini as Google Gemini API
    participant DB as MongoDB

    Customer->>SocketIO: Emit 'send_message' (content, conversationId)
    SocketIO->>Express: Route message event
    Express->>Redis: Check conversation escalation state
    Redis-->>Express: Returns 'AI_ACTIVE'
    Express->>DB: Fetch conversational history & AI Training Data
    DB-->>Express: Return history context + training docs
    Express->>Gemini: Request generation (Context + Prompt + Message)
    Gemini-->>Express: Return generated AI answer
    Express->>DB: Save user & AI messages to Database
    Express->>SocketIO: Broadcast 'receive_message' (AI answer)
    SocketIO->>Customer: Display message in Widget
```

### 2. Conversation Escalation Flow (Handoff to Human Agent)
```mermaid
sequenceDiagram
    autonumber
    actor Customer
    participant SocketIO as Socket.IO Server
    participant Express as Express App
    participant DB as MongoDB
    participant Email as Email Service
    actor Agent

    Customer->>SocketIO: Emit 'send_message' (needs human help)
    SocketIO->>Express: Parse message
    Express->>Express: Detect trigger / customer requests agent
    Express->>DB: Update Conversation & Ticket status to 'open' (Agent assigned)
    Express->>SocketIO: Emit 'conversation_escalated' to Organization Room
    SocketIO->>Agent: Alert agent panel about incoming escalated chat
    Express->>Email: Send escalation notification to support staff
    Note over Customer, Agent: Future messages route directly between Customer and Agent via Socket.IO
```

---

## ⚡ Design Patterns & Architecture Best Practices

*   **Repository / Controller Pattern:** Decouples Express routes, route controllers, database schemas, and business services. Routes only manage paths; Controllers extract params and return responses; Services execute business logic.
*   **Dynamic Room Partitioning:** Isolates real-time messages by assigning customers to room `conversation_<id>` and agents to `org_<id>`.
*   **Inactivity Expiry (TTL Caching):** Uses Redis Key-space notifications or polling timers to track user inactivity. If a customer is idle for >2 hours, the session expires, automatically purging the ephemeral chat token to preserve privacy.
*   **Fail-Soft Database Resiliency:** If Redis is down, the backend falls back gracefully to MongoDB query fallbacks, preventing a crash.
