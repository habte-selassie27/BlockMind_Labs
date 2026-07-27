FROM node:20-slim
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY apps/web3-middleware/package.json ./apps/web3-middleware/
RUN pnpm install --frozen-lockfile || pnpm install
COPY apps/web3-middleware/ ./apps/web3-middleware/
WORKDIR /app/apps/web3-middleware
RUN pnpm build || true
EXPOSE 8003
CMD ["node", "dist/index.js"]
