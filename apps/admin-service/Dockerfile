FROM node:20-slim
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY apps/admin-service/package.json ./apps/admin-service/
RUN pnpm install || pnpm install
COPY apps/admin-service/ ./apps/admin-service/
WORKDIR /app/apps/admin-service
RUN pnpm build || true
EXPOSE 8009
CMD ["node", "dist/index.js"]
