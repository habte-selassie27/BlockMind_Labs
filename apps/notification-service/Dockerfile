FROM node:20-slim
WORKDIR /app
COPY apps/notification-service/package.json ./
RUN npm install
COPY apps/notification-service/ ./
EXPOSE 8007
CMD ["node", "dist/index.js"]
