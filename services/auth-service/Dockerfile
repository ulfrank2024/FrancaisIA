FROM node:20-alpine
WORKDIR /app
COPY prisma ./prisma
COPY services/auth-service/package*.json ./
RUN npm ci --only=production
RUN npx prisma generate
COPY services/auth-service/ .
RUN npm run build
EXPOSE 4001
CMD ["node", "dist/index.js"]
