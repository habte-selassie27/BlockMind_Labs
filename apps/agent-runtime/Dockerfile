FROM node:20-slim
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY apps/agent-runtime/package.json ./apps/agent-runtime/
RUN pnpm install --frozen-lockfile || pnpm install
COPY apps/agent-runtime/ ./apps/agent-runtime/
WORKDIR /app/apps/agent-runtime
RUN pnpm build || true
EXPOSE 8002
CMD ["node", "dist/index.js"]
