# ImmuniWatch Nigeria 🛡️

**Real-time vaccine misinformation surveillance and counter-narrative platform for Nigeria's public health teams.**

ImmuniWatch ingests health-related social media posts and public submissions, classifies them with an NLP model, and routes uncertain cases to human analysts. It then generates evidence-based counter-narratives grounded in a verified knowledge base. The aim is to help health organisations spot misinformation surges early and respond with facts.

🔗 **Live:** https://immuniwatch-frontend.onrender.com/

<!-- ![Dashboard](docs/dashboard.png) ![HITL Queue](docs/hitl.png) -->

---

## ✨ Features

- **Multi-platform ingestion:** X/Twitter, Facebook, YouTube, Bluesky, and Instagram, plus public submissions, in 🇳🇬 **English, Nigerian Pidgin, Hausa, Yoruba, and Igbo**.
- **AI classification:** posts are labelled *misinformation*, *factual*, or *irrelevant* by a Python ML service, with confidence scores and priority levels.
- **Human-in-the-loop (HITL) review:** low-confidence classifications go to an analyst queue, and analyst decisions feed back into model retraining.
- **RAG counter-narratives:** fact-based responses are generated with Groq LLMs, grounded in knowledge-base evidence, then sent out from the Response Dispatch view.
- **Knowledge base:** upload trusted health documents, embedded asynchronously for semantic search.
- **Model health monitoring:** live metrics broken down by language, **PSI drift detection**, analyst-override-rate alerts, and retraining history.
- **Trends & geo-surge alerts:** spot spikes in misinformation by topic and region.
- **Multi-tenant organisations:** health centres claim an org and invite staff. Roles are Analyst, Senior Analyst, Supervisor, Org Admin, and Super Admin.
- **Audit log, viewer access, and real-time updates** over Socket.IO.

## 🏗 Architecture

```
Social platforms / Submissions
        │
        ▼
 Express + TypeScript API ──► Kafka (internal events, optional)
        │
        ├──► Python ML service (classify · embed · metrics)   ← circuit breaker (opossum) + retries
        ├──► Groq LLM (counter-narrative generation, RAG)
        ├──► MongoDB (posts, classifications, HITL reviews, KB, audit)
        └──► Socket.IO ──► React dashboard
```

The backend talks to the ML service through a single `mlClient`, wrapped in a circuit breaker and retry logic. A **mock mode** lets the whole platform run without the ML service.

## 🛠 Tech Stack

| Layer | Tools |
|---|---|
| Frontend | React, TypeScript, Vite, Tailwind CSS, TanStack Query, React Router, Recharts, Socket.IO client |
| Backend | Node.js, Express, TypeScript, MongoDB (Mongoose), Zod, Socket.IO, KafkaJS, Opossum, Winston, Helmet |
| AI / ML | Python ML service (classification, embeddings, drift metrics), Groq LLM for RAG |
| Testing | Jest, Supertest, mongodb-memory-server, Nock |
| Deploy | Render |

## 📁 Structure

```
Backend/    Express API — controllers, services, models, routes, Kafka utils, tests, seed
Frontend/   React dashboard — pages (Dashboard, HITL Queue, Knowledge Base, Model Health, Trends, Geo Surge, …)
```

## 🚀 Getting Started

```bash
# Backend — http://localhost:5000
cd Backend
cp .env.example .env     # set ML_MOCK_MODE=true to run without the ML service
npm install
npm run seed             # optional demo data
npm run dev

# Frontend — http://localhost:5173
cd Frontend
npm install
echo "VITE_API_URL=http://localhost:5000/api/v1" > .env
npm run dev
```

**Tests:** `npm test` runs the auth, posts, and HITL tests. `npm run test:integration` runs the ML integration tests.

Key variables in `Backend/.env.example` include `ML_SERVICE_URL`, `ML_MOCK_MODE`, `ML_PSI_THRESHOLD`, `HITL_THRESHOLD`, `KAFKA_ENABLED`, circuit-breaker tuning, and the alert thresholds.

## 👤 Author

**Fowosere Ademola Abraham** ([@Zionnaire](https://github.com/Zionnaire)): backend, frontend, and AI integration
