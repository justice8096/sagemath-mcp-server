#!/usr/bin/env tsx
// Auto-generated CLI — project name is read from manifest at build time
// Run: tsx cli.ts <command> [--param value ...]

const VERSION = "1.0.0";
const NAME = "SageMath MCP Server";

function showHelp(): void {
  console.log(NAME + " CLI v" + VERSION);
  console.log("");
  console.log("Usage: tsx cli.ts <command> [options]");
  console.log("");
  console.log("Commands:");
  console.log(
  "  evaluate -- Execute arbitrary SageMath expressions and return the computed result\n" +
  "  solve-equation -- Solve algebraic and transcendental equations symbolically\n" +
  "  differentiate -- Compute derivatives of mathematical expressions (partial, higher-order)\n" +
  "  integrate -- Compute indefinite and definite integrals of mathematical expressions\n" +
  "  simplify -- Simplify mathematical expressions using algebraic rules and trigonometric identities\n" +
  "  factor -- Factor polynomials and integer expressions\n" +
  "  matrix-ops -- Perform matrix operations: determinant, inverse, eigenvalues, rank, RREF\n" +
  "  plot -- Generate plots of mathematical functions and return as base64-encoded PNG image\n" +
  "  latex-convert -- Convert mathematical expressions to LaTeX notation for document preparation\n" +
  "  number-theory -- Perform number theory calculations: primality, factorization, divisor functions, and more\n" +
  ""
  );
  console.log("Options:");
  console.log("  --help     Show this help message");
  console.log("  --version  Show version");
}

function parseCliArgs(): Record<string, string> {
  const args: Record<string, string> = {};
  const raw = process.argv.slice(3);
  for (let i = 0; i < raw.length; i++) {
    if (raw[i].startsWith("--") && raw[i + 1] && !raw[i + 1].startsWith("--")) { args[raw[i]] = raw[++i]; }
    else if (raw[i].includes("=")) { const [key, ...val] = raw[i].split("="); args[key] = val.join("="); }
  }
  return args;
}

function routeCommand(command: string, args: Record<string, string>): unknown {
  switch (command) {
    case "evaluate":
      return {
        command: "evaluate",
        displayName: "Evaluate SageMath Expression",
        params: {
        expression: args["--expression"] || (() => { console.error("Missing required: --expression"); process.exit(1); })(),
        },
      };
    case "solve-equation":
      return {
        command: "solve-equation",
        displayName: "Solve Equation",
        params: {
        equation: args["--equation"] || (() => { console.error("Missing required: --equation"); process.exit(1); })(),
        variable: args["--variable"] || (() => { console.error("Missing required: --variable"); process.exit(1); })(),
        variables: args["--variables"] || "",
        },
      };
    case "differentiate":
      return {
        command: "differentiate",
        displayName: "Differentiate Expression",
        params: {
        expression: args["--expression"] || (() => { console.error("Missing required: --expression"); process.exit(1); })(),
        variable: args["--variable"] || (() => { console.error("Missing required: --variable"); process.exit(1); })(),
        order: args["--order"] || 1,
        variables: args["--variables"] || "",
        },
      };
    case "integrate":
      return {
        command: "integrate",
        displayName: "Integrate Expression",
        params: {
        expression: args["--expression"] || (() => { console.error("Missing required: --expression"); process.exit(1); })(),
        variable: args["--variable"] || (() => { console.error("Missing required: --variable"); process.exit(1); })(),
        lower_limit: args["--lower-limit"] || "",
        upper_limit: args["--upper-limit"] || "",
        variables: args["--variables"] || "",
        },
      };
    case "simplify":
      return {
        command: "simplify",
        displayName: "Simplify Expression",
        params: {
        expression: args["--expression"] || (() => { console.error("Missing required: --expression"); process.exit(1); })(),
        simplification_type: args["--simplification-type"] || "default",
        variables: args["--variables"] || "",
        },
      };
    case "factor":
      return {
        command: "factor",
        displayName: "Factor Expression",
        params: {
        expression: args["--expression"] || (() => { console.error("Missing required: --expression"); process.exit(1); })(),
        variables: args["--variables"] || "",
        },
      };
    case "matrix-ops":
      return {
        command: "matrix-ops",
        displayName: "Matrix Operations",
        params: {
        matrix: args["--matrix"] || (() => { console.error("Missing required: --matrix"); process.exit(1); })(),
        operation: args["--operation"] || "determinant",
        ring: args["--ring"] || "QQ",
        },
      };
    case "plot":
      return {
        command: "plot",
        displayName: "Generate Mathematical Plot",
        params: {
        expression: args["--expression"] || (() => { console.error("Missing required: --expression"); process.exit(1); })(),
        variable: args["--variable"] || "x",
        x_min: args["--x-min"] || -10,
        x_max: args["--x-max"] || 10,
        title: args["--title"] || "",
        },
      };
    case "latex-convert":
      return {
        command: "latex-convert",
        displayName: "Convert to LaTeX",
        params: {
        expression: args["--expression"] || (() => { console.error("Missing required: --expression"); process.exit(1); })(),
        variables: args["--variables"] || "",
        },
      };
    case "number-theory":
      return {
        command: "number-theory",
        displayName: "Number Theory Operations",
        params: {
        operation: args["--operation"] || (() => { console.error("Missing required: --operation"); process.exit(1); })(),
        value: args["--value"] || (() => { console.error("Missing required: --value"); process.exit(1); })(),
        second_value: args["--second-value"] || "",
        },
      };
    default:
      console.error("Unknown command: " + command);
      showHelp();
      process.exit(1);
  }
}

const command = process.argv[2];

if (!command || command === "--help") { showHelp(); process.exit(0); }
if (command === "--version") { console.log(VERSION); process.exit(0); }

const args = parseCliArgs();
const result = routeCommand(command, args);
console.log(JSON.stringify(result, null, 2));