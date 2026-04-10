# Threat Model — SageMath MCP Server

## 1. System Overview

SageMath MCP Server is an MCP (Model Context Protocol) tool server providing 10 tools for mathematical computation. It communicates via stdio/JSON-RPC and is designed for local, single-user operation.

### Architecture

```
LLM Client (Claude, etc.)
    ↕ stdio/JSON-RPC
SageMath MCP Server (MCP Server)
    ↕ child_process / Docker
SageMath CAS Engine
```

### Trust Boundaries

1. **LLM ↔ MCP Server:** The MCP protocol boundary. Tool invocations come from the LLM client. Input validation (Zod schemas) is the primary control.
2. **MCP Server ↔ SageMath:** The system boundary. Commands are passed to a shell; escaping and Docker sandboxing are controls.

## 2. Assets

| Asset | Sensitivity | Description |
|-------|-------------|-------------|
| User math expressions | LOW | Mathematical expressions submitted for evaluation |
| SageMath execution environment | HIGH | Shell access to SageMath CAS — can execute arbitrary Python |
| Host file system | HIGH | Accessible if SageMath sandbox is bypassed |
| Docker socket (if used) | MEDIUM | Container management access |

## 3. Threat Analysis (STRIDE)

### Spoofing
- **Threat:** Malicious LLM client sends crafted tool invocations
- **Mitigation:** MCP protocol requires explicit tool invocation; Zod schema validation on all inputs
- **Residual risk:** LOW — single-user, local operation

### Tampering
- **Threat:** Injection of shell commands via crafted math expressions
- **Mitigation:** `escapeShellString` sanitization; optional Docker containerization with resource limits
- **Residual risk:** LOW — SageMath's own parser restricts most system operations

### Repudiation
- **Threat:** No audit trail of tool invocations
- **Mitigation:** None currently — **gap identified**
- **Recommendation:** Add structured logging of all tool invocations with timestamps

### Information Disclosure
- **Threat:** Math expression results could contain sensitive computed values
- **Mitigation:** No persistence — results are transient in the MCP response
- **Residual risk:** LOW

### Denial of Service
- **Threat:** Resource exhaustion via expensive mathematical computations
- **Mitigation:** Configurable execution timeouts; Docker resource limits (if enabled)
- **Residual risk:** LOW — single-user design accepts this risk

### Elevation of Privilege
- **Threat:** Escape from SageMath sandbox to gain host shell access
- **Mitigation:** Docker containerization option isolates execution; `escapeShellString` prevents shell metacharacter injection
- **Residual risk:** MEDIUM — native (non-Docker) mode runs SageMath with user privileges

## 4. Risk Summary

| Risk | Severity | Likelihood | Mitigation Status |
|------|----------|------------|-------------------|
| Shell injection via math expressions | HIGH | LOW | MITIGATED — escapeShellString + Docker option |
| SageMath sandbox escape | HIGH | LOW | PARTIALLY MITIGATED — Docker recommended for untrusted input |
| Resource exhaustion | MEDIUM | LOW | MITIGATED — timeouts configured |
| No audit logging | LOW | N/A | GAP — recommended improvement |

## 5. Recommended Improvements

1. **Add structured audit logging** for all tool invocations
2. **Implement rate limiting** on tool calls to prevent abuse
3. **Default to Docker mode** for untrusted environments
4. **Add automated security scanning** in CI/CD pipeline (implemented — see .github/workflows/ci.yml)
5. **Regular dependency updates** via Dependabot or Renovate
