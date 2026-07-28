FROM node:20-slim
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY apps/api-gateway/package.json ./apps/api-gateway/
RUN pnpm install || pnpm install
COPY apps/api-gateway/ ./apps/api-gateway/
WORKDIR /app/apps/api-gateway
RUN pnpm build || true
EXPOSE 3000
CMD ["node", "dist/index.js"]
