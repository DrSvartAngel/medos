# MedOS Dedicated PDF Extraction Microservice
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

# Install system utilities for PDF rasterization and OCR
RUN apk add --no-cache poppler-utils tesseract-ocr tesseract-ocr-data-tur tesseract-ocr-data-eng

COPY package*.json ./
RUN npm ci --omit=dev

COPY ocrEngine.js pdfParser.js pptxParser.js visualEngine.js pdfServer.js ./

EXPOSE 3001

USER node

CMD ["node", "pdfServer.js"]
