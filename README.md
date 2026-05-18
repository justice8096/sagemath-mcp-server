# SageMath MCP Server

[![License: CC0-1.0](https://img.shields.io/badge/License-CC0%201.0-lightgrey.svg)](https://creativecommons.org/publicdomain/zero/1.0/)
[![npm](https://img.shields.io/npm/v/@justice8096/sagemath-mcp-server.svg)](https://www.npmjs.com/package/@justice8096/sagemath-mcp-server)

A [Model Context Protocol](https://modelcontextprotocol.io) server that exposes [SageMath](https://www.sagemath.org/) — a 100+ package computer algebra system — to LLM clients such as Claude. Where most "math MCPs" wrap a single library (SymPy, mathjs), this one subprocess-wraps the entire SageMath stack so the model has access to genuine symbolic mathematics, not arithmetic.

## Why

LLMs are bad at exact arithmetic, brittle with multi-step algebra, and unreliable when symbolic manipulation matters. The right pattern is to keep the *conceptual* reasoning in the model and delegate *mechanical* computation to a tool — the same trick a person with dyscalculia uses with a calculator. SageMath gives you the broadest tool surface for that delegation: factoring, integration, eigenvalues, number theory, LaTeX rendering, and plotting all behind one interface.

## Tools

| Tool | Description |
|---|---|
| `sage_evaluate` | Run an arbitrary SageMath expression. |
| `sage_solve_equation` | Solve algebraic / transcendental equations symbolically. |
| `sage_differentiate` | Compute derivatives (any order, any variable). |
| `sage_integrate` | Indefinite and definite integrals. |
| `sage_simplify` | Simplify expressions (`default`, `full`, `trig`, `rational`). |
| `sage_factor` | Factor polynomials or integers. |
| `sage_matrix_ops` | Determinant, inverse, eigenvalues, rank, RREF, transpose over `QQ` / `RR` / `ZZ` / `CC`. |
| `sage_plot` | Plot an expression and return a base64 PNG. |
| `sage_latex_convert` | Convert a SageMath expression to LaTeX. |
| `sage_number_theory` | `is_prime`, `next_prime`, `factor`, `euler_phi`, `gcd`, `lcm`, `prime_range`, `sigma`, `moebius`. |

All tools follow the same schema pattern (see [`src/schemas/common.ts`](src/schemas/common.ts)).

## Installation

The server needs either a local SageMath install or Docker available on the host so it can spawn a SageMath process.

### Option 1: npm + local SageMath

```bash
npm install -g @justice8096/sagemath-mcp-server
# requires `sage` on PATH — see https://doc.sagemath.org/html/en/installation/
sagemath-mcp
```

### Option 2: Docker (no local SageMath required)

```bash
docker compose up
# uses the official sagemath/sagemath image; the server runs inside the container
```

### Option 3: from source

```bash
git clone https://github.com/justice8096/sagemath-mcp-server.git
cd sagemath-mcp-server
npm install
npm run build
npm start
```

## Configuring an MCP client

### Claude Desktop / Claude Code (stdio transport)

Add to `~/.claude.json` (or the equivalent Claude Desktop config):

```json
{
  "mcpServers": {
    "sagemath": {
      "command": "sagemath-mcp"
    }
  }
}
```

### Remote / HTTP transport

```bash
TRANSPORT=http API_KEY=your-secret-key npm start
```

Then point an MCP HTTP client at `http://<host>:3000/mcp` with the matching `API_KEY` header.

## Architecture

- **TypeScript** wrapper, runtime is Node.js ≥ 18.
- **Subprocess wrapping** — the wrapper code is CC0; SageMath remains GPL-3.0 and runs as a separate process, which is the canonical safe interaction model per the [GNU GPL FAQ on aggregation](https://www.gnu.org/licenses/gpl-faq.en.html). Embedding via FFI would propagate copyleft; subprocess execution does not.
- **Dual transport** — stdio (Claude Desktop, Claude Code, local MCP clients) and Streamable HTTP (remote deployment, optional `API_KEY` env var).
- **i18n** — English, Spanish, French via [`src/i18n.ts`](src/i18n.ts) and [`locales/`](locales).
- **Multi-format build** — `build.ts` emits Claude plugin, OpenAI function-calling, n8n node, MCP server descriptor, CLI tool, and YAML prompt-library outputs from the same source manifest.

## Configuration

| Env var | Default | Purpose |
|---|---|---|
| `TRANSPORT` | `stdio` | `stdio` or `http`. |
| `PORT` | `3000` | HTTP port when `TRANSPORT=http`. |
| `API_KEY` | (none) | If set, HTTP requests must include matching `API_KEY` header. |
| `SAGE_TIMEOUT` | `30000` | Per-call SageMath timeout in milliseconds. |
| `SAGE_DOCKER_IMAGE` | `sagemath/sagemath:latest` | Image used when SageMath isn't installed locally. |

## Security

- All SageMath input is sanitized to strip shell metacharacters before subprocess execution; see [`src/services/sage-executor.ts`](src/services/sage-executor.ts).
- HTTP transport requires `API_KEY` if set — there is no default credential.
- See [`SECURITY.md`](SECURITY.md) and [`THREAT_MODEL.md`](THREAT_MODEL.md) for the full posture.
- Pre-commit audit suite under [`audits/`](audits/): SAST/DAST scan, supply-chain audit, CWE mapping, LLM-compliance report, contribution analysis.

## License

This wrapper is released under [CC0-1.0](LICENSE) (public domain). SageMath itself remains GPL-3.0; the subprocess execution model keeps the licenses independent. See [`SECURITY.md`](SECURITY.md) and the project's [compliance analysis](https://github.com/justice8096/sagemath-mcp-server/blob/main/audits/llm-compliance-report.md) for the legal reasoning.

## Status

`v1.0.0` — public release. The wrapper layer is stable; the SageMath surface is feature-rich and stable upstream. File issues at https://github.com/justice8096/sagemath-mcp-server/issues.
