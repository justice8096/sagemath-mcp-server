export const SERVER_NAME = "sagemath-mcp-server";
export const SERVER_VERSION = "1.1.0";

export const DEFAULT_SAGE_TIMEOUT = 30000; // 30 seconds
export const DEFAULT_SAGE_DOCKER_IMAGE = "sagemath/sagemath:latest";
export const DEFAULT_SAGE_DOCKER_NETWORK = "none";
export const DEFAULT_SAGE_DOCKER_MEMORY = "2g";
export const DEFAULT_SAGE_DOCKER_PIDS_LIMIT = 256;
export const DEFAULT_LOCALE = "en";
export const SUPPORTED_LOCALES = ["en", "es", "fr"];

// The program is passed to SageMath as one argv element. Operating systems cap
// the size of a single argument (128 KiB on Linux), so reject early with a
// clear message instead of failing inside spawn().
export const MAX_CODE_LENGTH = 100_000;

// Upper bound on captured stdout/stderr per call (a plot is well under 1 MB).
export const MAX_OUTPUT_BYTES = 16 * 1024 * 1024;

// HTTP transport defaults.
export const DEFAULT_HTTP_HOST = "127.0.0.1";
export const DEFAULT_HTTP_PORT = 3000;
export const MIN_API_KEY_LENGTH = 16;
export const HTTP_BODY_LIMIT = "1mb";
