#!/bin/bash
# Blockmind Labs — Dev Startup Script
# Starts all services with correct env vars

set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "🚀 Starting Blockmind Labs..."

# Kill existing processes on our ports
for port in 3000 5173 8001 8002 8003 8005 8006 8007 8008 8009; do
  fuser -k $port/tcp 2>/dev/null || true
done
sleep 1

# Start Docker services (redis, postgres, weaviate)
echo "📦 Starting Docker services..."
cd "$ROOT" && docker compose up -d redis postgres 2>/dev/null || echo "  (Docker not available — using external services)"

# Start Python services
echo "🐍 Starting Python services..."
cd "$ROOT/apps/intent-service" && nohup uvicorn src.main:app --host 0.0.0.0 --port 8001 --reload > /tmp/intent.log 2>&1 &
cd "$ROOT/apps/memory-service" && nohup uvicorn src.main:app --host 0.0.0.0 --port 8005 --reload > /tmp/memory.log 2>&1 &
cd "$ROOT/apps/analytics-service" && nohup uvicorn src.main:app --host 0.0.0.0 --port 8006 --reload > /tmp/analytics.log 2>&1 &

# Start Node services
echo "📦 Starting Node services..."
cd "$ROOT/apps/api-gateway" && SKIP_AUTH=true nohup npx tsx src/index.ts > /tmp/gateway.log 2>&1 &
cd "$ROOT/apps/notification-service" && nohup node src/index.js > /tmp/notification.log 2>&1 &
cd "$ROOT/apps/sdk-proxy" && nohup npx tsx src/index.ts > /tmp/sdk-proxy.log 2>&1 &
cd "$ROOT/apps/admin-service" && nohup node src/index.js > /tmp/admin.log 2>&1 &

# Start agent-runtime (with Groq API key)
echo "🤖 Starting agent-runtime (Groq LLM)..."
cd "$ROOT/apps/agent-runtime" && GROQ_API_KEY="${GROQ_API_KEY:-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}" \
  nohup npx tsx src/index.ts > /tmp/agent.log 2>&1 &

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
echo ""
echo "   Logs: /tmp/{agent,gateway,intent,memory,analytics,chat}.log"
