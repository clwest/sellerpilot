#!/bin/bash
echo "SellerPilot — Starting..."
cd "$(dirname "$0")/backend"
python -m app.seed 2>/dev/null
echo "Starting backend on :8005..."
uvicorn app.main:app --port 8005 --host 0.0.0.0 --reload &
BACKEND_PID=$!
cd "$(dirname "$0")/frontend"
echo "Starting frontend on :5177..."
npm run dev &
FRONTEND_PID=$!
echo ""
echo "SellerPilot running:"
echo "  Backend:  http://localhost:8005"
echo "  Frontend: http://localhost:5177"
echo "  Demo: demo@sellerpilot.dev / demo123"
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null" EXIT
wait
