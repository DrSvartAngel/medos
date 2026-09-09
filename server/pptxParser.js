// MedOS — Production-Grade Server-Side PPTX Slide Parser
// Parses OOXML PPTX presentation packages, preserving:
// - Slide order & slide numbers
// - Slide titles & text hierarchy (nested bullet levels)
// - Real tables (rows, columns, cell content)
// - Speaker notes per slide
// - Image & diagram references (relationships, alt text)
// - Turkish / Unicode medical terminology

const zlib = require('zlib');
const path = require('path');

const MAX_PPTX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

let AdmZip = null;
try {
  AdmZip = require(path.join(__dirname, 'node_modules', 'adm-zip'));
} catch {
  try {
    AdmZip = require('adm-zip');
  } catch {
    AdmZip = null;
  }
}

/**
 * Fallback zero-dependency ZIP directory extractor using pure Node.js zlib.
 */
function extractZipEntriesNative(buffer) {
  const entries = new Map();

  // Search for End of Central Directory Record (EOCD) signature: 0x06054b50
  let eocdOffset = -1;
  for (let i = buffer.length - 22; i >= Math.max(0, buffer.length - 65557); i--) {
    if (buffer.readUInt32LE(i) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }

  if (eocdOffset !== -1) {
    const totalEntries = buffer.readUInt16LE(eocdOffset + 10);
    const cdOffset = buffer.readUInt32LE(eocdOffset + 16);
    let curr = cdOffset;

    for (let i = 0; i < totalEntries && curr < eocdOffset; i++) {
      if (buffer.readUInt32LE(curr) !== 0x02014b50) break;
      const method = buffer.readUInt16LE(curr + 10);
      const compSize = buffer.readUInt32LE(curr + 20);
      const uncompSize = buffer.readUInt32LE(curr + 24);
      const nameLen = buffer.readUInt16LE(curr + 28);
      const extraLen = buffer.readUInt16LE(curr + 30);
      const commentLen = buffer.readUInt16LE(curr + 32);
      const localHeaderOffset = buffer.readUInt32LE(curr + 42);

      const name = buffer.slice(curr + 46, curr + 46 + nameLen).toString('utf8');
      curr += 46 + nameLen + extraLen + commentLen;

      if (buffer.readUInt32LE(localHeaderOffset) !== 0x04034b50) continue;
      const localNameLen = buffer.readUInt16LE(localHeaderOffset + 26);
      const localExtraLen = buffer.readUInt16LE(localHeaderOffset + 28);
      const dataOffset = localHeaderOffset + 30 + localNameLen + localExtraLen;
      const compData = buffer.slice(dataOffset, dataOffset + compSize);

      let data;
      try {
        if (method === 0) {
          data = compData;
        } else if (method === 8) {
          data = zlib.inflateRawSync(compData);
        } else {
          continue;
        }
        entries.set(name, data.toString('utf8'));
      } catch {
        // Skip corrupted entry
      }
    }
    return entries;
  }

  // Fallback: scan local headers sequentially
  let offset = 0;
  while (offset < buffer.length - 30) {
    if (buffer.readUInt32LE(offset) !== 0x04034b50) break;
    const method = buffer.readUInt16LE(offset + 8);
    const compSize = buffer.readUInt32LE(offset + 18);
    const nameLen = buffer.readUInt16LE(offset + 26);
    const extraLen = buffer.readUInt16LE(offset + 28);
    const name = buffer.slice(offset + 30, offset + 30 + nameLen).toString('utf8');
    const dataOffset = offset + 30 + nameLen + extraLen;
    const compData = buffer.slice(dataOffset, dataOffset + compSize);

    try {
      let data;
      if (method === 0) data = compData;
      else if (method === 8) data = zlib.inflateRawSync(compData);
      if (data) entries.set(name, data.toString('utf8'));
    } catch {
      // Ignore corrupted item
    }
    offset = dataOffset + compSize;
  }

  return entries;
}

/**
 * Extracts map of filename -> { text: string, buffer: Buffer } from PPTX ZIP buffer.
 */
function getZipEntries(buffer) {
  const textEntries = new Map();
  const binaryEntries = new Map();

  if (AdmZip) {
    try {
      const zip = new AdmZip(buffer);
      const zipEntries = zip.getEntries();
      for (const entry of zipEntries) {
        if (!entry.isDirectory) {
          const raw = entry.getData();
          binaryEntries.set(entry.entryName, raw);
          try {
            textEntries.set(entry.entryName, raw.toString('utf8'));
          } catch {
            // Non-UTF8 binary entry
          }
        }
      }
      return { textEntries, binaryEntries };
    } catch {
      // Fallback to native
    }
  }

  const nativeText = extractZipEntriesNative(buffer);
  return { textEntries: nativeText, binaryEntries: new Map() };
}

/**
 * Unescapes XML entities safely.
 */
function unescapeXml(str) {
  if (!str) return '';
  return str
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

/**
 * Extracts text from XML elements matching <...:t>...</...:t>.
 */
function extractTextRuns(xml) {
  const tRegex = /<(?:[a-zA-Z0-9]+:)?t(?:\s[^>]*)?>([\s\S]*?)<\/(?:[a-zA-Z0-9]+:)?t>/g;
  const runs = [];
  let m;
  while ((m = tRegex.exec(xml)) !== null) {
    runs.push(unescapeXml(m[1]));
  }
  return runs.join('');
}

/**
 * Determines slide order from ppt/presentation.xml and relationships.
 */
function resolveSlideOrder(entries) {
  const orderedSlideFiles = [];

  const presXml = entries.get('ppt/presentation.xml');
  const presRelsXml = entries.get('ppt/_rels/presentation.xml.rels');

  if (presXml && presRelsXml) {
    // Map rId -> target slide file
    const relMap = new Map();
    const relRegex = /<Relationship[^>]+Id="([^"]+)"[^>]+Target="([^"]+)"/g;
    let rMatch;
    while ((rMatch = relRegex.exec(presRelsXml)) !== null) {
      let target = rMatch[2];
      if (!target.startsWith('ppt/')) {
        target = 'ppt/' + target.replace(/^\//, '');
      }
      relMap.set(rMatch[1], target);
    }

    // Read slideId list
    const sldIdRegex = /<p:sldId[^>]+r:id="([^"]+)"/g;
    let sMatch;
    while ((sMatch = sldIdRegex.exec(presXml)) !== null) {
      const targetFile = relMap.get(sMatch[1]);
      if (targetFile && entries.has(targetFile)) {
        orderedSlideFiles.push(targetFile);
      }
    }
  }

  // Fallback if presentation.xml is missing or empty: sort slide files numerically
  if (orderedSlideFiles.length === 0) {
    const slideNames = Array.from(entries.keys()).filter((k) =>
      /^ppt\/slides\/slide\d+\.xml$/.test(k)
    );
    slideNames.sort((a, b) => {
      const numA = parseInt(a.match(/\d+/)[0], 10);
      const numB = parseInt(b.match(/\d+/)[0], 10);
      return numA - numB;
    });
    return slideNames;
  }

  return orderedSlideFiles;
}

/**
 * Extracts relationship targets (images, notes) for a given slide.
 */
function extractSlideRelationships(slideFile, entries) {
  const dir = path.dirname(slideFile);
  const base = path.basename(slideFile);
  const relFile = `${dir}/_rels/${base}.rels`;
  const relXml = entries.get(relFile);

  const images = new Map(); // rId -> media path
  let notesFile = null;

  if (relXml) {
    const relRegex = /<Relationship[^>]+Id="([^"]+)"[^>]+Type="([^"]+)"[^>]+Target="([^"]+)"/g;
    let match;
    while ((match = relRegex.exec(relXml)) !== null) {
      const id = match[1];
      const type = match[2];
      let target = match[3];

      if (type.includes('relationships/notesSlide')) {
        // e.g. ../notesSlides/notesSlide1.xml -> ppt/notesSlides/notesSlide1.xml
        notesFile = path.posix.normalize(`${dir}/${target}`);
      } else if (type.includes('relationships/image')) {
        images.set(id, path.posix.basename(target));
      }
    }
  }

  return { images, notesFile };
}

/**
 * Parses an individual slide XML.
 */
function parseSlideXml(slideXml, slideNumber, relationships, entries) {
  let title = '';
  const textBlocks = [];
  const tables = [];
  const imageReferences = [];

  // 1. Extract Shapes (<p:sp>)
  const spRegex = /<p:sp\b[\s\S]*?<\/p:sp>/g;
  let spMatch;

  while ((spMatch = spRegex.exec(slideXml)) !== null) {
    const spContent = spMatch[0];

    // Check if this shape is a title placeholder
    const isTitle = /<p:ph\b[^>]*type="(?:title|ctrTitle)"/.test(spContent);

    // Extract paragraphs within this shape
    const pRegex = /<a:p\b[\s\S]*?<\/a:p>/g;
    let pMatch;
    const shapeLines = [];

    while ((pMatch = pRegex.exec(spContent)) !== null) {
      const pContent = pMatch[0];

      // Bullet level: <a:pPr lvl="1">
      const lvlMatch = pContent.match(/<a:pPr\b[^>]*lvl="(\d+)"/);
      const lvl = lvlMatch ? parseInt(lvlMatch[1], 10) : 0;

      const rawText = extractTextRuns(pContent).trim();
      if (rawText.length > 0) {
        if (isTitle && !title) {
          title = rawText;
        } else {
          const indent = '  '.repeat(lvl);
          const bullet = lvl > 0 ? `${indent}- ${rawText}` : rawText;
          shapeLines.push(bullet);
        }
      }
    }

    if (shapeLines.length > 0) {
      textBlocks.push(shapeLines.join('\n'));
    }
  }

  // 2. Extract Tables (<a:tbl>)
  const tblRegex = /<a:tbl\b[\s\S]*?<\/a:tbl>/g;
  let tblMatch;
  while ((tblMatch = tblRegex.exec(slideXml)) !== null) {
    const tblXml = tblMatch[0];
    const trRegex = /<a:tr\b[\s\S]*?<\/a:tr>/g;
    let trMatch;
    const tableRows = [];

    while ((trMatch = trRegex.exec(tblXml)) !== null) {
      const trXml = trMatch[0];
      const tcRegex = /<a:tc\b[\s\S]*?<\/a:tc>/g;
      let tcMatch;
      const rowCells = [];

      while ((tcMatch = tcRegex.exec(trXml)) !== null) {
        const cellText = extractTextRuns(tcMatch[0]).trim();
        rowCells.push(cellText);
      }

      if (rowCells.some((c) => c.length > 0)) {
        tableRows.push(rowCells);
      }
    }

    if (tableRows.length > 0) {
      tables.push({ rows: tableRows });
    }
  }

  // 3. Extract Image / Diagram references (<p:pic>)
  const picRegex = /<p:pic\b[\s\S]*?<\/p:pic>/g;
  let picMatch;
  while ((picMatch = picRegex.exec(slideXml)) !== null) {
    const picXml = picMatch[0];
    const blipMatch = picXml.match(/<a:blip\b[^>]*r:embed="([^"]+)"/);
    const altMatch = picXml.match(/<p:cNvPr\b[^>]*(?:descr|title)="([^"]+)"/);

    const relId = blipMatch ? blipMatch[1] : '';
    const altText = altMatch ? unescapeXml(altMatch[1]) : undefined;
    const target = relId ? relationships.images.get(relId) : undefined;

    if (relId || target) {
      imageReferences.push({
        relId,
        target,
        altText,
      });
    }
  }

  // 4. Extract Speaker Notes if associated
  let notes = '';
  if (relationships.notesFile && entries.has(relationships.notesFile)) {
    const notesXml = entries.get(relationships.notesFile);
    const notesSpRegex = /<p:sp\b[\s\S]*?<\/p:sp>/g;
    let nMatch;
    const noteLines = [];

    while ((nMatch = notesSpRegex.exec(notesXml)) !== null) {
      const nSp = nMatch[0];
      // Exclude slide number / header placeholders in notes
      if (!/<p:ph\b[^>]*type="(?:sldNum|hdr|ftr)"/.test(nSp)) {
        const pRegex = /<a:p\b[\s\S]*?<\/a:p>/g;
        let npMatch;
        while ((npMatch = pRegex.exec(nSp)) !== null) {
          const t = extractTextRuns(npMatch[0]).trim();
          if (t.length > 0) noteLines.push(t);
        }
      }
    }
    notes = noteLines.join('\n').trim();
  }

  // Build combined text body for this slide
  let slideBody = textBlocks.join('\n\n');

  // Format tables into markdown representation
  if (tables.length > 0) {
    const tableMarkdown = tables
      .map((tbl) => {
        const colCount = Math.max(...tbl.rows.map((r) => r.length), 1);
        const header = '| ' + tbl.rows[0].map((c) => c || ' ').join(' | ') + ' |';
        const separator = '| ' + new Array(colCount).fill('---').join(' | ') + ' |';
        const body = tbl.rows
          .slice(1)
          .map((r) => {
            const padded = [...r];
            while (padded.length < colCount) padded.push('');
            return '| ' + padded.map((c) => c || ' ').join(' | ') + ' |';
          })
          .join('\n');
        return [header, separator, body].filter(Boolean).join('\n');
      })
      .join('\n\n');

    slideBody += (slideBody ? '\n\n' : '') + tableMarkdown;
  }

  // Append image reference badges if any
  if (imageReferences.length > 0) {
    const imgBadge = imageReferences
      .map((img) => `[Image: ${img.target || img.relId}${img.altText ? ` - ${img.altText}` : ''}]`)
      .join('\n');
    slideBody += (slideBody ? '\n\n' : '') + imgBadge;
  }

  // If no title found via placeholder, use first line if short
  if (!title && textBlocks.length > 0) {
    const firstLine = textBlocks[0].split('\n')[0].replace(/^[-*•]\s*/, '').trim();
    if (firstLine.length > 0 && firstLine.length <= 100) {
      title = firstLine;
    }
  }

  return {
    slideNumber,
    title: title || undefined,
    text: slideBody.trim(),
    notes: notes || undefined,
    tables: tables.length > 0 ? tables : undefined,
    images: imageReferences.length > 0 ? imageReferences : undefined,
  };
}

const { recognizeImage } = require('./ocrEngine');

/**
 * Parses a PPTX buffer into structured slides.
 */
async function parsePptxBuffer(buffer, options = {}) {
  if (!Buffer.isBuffer(buffer)) {
    throw new Error('Input must be a valid Buffer');
  }

  if (buffer.length > MAX_PPTX_SIZE_BYTES) {
    const err = new Error('File exceeds maximum size of 5 MB');
    err.code = 'file_too_large';
    throw err;
  }

  // Validate ZIP magic bytes (PK\x03\x04 or 0x04034b50)
  if (buffer.length < 4 || buffer.readUInt32LE(0) !== 0x04034b50) {
    const err = new Error('Invalid presentation: Missing ZIP PK header');
    err.code = 'invalid_format';
    throw err;
  }

  const { textEntries, binaryEntries } = getZipEntries(buffer);
  const entries = textEntries;
  if (entries.size === 0) {
    const err = new Error('Invalid presentation: Empty or corrupted ZIP container');
    err.code = 'corrupted_archive';
    throw err;
  }

  const slideFiles = resolveSlideOrder(entries);
  if (slideFiles.length === 0) {
    return {
      status: 'empty',
      slideCount: 0,
      slides: [],
      warnings: ['no_slides_found'],
    };
  }

  const slides = [];
  const enableOcr = options.enableOcr !== false;

  for (let i = 0; i < slideFiles.length; i++) {
    const file = slideFiles[i];
    const xml = entries.get(file);
    if (!xml) continue;

    const rels = extractSlideRelationships(file, entries);
    const slide = parseSlideXml(xml, i + 1, rels, entries);

    // Run OCR on embedded images if enabled
    if (enableOcr && slide.images && slide.images.length > 0 && binaryEntries.size > 0) {
      for (let imgIdx = 0; imgIdx < slide.images.length; imgIdx++) {
        const img = slide.images[imgIdx];
        let targetKey = img.target;
        if (targetKey) {
          if (targetKey.startsWith('../')) {
            targetKey = 'ppt/' + targetKey.replace(/^\.\.\//, '');
          } else if (!targetKey.startsWith('ppt/')) {
            targetKey = 'ppt/' + targetKey;
          }
        }

        const imgBuffer = targetKey ? binaryEntries.get(targetKey) : null;
        if (imgBuffer) {
          try {
            const ocrResult = await recognizeImage(imgBuffer, {
              language: options.language || 'tur+eng',
              provenance: {
                slideNumber: slide.slideNumber,
                mediaId: img.relId,
                imageIndex: imgIdx + 1,
              },
            });

            if (ocrResult && ocrResult.text && ocrResult.text.trim().length > 0) {
              img.ocrText = ocrResult.text.trim();
              img.ocrConfidence = ocrResult.confidence;
              img.extractionMethod = 'ocr';
              slide.text += `\n\n[OCR - Image ${imgIdx + 1}]\n${img.ocrText}`;
            }
          } catch {
            // Ignore single image OCR failure
          }
        }
      }

      slide.visualAssets = slide.images.map((img, idx) => ({
        slideNumber: slide.slideNumber,
        mediaId: img.relId,
        imageIndex: idx + 1,
        target: img.target,
        altText: img.altText,
        ocrText: img.ocrText,
        ocrConfidence: img.ocrConfidence,
        provenance: {
          slideNumber: slide.slideNumber,
          mediaId: img.relId,
          imageIndex: idx + 1,
          extractionMethod: img.ocrText ? 'ocr' : 'native',
        },
      }));
    }

    slides.push(slide);
  }

  const totalTextLength = slides.reduce(
    (sum, s) => sum + s.text.length + (s.notes ? s.notes.length : 0),
    0
  );

  const warnings = [];
  if (totalTextLength === 0) {
    warnings.push('empty_slides_no_text');
  }

  return {
    status: totalTextLength > 0 ? 'success' : 'empty',
    slideCount: slides.length,
    slides,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

module.exports = {
  parsePptxBuffer,
  MAX_PPTX_SIZE_BYTES,
  isMaturePptxParserAvailable: () => AdmZip !== null,
};
