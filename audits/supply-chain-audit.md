# Supply Chain Security Audit Report

**Project:** SageMath MCP Server
**Audit Date:** 2026-04-09 (Initial Audit)
**Branch:** main
**SLSA Level:** 0
**Ecosystems:** npm

---

## Supply Chain Posture

| Check | Status |
|-------|--------|
| Lockfile present | ✅ YES (package-lock.json) |
| .gitignore present | ✅ YES |
| SBOM present | ❌ NO |
| CI/CD configured | ❌ NO |
| SECURITY.md | ❌ NO |
| LICENSE | ❌ NO |
| Dependency pinning | none-pinned |
| Total dependencies | 7 |

---

## SLSA Level Assessment: L0

| SLSA Requirement | Status |
|---|---|
| Source versioned | ✅ MET — Git repository |
| Build scripted | ❌ NOT MET — No CI/CD pipeline |
| Build service | ❌ NOT MET |
| Lockfile integrity | ✅ MET |
| Provenance generated | ❌ ABSENT |
| Hermetic build | ❌ ABSENT |

---

## Findings

### HIGH — No CI/CD Pipeline

- No GitHub Actions, GitLab CI, or other CI configuration detected.
- Builds and tests are not automated.
- **Remediation:** Add GitHub Actions workflow for automated testing and linting.

### MEDIUM — No SECURITY.md

- No security policy or vulnerability disclosure process documented.
- **Remediation:** Add SECURITY.md with vulnerability reporting instructions.

### MEDIUM — No LICENSE File

- No license file found. Code usage rights are unclear.
- **Remediation:** Add MIT, Apache-2.0, or other appropriate license file.

### MEDIUM — No SBOM

- No Software Bill of Materials artifact generated.
- **Remediation:** Generate CycloneDX or SPDX SBOM from package.json.

### INFO — Dependencies Use Semver Ranges

- All 7 dependencies use caret (^) or tilde (~) version ranges.
- Lockfile is present, which pins actual installed versions.
- **Remediation:** Consider exact pinning for production dependencies.

---

## Dependency Overview

| Metric | Value |
|--------|-------|
| Total dependencies | 7 |
| Pinning strategy | none-pinned |
| Lockfile | package-lock.json |
| Known CVEs | Scan not available (npm audit requires npm install) |

---

## Framework Compliance

| Framework | Requirement | Status |
|---|---|---|
| NIST SP 800-218A PS.1 | Protect code | PARTIAL — versioned, no branch protection |
| NIST SP 800-218A PW.9 | Use automated testing | NOT MET — No CI |
| SLSA Source L1 | Version controlled | MET |
| SLSA Build L1 | Scripted build | NOT MET |
| ISO 27001 A.14.2 | Secure development | PARTIAL |
| ISO 27001 A.15 | Supplier relationships | PARTIAL — lockfile present, no SBOM |

---

## Overall Assessment

**NEEDS IMPROVEMENT** — Lockfile and .gitignore present (good). Missing: CI/CD pipeline, SECURITY.md, LICENSE, SBOM.
