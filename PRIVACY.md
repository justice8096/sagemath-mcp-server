# Privacy Policy — SageMath MCP Server

**Last updated: 2026-05-18**

This extension does not collect, transmit, store, or share any personal data.

## What the extension does

The SageMath MCP Server (`@justice8096/sagemath-mcp-server`) is a thin wrapper around the [SageMath](https://www.sagemath.org/) computer algebra system. When the MCP host (e.g. Claude Desktop, Claude Code) invokes one of its 10 tools, the extension:

1. Receives a mathematical expression or operation request from the host.
2. Spawns a local SageMath subprocess (either an installed local `sage` binary or a Docker container running `sagemath/sagemath:latest`).
3. Passes the expression to that subprocess and waits for the result.
4. Returns the result to the MCP host.

All execution is local to the user's machine. The extension does not connect to any network endpoint owned by the author, does not call back to a server, and does not include any telemetry, analytics, or crash reporting.

## What the extension does NOT do

- It does not collect identifiers (no user IDs, no machine fingerprints).
- It does not record or transmit the mathematical expressions you ask it to evaluate.
- It does not send usage statistics anywhere.
- It does not phone home for updates, license checks, or any other reason.

## Third-party software invoked

The extension delegates math computation to SageMath, which runs as a separate subprocess on the user's machine. SageMath itself is open-source software released under the GNU GPL v3 license; it likewise does not transmit data to any remote server during expression evaluation. If the user has configured the extension to fall back to a Docker image (the default), the first invocation will pull `sagemath/sagemath:latest` from Docker Hub; subsequent invocations use the cached local image. The Docker pull is governed by [Docker Hub's terms](https://www.docker.com/legal/docker-terms-service/) and the user's Docker daemon configuration, not by this extension.

If the user explicitly opts into the HTTP transport (`TRANSPORT=http`) and exposes the server to a remote network, the extension accepts MCP requests over HTTP and optionally enforces an `API_KEY` header. In that configuration the user is responsible for the security and privacy properties of their deployment; the extension itself still does not log or transmit data to the author.

## Open source

This extension is released under the CC0-1.0 license. Full source code is available at https://github.com/justice8096/sagemath-mcp-server. The privacy posture described above can be verified by reading the source — the [`src/services/sage-executor.ts`](https://github.com/justice8096/sagemath-mcp-server/blob/main/src/services/sage-executor.ts) module is the only network/process boundary in the extension.

## Contact

For privacy questions, file an issue at https://github.com/justice8096/sagemath-mcp-server/issues.
