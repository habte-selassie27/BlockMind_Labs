FROM node:20-slim
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY apps/notification-service/package.json ./apps/notification-service/
RUN pnpm install || pnpm install
COPY apps/notification-service/ ./apps/notification-service/
WORKDIR /app/apps/notification-service
RUN pnpm build || true
EXPOSE 8007
CMD ["node", "dist/index.js"]
