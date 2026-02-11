<div align="center">

# AI-Powered Customer Support System

**A fullstack multi-agent AI support platform built with Hono, React, and the Vercel AI SDK**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Hono](https://img.shields.io/badge/Hono-4.11-E36002?logo=hono&logoColor=white)](https://hono.dev/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/Prisma-6.19-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io/)
[![Turborepo](https://img.shields.io/badge/Turborepo-2.5-EF4444?logo=turborepo&logoColor=white)](https://turbo.build/)
[![Vitest](https://img.shields.io/badge/Tested_with-Vitest-6E9F18?logo=vitest&logoColor=white)](https://vitest.dev/)

A production-ready customer support system featuring a **Router Agent** that classifies user intent and delegates to specialized sub-agents — each equipped with tools that query live data from a PostgreSQL database. Responses are **streamed in real time** with thinking indicators and agent routing status.

</div>

---

## Screenshots

### Chat Interface
<img src="screenshots/chat-interface.png" alt="Chat Interface" width="800" />

### Agent Routing & Streaming
<img src="screenshots/agent-routing.png" alt="Agent Routing" width="800" />

### Conversation History
<img src="screenshots/conversation-history.png" alt="Conversation History" width="800" />

---

## Table of Contents

- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [API Reference](#api-reference)
- [Multi-Agent System](#multi-agent-system)
- [Key Features](#key-features)
- [Testing](#testing)
- [Project Structure](#project-structure)
- [Database Schema & Seed Data](#database-schema--seed-data)

---

## Architecture

The system follows a **Controller → Service → Agent** pattern with clean separation of concerns. The Router Agent uses a hybrid classification strategy (keyword matching + LLM fallback) to delegate queries to the correct sub-agent, which gathers tool data and streams a contextual response.

```
┌─────────────────────────────────────────────────────────────────┐
│                     Frontend (React + Vite)                     │
│              Hono RPC Client (end-to-end type safety)           │
└────────────────────────────┬────────────────────────────────────┘
                             │  HTTP / Streaming
┌────────────────────────────▼────────────────────────────────────┐
│                      Backend (Hono.dev)                         │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────────┐  │
│  │ Rate Limiter │  │ Error Handler│  │ CORS Middleware       │  │
│  │ 30 req/min/IP│  │  (global)    │  │                       │  │
│  └──────┬───────┘  └──────┬───────┘  └───────────┬───────────┘  │
│         └─────────────────┼──────────────────────┘              │
│                           ▼                                     │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    Controller Layer                     │    │
│  │           (thin handlers — delegates to services)       │    │
│  └─────────────────────────┬───────────────────────────────┘    │
│                            ▼                                    │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                     Service Layer                       │    │
│  │       (business logic, context management, routing)     │    │
│  └─────────────────────────┬───────────────────────────────┘    │
│                            ▼                                    │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    Router Agent                         │    │
│  │         (intent classification + delegation)            │    │
│  │                                                         │    │
│  │    ┌──────────────┬──────────────┬──────────────┐       │    │
│  │    │ Order Agent  │ Billing Agent│ Support Agent│       │    │
│  │    │              │              │              │       │    │
│  │    │ • getOrder   │ • getInvoice │ • searchFAQ  │       │    │
│  │    │ • delivery   │ • payment    │ • history    │       │    │
│  │    │ • tracking   │ • refund     │              │       │    │
│  │    │              │ • listAll    │              │       │    │
│  │    └──────────────┴──────────────┴──────────────┘       │    │
│  └─────────────────────────────────────────────────────────┘    │
│                            ▼                                    │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              PostgreSQL + Prisma ORM                    │    │
│  │    (Conversations, Messages, Orders, Invoices)          │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology | Purpose |
|:------|:-----------|:--------|
| **Frontend** | React 19, Vite, TypeScript | SPA with real-time streaming UI |
| **Backend** | Hono.dev, Node.js, TypeScript | Lightweight, high-performance API server |
| **Database** | PostgreSQL | Relational data storage |
| **ORM** | Prisma 6 | Type-safe database access with migrations |
| **AI** | Vercel AI SDK, Groq (Llama 3.3 70B) | LLM inference with streaming support |
| **Monorepo** | Turborepo + npm Workspaces | Parallel builds, shared dependencies |
| **Type Safety** | Hono RPC (`hc` client) | End-to-end type-safe API calls |
| **Validation** | Zod | Runtime schema validation for tool inputs |
| **Testing** | Vitest | Unit & integration tests with mocked DB |

---

## Getting Started

### Prerequisites

- **Node.js** >= 22.x
- **PostgreSQL** running locally or a remote connection string
- **Groq API key** — free at [console.groq.com](https://console.groq.com)

### 1. Clone & Install

```bash
git clone https://github.com/Dame121/AI-powered-customer-support-system.git
cd AI-powered-customer-support-system
npm install
```

### 2. Configure Environment

Create `apps/backend/.env`:

```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/customer_support"
GROQ_API_KEY="your-groq-api-key"
```

### 3. Database Setup

```bash
npm run db:migrate      # Run Prisma migrations
npm run db:seed         # Seed with sample orders, invoices & conversations
```

### 4. Run the Application

```bash
npm run dev             # Starts backend + frontend concurrently via Turborepo
```

| Service | URL |
|:--------|:----|
| Backend API | http://localhost:3000 |
| Frontend | http://localhost:5173 |

<details>
<summary><strong>Run services individually</strong></summary>

```bash
npm run dev:backend     # Backend only
npm run dev:frontend    # Frontend only
```
</details>

<details>
<summary><strong>Production build</strong></summary>

```bash
npm run build           # Turbo build (backend tsc + frontend vite build)
```
</details>

---

## API Reference

### Chat

| Method | Endpoint | Description |
|:-------|:---------|:------------|
| `POST` | `/api/chat/messages` | Send a message and receive a streamed AI response |
| `GET` | `/api/chat/conversations` | List all conversations with messages |
| `GET` | `/api/chat/conversations/:id` | Get a single conversation by ID |
| `DELETE` | `/api/chat/conversations/:id` | Delete a conversation and its messages |

### Agents

| Method | Endpoint | Description |
|:-------|:---------|:------------|
| `GET` | `/api/agents` | List all available agents |
| `GET` | `/api/agents/:type/capabilities` | Get an agent's tools and capabilities |

### Health

| Method | Endpoint | Description |
|:-------|:---------|:------------|
| `GET` | `/api/health` | Health check with database connectivity status |

<details>
<summary><strong>Example: Send a message</strong></summary>

```bash
curl -X POST http://localhost:3000/api/chat/messages \
  -H "Content-Type: application/json" \
  -d '{"content": "What is the status of ORD-1001?"}'
```

The response is a **streamed text response** with:
- `X-Conversation-Id` header — the conversation ID (auto-created if not provided)
- `X-Agent-Type` header — which agent handled the query (`order`, `billing`, `support`)
- Body — streamed AI text, prefixed with `__STATUS__:Routed to <agent> agent\n`

</details>

---

## Multi-Agent System

### How It Works

1. **User sends a message** → the Service layer saves it and loads conversation history
2. **Router Agent classifies intent** using a two-tier strategy:
   - **Tier 1 — Keyword matching**: Fast regex-based checks for order IDs (`ORD-XXXX`), invoice IDs (`INV-XXXX`), and domain-specific keywords
   - **Tier 2 — LLM classification**: For ambiguous queries, the Router sends the message to Groq's Llama 3.3 model with a tightly constrained system prompt that returns one word: `order`, `billing`, or `support`
   - **Follow-up context**: Short/ambiguous messages ("yes please", "tell me more") inherit the previous agent type from conversation history
3. **Sub-agent gathers tool data** — real database queries (orders, invoices, FAQs) are executed and injected into the agent's system prompt
4. **Response is streamed** — the sub-agent generates a response via `streamText()` and it's piped to the client in real time

### Agent Breakdown

| Agent | Tools | Capabilities |
|:------|:------|:-------------|
| **Order Agent** | `getOrderDetails`, `checkDeliveryStatus`, `getTrackingInfo` | Look up orders by ID, check shipping status, retrieve tracking numbers |
| **Billing Agent** | `getInvoiceDetails`, `checkPaymentStatus`, `checkRefundStatus`, `listAllInvoices` | Look up invoices, check payment/refund status, list all invoices |
| **Support Agent** | `searchFAQ`, `getConversationHistory` | Answer FAQs (returns, shipping, passwords), pull conversation history for context |

---

## Key Features

| Feature | Description |
|:--------|:------------|
| **Hono RPC** | Frontend uses `hc<AppType>()` for compile-time type-safe API calls across the monorepo |
| **Turborepo** | Parallel dev/build pipelines with smart caching |
| **Streaming Responses** | AI responses stream word-by-word to the UI via `ReadableStream` |
| **Thinking Indicators** | Animated status messages ("Analyzing your query...", "Searching knowledge base...") while the AI processes |
| **Agent Routing Status** | Visual badge showing which agent was selected before the response begins |
| **Markdown Rendering** | AI responses render rich formatting — bold, lists, code blocks, etc. |
| **Conversation Persistence** | All messages saved to PostgreSQL with agent type tracking per message |
| **Auto-Generated Titles** | Conversations are automatically titled from the first user message |
| **Context Compaction** | Only the last 20 messages are sent to the LLM to prevent token overflow |
| **Rate Limiting** | In-memory rate limiter — 30 requests/minute per IP address |
| **Global Error Handling** | Middleware catches all unhandled errors and returns consistent JSON responses |
| **Unit & Integration Tests** | 69 tests across 6 files using Vitest — covers intent routing, rate limiting, chat service, agent definitions, and full API integration |

---

## Testing

The backend includes a comprehensive test suite built with **Vitest**.

```bash
npm test                # Run all tests via Turborepo
npm run test:coverage   # Run with code coverage report
```

| Test File | Tests | Scope |
|:----------|:-----:|:------|
| `support.tools.test.ts` | 12 | FAQ keyword matching, case-insensitivity, fallback responses |
| `router.agent.test.ts` | 19 | Intent classification — IDs, keyword routing, priority rules |
| `rateLimiter.test.ts` | 6 | Request limits, 429 blocking, per-IP tracking, window expiry |
| `agents.test.ts` | 7 | Agent definitions structure, tool registration for all 3 agents |
| `chat.service.test.ts` | 13 | Conversation CRUD, context compaction, auto-titling, 404 handling |
| `api.integration.test.ts` | 12 | Full HTTP integration tests for health, agents, and chat routes |
| **Total** | **69** | |

All database calls are mocked with `vi.mock()` — no live DB needed to run tests.

---

## Project Structure

```
ai-customer-support/
├── turbo.json                      # Turborepo pipeline config
├── package.json                    # Root workspace config
│
├── apps/
│   ├── backend/
│   │   ├── prisma/
│   │   │   ├── schema.prisma       # Database schema (Conversations, Messages, Orders, Invoices)
│   │   │   ├── seed.ts             # Seed script with sample data
│   │   │   └── migrations/         # Prisma migration history
│   │   └── src/
│   │       ├── index.ts            # Server entrypoint (Hono + middleware + routes)
│   │       ├── agents/
│   │       │   ├── router.agent.ts # Intent classification + agent delegation
│   │       │   ├── order.agent.ts  # Order sub-agent definition + tools
│   │       │   ├── billing.agent.ts# Billing sub-agent definition + tools
│   │       │   └── support.agent.ts# Support sub-agent definition + tools
│   │       ├── controllers/
│   │       │   └── chat.controller.ts  # Thin route handlers
│   │       ├── services/
│   │       │   └── chat.service.ts     # Business logic + context management
│   │       ├── tools/
│   │       │   ├── order.tools.ts      # Database queries for orders
│   │       │   ├── billing.tools.ts    # Database queries for invoices
│   │       │   └── support.tools.ts    # FAQ lookup + conversation history
│   │       ├── middlewares/
│   │       │   ├── errorHandler.ts     # Global error handling
│   │       │   └── rateLimiter.ts      # IP-based rate limiting
│   │       ├── __tests__/             # (co-located test files)
│   │       │   ├── *.test.ts          # Unit tests (tools, agents, middleware)
│   │       │   └── api.integration.test.ts  # Integration tests (HTTP routes)
│   │       ├── routes/
│   │       │   ├── index.ts            # Route aggregator (Hono RPC type export)
│   │       │   ├── chat.routes.ts      # Chat endpoints
│   │       │   ├── agent.routes.ts     # Agent info endpoints
│   │       │   └── health.routes.ts    # Health check
│   │       ├── db/
│   │       │   └── index.ts            # Prisma client singleton
│   │       └── types/
│   │           └── index.ts            # Shared TypeScript types
│   │
│   └── frontend/
│       └── src/
│           ├── App.tsx                 # Root component (sidebar + chat layout)
│           ├── api/
│           │   └── client.ts           # Hono RPC client + API helpers
│           └── components/
│               ├── ChatArea.tsx        # Chat UI with streaming + markdown
│               └── Sidebar.tsx         # Conversation list + new chat
│
└── screenshots/                    # Application screenshots
```

---

## Database Schema & Seed Data

### Schema Overview

| Model | Purpose | Key Fields |
|:------|:--------|:-----------|
| **Conversation** | Groups messages into threads | `id`, `title`, `createdAt` |
| **Message** | Individual chat messages | `role`, `content`, `agentType`, `conversationId` |
| **Order** | Customer orders with items | `id`, `status`, `tracking`, `items` (JSON), `total` |
| **Invoice** | Billing records | `id`, `amount`, `status`, `dueDate` |

### Seed Data

The database is pre-seeded with **7 orders** and **7 invoices** covering various statuses:

<details>
<summary><strong>Orders</strong></summary>

| Order | Customer | Status | Total | Tracking |
|:------|:---------|:-------|:------|:---------|
| ORD-1001 | Alice Johnson | shipped | $99.97 | TRK-ABC123 |
| ORD-1002 | Bob Smith | processing | $149.99 | — |
| ORD-1003 | Carol Davis | delivered | $77.50 | TRK-XYZ789 |
| ORD-1004 | David Lee | shipped | $124.97 | TRK-DEF456 |
| ORD-1005 | Eva Martinez | cancelled | $299.99 | — |
| ORD-1006 | Frank Wilson | processing | $259.98 | — |
| ORD-1007 | Alice Johnson | delivered | $50.97 | TRK-GHI012 |

</details>

<details>
<summary><strong>Invoices</strong></summary>

| Invoice | Customer | Amount | Status | Due Date |
|:--------|:---------|:-------|:-------|:---------|
| INV-2001 | Alice Johnson | $99.97 | paid | 2026-02-15 |
| INV-2002 | Bob Smith | $149.99 | pending | 2026-03-08 |
| INV-2003 | Carol Davis | $77.50 | paid | 2026-02-20 |
| INV-2004 | David Lee | $124.97 | pending | 2026-03-01 |
| INV-2005 | Eva Martinez | $299.99 | refunded | 2026-03-05 |
| INV-2006 | Frank Wilson | $259.98 | pending | 2026-03-10 |
| INV-2007 | Alice Johnson | $50.97 | overdue | 2026-01-20 |

</details>

---

## Design Decisions

| Decision | Rationale |
|:---------|:----------|
| **Hybrid intent classification** | Keyword regex runs first (fast, deterministic) with LLM fallback for ambiguous queries — balances speed and accuracy |
| **Tool data injection over LLM tool-calling** | Tool results are gathered server-side and injected into the system prompt, avoiding extra LLM round-trips and reducing latency |
| **Context compaction** | Capping at 20 messages prevents token overflow while maintaining enough context for coherent multi-turn conversations |
| **Controller-Service pattern** | Controllers stay thin (HTTP concerns), services own business logic — keeps code testable and maintainable |
| **Hono RPC** | Eliminates manual API type definitions — the frontend's client is auto-typed from the backend's route definitions |
| **Streaming with status prefix** | The `__STATUS__:` prefix lets the frontend distinguish routing metadata from AI content in a single stream |

---

<div align="center">

**Built with Hono.dev, React, Vercel AI SDK, and PostgreSQL**

</div>
