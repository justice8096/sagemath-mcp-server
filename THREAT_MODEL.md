# Threat Model - SageMath MCP Server

Revised for 1.1.0 (2026-11-20) after three vulnerability reports. The earlier version of this document rated shell injection as mitigated. It was not.

## 1. System Overview

SageMath MCP Server provides 10 tools for mathematical computation. It speaks MCP over stdio (default) or Streamable HTTP. Each tool builds a short SageMath program from its arguments and runs it in a child process.

### Architecture

```
LLM client (Claude, etc.)
    | stdio JSON-RPC, or HTTP + API key
SageMath MCP Server (Node.js)
    | child process, argument array, no shell
SageMath (local binary, or a throwaway Docker container)
```

### Trust Boundaries

1. **Network to server (HTTP only).** Guarded by the API key. The server will not start in HTTP mode without one.
2. **Client to server.** Tool calls come from an LLM. The LLM may be acting on untrusted content it has read (prompt injection). Tool arguments are therefore untrusted.
3. **Server to SageMath.** The program is passed as one process argument. No shell is involved.
4. **SageMath to host.** SageMath code is Python. In local mode there is no boundary here. In Docker mode the container is the boundary.

## 2. Assets

| Asset | Sensitivity | Description |
|-------|-------------|-------------|
| Host file system and user account | HIGH | Reachable by SageMath code in local mode |
| Local network and cloud credentials | HIGH | Reachable by SageMath code in local mode |
| API key | HIGH | Grants code execution over HTTP |
| Docker socket | HIGH | Used by the server to start containers; never mounted into them |
| Math expressions and results | LOW | Transient; logged to stderr in the audit log |

## 3. Threat Analysis (STRIDE)

### Spoofing
- **Threat:** An unauthenticated party calls tools over HTTP.
- **Mitigation:** API key required to start; constant-time comparison; loopback bind by default.
- **Residual risk:** MEDIUM if exposed beyond loopback without TLS (the key travels in clear text). LOW on loopback.

### Tampering
- **Threat:** Shell command injection through tool arguments.
- **Mitigation:** No shell. The program is a single argv element. Docker mode bypasses the image entrypoint, which would otherwise re-parse arguments through `sh -c`. Regression tests cover the reported inputs.
- **Residual risk:** LOW.

- **Threat:** Python code in an expression argument (for example `__import__('os').system(...)`).
- **Mitigation:** The nine structured tools accept plain mathematics only, checked against an allow-list before anything runs. `sage_evaluate` accepts code by design; it is annotated as not read-only so clients prompt for approval. Docker mode confines the effect to a container with no network, no capabilities, and memory and process limits.
- **Residual risk:** For `sage_evaluate`: HIGH in local mode, LOW in Docker mode. For the other tools: LOW, and it depends on the allow-list being complete.

### Repudiation
- **Threat:** No record of what was run.
- **Mitigation:** Structured audit log of every tool call on stderr.
- **Residual risk:** LOW. The log is not tamper-proof.

### Information Disclosure
- **Threat:** SageMath code reads local files and returns them in a tool result.
- **Mitigation:** Docker mode. None in local mode.
- **Residual risk:** HIGH in local mode. LOW in Docker mode.

### Denial of Service
- **Threat:** Expensive or endless computations; very large requests or outputs.
- **Mitigation:** Per-call timeout that kills the process or container; 1 MB request limit; 16 MB output limit; container memory and process limits.
- **Residual risk:** LOW. No rate limiting; single-user design.

### Elevation of Privilege
- **Threat:** Code in the container gains root or reaches the host.
- **Mitigation:** `--cap-drop ALL` and `no-new-privileges` (the stock image gives its user passwordless sudo, which this blocks); no volumes; no network.
- **Residual risk:** LOW. Depends on the container runtime.

## 4. Risk Summary

| Risk | Severity | Status |
|------|----------|--------|
| Shell injection through tool arguments | CRITICAL | FIXED in 1.1.0 |
| Unauthenticated HTTP access | CRITICAL | FIXED in 1.1.0 |
| Python execution through `sage_evaluate`, local mode | HIGH | ACCEPTED, documented. Docker is preferred automatically; local mode is used only without Docker or by explicit setting |
| Python execution through `sage_evaluate`, Docker mode | LOW | CONFINED |
| Python execution through the nine structured tools | LOW | BLOCKED by the math-only allow-list |
| API key sent without TLS | MEDIUM | DOCUMENTED. Use a TLS proxy for remote access |
| Resource exhaustion | LOW | MITIGATED |

## 5. Recommended Improvements

1. Rate limiting on the HTTP transport.
2. Dependabot or Renovate for dependency updates.
