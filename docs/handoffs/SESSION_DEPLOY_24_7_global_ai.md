# SESSION — Joined the 24/7 Global AI portfolio + frontend deployed

**Date:** 2026-05-20
**Live URL (frontend):** https://sellerpilot-mu.vercel.app
**Render Blueprint URL:** https://render.com/deploy?repo=https://github.com/clwest/sellerpilot

## What changed

The Founder Toolkit triplet (SellerPilot, SignalStudio, ComplianceSentinel) — paused since April 2025 — got unpaused and partially deployed as part of the 24/7 Global AI portfolio launch.

Single file added to this repo:
- `frontend/.env.production` — `VITE_API_URL=https://sellerpilot-api.onrender.com`

No source code touched. The existing `render.yaml`, `start.sh`, and the inline `if not OPENAI_API_KEY: return STUB` demo-mode fallback in `backend/app/main.py` already made this deploy-ready.

## Current state

- **Frontend:** ✅ Live on Vercel via GitHub auto-deploy
- **Backend:** ⏳ Blueprint queued. Click the URL above → Render imports `render.yaml` → service builds in ~3 min.

## Activation notes

When activating the Blueprint:
- **Leave `OPENAI_API_KEY` blank** unless you want to pay for real GPT-4o-mini optimization. Demo-mode returns deterministic stub listings with realistic structure — perfect for the click-through demo.
- `DATABASE_URL` can also stay blank; the app defaults to SQLite (`./sellerpilot.db`) which gets seeded on startup via `python -m app.seed`.
- Demo login (seeded automatically): `demo@sellerpilot.dev` / `demo123`.

## CORS gotcha

The `render.yaml` CORS list was written before the Vercel deploy assigned a random suffix. If activation reveals CORS errors in the browser, update `CORS_ALLOWED_ORIGINS` in the Render dashboard to include `https://sellerpilot-mu.vercel.app` and trigger a redeploy.

## On the 24/7 landing

Card in `src/lib/products.ts` of the `clwest/24-7-ai-global` repo under LAB:
- `status: "demo-ready"`
- `subStatus: "Frontend Live"`
- `url: "https://sellerpilot-mu.vercel.app"`

After the Render Blueprint flips on and you've smoke-tested the API, flip the card to `status: "shipped"`, `subStatus: "Demo Tier"`.
