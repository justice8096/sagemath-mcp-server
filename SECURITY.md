# Security Policy

## Supported Versions

| Version | Supported |
| ------- | --------- |
| 1.1.x   | Yes |
| 1.0.x   | No. Vulnerable to command injection. Upgrade to 1.1.0 or later. |

## Reporting a Vulnerability

Do not open a public GitHub issue for a security vulnerability.

Use GitHub private vulnerability reporting on this repository (Security tab, "Report a vulnerability"). You can also email **justice8096@gmail.com** with "SECURITY" in the subject.

Please include:

- A description of the vulnerability
- Steps to reproduce
- Your assessment of the impact
- A suggested fix, if you have one

### What to Expect

- **Acknowledgment:** within 48 hours.
- **Assessment:** within 7 days.
- **Fix:** critical vulnerabilities are patched within 14 days of confirmation.
- **Disclosure:** coordinated. We agree the timing with you and credit you in the advisory.

### In Scope

- Any way for a tool argument to reach a shell, or to run outside the SageMath process
- Any input that gets code past the math-only check on the nine structured tools
- Authentication or authorization bypass on the HTTP transport
- Escape from the Docker execution container
- Credential exposure or leakage
- Dependency vulnerabilities with an exploitable path through this server

### Out of Scope

- `sage_evaluate` running SageMath code. That is its purpose. See "What this server does not protect against" below.
- Denial of service by expensive computation (single-user design; timeouts and container limits apply)
- Issues in upstream dependencies with no demonstrated path through this server

## Security Design

### What the server does

The server exposes SageMath to an MCP client over stdio or HTTP. Each tool builds a short SageMath program from its arguments and runs it in a child process.

### Controls

- **No shell.** The program is passed to the child process as one argument. Nothing is interpolated into a command line. There is no escaping step to get wrong.
- **Docker confinement.** In Docker mode each call runs in a new container with no network (`--network none`), all capabilities dropped, `no-new-privileges`, a memory limit and a process limit. The image entrypoint is replaced with `sage`, because the stock entrypoint passes its arguments through a shell.
- **Timeouts.** Each call has a timeout. The process, or the container, is killed when it expires.
- **HTTP authentication.** The HTTP transport refuses to start without `API_KEY` (16 characters or more). Every route except the bare `/health` probe requires the key. Keys are compared in constant time. The listener binds to `127.0.0.1` unless `HOST` is set.
- **Math-only structured tools.** Every tool except `sage_evaluate` checks its expressions against an allow-list (numbers, names, operators, brackets, known math functions) and refuses everything else. Fields that hold variable names accept identifiers only.
- **Audit log.** Every tool call is logged to stderr as JSON.
- **No stored secrets.** The API key is read from the environment and never written anywhere.

### What this server does not protect against

SageMath code is Python. `sage_evaluate` accepts SageMath code by design. A caller who can invoke it can run Python with the privileges of the SageMath process.

- In **local mode** that means your user account and your files. Use local mode only when you trust every source of input, including any content the connected model reads.
- In **Docker mode** that means a throwaway container with no network. Docker is the default when it is installed and running. Set `SAGE_EXECUTION_MODE=docker` for agents and untrusted input, so the server never falls back to local mode.
- The API key is the only barrier on the HTTP transport. The transport has no TLS. Put it behind a TLS proxy if it leaves the machine.

See `THREAT_MODEL.md` for the full threat model.
