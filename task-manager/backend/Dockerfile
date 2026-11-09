# Application Tier: Node.js + Express
FROM node:20-alpine
WORKDIR /app

# ติดตั้ง dependency ก่อน (ใช้ cache ได้ถ้า package.json ไม่เปลี่ยน)
COPY package*.json ./
RUN npm install --omit=dev

COPY src ./src

ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "src/server.js"]
