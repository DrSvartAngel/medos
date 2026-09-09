// MedOS — Production-Grade Server-Side PDF Parser
// Powered by Mozilla PDF.js (via pdf-parse) with deterministic fallback.
// Handles nested page trees, compressed streams, ToUnicode tables, Turkish/Unicode characters,
// and PowerPoint/lecture export structures.

const zlib = require('zlib');
const path = require('path');

const MAX_PDF_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

let pdfParseModule = null;
try {
  pdfParseModule = require(path.join(__dirname, 'node_modules', 'pdf-parse'));
} catch {
  try {
    pdfParseModule = require('pdf-parse');
  } catch {
    pdfParseModule = null;
  }
}

/**
 * Extracts structured text using Mozilla PDF.js engine.
 */
async function parseWithPdfJs(buffer) {
  const pages = [];

  function renderPage(pageData) {
    return pageData.getTextContent({ normalizeWhitespace: true }).then((textContent) => {
      let lastY = null;
      let pageText = '';
      const items = textContent.items || [];

      for (const item of items) {
        const str = item.str || '';
        if (!str) continue;

        const currentY = item.transform ? item.transform[5] : null;
        if (lastY !== null && currentY !== null && Math.abs(currentY - lastY) > 5) {
          if (!pageText.endsWith('\n')) {
            pageText += (Math.abs(currentY - lastY) > 16 ? '\n\n' : '\n');
          }
        } else if (pageText.length > 0 && !pageText.endsWith('\n') && !pageText.endsWith(' ')) {
          pageText += ' ';
        }

        pageText += str;
        lastY = currentY;
      }

      const trimmed = pageText.trim();
      const lines = trimmed.split('\n').map((l) => l.trim()).filter(Boolean);
      const headings = lines.length > 0 && lines[0].length < 120 ? [lines[0]] : undefined;

      pages.push({
        pageNumber: pageData.pageIndex + 1,
        text: trimmed,
        headings,
      });

      return trimmed;
    });
  }

  const data = await pdfParseModule(buffer, {
    pagerender: renderPage,
    max: 0,
  });

  // Sort by pageNumber
  pages.sort((a, b) => a.pageNumber - b.pageNumber);

  const totalTextLength = pages.reduce((sum, p) => sum + p.text.length, 0);
  const warnings = [];

  if (pages.length === 0) {
    warnings.push('no_pages_found');
  } else if (totalTextLength === 0) {
    warnings.push('scanned_or_image_only_pdf_requires_ocr');
  }

  return {
    pageCount: data.numpages || pages.length,
    pages,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * Fallback parser using native zlib and object stream resolution.
 */
function parseWithFallback(buffer) {
  const text = buffer.toString('binary');
  const objects = new Map();
  const objRegex = /(\d+)\s+(\d+)\s+obj([\s\S]*?)endobj/g;
  let match;

  while ((match = objRegex.exec(text)) !== null) {
    const objNum = parseInt(match[1], 10);
    const genNum = parseInt(match[2], 10);
    const body = match[3];
    const key = `${objNum} ${genNum}`;

    const streamIdx = body.indexOf('stream');
    if (streamIdx !== -1) {
      const dictPart = body.slice(0, streamIdx);
      let streamStart = streamIdx + 6;
      if (body[streamStart] === '\r') streamStart++;
      if (body[streamStart] === '\n') streamStart++;

      const endstreamIdx = body.indexOf('endstream', streamStart);
      const streamContent = endstreamIdx !== -1 ? body.slice(streamStart, endstreamIdx) : '';
      const streamBuf = Buffer.from(streamContent, 'binary');

      const filterMatch = dictPart.match(/\/Filter\s*(\/[A-Za-z0-9]+|\[[\s\S]*?\])/);
      const filter = filterMatch ? filterMatch[1] : '';

      objects.set(key, { objNum, genNum, dict: dictPart, stream: streamBuf, filter });
    } else {
      objects.set(key, { objNum, genNum, dict: body, stream: null, filter: '' });
    }
  }

  const pageObjects = [];
  for (const [key, obj] of objects.entries()) {
    if (/\/Type\s*\/Page(?![a-zA-Z])/.test(obj.dict)) {
      pageObjects.push(obj);
    }
  }

  pageObjects.sort((a, b) => a.objNum - b.objNum);

  const pages = [];
  for (let i = 0; i < pageObjects.length; i++) {
    const pageObj = pageObjects[i];
    let rawStream = '';

    const arrayMatch = pageObj.dict.match(/\/Contents\s*\[([^\]]+)\]/);
    const streamRefs = [];
    if (arrayMatch) {
      const refRegex = /(\d+)\s+(\d+)\s+R/g;
      let rMatch;
      while ((rMatch = refRegex.exec(arrayMatch[1])) !== null) {
        streamRefs.push(`${rMatch[1]} ${rMatch[2]}`);
      }
    } else {
      const singleMatch = pageObj.dict.match(/\/Contents\s+(\d+)\s+(\d+)\s+R/);
      if (singleMatch) {
        streamRefs.push(`${singleMatch[1]} ${singleMatch[2]}`);
      }
    }

    for (const ref of streamRefs) {
      const streamObj = objects.get(ref);
      if (streamObj && streamObj.stream) {
        let piece = '';
        if (streamObj.filter.includes('FlateDecode')) {
          try {
            piece = zlib.inflateSync(streamObj.stream).toString('binary');
          } catch {
            piece = streamObj.stream.toString('binary');
          }
        } else {
          piece = streamObj.stream.toString('binary');
        }
        rawStream += piece + '\n';
      }
    }

    let extracted = '';
    const btRegex = /BT([\s\S]*?)ET/g;
    let btMatch;
    while ((btMatch = btRegex.exec(rawStream)) !== null) {
      const tjRegex = /\(((?:[^()\\]|\\.)*)\)\s*Tj/g;
      let tjMatch;
      while ((tjMatch = tjRegex.exec(btMatch[1])) !== null) {
        extracted += tjMatch[1] + ' ';
      }
    }

    const trimmed = extracted.trim();
    const lines = trimmed.split('\n').map((l) => l.trim()).filter(Boolean);
    pages.push({
      pageNumber: i + 1,
      text: trimmed,
      headings: lines.length > 0 ? [lines[0]] : undefined,
    });
  }

  const totalLength = pages.reduce((sum, p) => sum + p.text.length, 0);
  const warnings = totalLength === 0 && pages.length > 0 ? ['scanned_or_image_only_pdf_requires_ocr'] : undefined;

  return {
    pageCount: pages.length,
    pages,
    warnings,
  };
}

const { recognizeImage, rasterizePdfPageNative, extractImagesFromPdfBuffer } = require('./ocrEngine');

/**
 * Applies hybrid OCR to pages with nearly zero or missing native text.
 */
async function applyHybridOcrIfNeeded(pdfBuffer, pages, options = {}) {
  const enableOcr = options.enableOcr !== false;
  if (!enableOcr) {
    for (const p of pages) {
      if (!p.extractionMethod) p.extractionMethod = 'native';
    }
    return pages;
  }

  // Pre-extract raw image XObjects from PDF buffer if available
  let extractedImages = null;

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const textLen = (page.text || '').trim().length;

    // Decision rule: Usable native text (> 40 chars) uses normal PDF text
    if (textLen > 40) {
      page.extractionMethod = 'native';
      continue;
    }

    // Page has nearly zero meaningful text (<= 40 chars). Check for raster scan / image
    let pageImageBuffer = rasterizePdfPageNative(pdfBuffer, page.pageNumber);

    if (!pageImageBuffer) {
      if (extractedImages === null) {
        extractedImages = extractImagesFromPdfBuffer(pdfBuffer);
      }
      if (extractedImages && extractedImages.length > i) {
        pageImageBuffer = extractedImages[i].data;
      } else if (extractedImages && extractedImages.length > 0 && pages.length === 1) {
        pageImageBuffer = extractedImages[0].data;
      }
    }

    if (pageImageBuffer) {
      const ocrResult = await recognizeImage(pageImageBuffer, {
        language: options.language || 'tur+eng',
        provenance: {
          pageNumber: page.pageNumber,
          imageIndex: i + 1,
        },
      });

      if (ocrResult && ocrResult.text && ocrResult.text.trim().length > 0) {
        // Prefer OCR text when native text is trivial/empty
        page.text = ocrResult.text.trim();
        page.extractionMethod = 'ocr';
        page.confidence = ocrResult.confidence;
        if (ocrResult.warnings && ocrResult.warnings.length > 0) {
          page.warnings = ocrResult.warnings;
        }
        continue;
      }
    }

    // Fallback: preserve original native text
    page.extractionMethod = 'native';
  }

  return pages;
}

/**
 * Parses a PDF buffer into structured pages and provenance metadata.
 */
async function parsePdfBuffer(buffer, options = {}) {
  if (!Buffer.isBuffer(buffer)) {
    throw new Error('Input must be a valid Buffer');
  }

  if (buffer.length > MAX_PDF_SIZE_BYTES) {
    const err = new Error('File exceeds maximum size of 5 MB');
    err.code = 'file_too_large';
    throw err;
  }

  const header = buffer.slice(0, 8).toString('ascii');
  if (!header.includes('%PDF-')) {
    const err = new Error('Invalid PDF: Missing %PDF header');
    err.code = 'invalid_format';
    throw err;
  }

  let result;
  if (pdfParseModule) {
    try {
      result = await parseWithPdfJs(buffer);
    } catch {
      result = parseWithFallback(buffer);
    }
  } else {
    result = parseWithFallback(buffer);
  }

  // Apply Hybrid OCR for scanned / image-only pages
  result.pages = await applyHybridOcrIfNeeded(buffer, result.pages, options);

  const totalTextLength = result.pages.reduce((sum, p) => sum + (p.text || '').length, 0);
  const ocrPagesCount = result.pages.filter((p) => p.extractionMethod === 'ocr').length;
  const warnings = [];

  if (result.pages.length === 0) {
    warnings.push('no_pages_found');
  } else if (totalTextLength === 0) {
    warnings.push('scanned_or_image_only_pdf_requires_ocr');
  } else if (ocrPagesCount > 0) {
    warnings.push('hybrid_ocr_applied');
  }

  result.warnings = warnings.length > 0 ? warnings : undefined;
  return result;
}

module.exports = {
  parsePdfBuffer,
  MAX_PDF_SIZE_BYTES,
  isMatureParserAvailable: () => pdfParseModule !== null,
};
