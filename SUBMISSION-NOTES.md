# Anthropic Connectors Directory — Submission Notes

> Status as of 2026-05-18: **prep complete, submission paused pending user-supplied artifacts (logo + screenshots).** All textual artifacts and the MCPB bundle build are in place.

## Submission URL

**Desktop Extension submission form:** https://clau.de/desktop-extention-submission

The directory accepts three server types: (1) remote MCP servers, (2) **desktop extensions packaged as MCPB**, (3) MCP Apps with interactive UI. SageMath is type 2 — it runs locally (spawns a SageMath subprocess) and has no OAuth/SaaS surface.

Email `mcp-review@anthropic.com` if the form is blocked.

## Pre-built artifacts in this repo

| Artifact | Path | Notes |
|---|---|---|
| **MCPB bundle** | `sagemath-mcp-server-1.0.1.mcpb` (gitignored — regenerate via `npx mcpb pack`) | 13.5 MB compressed, 45.6 MB unpacked, 3162 files. Built from `manifest.json` at the repo root + the existing `build/` output. |
| **Top-level MCPB manifest** | `manifest.json` | Declares 10 tools, two optional user_config env vars (SAGE_TIMEOUT, SAGE_DOCKER_IMAGE), compatibility (darwin/win32/linux, Node ≥ 18). Validates clean against the `0.3` schema. |
| **Privacy policy** | `PRIVACY.md` | Boilerplate — no data collected, all execution local, third-party invocation (SageMath subprocess, Docker Hub pull) explicitly named. |
| **Documentation link** | https://github.com/justice8096/sagemath-mcp-server#readme | The README written for v1.0.0; sufficient as the public docs link Anthropic asks for. |

## Form fields — pre-filled answers

When you sit down to submit, paste these:

- **Server name:** SageMath MCP Server
- **Short description (≤120 chars):** 10 symbolic-math tools for LLMs via SageMath's full computer algebra system.
- **Server URL / package identifier:** `@justice8096/sagemath-mcp-server` on npm; `io.github.justice8096/sagemath-mcp-server` on the Official MCP Registry.
- **Repository URL:** https://github.com/justice8096/sagemath-mcp-server
- **License:** CC0-1.0 (wrapper). SageMath itself is GPL-3.0; subprocess aggregation model keeps the licenses independent (per the [GNU GPL FAQ on aggregation](https://www.gnu.org/licenses/gpl-faq.en.html)).
- **Documentation link:** https://github.com/justice8096/sagemath-mcp-server#readme
- **Privacy policy:** https://github.com/justice8096/sagemath-mcp-server/blob/main/PRIVACY.md
- **Test account / credentials:** N/A — no authentication required for local stdio transport. For HTTP transport, the optional `API_KEY` env var gates access but is not part of the extension's default install.
- **OAuth callback URIs:** N/A — no OAuth.

## What still needs your input

These cannot be auto-generated and need you to supply them:

1. **Server logo** — SVG preferred, or PNG ≥ 256×256. Visually should suggest "SageMath" or "symbolic math" or "computer algebra"; something distinct from a generic calculator icon. SageMath's own logo is a stylized "σ" inside a hexagon (https://www.sagemath.org/pix/sage_logo.svg) — you cannot use that directly without permission, but an inspired-by design is fair. **Decision needed:** commission, sketch yourself, or use a public-domain math glyph (e.g., the ∮ contour integral or the ∂ partial-derivative symbol).
2. **3-5 promotional screenshots, ≥ 1000 px wide, no visible prompts** — for SageMath this is awkward because the "UI" is just the model's response in Claude Desktop after invoking a tool. Reasonable options:
   - A screenshot of Claude Desktop showing a `sage_solve_equation` tool call rendering the symbolic solution.
   - A screenshot of a `sage_plot` invocation rendering the base64 PNG inline.
   - A screenshot of a LaTeX-rendered output from `sage_latex_convert`.
   - The README on GitHub with the tools table visible.
   - The npm package page.
3. **Favicon verification** — the form will likely ask for an emoji-equivalent or favicon path. Once you have the logo, this falls out for free.

## Build verification before submission

```powershell
cd D:\sagemath-mcp-server
npm install
npm run build
npx mcpb validate manifest.json
npx mcpb pack . sagemath-mcp-server-1.0.1.mcpb
```

The pack step regenerates the `.mcpb` file deterministically — bump the filename to match `manifest.json#/version` for each new release.

## Review expectations

Per Anthropic's documentation, the Connectors Directory team reviews submissions manually. Multi-day turnaround. They look at:

- Tool descriptions (already polished — see `manifest.json#/tools`)
- Privacy posture (PRIVACY.md addresses this explicitly)
- Whether the extension actually works (they will install the MCPB and exercise tools)
- Whether the documentation matches the implementation

If they reject, common reasons would be: missing or poor-quality logo; missing screenshots; tool descriptions that don't match what the tools actually do; failure to install due to missing dependencies (SageMath subprocess error from a clean Docker-less environment — but the error message is clear and points the user at the install docs).

## Related entries

- **Already published 2026-05-18** to the Official MCP Registry as `io.github.justice8096/sagemath-mcp-server@1.0.1` (https://registry.modelcontextprotocol.io/v0/servers?search=sagemath). That's a separate registry — protocol-level, self-service, accessible to community aggregators. The Connectors Directory submission gets first-class Claude UI integration on top of that.
