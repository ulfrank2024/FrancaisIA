FROM node:20-alpine
WORKDIR /app
COPY prisma ./prisma
COPY services/progress-service/package*.json ./
RUN npm ci --only=production
RUN npx prisma generate
COPY services/progress-service/ .
RUN npm run build
EXPOSE 4004
CMD ["node", "dist/index.js"]
