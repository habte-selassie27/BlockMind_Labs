FROM node:20-slim
WORKDIR /app
COPY apps/agent-runtime/package.json ./
RUN npm install
COPY apps/agent-runtime/ ./
EXPOSE 8002
CMD ["node", "dist/index.js"]
