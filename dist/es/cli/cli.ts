#!/usr/bin/env tsx
// Auto-generated CLI — project name is read from manifest at build time
// Run: tsx cli.ts <command> [--param value ...]

const VERSION = "1.0.0";
const NAME = "Servidor MCP de SageMath";

function showHelp(): void {
  console.log(NAME + " CLI v" + VERSION);
  console.log("");
  console.log("Usage: tsx cli.ts <command> [options]");
  console.log("");
  console.log("Commands:");
  console.log(
  "  evaluate -- Ejecutar expresiones arbitrarias de SageMath y retornar el resultado computado\n" +
  "  solve-equation -- Resolver ecuaciones algebraicas y trascendentales simbólicamente\n" +
  "  differentiate -- Calcular derivadas de expresiones matemáticas (parciales, orden superior)\n" +
  "  integrate -- Calcular integrales indefinidas y definidas de expresiones matemáticas\n" +
  "  simplify -- Simplificar expresiones matemáticas usando reglas algebraicas e identidades trigonométricas\n" +
  "  factor -- Factorizar polinomios y expresiones enteras\n" +
  "  matrix-ops -- Realizar operaciones matriciales: determinante, inversa, valores propios, rango, RREF\n" +
  "  plot -- Generar gráficos de funciones matemáticas retornando imagen PNG codificada en base64\n" +
  "  latex-convert -- Convertir expresiones matemáticas a notación LaTeX para preparación de documentos\n" +
  "  number-theory -- Realizar cálculos de teoría de números: primalidad, factorización, funciones divisoras\n" +
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
        displayName: "Evaluar Expresión de SageMath",
        params: {
        expression: args["--expression"] || (() => { console.error("Missing required: --expression"); process.exit(1); })(),
        },
      };
    case "solve-equation":
      return {
        command: "solve-equation",
        displayName: "Resolver Ecuación",
        params: {
        equation: args["--equation"] || (() => { console.error("Missing required: --equation"); process.exit(1); })(),
        variable: args["--variable"] || (() => { console.error("Missing required: --variable"); process.exit(1); })(),
        variables: args["--variables"] || "",
        },
      };
    case "differentiate":
      return {
        command: "differentiate",
        displayName: "Diferenciar Expresión",
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
        displayName: "Integrar Expresión",
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
        displayName: "Simplificar Expresión",
        params: {
        expression: args["--expression"] || (() => { console.error("Missing required: --expression"); process.exit(1); })(),
        simplification_type: args["--simplification-type"] || "default",
        variables: args["--variables"] || "",
        },
      };
    case "factor":
      return {
        command: "factor",
        displayName: "Factorizar Expresión",
        params: {
        expression: args["--expression"] || (() => { console.error("Missing required: --expression"); process.exit(1); })(),
        variables: args["--variables"] || "",
        },
      };
    case "matrix-ops":
      return {
        command: "matrix-ops",
        displayName: "Operaciones Matriciales",
        params: {
        matrix: args["--matrix"] || (() => { console.error("Missing required: --matrix"); process.exit(1); })(),
        operation: args["--operation"] || "determinant",
        ring: args["--ring"] || "QQ",
        },
      };
    case "plot":
      return {
        command: "plot",
        displayName: "Generar Gráfico Matemático",
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
        displayName: "Convertir a LaTeX",
        params: {
        expression: args["--expression"] || (() => { console.error("Missing required: --expression"); process.exit(1); })(),
        variables: args["--variables"] || "",
        },
      };
    case "number-theory":
      return {
        command: "number-theory",
        displayName: "Operaciones de Teoría de Números",
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