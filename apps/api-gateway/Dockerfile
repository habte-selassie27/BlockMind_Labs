FROM node:20-slim
WORKDIR /app
COPY apps/api-gateway/package.json ./
RUN npm install
COPY apps/api-gateway/ ./
EXPOSE 3000
CMD ["node", "dist/index.js"]
