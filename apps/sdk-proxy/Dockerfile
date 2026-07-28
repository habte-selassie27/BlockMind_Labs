FROM node:20-slim
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY apps/sdk-proxy/package.json ./apps/sdk-proxy/
RUN pnpm install || pnpm install
COPY apps/sdk-proxy/ ./apps/sdk-proxy/
WORKDIR /app/apps/sdk-proxy
RUN pnpm build || true
EXPOSE 8008
CMD ["node", "dist/index.js"]
