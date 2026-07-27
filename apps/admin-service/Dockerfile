FROM node:20-slim
WORKDIR /app
COPY apps/admin-service/package.json ./
RUN npm install
COPY apps/admin-service/ ./
EXPOSE 8009
CMD ["node", "dist/index.js"]
