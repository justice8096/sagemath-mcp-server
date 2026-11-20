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

The HTTP transport requires an API key. The server will not start in HTTP mode without one.

```bash
export API_KEY="$(openssl rand -hex 32)"
TRANSPORT=http npm start
```

The server listens on `127.0.0.1:3000` by default. Point an MCP HTTP client at `http://127.0.0.1:3000/mcp` and send the key in an `X-API-Key` header or as `Authorization: Bearer <key>`.

To accept connections from other machines, set `HOST=0.0.0.0` and put TLS in front of the port. Read the Security section first: anyone holding the key can run code on the host.

## Architecture

- **TypeScript** wrapper, runtime is Node.js ≥ 18.
- **Subprocess wrapping** — the wrapper code is CC0; SageMath remains GPL-3.0 and runs as a separate process, which is the canonical safe interaction model per the [GNU GPL FAQ on aggregation](https://www.gnu.org/licenses/gpl-faq.en.html). Embedding via FFI would propagate copyleft; subprocess execution does not.
- **Dual transport** — stdio (Claude Desktop, Claude Code, local MCP clients) and Streamable HTTP (loopback by default, `API_KEY` required).
- **i18n** — English, Spanish, French via [`src/i18n.ts`](src/i18n.ts) and [`locales/`](locales).
- **Multi-format build** — `build.ts` emits Claude plugin, OpenAI function-calling, n8n node, MCP server descriptor, CLI tool, and YAML prompt-library outputs from the same source manifest.

## Configuration

| Env var | Default | Purpose |
|---|---|---|
| `TRANSPORT` | `stdio` | `stdio` or `http`. |
| `HOST` | `127.0.0.1` | Interface the HTTP transport listens on. |
| `PORT` | `3000` | HTTP port when `TRANSPORT=http`. |
| `API_KEY` | (none) | Required when `TRANSPORT=http`, at least 16 characters. Sent by clients as `X-API-Key` or `Authorization: Bearer`. |
| `SAGE_EXECUTION_MODE` | `auto` | `auto` uses Docker when it is installed and running, otherwise a local `sage`. `local` or `docker` forces one. |
| `SAGE_TIMEOUT` | `30000` | Per-call SageMath timeout in milliseconds. The process is killed when it expires. |
| `SAGE_DOCKER_IMAGE` | `sagemath/sagemath:latest` | Image used in Docker mode. |
| `SAGE_DOCKER_NETWORK` | `none` | Docker network for each call. `none` gives the container no network. |
| `SAGE_DOCKER_MEMORY` | `2g` | Memory limit for each container. |

## Security

SageMath code is Python. A SageMath expression can open files, start processes and use the network. That holds for every tool here, because each one places its expression arguments into a SageMath program. Treat access to this server as the ability to run code.

- **Docker is the default.** When Docker is installed and running, each call runs in a throwaway container with no network, no Linux capabilities, and memory and process limits. Without Docker the server uses a local `sage`, and the code runs as your user, with your files. Set `SAGE_EXECUTION_MODE=docker` to rule out that fallback.
- **No shell.** The program reaches SageMath as a single process argument. Shell characters in tool arguments have no effect. Versions up to 1.0.1 built a shell command line and were open to command injection; upgrade.
- **HTTP needs a key.** The HTTP transport refuses to start without `API_KEY` and listens on loopback by default.
- **Prompt injection.** A model that reads untrusted content can be steered into calling these tools. `sage_evaluate` is marked as not read-only so that clients ask before running it.
- See [`SECURITY.md`](SECURITY.md) and [`THREAT_MODEL.md`](THREAT_MODEL.md) for the full posture, and [`CHANGELOG.md`](CHANGELOG.md) for the 1.1.0 security fixes.
- Audit reports are under [`audits/`](audits/): SAST/DAST scan, supply-chain audit, CWE mapping, LLM-compliance report, contribution analysis.

## License

This wrapper is released under [CC0-1.0](LICENSE) (public domain). SageMath itself remains GPL-3.0; the subprocess execution model keeps the licenses independent. See [`SECURITY.md`](SECURITY.md) and the project's [compliance analysis](https://github.com/justice8096/sagemath-mcp-server/blob/main/audits/llm-compliance-report.md) for the legal reasoning.

## Status

`v1.1.0` - security release. Versions up to 1.0.1 are vulnerable; see [`CHANGELOG.md`](CHANGELOG.md). The wrapper layer is stable; the SageMath surface is feature-rich and stable upstream. File issues at https://github.com/justice8096/sagemath-mcp-server/issues.
