# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability in SageMath MCP Server, please report it responsibly.

**Do NOT open a public GitHub issue for security vulnerabilities.**

### How to Report

1. **Email:** Send a detailed report to security@example.com
2. **Include:**
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact assessment
   - Suggested fix (if any)

### What to Expect

- **Acknowledgment:** Within 48 hours of your report
- **Assessment:** Within 7 days, we will assess severity and impact
- **Resolution:** Critical vulnerabilities will be patched within 14 days
- **Disclosure:** We follow coordinated disclosure — we will work with you on timing

### Scope

The following are in scope for security reports:

- Command injection bypassing input sanitization in sage-executor
- Authentication or authorization bypass
- Credential exposure or leakage
- Dependency vulnerabilities with exploitable attack path
- Path traversal or file system access beyond intended scope

### Out of Scope

- Denial of service via resource exhaustion (MCP servers are single-user by design)
- Issues in upstream dependencies without a demonstrated exploit path
- Intended SageMath code execution (this is the core functionality)

## Security Design

### Architecture

SageMath MCP Server is an MCP (Model Context Protocol) tool server that communicates via stdio/JSON-RPC. It has no HTTP endpoints and is designed for local, single-user operation.

### Key Security Controls

- **Input sanitization:** Shell string escaping via `escapeShellString` for all user inputs passed to SageMath
- **Docker sandboxing:** Optional containerized execution with resource limits
- **Timeout enforcement:** All SageMath operations have configurable timeouts
- **No credential storage:** No API keys or secrets stored in codebase

### Threat Model Summary

See `THREAT_MODEL.md` for the full threat model document.
