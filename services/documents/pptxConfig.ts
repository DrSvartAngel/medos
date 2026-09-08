// MedOS — Phase 12.3: PPTX Extraction Service Configuration
// Isolated configuration for external PPTX slide extraction endpoint.
// Reuses extraction service infrastructure securely.

import { getPdfExtractionEndpoint, isEndpointSecureForRuntime } from './pdfConfig';

let customPptxEndpoint: string | null = null;

/**
 * Returns the currently configured PPTX extraction endpoint URL, or null if unconfigured.
 * Automatically falls back to the common MedOS extraction service endpoint.
 */
export function getPptxExtractionEndpoint(): string | null {
  let url: string | null = null;

  if (customPptxEndpoint !== null) {
    url = customPptxEndpoint;
  } else if (
    typeof process !== 'undefined' &&
    process.env &&
    process.env.EXPO_PUBLIC_PPTX_EXTRACTION_URL
  ) {
    const envUrl = process.env.EXPO_PUBLIC_PPTX_EXTRACTION_URL.trim();
    if (envUrl.length > 0) url = envUrl;
  }

  // Fallback to shared extraction service endpoint
  if (!url) {
    url = getPdfExtractionEndpoint();
  }

  if (!url) return null;

  if (!isEndpointSecureForRuntime(url)) {
    return null;
  }

  return url;
}

/**
 * Sets or clears the active PPTX extraction service endpoint URL.
 */
export function setPptxExtractionEndpoint(url: string | null): void {
  if (url === null) {
    customPptxEndpoint = null;
    return;
  }
  const trimmed = url.trim();
  customPptxEndpoint = trimmed.length > 0 ? trimmed.replace(/\/+$/, '') : null;
}
