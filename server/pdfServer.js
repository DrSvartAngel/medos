// MedOS — Lightweight Deterministic PDF Extraction Server
// Zero-dependency HTTP service providing page-by-page PDF extraction for MedOS.

const http = require('http');
const { parsePdfBuffer, MAX_PDF_SIZE_BYTES } = require('./pdfParser');
const { parsePptxBuffer } = require('./pptxParser');

function parseMultipartBody(buffer, boundary) {
  const boundaryBuffer = Buffer.from(`--${boundary}`);
  const parts = [];
  let start = 0;

  while ((start = buffer.indexOf(boundaryBuffer, start)) !== -1) {
    start += boundaryBuffer.length;
    if (buffer[start] === 45 && buffer[start + 1] === 45) {
      // Reached ending boundary `--`
      break;
    }
    // Skip CRLF
    if (buffer[start] === 13 && buffer[start + 1] === 10) start += 2;

    const headerEnd = buffer.indexOf(Buffer.from('\r\n\r\n'), start);
    if (headerEnd === -1) break;

    const headersStr = buffer.slice(start, headerEnd).toString('utf8');
    const contentStart = headerEnd + 4;
    const nextBoundary = buffer.indexOf(boundaryBuffer, contentStart);
    if (nextBoundary === -1) break;

    // Content ends before CRLF before next boundary
    let contentEnd = nextBoundary;
    if (buffer[contentEnd - 2] === 13 && buffer[contentEnd - 1] === 10) {
      contentEnd -= 2;
    }

    const fileBytes = buffer.slice(contentStart, contentEnd);
    return fileBytes; // Return first file part
  }

  return null;
}

function createPdfServer() {
  const server = http.createServer(async (req, res) => {
    // CORS headers for client accessibility
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    // Health check endpoint
    if (req.method === 'GET' && (req.url === '/health' || req.url === '/api/v1/health')) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', service: 'medos-pdf-extraction' }));
      return;
    }

    // Extraction endpoint (supports both PDF and PPTX)
    if (
      req.method === 'POST' &&
      (req.url === '/extract' ||
        req.url === '/api/v1/extract-pdf' ||
        req.url === '/extract-pptx' ||
        req.url === '/api/v1/extract-pptx')
    ) {
      const chunks = [];
      let totalLength = 0;
      let tooLarge = false;

      req.on('data', (chunk) => {
        totalLength += chunk.length;
        if (totalLength > MAX_PDF_SIZE_BYTES) {
          tooLarge = true;
          req.resume();
          return;
        }
        chunks.push(chunk);
      });

      req.on('end', async () => {
        if (tooLarge) {
          res.writeHead(413, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            status: 'file_too_large',
            errorMessage: 'Payload exceeds maximum 5 MB limit',
          }));
          return;
        }

        try {
          const bodyBuffer = Buffer.concat(chunks);
          if (bodyBuffer.length === 0) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              status: 'failed',
              errorMessage: 'Empty request body',
            }));
            return;
          }

          const contentType = req.headers['content-type'] || '';
          let pdfBuffer = null;

          if (contentType.includes('application/json')) {
            const parsed = JSON.parse(bodyBuffer.toString('utf8'));
            if (!parsed.fileBase64) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                status: 'failed',
                errorMessage: 'Missing fileBase64 in JSON payload',
              }));
              return;
            }
            pdfBuffer = Buffer.from(parsed.fileBase64, 'base64');
          } else if (contentType.includes('multipart/form-data')) {
            const boundaryMatch = contentType.match(/boundary=([^;]+)/);
            if (!boundaryMatch) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                status: 'failed',
                errorMessage: 'Missing multipart boundary',
              }));
              return;
            }
            const boundary = boundaryMatch[1].replace(/["']/g, '');
            pdfBuffer = parseMultipartBody(bodyBuffer, boundary);
            if (!pdfBuffer) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                status: 'failed',
                errorMessage: 'No file part found in multipart payload',
              }));
              return;
            }
          } else {
            // Direct binary (application/pdf, application/vnd.openxmlformats-officedocument.presentationml.presentation, etc.)
            pdfBuffer = bodyBuffer;
          }

          const isZip =
            pdfBuffer.length >= 4 &&
            pdfBuffer[0] === 0x50 &&
            pdfBuffer[1] === 0x4b &&
            pdfBuffer[2] === 0x03 &&
            pdfBuffer[3] === 0x04;
          const isPptx =
            isZip ||
            req.url.includes('pptx') ||
            contentType.includes('presentation') ||
            contentType.includes('powerpoint');

          if (isPptx) {
            const parsedResult = await parsePptxBuffer(pdfBuffer);
            const hasText = parsedResult.slides.some((s) => s.text.trim().length > 0);

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(
              JSON.stringify({
                status: hasText
                  ? 'success'
                  : parsedResult.slideCount > 0
                  ? 'partial'
                  : 'empty',
                canonicalType: 'pptx',
                slideCount: parsedResult.slideCount,
                slides: parsedResult.slides,
                warnings: parsedResult.warnings,
              })
            );
            return;
          }

          const parsedResult = await parsePdfBuffer(pdfBuffer);
          const hasText = parsedResult.pages.some((p) => p.text.trim().length > 0);

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              status: hasText
                ? 'success'
                : parsedResult.pageCount > 0
                ? 'partial'
                : 'empty',
              canonicalType: 'pdf',
              pageCount: parsedResult.pageCount,
              pages: parsedResult.pages,
              warnings: parsedResult.warnings,
            })
          );
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Unknown extraction failure';
          const code = err && err.code ? err.code : 'extraction_error';
          const httpStatus = code === 'invalid_format' ? 400 : (code === 'file_too_large' ? 413 : 500);

          res.writeHead(httpStatus, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            status: 'failed',
            errorMessage: message,
            errorCode: code,
          }));
        }
      });
      return;
    }

    // 404 for unmapped routes
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'not_found', errorMessage: 'Endpoint not found' }));
  });

  return server;
}

// Auto-run if executed directly via CLI
if (require.main === module) {
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;
  const HOST = process.env.HOST || '0.0.0.0';
  const server = createPdfServer();
  server.listen(PORT, HOST, () => {
    console.log(`[MedOS PDF Extraction Server] listening on http://${HOST}:${PORT}`);
  });
}

module.exports = { createPdfServer };
