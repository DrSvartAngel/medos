// MedOS — Phase 12.2: PDF Extraction Service Configuration
// Clean, isolated configuration for external PDF extraction endpoint.
// Never exposes credentials or hardcodes production secrets.

let customExtractionEndpoint: string | null = null;

declare const __DEV__: boolean;

/**
 * Checks whether an endpoint URL meets security requirements for the active runtime.
 * Production builds strictly require HTTPS to protect medical/study source confidentiality.
 */
export function isEndpointSecureForRuntime(url: string): boolean {
  const isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV !== 'production';
  if (isDev) return true;
  return url.toLowerCase().startsWith('https://');
}

/**
 * Returns the currently configured PDF extraction endpoint URL, or null if unconfigured.
 */
export function getPdfExtractionEndpoint(): string | null {
  let url: string | null = null;

  if (customExtractionEndpoint !== null) {
    url = customExtractionEndpoint;
  } else if (
    typeof process !== 'undefined' &&
    process.env &&
    process.env.EXPO_PUBLIC_PDF_EXTRACTION_URL
  ) {
    const envUrl = process.env.EXPO_PUBLIC_PDF_EXTRACTION_URL.trim();
    if (envUrl.length > 0) url = envUrl;
  }

  if (!url) return null;

  if (!isEndpointSecureForRuntime(url)) {
    // In production, refuse unencrypted HTTP transport
    return null;
  }

  return url;
}

/**
 * Sets or clears the active PDF extraction service endpoint URL.
 */
export function setPdfExtractionEndpoint(url: string | null): void {
  if (url === null) {
    customExtractionEndpoint = null;
    return;
  }
  const trimmed = url.trim();
  customExtractionEndpoint = trimmed.length > 0 ? trimmed.replace(/\/+$/, '') : null;
}
