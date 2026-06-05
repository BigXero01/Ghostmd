# GhostMD — Phantom Markets Division

Automated crypto trading platform with gothic/cipherpunk aesthetic. Algorithmic multi-exchange arbitrage, 6-hour compounding epochs, Stripe deposits, and live WebSocket telemetry.

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 App Router · TypeScript · Tailwind CSS · Zustand · TanStack Query v5 · Framer Motion · Recharts · Stripe.js |
| Backend | NestJS · REST + Socket.io WebSocket · JWT (15min) + refresh rotation (7d) · BullMQ · node-cron |
| Database | PostgreSQL 16 via Prisma ORM |
| Cache / Queue | Redis 7 (sessions · pub-sub · BullMQ) |
| Payments | Stripe Payment Intents — PCI DSS handled entirely by Stripe |
| Trading Engine | CCXT (Binance · OKX · Bybit · Coinbase · Kraken) · triangular arb · cross-exchange delta · 4H momentum |
| Infra | AWS ECS Fargate · RDS Multi-AZ · ElastiCache · ALB · CloudFront · Terraform IaC |
| CI/CD | GitHub Actions → ECR → ECS rolling deploy · Playwright E2E |
| Monorepo | Turborepo — apps/web · apps/api · packages/types · packages/utils · packages/config |

## Project Structure

```
ghostmd/
├── apps/
│   ├── api/          # NestJS backend
│   │   ├── prisma/   # Schema + migrations
│   │   └── src/
│   │       ├── auth/         # JWT + refresh token rotation
│   │       ├── portfolio/    # Balance management + projections
│   │       ├── deposits/     # Stripe PaymentIntent flow
│   │       ├── withdrawals/  # Withdrawal requests
│   │       ├── webhooks/     # Stripe webhook handler
│   │       ├── algo/         # Trading engine (gateway · signals · risk · telemetry)
│   │       ├── compounding/  # 6-hour cron epoch processor
│   │       └── health/       # Terminus health check
│   └── web/          # Next.js 14 frontend
│       └── src/
│           ├── app/          # App Router pages
│           ├── components/   # UI · layout · landing · auth · dashboard
│           ├── hooks/        # useWebSocket · usePortfolio
│           ├── stores/       # Zustand (auth · websocket state)
│           └── lib/          # API client · utilities
├── packages/
│   ├── types/        # Shared TypeScript types
│   ├── utils/        # Formatting · projections · validation
│   └── config/       # Shared ESLint configs
├── infra/terraform/  # AWS VPC · ECS · RDS · ElastiCache · ALB
└── docker-compose.yml
```

## Local Development

### Prerequisites
- Node.js ≥ 20
- Docker + Docker Compose
- A Stripe test account (for payments)

### Quick Start

```bash
# 1. Clone and install
git clone https://github.com/bigxero01/ghostmd
cd ghostmd
cp .env.example .env   # fill in secrets
npm install

# 2. Start Postgres + Redis
docker compose up postgres redis -d

# 3. Run database migrations
cd apps/api && npx prisma migrate dev && cd ../..

# 4. Start all apps in watch mode
npm run dev
```

Apps:
- **Web** → http://localhost:3000
- **API** → http://localhost:4000/api
- **Health** → http://localhost:4000/api/health

### Stripe Webhook (local)

```bash
stripe listen --forward-to localhost:4000/api/webhooks/stripe
```

## Environment Variables

See `.env.example` for the full list. Required for local dev:

```env
JWT_SECRET=<min 32 chars>
REFRESH_TOKEN_SECRET=<min 32 chars>
DATABASE_URL=postgresql://ghostmd:ghostmd_dev@localhost:5432/ghostmd
REDIS_URL=redis://localhost:6379
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

## Deposit Flow

1. Frontend → `POST /api/deposits/intent` → returns Stripe `clientSecret`
2. Stripe.js `confirmPayment()` handles card / 3DS entirely client-side
3. Stripe fires webhook → NestJS verifies signature → marks deposit `CONFIRMED`
4. Prisma transaction credits `Portfolio.balance`
5. WebSocket `portfolio_update` event updates frontend balance in real-time

> GhostMD **never stores or processes raw card data**. PCI DSS scope is handled entirely by Stripe.

## Compounding Engine

A BullMQ cron fires every 6 hours:
1. Fetch all portfolios with `balance > 0`
2. Calculate epoch ROI from the signal engine (~0.25% base ± variance)
3. Apply ROI to each balance, write `PortfolioSnapshot`
4. Emit `epoch_complete` + `portfolio_update` WebSocket events per user

## Risk Engine

- **15% max drawdown kill-switch** — halts all new orders
- **3× leverage cap** — hard ceiling on position sizing
- Continuous drawdown tracking with Datadog APM metrics

## WebSocket Events (`/algo` namespace)

| Event | Payload |
|-------|---------|
| `trade_executed` | `TradeExecution` |
| `signal_detected` | `TradeSignal` |
| `epoch_complete` | `EpochReport` |
| `portfolio_update` | `Portfolio` |

## Infrastructure

Terraform provisions:
- VPC with public/private subnets across 2 AZs
- ECS Fargate cluster (API + Web services)
- RDS PostgreSQL 16 Multi-AZ with encryption + deletion protection
- ElastiCache Redis 7
- ALB with HTTPS termination (ACM)
- Security groups with least-privilege rules

```bash
cd infra/terraform
terraform init
terraform plan -var="db_password=<secret>"
terraform apply
```

## CI/CD

| Trigger | Pipeline |
|---------|----------|
| Pull Request | lint → typecheck → unit tests (Jest/Vitest) |
| Push to `main` | lint → typecheck → test → turbo build → docker push ECR → ECS rolling deploy → Playwright E2E |

---

> **Risk Disclaimer:** Cryptocurrency trading involves significant financial risk. All ROI projections shown are estimates based on historical backtesting and are not guaranteed. Past performance is not indicative of future results. Never invest more than you can afford to lose.
