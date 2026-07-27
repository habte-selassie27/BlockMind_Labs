FROM node:20-slim AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate
COPY apps/chat-pwa/package.json ./
RUN pnpm install
COPY apps/chat-pwa/ ./
RUN pnpm build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY apps/chat-pwa/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
