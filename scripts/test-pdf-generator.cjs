// MedOS — Real-World PDF Corpus Generators for Phase 12.2
// Creates valid PDF fixtures representing 6 distinct real-world structures:
// A. Simple generated PDF
// B. Compressed PDF (FlateDecode)
// C. PowerPoint / Slide export PDF (landscape, multiple content streams, bulleted hierarchy)
// D. Turkish / Unicode PDF (Turkish medical terminology)
// E. Advanced Medical Terminology PDF (biochemical & clinical entities)
// F. Scanned / image-only PDF (no selectable text stream)

const zlib = require('zlib');
const { parsePdfBuffer } = require('../server/pdfParser.js');

/**
 * Builds a standards-compliant PDF 1.4 binary buffer with exact byte offset xref table.
 */
function buildPdf(objects) {
  let body = '%PDF-1.4\n';
  const offsets = {};
  const entries = Object.entries(objects).sort((a, b) => Number(a[0]) - Number(b[0]));

  for (const [id, content] of entries) {
    offsets[id] = body.length;
    if (Buffer.isBuffer(content)) {
      const header = Buffer.from(`${id} 0 obj\n`, 'binary');
      const footer = Buffer.from('\nendobj\n', 'binary');
      body = Buffer.concat([Buffer.from(body, 'binary'), header, content, footer]).toString('binary');
    } else {
      body += `${id} 0 obj\n${content}\nendobj\n`;
    }
  }

  const startxref = body.length;
  const maxId = Math.max(...Object.keys(objects).map(Number));
  let xref = `xref\n0 ${maxId + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= maxId; i++) {
    const off = String(offsets[i] || 0).padStart(10, '0');
    xref += `${off} 00000 n \n`;
  }
  const trailer = `trailer\n<< /Size ${maxId + 1} /Root 1 0 R >>\nstartxref\n${startxref}\n%%EOF\n`;
  return Buffer.from(body + xref + trailer, 'binary');
}

/**
 * A. Simple generated PDF (2 portrait pages, basic fonts and streams)
 */
function createSampleTwoPagePdf() {
  const page1Stream = [
    'BT',
    '/F1 14 Tf',
    '72 700 Td',
    '(Cardiovascular Physiology Overview) Tj',
    '0 -24 Td',
    '/F1 11 Tf',
    '(Cardiac output equals stroke volume multiplied by heart rate.) Tj',
    'ET',
  ].join('\n');

  const page2Stream = [
    'BT',
    '/F1 14 Tf',
    '72 700 Td',
    '(Myocardial Action Potential) Tj',
    '0 -24 Td',
    '/F1 11 Tf',
    '(Phase 0 rapid depolarization is mediated by voltage-gated sodium channels.) Tj',
    'ET',
  ].join('\n');

  return buildPdf({
    1: '<< /Type /Catalog /Pages 2 0 R >>',
    2: '<< /Type /Pages /Kids [3 0 R 4 0 R] /Count 2 >>',
    3: '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 6 0 R >>',
    4: '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 7 0 R >>',
    5: '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    6: `<< /Length ${page1Stream.length} >> stream\n${page1Stream}\nendstream`,
    7: `<< /Length ${page2Stream.length} >> stream\n${page2Stream}\nendstream`,
  });
}

/**
 * B. Compressed PDF (FlateDecode compressed zlib streams)
 */
function createSampleCompressedTwoPagePdf() {
  const page1Text = [
    'BT',
    '/F1 14 Tf',
    '72 700 Td',
    '(Pulmonary Physiology Principles) Tj',
    '0 -24 Td',
    '/F1 11 Tf',
    '(Ventilation perfusion mismatch is the most common cause of arterial hypoxemia.) Tj',
    'ET',
  ].join('\n');

  const page2Text = [
    'BT',
    '/F1 14 Tf',
    '72 700 Td',
    '(Oxygen Dissociation Curve) Tj',
    '0 -24 Td',
    '/F1 11 Tf',
    '(Rightward shift of the hemoglobin curve is facilitated by increased 2,3-DPG and acidosis.) Tj',
    'ET',
  ].join('\n');

  const comp1 = zlib.deflateSync(Buffer.from(page1Text, 'binary'));
  const comp2 = zlib.deflateSync(Buffer.from(page2Text, 'binary'));

  const stream6 = Buffer.concat([
    Buffer.from(`<< /Filter /FlateDecode /Length ${comp1.length} >> stream\n`, 'binary'),
    comp1,
    Buffer.from('\nendstream', 'binary'),
  ]);

  const stream7 = Buffer.concat([
    Buffer.from(`<< /Filter /FlateDecode /Length ${comp2.length} >> stream\n`, 'binary'),
    comp2,
    Buffer.from('\nendstream', 'binary'),
  ]);

  return buildPdf({
    1: '<< /Type /Catalog /Pages 2 0 R >>',
    2: '<< /Type /Pages /Kids [3 0 R 4 0 R] /Count 2 >>',
    3: '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 6 0 R >>',
    4: '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 7 0 R >>',
    5: '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    6: stream6,
    7: stream7,
  });
}

/**
 * C. PowerPoint / Keynote export slide PDF (16:9 widescreen landscape, multiple content streams per page)
 */
function createPowerPointStyleSlidePdf() {
  const slide1Header = 'BT /F1 20 Tf 50 480 Td (Klinik Kardiyoloji - Ders 4: Koroner Sendromlar) Tj ET';
  const slide1Body = 'BT /F1 14 Tf 50 430 Td (Miyokard Enfarktusu ve Akut Koroner Sendrom Yonetimi) Tj ET';

  const slide2Header = 'BT /F1 18 Tf 50 480 Td (ST Elevasyonlu Miyokard Enfarktusu: STEMI) Tj ET';
  const slide2Body = [
    'BT',
    '/F1 12 Tf',
    '50 420 Td',
    '(Patofizyoloji: Koroner aterom plagi rupturu ve intraluminal trombus olusumu) Tj',
    '0 -24 Td',
    '(EKG Kriterleri: En az iki komsu derivasyonda yeni ST segment elevasyonu) Tj',
    '0 -24 Td',
    '(Reperfuzyon Hedefi: Ilk 120 dakikada primer PCI) Tj',
    'ET',
  ].join('\n');

  return buildPdf({
    1: '<< /Type /Catalog /Pages 2 0 R >>',
    2: '<< /Type /Pages /Kids [3 0 R 4 0 R] /Count 2 >>',
    3: '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 960 540] /Resources << /Font << /F1 9 0 R >> >> /Contents [5 0 R 6 0 R] >>',
    4: '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 960 540] /Resources << /Font << /F1 9 0 R >> >> /Contents [7 0 R 8 0 R] >>',
    5: `<< /Length ${slide1Header.length} >> stream\n${slide1Header}\nendstream`,
    6: `<< /Length ${slide1Body.length} >> stream\n${slide1Body}\nendstream`,
    7: `<< /Length ${slide2Header.length} >> stream\n${slide2Header}\nendstream`,
    8: `<< /Length ${slide2Body.length} >> stream\n${slide2Body}\nendstream`,
    9: '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  });
}

/**
 * D. Turkish / Medical terminology PDF
 */
function createTurkishMedicalPdf() {
  const stream1 = [
    'BT',
    '/F1 14 Tf',
    '72 700 Td',
    '(Kardiyovaskuler Fizyoloji ve Sag Ventrikul Basinc-Hacim Iliskisi) Tj',
    '0 -24 Td',
    '/F1 11 Tf',
    '(Aort kapagi darligi, pulmoner hipertansiyon ve sistolik disfonksiyon) Tj',
    '0 -20 Td',
    '(Frank-Starling mekanizmasi ve ventrikuler kompliyans degisiklikleri) Tj',
    'ET',
  ].join('\n');

  const stream2 = [
    'BT',
    '/F1 14 Tf',
    '72 700 Td',
    '(Endokrinoloji: Diyabetik Ketoasidoz Patogenezi) Tj',
    '0 -24 Td',
    '/F1 11 Tf',
    '(Insulin eksikligi sonucu lipoliz ve serbest yag asitlerinin hepatik oksidasyonu) Tj',
    '0 -20 Td',
    '(Asetoasetat ve beta-hidroksibutirat birikimi ile gelisen anyon acikli metabolik asidoz) Tj',
    'ET',
  ].join('\n');

  return buildPdf({
    1: '<< /Type /Catalog /Pages 2 0 R >>',
    2: '<< /Type /Pages /Kids [3 0 R 4 0 R] /Count 2 >>',
    3: '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 6 0 R >>',
    4: '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 7 0 R >>',
    5: '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    6: `<< /Length ${stream1.length} >> stream\n${stream1}\nendstream`,
    7: `<< /Length ${stream2.length} >> stream\n${stream2}\nendstream`,
  });
}

/**
 * E. Complex Medical Terminology PDF
 */
function createMedicalTerminologyPdf() {
  const stream = [
    'BT',
    '/F1 14 Tf',
    '72 700 Td',
    '(Pharmacokinetics: Cytochrome P450 Enzyme Induction and Inhibition) Tj',
    '0 -24 Td',
    '/F1 11 Tf',
    '(Substrates of CYP3A4, CYP2D6, and CYP2C9 undergo extensive first-pass hepatic metabolism.) Tj',
    '0 -20 Td',
    '(Clopidogrel requires bioactivation via CYP2C19 to form its active antiplatelet metabolite.) Tj',
    '0 -20 Td',
    '(Amiodarone and fluconazole act as potent inhibitors causing elevated serum concentrations.) Tj',
    'ET',
  ].join('\n');

  return buildPdf({
    1: '<< /Type /Catalog /Pages 2 0 R >>',
    2: '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    3: '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    4: '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    5: `<< /Length ${stream.length} >> stream\n${stream}\nendstream`,
  });
}

/**
 * F. Scanned / image-only PDF (Page object has MediaBox but zero selectable text content stream)
 */
function createScannedImageOnlyPdf() {
  return buildPdf({
    1: '<< /Type /Catalog /Pages 2 0 R >>',
    2: '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    3: '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>',
  });
}

if (require.main === module) {
  async function testAll() {
    console.log('Testing PDF Corpus:');
    const a = await parsePdfBuffer(createSampleTwoPagePdf());
    console.log('A (Simple): pages =', a.pageCount, 'title =', a.pages[0]?.headings?.[0]);

    const b = await parsePdfBuffer(createSampleCompressedTwoPagePdf());
    console.log('B (Compressed): pages =', b.pageCount, 'title =', b.pages[0]?.headings?.[0]);

    const c = await parsePdfBuffer(createPowerPointStyleSlidePdf());
    console.log('C (PowerPoint): pages =', c.pageCount, 'title =', c.pages[0]?.headings?.[0]);

    const d = await parsePdfBuffer(createTurkishMedicalPdf());
    console.log('D (Turkish): pages =', d.pageCount, 'title =', d.pages[0]?.headings?.[0]);

    const e = await parsePdfBuffer(createMedicalTerminologyPdf());
    console.log('E (Medical Terms): pages =', e.pageCount, 'title =', e.pages[0]?.headings?.[0]);

    const f = await parsePdfBuffer(createScannedImageOnlyPdf());
    console.log('F (Scanned): pages =', f.pageCount, 'warnings =', f.warnings);
  }
  testAll().catch(console.error);
}

module.exports = {
  createSampleTwoPagePdf,
  createSampleCompressedTwoPagePdf,
  createPowerPointStyleSlidePdf,
  createTurkishMedicalPdf,
  createMedicalTerminologyPdf,
  createScannedImageOnlyPdf,
};
