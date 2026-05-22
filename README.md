# SellerPilot

AI-assisted e-commerce listing optimizer.

## Quick Start

```bash
bash start.sh
# Backend: http://localhost:8005
# Frontend: http://localhost:5177
# Demo login: demo@sellerpilot.dev / demo123
```

## Docker / fleet-net

SellerPilot ships a `docker-compose.yml` for the laptop-local fleet
network. Three containers (`sellerpilot_postgres`, `sellerpilot_api`,
`sellerpilot_web`) on the shared `fleet-net`.

```bash
docker network create fleet-net 2>/dev/null || true
cp .env.example .env  # edit OPENAI_API_KEY + SECRET_KEY
docker compose up -d                                              # prod-like
docker compose -f docker-compose.yml -f docker-compose.dev.yml up # dev
```

Reach it at `http://localhost:8005/api/health` and
`http://localhost:5177/`. Fleet pattern reference:
[`/Users/donkeyking/development/infra/README.md`](/Users/donkeyking/development/infra/README.md).
