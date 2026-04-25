// When served from the Worker itself, use relative paths (no CORS).
// From any other origin (localhost, GitHub Pages), call the Worker directly.
const WORKER_URL = 'https://graphql.magnus6139.workers.dev';
export const PROXY = location.hostname === 'graphql.magnus6139.workers.dev' ? '' : WORKER_URL;
