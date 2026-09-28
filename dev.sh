#!/bin/bash
# Blockmind Labs — Dev Startup Script
# Starts all services with correct env vars

set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"

# Use repo venv (Python 3.12) for the Python services
if [ -d "$ROOT/.venv/bin" ]; then
  export PATH="$ROOT/.venv/bin:$PATH"
fi

echo "🚀 Starting Blockmind Labs..."

# Kill existing processes on our ports
for port in 3000 5173 8001 8002 8003 8004 8005 8006 8007 8008 8009; do
  fuser -k $port/tcp 2>/dev/null || true
done
sleep 1

# Start Docker services (redis, postgres, weaviate)
echo "📦 Starting Docker services..."
cd "$ROOT" && docker compose up -d redis postgres 2>/dev/null || echo "  (Docker not available — using external services)"

# Data store URLs (docker-compose maps postgres to host port 5433)
export DATABASE_URL="${DATABASE_URL:-postgresql://blockmind:blockmind_dev@localhost:5433/blockmind}"
export POSTGRES_URL="${POSTGRES_URL:-$DATABASE_URL}"
export REDIS_URL="${REDIS_URL:-redis://localhost:6379}"
export GIWA_RPC_URL="${GIWA_RPC_URL:-https://sepolia-rpc.giwa.io}"

# Start Python services
echo "🐍 Starting Python services..."
cd "$ROOT/apps/intent-service" && nohup uvicorn src.main:app --host 0.0.0.0 --port 8001 --reload > /tmp/intent.log 2>&1 &
cd "$ROOT/apps/memory-service" && nohup uvicorn src.main:app --host 0.0.0.0 --port 8005 --reload > /tmp/memory.log 2>&1 &
cd "$ROOT/apps/analytics-service" && nohup uvicorn src.main:app --host 0.0.0.0 --port 8006 --reload > /tmp/analytics.log 2>&1 &

# Start Node services
echo "📦 Starting Node services..."
cd "$ROOT/apps/api-gateway" && SKIP_AUTH=true nohup npx tsx src/index.ts > /tmp/gateway.log 2>&1 &
cd "$ROOT/apps/notification-service" && nohup npx tsx src/index.ts > /tmp/notification.log 2>&1 &
cd "$ROOT/apps/sdk-proxy" && nohup npx tsx src/index.ts > /tmp/sdk-proxy.log 2>&1 &
cd "$ROOT/apps/admin-service" && nohup npx tsx src/index.ts > /tmp/admin.log 2>&1 &
cd "$ROOT/apps/web3-middleware" && WALLET_SIGNER_URL="${WALLET_SIGNER_URL:-http://localhost:8004}" \
  nohup npx tsx src/index.ts > /tmp/web3.log 2>&1 &

# Start agent-runtime (with Groq API key)
echo "🤖 Starting agent-runtime (Groq LLM)..."
if [ -f "$ROOT/.env" ]; then
  set -a
  # shellcheck disable=SC1091
  . "$ROOT/.env"
  set +a
fi
cd "$ROOT/apps/agent-runtime" && nohup npx tsx src/index.ts > /tmp/agent.log 2>&1 &

# Start chat PWA
echo "💻 Starting chat PWA..."
cd "$ROOT/apps/chat-pwa" && nohup npx vite --host > /tmp/chat.log 2>&1 &

sleep 5
echo ""
echo "✅ Services started!"
echo ""
echo "   Chat PWA:       http://localhost:5173"
echo "   API Gateway:    http://localhost:3000"
echo "   Agent Runtime:  http://localhost:8002"
echo "   Intent Service: http://localhost:8001"
echo "   Memory Service: http://localhost:8005"
echo "   Analytics:      http://localhost:8006"
echo "   Web3 Middleware:http://localhost:8003"
echo ""
echo "   Logs: /tmp/{agent,gateway,intent,memory,analytics,chat,web3,notification,admin,sdk-proxy}.log"
