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
    ├── Rate Limiter       → 30 req/min per IP
    ├── Error Handler      → global error middleware
    ├── Router Agent       → intent classification + delegation
    │     ├── Order Agent  → tools: getOrderDetails, checkDeliveryStatus, getTrackingInfo
    │     ├── Billing Agent→ tools: getInvoiceDetails, checkPaymentStatus, checkRefundStatus, listAllInvoices
    │     └── Support Agent→ tools: searchFAQ, getConversationHistory
    └── Database (PostgreSQL + Prisma)
```

**Key patterns:**
- Controller-Service separation (routes → controller → service → agents)
- Global error handling middleware
- Rate limiting (30 requests/minute per IP)
- Streaming AI responses via Vercel AI SDK + Groq
- Conversation context persistence across messages
- Context compaction (last 20 messages to prevent token overflow)
- Keyword + LLM hybrid intent classification
- Agent type tracking per message
- Auto-generated conversation titles
- "Thinking" / routing status indicators
- Markdown rendering for AI responses

## Tech Stack

| Layer     | Technology                              |
|-----------|-----------------------------------------|
| Frontend  | React 19, Vite, TypeScript              |
| Backend   | Hono.dev, TypeScript, Node.js           |
| Database  | PostgreSQL                              |
| ORM       | Prisma                                  |
| AI        | Vercel AI SDK, Groq (Llama 3.3)         |
| Monorepo  | Turborepo + npm Workspaces              |
| Type-safe client | Hono RPC (`hc` client)           |

## Prerequisites

- **Node.js** >= 22.x
- **PostgreSQL** running locally (or remote connection string)
- **Groq API key** (free at https://console.groq.com)

## Setup

### 1. Clone the repository

```bash
git clone https://github.com/Dame121/AI-powered-customer-support-system.git
cd AI-powered-customer-support-system
npm install        # installs all workspace dependencies
```

### 2. Backend setup

Create a `.env` file in `apps/backend/` (see `.env.example`):

```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/customer_support"
GROQ_API_KEY="your-groq-api-key-here"
```

Run database migrations and seed:

```bash
cd apps/backend
npx prisma migrate dev
npm run db:seed
```

### 3. Run everything (Turborepo)

From the project root:

```bash
npm run dev        # starts backend + frontend concurrently via turbo
```

Or run individually:

```bash
npm run dev:backend    # backend only → http://localhost:3000
npm run dev:frontend   # frontend only → http://localhost:5173
```

Build all packages:

```bash
npm run build      # turbo build (backend tsc + frontend vite build)
```

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

### Orders (7 records)

| Order     | Customer       | Status      | Total    | Tracking    |
|-----------|---------------|-------------|----------|-------------|
| ORD-1001  | Alice Johnson | shipped     | $99.97   | TRK-ABC123  |
| ORD-1002  | Bob Smith     | processing  | $149.99  | —           |
| ORD-1003  | Carol Davis   | delivered   | $77.50   | TRK-XYZ789  |
| ORD-1004  | David Lee     | shipped     | $124.97  | TRK-DEF456  |
| ORD-1005  | Eva Martinez  | cancelled   | $299.99  | —           |
| ORD-1006  | Frank Wilson  | processing  | $259.98  | —           |
| ORD-1007  | Alice Johnson | delivered   | $50.97   | TRK-GHI012  |

### Invoices (7 records)

| Invoice   | Customer       | Amount   | Status   | Due Date   |
|-----------|---------------|----------|----------|------------|
| INV-2001  | Alice Johnson | $99.97   | paid     | 2026-02-15 |
| INV-2002  | Bob Smith     | $149.99  | pending  | 2026-03-08 |
| INV-2003  | Carol Davis   | $77.50   | paid     | 2026-02-20 |
| INV-2004  | David Lee     | $124.97  | pending  | 2026-03-01 |
| INV-2005  | Eva Martinez  | $299.99  | refunded | 2026-03-05 |
| INV-2006  | Frank Wilson  | $259.98  | pending  | 2026-03-10 |
| INV-2007  | Alice Johnson | $50.97   | overdue  | 2026-01-20 |

## Multi-Agent System

### Router Agent
- Classifies user intent using keyword matching + LLM fallback
- Tracks conversation context for follow-up messages
- Delegates to the correct sub-agent with tool-gathered data injected into the prompt
- Sends routing status to frontend ("Routed to order agent")

### Order Agent
- **getOrderDetails** — fetch full order by ID (customer, items, total, dates)
- **checkDeliveryStatus** — get current shipping status + delivery date
- **getTrackingInfo** — get tracking number + shipping info

### Billing Agent
- **getInvoiceDetails** — fetch invoice by ID (customer, amount, description, dates)
- **checkPaymentStatus** — get payment status + due date
- **checkRefundStatus** — check if invoice has been refunded
- **listAllInvoices** — list all invoices with details

### Support Agent
- **searchFAQ** — keyword-based FAQ lookup (passwords, shipping, returns, etc.)
- **getConversationHistory** — retrieve prior conversation messages for context

## Features

- **Hono RPC + type-safe client** — Frontend uses `hc<AppType>()` from `hono/client` for end-to-end type safety
- **Turborepo monorepo** — `npm run dev` starts backend + frontend concurrently via `turbo`
- **Streaming responses** — AI responses stream in real-time, word by word
- **Thinking indicator** — Shows "Analyzing your query...", "Searching knowledge base..." etc. while the AI processes
- **Agent routing status** — Displays which agent was selected before response starts
- **Markdown rendering** — AI responses render bold, lists, code blocks, etc.
- **Conversation persistence** — All messages saved to PostgreSQL with agent type tracking
- **Auto-generated titles** — Conversations get titled from the first user message
- **Context compaction** — Only last 20 messages sent to LLM to prevent token overflow
- **Rate limiting** — 30 requests/minute per IP address
- **Error handling** — Global middleware + frontend error banners
- **Loading states** — Skeleton loading when fetching conversation history
