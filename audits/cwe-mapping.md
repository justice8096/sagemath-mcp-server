# CWE Mapping Report

**Project:** SageMath MCP Server
**Date:** 2026-04-09
**Audit Cycle:** Initial Audit
**Source Findings:** SAST/DAST Scan + Supply Chain Audit
**Unique CWEs:** 2

---

## CWE Inventory

| CWE ID | Name | Severity | Count | Status |
|--------|------|----------|-------|--------|
| CWE-22 | Path Traversal | MEDIUM | 16 | FALSE POSITIVE |
| CWE-78 | OS Command Injection | HIGH | 5 | ACCEPTED (by-design) |

---

## Compliance Framework Mapping

| CWE | OWASP Top 10 2021 | OWASP LLM Top 10 2025 | NIST SP 800-53 | ISO 27001 |
|-----|-------------------|----------------------|----------------|-----------|
| CWE-22 | A01:2021 Broken Access Control | — | AC-6, SI-10 | A.8.3 |
| CWE-78 | A03:2021 Injection | LLM01 (Prompt Injection) | SI-10, SC-18 | A.8.28 |

---

## Overall Assessment

**2 unique CWEs** identified. CWE-78 findings are accepted by design — the project's core purpose is executing SageMath CAS commands. CWE-22 findings are all false positives (TypeScript relative imports). **No actionable security vulnerabilities found.**
