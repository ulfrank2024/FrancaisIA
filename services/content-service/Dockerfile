FROM node:20-alpine
WORKDIR /app
COPY prisma ./prisma
COPY services/content-service/package*.json ./
RUN npm ci --only=production
RUN npx prisma generate
COPY services/content-service/ .
RUN npm run build
EXPOSE 4002
CMD ["node", "dist/index.js"]
