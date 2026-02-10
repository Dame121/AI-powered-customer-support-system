# AI-Powered Customer Support System

A fullstack AI customer support system with a **multi-agent architecture**. A router agent analyzes incoming queries and delegates to specialized sub-agents (Order, Billing, Support), each with access to tools that query real data from a PostgreSQL database. Responses are streamed in real time.

## Architecture

```
Frontend (React + Vite)
    │
    ▼
Backend (Hono.dev)
    │
    ├── Controller Layer   → thin route handlers
    ├── Service Layer      → business logic
    ├── Router Agent       → intent classification + delegation
    │     ├── Order Agent  → tools: getOrderDetails, checkDeliveryStatus, getTrackingInfo
    │     ├── Billing Agent→ tools: getInvoiceDetails, checkPaymentStatus, listAllInvoices
    │     └── Support Agent→ tools: searchFAQ, getConversationHistory
    └── Database (PostgreSQL + Prisma)
```

**Key patterns:**
- Controller-Service separation (routes → controller → service → agents)
- Global error handling middleware
- Streaming AI responses via Vercel AI SDK + Groq
- Conversation context persistence across messages
- Keyword + LLM hybrid intent classification

## Tech Stack

| Layer     | Technology                        |
|-----------|-----------------------------------|
| Frontend  | React 19, Vite, TypeScript        |
| Backend   | Hono.dev, TypeScript, Node.js     |
| Database  | PostgreSQL                        |
| ORM       | Prisma                            |
| AI        | Vercel AI SDK, Groq (Llama 3.3)   |

## Prerequisites

- **Node.js** >= 22.x
- **PostgreSQL** running locally (or remote connection string)
- **Groq API key** (free at https://console.groq.com)

## Setup

### 1. Clone the repository

```bash
git clone https://github.com/Dame121/AI-powered-customer-support-system.git
cd AI-powered-customer-support-system
```

### 2. Backend setup

```bash
cd backend
npm install
```

Create a `.env` file in `backend/`:

```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/customer_support"
GROQ_API_KEY="your-groq-api-key-here"
```

Run database migrations and seed:

```bash
npx prisma migrate dev
npm run db:seed
```

Start the backend:

```bash
npm run dev
```

Backend runs at **http://localhost:3000**

### 3. Frontend setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at **http://localhost:5173**

## API Routes

| Method | Endpoint                         | Description                  |
|--------|----------------------------------|------------------------------|
| POST   | `/api/chat/messages`             | Send message (streaming)     |
| GET    | `/api/chat/conversations`        | List all conversations       |
| GET    | `/api/chat/conversations/:id`    | Get conversation with messages|
| DELETE | `/api/chat/conversations/:id`    | Delete a conversation        |
| GET    | `/api/agents`                    | List all agents              |
| GET    | `/api/agents/:type/capabilities` | Get agent tools/capabilities |
| GET    | `/api/health`                    | Health check + DB status     |

## Seed Data

| Orders    | Status      | Tracking    |
|-----------|-------------|-------------|
| ORD-1001  | shipped     | TRK-ABC123  |
| ORD-1002  | processing  | —           |
| ORD-1003  | delivered   | TRK-XYZ789  |

| Invoices  | Amount  | Status   |
|-----------|---------|----------|
| INV-2001  | $49.99  | paid     |
| INV-2002  | $150.00 | pending  |
| INV-2003  | $75.50  | overdue  |

## Multi-Agent System

### Router Agent
- Classifies user intent using keyword matching + LLM fallback
- Tracks conversation context for follow-up messages
- Delegates to the correct sub-agent with tool-gathered data injected into the prompt

### Order Agent
- **getOrderDetails** — fetch full order by ID
- **checkDeliveryStatus** — get current shipping status
- **getTrackingInfo** — get tracking number

### Billing Agent
- **getInvoiceDetails** — fetch invoice by ID
- **checkPaymentStatus** — get payment status
- **listAllInvoices** — list all invoices with details

### Support Agent
- **searchFAQ** — keyword-based FAQ lookup
- **getConversationHistory** — retrieve prior conversation messages
