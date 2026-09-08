# MedOS Dedicated PDF Extraction Microservice
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

COPY package*.json ./
RUN npm ci --omit=dev

COPY pdfParser.js pptxParser.js pdfServer.js ./

EXPOSE 3001

USER node

CMD ["node", "pdfServer.js"]
