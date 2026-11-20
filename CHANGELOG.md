# Changelog

## 1.1.0 - 2026-11-20

Security release. All users should upgrade. Versions 1.0.0 and 1.0.1 are vulnerable.

### Security

- **Command injection through tool arguments (CWE-78, GHSA-2q55-r7q3-v3g3, GHSA-p73q-cgp8-6qg6, issue #1).** In local mode the program was placed in a shell command line. The escaping was wrong, so input such as `$(...)` ran as a shell command. SageMath is now started without a shell and receives the program as one argument. The escaping helpers are gone.
- **Shell re-parsing inside the Docker container.** The stock `sagemath/sagemath` entrypoint joins its arguments and runs them through `sh -c`. That broke ordinary expressions and allowed injection inside the container. Docker mode now sets `--entrypoint sage`.
- **HTTP transport started without authentication (CWE-306, GHSA-rg88-jr3x-6547).** With `API_KEY` unset, every request was accepted on all interfaces. The HTTP transport now refuses to start without `API_KEY` (16 characters or more), binds to `127.0.0.1` unless `HOST` is set, and compares keys in constant time. `deploy/docker-compose.yml` fails if `API_KEY` is missing and publishes the port on loopback by default.
- **Docker confinement.** Each call now runs with `--network none`, `--cap-drop ALL`, `--security-opt no-new-privileges`, a memory limit and a process limit. A timed-out container is killed.
- **Timeouts now kill the process.** Before, a timed-out computation kept running.
- **Honest tool annotation.** `sage_evaluate` is no longer marked read-only, so clients ask before running it.
- **Math-only structured tools.** Every tool except `sage_evaluate` now checks its expressions against an allow-list: numbers, names, operators, brackets, and a fixed list of math functions. Code is refused before anything runs.
- **Argument validation.** Variable-name fields accept identifiers only. The plot title can no longer end its string literal.
- **Dependencies.** `npm audit fix` applied (MCP SDK, express, body-parser, hono, fast-uri).
- `SECURITY.md` and `THREAT_MODEL.md` rewritten. They wrongly said the server had no HTTP endpoints and that escaping prevented injection.

### Changed (may need action)

- Docker is now the default when both Docker and a local `sage` are present. Before, a local `sage` won. Set `SAGE_EXECUTION_MODE=local` to keep the old behaviour. If Docker is installed but not running, the server warns and uses the local `sage`.
- The nine structured tools refuse input that is not plain mathematics, including functions outside the allow-list in `src/services/expression-guard.ts`. Use `sage_evaluate` for anything else.
- The default `SAGE_TIMEOUT` is now 120 seconds (was 30). A first call on a busy host, or a cold Docker start, can take longer than 30 seconds.
- `TRANSPORT=http` without `API_KEY` now exits with an error.
- The HTTP transport listens on `127.0.0.1` by default. Set `HOST=0.0.0.0` to accept remote connections.
- `GET /health` returns only `{"status":"ok"}`. The earlier detail moved to `GET /status`, which needs the key.
- HTTP request bodies are limited to 1 MB (was 50 MB).
- Programs longer than 100,000 bytes are rejected.

### Added

- `SAGE_EXECUTION_MODE` (`auto`, `local`, `docker`), `SAGE_DOCKER_NETWORK`, `SAGE_DOCKER_MEMORY`, `SAGE_DOCKER_PIDS_LIMIT`, `HOST`.
- Test suite (`npm test`) with regression tests for both advisories.

### Fixed

- Tool descriptions and error details were missing in the published npm package, because the locale files were not shipped. They are now included, with built-in English as a fallback.
- `deploy/Dockerfile` copied directories that do not exist.
- SageMath and Docker detection no longer depends on `which`, so it works on Windows.
- Error messages no longer repeat "SageMath execution failed:" twice.
- The compose files run an init process, so finished helper processes no longer collect as zombies in the container.
- The HTTP transport now works on Node 18.

### Credits

Thanks to @cazy8 and @shravank75 for private reports, and to Still OS Digital Holdings for issue #1.

## 1.0.1 - 2026-05-18

Official MCP Registry submission.

## 1.0.0 - 2026-05-18

First public release.
