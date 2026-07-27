FROM node:20-slim
WORKDIR /app
COPY apps/sdk-proxy/package.json ./
RUN npm install
COPY apps/sdk-proxy/ ./
EXPOSE 8008
CMD ["node", "dist/index.js"]
