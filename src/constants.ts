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
// clear message instead of failing inside spawn(). The limit is in UTF-8
// bytes, because that is what the operating system counts.
//
// How many characters fit depends on the characters:
//
//   Character kind              Example             Bytes each   Fit in the limit
//   ASCII (ordinary math)       x, 7, +, (          1            100,000
//   Greek, accented Latin       U+03C0 (pi)         2             50,000
//   Chinese, Japanese, Korean   U+4E2D              3             33,333
//   Emoji, rare symbols         U+1F600             4             25,000
//
// So "x^2 + 1" is 7 characters and 7 bytes, while a 7-character string of
// Chinese text is 21 bytes. JavaScript's String.length is not a byte count:
// it reports 1 for each of the first three rows and 2 for each emoji.
// Use Buffer.byteLength(text, "utf8") to measure.
export const MAX_CODE_BYTES = 100_000;

// Upper bound on captured stdout/stderr per call (a plot is well under 1 MB).
export const MAX_OUTPUT_BYTES = 16 * 1024 * 1024;

// HTTP transport defaults.
export const DEFAULT_HTTP_HOST = "127.0.0.1";
export const DEFAULT_HTTP_PORT = 3000;
export const MIN_API_KEY_LENGTH = 16;
export const HTTP_BODY_LIMIT = "1mb";
