// Tiny inline SVG used as `placeholder="blur"` data URI for next/image.
// Avoids the network round-trip of a real LQIP while still giving a soft
// neutral background during loading.

const SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#f1f5f9"/><stop offset="100%" stop-color="#e2e8f0"/></linearGradient></defs><rect width="40" height="40" fill="url(#g)"/></svg>`;

export const BLUR_DATA_URL = `data:image/svg+xml;base64,${Buffer.from(SVG).toString('base64')}`;

// Browser-safe variant (Buffer is Node-only on the client; for client modules
// we precompute the base64 string at build time below).
export const BLUR_DATA_URL_STATIC =
  'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgdmlld0JveD0iMCAwIDQwIDQwIj48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImciIHgxPSIwIiB5MT0iMCIgeDI9IjEiIHkyPSIxIj48c3RvcCBvZmZzZXQ9IjAlIiBzdG9wLWNvbG9yPSIjZjFmNWY5Ii8+PHN0b3Agb2Zmc2V0PSIxMDAlIiBzdG9wLWNvbG9yPSIjZTJlOGYwIi8+PC9saW5lYXJHcmFkaWVudD48L2RlZnM+PHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBmaWxsPSJ1cmwoI2cpIi8+PC9zdmc+';
