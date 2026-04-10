# LLM Compliance Report

**Project:** SageMath MCP Server
**Date:** 2026-04-09
**Audit Cycle:** Initial Assessment
**Framework References:** EU AI Act, NIST AI RMF, ISO 27001, SOC 2

---

## Dimension Scores

| # | Dimension | Score | Grade |
|---|-----------|-------|-------|
| 1 | System Transparency | 75 | B |
| 2 | Training Data Disclosure | N/A | — |
| 3 | Risk Classification | 60 | C |
| 4 | Supply Chain Security | 55 | C |
| 5 | Consent & Authorization | 80 | B+ |
| 6 | Sensitive Data Handling | 85 | A- |
| 7 | Incident Response | 30 | F |
| 8 | Bias Assessment | N/A | — |

**Overall Composite Score:** 64/100

---

## Detailed Assessment

### 1. System Transparency (75/100)

**What's present:**
- Clear README describing the project's purpose and capabilities
- Source manifest documenting all 10 tools with descriptions
- Multi-locale support (en, es, fr) for tool descriptions
- MCP protocol compliance provides structured capability discovery

**What's missing:**
- No model card or system card
- No documented limitations or failure modes
- No version changelog

**Regulatory mapping:** EU AI Act Art. 13 (Transparency), NIST AI RMF MAP 1.1

### 2. Training Data Disclosure (N/A)

This project is an MCP tool server, not a model. It does not train, fine-tune, or host AI models. Training data disclosure is not applicable.

### 3. Risk Classification (60/100)

**Assessment:**
- Executes arbitrary mathematical code via SageMath CAS — potential for unintended system operations if SageMath sandbox is bypassed
- No formal risk assessment document
- No documented threat model

**Regulatory mapping:** EU AI Act Art. 6-9 (Risk Classification), NIST AI RMF GOVERN 1.1

### 4. Supply Chain Security (55/100)

**What's present:**
- Package lockfile (dependency pinning at install time)
- .gitignore preventing accidental credential commits
- 7 total dependencies

**What's missing:**
- No SBOM (Software Bill of Materials)
- No CI/CD pipeline for automated security checks
- No SECURITY.md vulnerability disclosure policy
- No LICENSE file
- Dependencies use semver ranges (not exact pins)

**Regulatory mapping:** EU AI Act Art. 25, NIST SP 800-218A, ISO 27001 A.14.2

### 5. Consent & Authorization (80/100)

**What's present:**
- MCP protocol requires explicit tool invocation by the LLM client
- Each tool has a defined schema — inputs are validated via Zod
- No implicit data collection or telemetry
- Docker containerization option for sandboxed execution

**What's missing:**
- No explicit consent mechanism for code execution
- No audit logging of tool invocations

### 6. Sensitive Data Handling (85/100)

**What's present:**
- No secrets or credentials in codebase (verified by secrets scan)
- No data persistence or logging of user inputs
- Math expressions processed transiently, no storage

**What's missing:**
- No data classification policy
- No data retention policy (though no data is retained)

### 7. Incident Response (30/100)

**What's present:**
- Git version control enables rollback

**What's missing:**
- No SECURITY.md or vulnerability disclosure process
- No incident response plan
- No monitoring or alerting
- No contact for security reports

**Regulatory mapping:** ISO 27001 A.16, SOC 2 CC7

### 8. Bias Assessment (N/A)

This project is a deterministic tool server. Mathematical computations do not involve classification, recommendation, or decision-making that could exhibit bias.

---

## Recommendations (Priority Order)

1. **Add SECURITY.md** with vulnerability reporting process
2. **Add CI/CD pipeline** with automated SAST scanning
3. **Generate SBOM** (CycloneDX format recommended)
4. **Add LICENSE file** (MIT recommended based on project context)
5. **Document threat model** for code execution risks
6. **Add audit logging** for tool invocations

---

## Overall Assessment

**PARTIAL COMPLIANCE** — Strong in data handling and transparency. Weak in incident response and supply chain governance. Primary gaps are operational (missing SECURITY.md, CI/CD, SBOM) rather than code-level security issues.
