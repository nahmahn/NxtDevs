
<div align="center">
  <img src="frontend/public/NxtDevs_logo.png" alt="NxtDevs Logo" width="200" />
  <h1>NxtDevs</h1>
  <p><strong>Algorithmic Thinking Trainer & Adaptive Learning Platform</strong></p>
  <p>
    A comprehensive system profiling cognitive patterns to identify biases and provide personalized coaching.
  </p>
  <p>
    <img src="https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi" alt="FastAPI" />
    <img src="https://img.shields.io/badge/python-3670A0?style=for-the-badge&logo=python&logoColor=ffdd54" alt="Python" />
    <img src="https://img.shields.io/badge/postgres-%23316192.svg?style=for-the-badge&logo=postgresql&logoColor=white" alt="Postgres" />
    <img src="https://img.shields.io/badge/redis-%23DD0031.svg?style=for-the-badge&logo=redis&logoColor=white" alt="Redis" />
    <img src="https://img.shields.io/badge/celery-%23a9cc54.svg?style=for-the-badge&logo=celery&logoColor=ddf4a4" alt="Celery" />
    <img src="https://img.shields.io/badge/next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" alt="Next JS" />
    <img src="https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
    <img src="https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="TailwindCSS" />
  </p>
</div>

---


---


---

## System Overview

**NxtDevs** is an advanced algorithmic training platform designed to go beyond simple syntax verification. It utilizes a **multi-dimensional profiling engine** to track user cognition across 20+ "Thinking Axes," identifying specific cognitive pitfalls such as "Greedy Bias" or "Premature Optimization."

Unlike standard coding platforms, NxtDevs integrates **real-time competitive duels**, **generative AI coaching**, and **deep analytics** to foster genuine problem-solving growth.

> "We don't just check if your code works; we analyze *how* you think."

---

## Key Technical Features

### Cognitive Profiling Engine
- **Multi-Dimensional Tracking**: Profiles users on axes like *Constraint Sensitivity*, *Edge Case Paranoia*, and *Asymptotic Intuition*.
- **Bias Detection**: Heuristic evaluation of submission history to detect patterns like over-reliance on Brute Force or premature optimization.
- **Adaptive Remediation**: Automatically assigns problems that target your specific cognitive weak points.

### LeetCode Integration & Analytics
- **GraphQL Data Sync**: Direct integration with LeetCode's GraphQL API (`backend/services/leetcode_service.py`) to fetch submission history, calendars, and problem tags.
- **Pattern Analysis**: Heuristics engine that scans your LeetCode history to identify strengths (e.g., "Strong Graph Intuition") vs weaknesses (e.g., "Greedy Bias Detected").
- **Smart Recommendations**: Correlates your LeetCode difficulty distribution with internal metrics to recommend optimal training sets.

### Real-Time Distributed Dueling
- **WebSocket Orchestration**: Custom-built `backend/engine/orchestrator.py` handles state synchronization between players with sub-50ms latency.
- **ELO Matchmaking**: Proprietary matchmaking queue (`backend/services/matchmaking.py`) that pairs users based on skill bands (Δ < 300 ELO).
- **Live State Sync**: Bidirectional communication ensuring fairness and instant feedback during 1v1 battles.

### Resilient AI Pipeline (Not a Wrapper)
- **Multi-Provider Fallback**: A robust engineering layer (`backend/services/ai_service.py`) that ensures 100% uptime by cascading requests: **Gemini 2.5 → Groq (Llama 3) → OpenRouter**.
- **Data-Driven Synthesis**: We use LLMs strictly as a *reasoning engine*. We feed raw execution metrics, error logs, and historical bias data to generate structured, JSON-based learning curriculums.
- **Structured Output**: AI generates actionable plans, not just chat.

### Enterprise-Grade Architecture
- **Async Task Queue**: Uses **Celery & Redis** for heavy background processing (report generation, batch stats syncing).
- **Scalable Database**: **PostgreSQL** with **SQLModel** (SQLAlchemy + Pydantic) for type-safe, high-performance data access.
- **Modern Frontend**: **Next.js 16 (App Router)** with TypeScript and TailwindCSS for a performant, type-safe UI.

---

## System Architecture

### High-Level Data Flow

```mermaid
graph TD
    User[User] -->|Interact| Frontend[Next.js Frontend]
    Frontend -->|REST / WebSocket| Backend[FastAPI Backend]
    
    subgraph "Backend Infrastructure"
        Backend -->|Persist| DB[(PostgreSQL)]
        Backend -->|Cache/Queue| Redis[(Redis Cache)]
        Backend -->|Dispatch| Celery[Celery Workers]
        Celery -->|Process| Redis
    end
    
    subgraph "Intelligence Layer"
        Backend -->|Contextual Prompting| AI[AI Service Orchestrator]
        AI -->|Primary| Gemini[Google Gemini 2.5]
        AI -->|Fallback| Groq[Groq Llama 3.3]
        AI -->|Safety Net| OpenRouter
    end
```

### Dueling Sequence

```mermaid
sequenceDiagram
    participant U1 as Player 1
    participant U2 as Player 2
    participant Orch as Socket Orchestrator
    participant MM as Matchmaking Service
    participant DB as Database

    U1->>MM: Join Queue (ELO 1200)
    U2->>MM: Join Queue (ELO 1250)
    MM->>MM: Match Found!
    MM-->>U1: Session ID Created
    MM-->>U2: Session ID Created
    
    U1->>Orch: Connect WS (Session ID)
    U2->>Orch: Connect WS (Session ID)
    
    loop Real-Time Battle
        Orch->>U1: Broadcast Question
        Orch->>U2: Broadcast Question
        U1->>Orch: Submit Code
        Orch->>DB: Validate & Score
        Orch->>U2: Notify Opponent Progress
    end
    
    Orch->>DB: Update ELO & Profile
    Orch->>U1: Final Results
    Orch->>U2: Final Results
```

---

## Technology Stack

### Backend
| Component | Technology | Role |
|-----------|------------|------|
| **Core** | **Python 3.11** | High-performance, type-hinted application logic |
| **API** | **FastAPI** | Async REST API & WebSocket handling |
| **ORM** | **SQLModel** | Database modeling & interaction |
| **Queue** | **Celery** | Distributed task processing |
| **Broker** | **Redis** | Message broker & caching layer |
| **AI** | **Gemini / Groq** | Logic & Reasoning Engines |

### Frontend
| Component | Technology | Role |
|-----------|------------|------|
| **Framework** | **Next.js 16** | Server-Side Rendering & App Router |
| **Language** | **TypeScript** | Strict type safety |
| **Styling** | **Tailwind CSS** | Rapid UI development |
| **State** | **Zustand / Hooks** | Complex state management |
| **Viz** | **Recharts** | Data visualization for cognitive profiles |

---

## Project Structure

```text
NxtDevs/
├── backend/
│   ├── api/             # API Route handlers (Auth, LeetCode, Duels)
│   ├── engine/          # Core scoring, dueling, and orchestration logic
│   ├── models/          # Database schema (SQLModel)
│   ├── services/        # Business logic (AI, Matchmaking, Stats Sync)
│   ├── celery_app.py    # Celery worker configuration
│   └── main.py          # FastAPI entry point
├── frontend/
│   ├── app/             # Next.js App Router pages
│   ├── components/      # Reusable UI React components
│   └── lib/             # Shared utilities
└── docker-compose.yml   # Container orchestration
```

---

##  Installation & Deployment

### Docker (Recommended)

To build and run the entire stack:

```bash
docker-compose up --build
```

### Manual Setup (Dev)

**1. Backend**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # or .\venv\Scripts\activate
pip install -r requirements.txt
uvicorn backend.main:app --reload
```

**2. Worker**
```bash
celery -A backend.celery_app worker --loglevel=info
```

**3. Frontend**
```bash
cd frontend
npm install
npm run dev
```

---

## License

Copyright © 2026 NxtDevs. All Rights Reserved.
Proprietary software.
