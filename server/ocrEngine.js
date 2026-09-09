// MedOS — Production-Grade Server-Side OCR Engine
// Handles standalone images (PNG, JPG, WebP), scanned PDFs, and PPTX embedded images.
// Supports English and Turkish (ç, ğ, ı, İ, ö, ş, ü).

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');
const zlib = require('zlib');

let tesseractJsModule = null;
try {
  tesseractJsModule = require(path.join(__dirname, 'node_modules', 'tesseract.js'));
} catch {
  try {
    tesseractJsModule = require('tesseract.js');
  } catch {
    tesseractJsModule = null;
  }
}

let hasNativeTesseract = null;
function checkNativeTesseract() {
  if (hasNativeTesseract !== null) return hasNativeTesseract;
  try {
    execSync('tesseract --version', { stdio: 'ignore' });
    hasNativeTesseract = true;
  } catch {
    hasNativeTesseract = false;
  }
  return hasNativeTesseract;
}

let hasPdftoppm = null;
function checkPdftoppm() {
  if (hasPdftoppm !== null) return hasPdftoppm;
  try {
    execSync('pdftoppm -v', { stdio: 'ignore' });
    hasPdftoppm = true;
  } catch {
    hasPdftoppm = false;
  }
  return hasPdftoppm;
}

/**
 * Normalizes recognized OCR text, preserving Turkish characters and clean paragraphs.
 */
function normalizeOcrText(raw) {
  if (!raw) return '';
  return raw
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Extracts raw raster images from PDF objects (e.g. DCTDecode JPEG or FlateDecode).
 */
function extractImagesFromPdfBuffer(pdfBuffer) {
  const images = [];
  const text = pdfBuffer.toString('binary');
  const objRegex = /(\d+)\s+(\d+)\s+obj([\s\S]*?)endobj/g;
  let match;

  while ((match = objRegex.exec(text)) !== null) {
    const objNum = parseInt(match[1], 10);
    const body = match[3];

    if (/\/Subtype\s*\/Image/.test(body)) {
      const streamIdx = body.indexOf('stream');
      if (streamIdx !== -1) {
        let streamStart = streamIdx + 6;
        if (body[streamStart] === '\r') streamStart++;
        if (body[streamStart] === '\n') streamStart++;

        const endstreamIdx = body.indexOf('endstream', streamStart);
        if (endstreamIdx !== -1) {
          const streamContent = body.slice(streamStart, endstreamIdx);
          const rawBuffer = Buffer.from(streamContent, 'binary');

          if (/\/Filter\s*\/DCTDecode/.test(body)) {
            // Direct JPEG image
            images.push({
              objNum,
              mimeType: 'image/jpeg',
              data: rawBuffer,
            });
          } else if (/\/Filter\s*\/FlateDecode/.test(body)) {
            try {
              const inflated = zlib.inflateSync(rawBuffer);
              images.push({
                objNum,
                mimeType: 'image/png',
                data: inflated,
              });
            } catch {
              // Ignore corrupt stream
            }
          }
        }
      }
    }
  }

  return images;
}

/**
 * Rasterizes a PDF page using pdftoppm if available.
 */
function rasterizePdfPageNative(pdfBuffer, pageNumber) {
  if (!checkPdftoppm()) return null;

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'medos-pdf-raster-'));
  const inputPdf = path.join(tempDir, 'input.pdf');
  const outputPrefix = path.join(tempDir, 'page');

  try {
    fs.writeFileSync(inputPdf, pdfBuffer);
    execSync(`pdftoppm -png -f ${pageNumber} -l ${pageNumber} -r 150 "${inputPdf}" "${outputPrefix}"`, {
      timeout: 10000,
      stdio: 'ignore',
    });

    const files = fs.readdirSync(tempDir);
    const pageFile = files.find((f) => f.startsWith('page') && f.endsWith('.png'));
    if (pageFile) {
      const pngBuffer = fs.readFileSync(path.join(tempDir, pageFile));
      return pngBuffer;
    }
    return null;
  } catch {
    return null;
  } finally {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup error
    }
  }
}

/**
 * Performs OCR on an image buffer using Native Tesseract CLI or Tesseract.js.
 * @param {Buffer} imageBuffer - Raw image bytes
 * @param {object} options - { language: 'tur+eng', provenance: {...} }
 */
async function recognizeImage(imageBuffer, options = {}) {
  const lang = options.language || 'tur+eng';
  const warnings = [];

  if (!imageBuffer || imageBuffer.length === 0) {
    return {
      text: '',
      language: lang,
      confidence: 0,
      warnings: ['empty_image_buffer'],
      extractionMethod: 'ocr',
    };
  }

  // 1. Try Native Tesseract CLI if available (fastest in Docker)
  if (checkNativeTesseract()) {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'medos-ocr-'));
    const inputPath = path.join(tempDir, 'ocr_input.png');

    try {
      fs.writeFileSync(inputPath, imageBuffer);
      // Run tesseract to stdout
      const stdout = execSync(`tesseract "${inputPath}" stdout -l ${lang} --oem 1`, {
        timeout: 15000,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      });

      const text = normalizeOcrText(stdout);
      return {
        text,
        language: lang,
        confidence: text.length > 0 ? 90 : 0,
        warnings: text.length === 0 ? ['no_text_detected'] : undefined,
        extractionMethod: 'ocr',
        sourceProvenance: options.provenance
          ? {
              ...options.provenance,
              extractionMethod: 'ocr',
            }
          : undefined,
      };
    } catch (nativeErr) {
      warnings.push(`native_ocr_failed: ${nativeErr.message}`);
    } finally {
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch {
        // Ignore cleanup
      }
    }
  }

  // 2. Try Tesseract.js (Node.js WebAssembly worker)
  if (tesseractJsModule) {
    try {
      const cachePath = path.join(os.tmpdir(), 'medos-tessdata');
      if (!fs.existsSync(cachePath)) {
        try { fs.mkdirSync(cachePath, { recursive: true }); } catch {}
      }
      const worker = await tesseractJsModule.createWorker(lang, undefined, {
        cachePath,
      });
      const ret = await worker.recognize(imageBuffer);
      await worker.terminate();

      const text = normalizeOcrText(ret.data?.text || '');
      const confidence = ret.data?.confidence || (text.length > 0 ? 80 : 0);

      return {
        text,
        language: lang,
        confidence: Math.round(confidence),
        warnings: text.length === 0 ? ['no_text_detected'] : (warnings.length > 0 ? warnings : undefined),
        extractionMethod: 'ocr',
        blocks: ret.data?.lines
          ? ret.data.lines.map((l) => ({
              text: l.text.trim(),
              confidence: l.confidence,
              bbox: l.bbox,
            }))
          : undefined,
        sourceProvenance: options.provenance
          ? {
              ...options.provenance,
              extractionMethod: 'ocr',
            }
          : undefined,
      };
    } catch (jsErr) {
      warnings.push(`tesseract_js_failed: ${jsErr.message}`);
    }
  }

  // 3. Fallback: If no OCR engine is executable or offline without traineddata
  return {
    text: '',
    language: lang,
    confidence: 0,
    warnings: warnings.length > 0 ? warnings : ['ocr_engine_unavailable'],
    extractionMethod: 'ocr',
    sourceProvenance: options.provenance
      ? {
          ...options.provenance,
          extractionMethod: 'ocr',
        }
      : undefined,
  };
}

module.exports = {
  recognizeImage,
  rasterizePdfPageNative,
  extractImagesFromPdfBuffer,
  normalizeOcrText,
  checkNativeTesseract,
  checkPdftoppm,
};
