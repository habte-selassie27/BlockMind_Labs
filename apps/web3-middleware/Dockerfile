FROM node:20-slim
WORKDIR /app
COPY apps/web3-middleware/package.json ./
RUN npm install
COPY apps/web3-middleware/ ./
EXPOSE 8003
CMD ["node", "dist/index.js"]
