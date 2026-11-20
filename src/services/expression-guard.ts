/*
 * Math-only guard for the structured tools.
 *
 * Every tool except sage_evaluate places its expression arguments into a
 * SageMath program, and SageMath is Python. This guard accepts plain
 * mathematics and nothing else, so those tools cannot be used to run code.
 * It is an allow-list: anything it does not recognise is rejected.
 *
 * Accepted: numbers, names, arithmetic and comparison operators, brackets,
 * commas, and calls to the functions listed below.
 * Rejected: quotes, attribute access, semicolons, newlines, assignment,
 * Python keywords, names containing a double underscore, calls to any other
 * function, and calls on the result of an expression.
 */

export const ALLOWED_FUNCTIONS: ReadonlySet<string> = new Set([
  // elementary
  "sqrt", "abs", "sgn", "sign", "exp", "log", "ln", "floor", "ceil", "ceiling",
  "round", "min", "max", "mod", "Mod",
  // trigonometric and hyperbolic
  "sin", "cos", "tan", "cot", "sec", "csc",
  "asin", "acos", "atan", "acot", "asec", "acsc", "atan2",
  "arcsin", "arccos", "arctan", "arccot", "arcsec", "arccsc", "arctan2",
  "sinh", "cosh", "tanh", "coth", "sech", "csch",
  "asinh", "acosh", "atanh", "arcsinh", "arccosh", "arctanh",
  // complex numbers
  "real", "imag", "real_part", "imag_part", "conjugate", "arg", "norm",
  // combinatorics and special functions
  "factorial", "binomial", "gamma", "log_gamma", "beta", "zeta", "psi",
  "erf", "erfc", "fibonacci", "bernoulli", "heaviside", "unit_step",
  "dirac_delta", "bessel_J", "bessel_Y", "airy_ai", "airy_bi",
  // algebra and calculus
  "expand", "factor", "simplify", "numerator", "denominator", "sum", "prod",
  "diff", "derivative", "integrate", "integral", "limit", "taylor",
  // number theory
  "gcd", "lcm", "xgcd", "crt", "is_prime", "next_prime", "previous_prime",
  "nth_prime", "prime_pi", "prime_range", "primes_first_n", "euler_phi",
  "sigma", "moebius", "divisors", "power_mod", "inverse_mod",
  "legendre_symbol", "kronecker",
  // linear algebra
  "matrix", "vector", "identity_matrix", "det", "transpose",
  // numeric conversion
  "n", "N", "numerical_approx", "ZZ", "QQ", "RR", "CC", "RDF", "Integer",
  "Rational",
]);

const KEYWORDS: ReadonlySet<string> = new Set([
  "and", "as", "assert", "async", "await", "break", "class", "continue",
  "def", "del", "elif", "else", "except", "exec", "finally", "for", "from",
  "global", "if", "import", "in", "is", "lambda", "nonlocal", "not", "or",
  "pass", "print", "raise", "return", "try", "while", "with", "yield",
]);

const OPERATORS = [
  "**", "//", "==", "!=", "<=", ">=", "^^",
  "+", "-", "*", "/", "^", "%", "<", ">", "=", "(", ")", "[", "]", ",",
];

export const MAX_EXPRESSION_LENGTH = 10_000;

const USE_EVALUATE = "Use sage_evaluate for general SageMath code.";

type Token = { kind: "number" | "name" | "op"; text: string };

/**
 * Returns null when the input is plain mathematics, otherwise a short
 * explanation of why it was refused.
 */
export function checkMathExpression(input: string): string | null {
  if (typeof input !== "string" || input.trim() === "") {
    return "expression is empty";
  }
  if (input.length > MAX_EXPRESSION_LENGTH) {
    return `expression is longer than ${MAX_EXPRESSION_LENGTH} characters`;
  }

  const tokens: Token[] = [];
  let i = 0;
  while (i < input.length) {
    const ch = input[i];
    if (ch === " " || ch === "\t") {
      i++;
      continue;
    }

    const rest = input.slice(i);
    const number = /^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/.exec(rest);
    if (number) {
      const next = rest[number[0].length];
      if (next !== undefined && /[A-Za-z0-9_.]/.test(next)) {
        return `malformed number near '${rest.slice(0, number[0].length + 1)}'`;
      }
      tokens.push({ kind: "number", text: number[0] });
      i += number[0].length;
      continue;
    }

    const name = /^[A-Za-z][A-Za-z0-9_]*/.exec(rest);
    if (name) {
      if (name[0].includes("__")) {
        return `name '${name[0]}' is not allowed. ${USE_EVALUATE}`;
      }
      if (KEYWORDS.has(name[0])) {
        return `keyword '${name[0]}' is not allowed in a math expression. ${USE_EVALUATE}`;
      }
      tokens.push({ kind: "name", text: name[0] });
      i += name[0].length;
      continue;
    }

    const op = OPERATORS.find((candidate) => rest.startsWith(candidate));
    if (op) {
      tokens.push({ kind: "op", text: op });
      i += op.length;
      continue;
    }

    const shown = ch === "\n" || ch === "\r" ? "line break" : `'${ch}'`;
    return `character ${shown} is not allowed in a math expression. ${USE_EVALUATE}`;
  }

  const stack: string[] = [];
  for (let k = 0; k < tokens.length; k++) {
    const token = tokens[k];
    const previous = tokens[k - 1];

    if (token.kind === "op" && token.text === "(") {
      if (previous?.kind === "name") {
        if (!ALLOWED_FUNCTIONS.has(previous.text)) {
          return `function '${previous.text}' is not available in this tool. ${USE_EVALUATE}`;
        }
      } else if (
        previous &&
        (previous.kind === "number" || previous.text === ")" || previous.text === "]")
      ) {
        return `a call on the result of an expression is not allowed. Write multiplication with '*'. ${USE_EVALUATE}`;
      }
      stack.push("(");
    } else if (token.kind === "op" && token.text === "[") {
      stack.push("[");
    } else if (token.kind === "op" && (token.text === ")" || token.text === "]")) {
      const open = stack.pop();
      if (open !== (token.text === ")" ? "(" : "[")) return "unbalanced brackets";
    } else if (token.kind === "op" && token.text === "=") {
      // A single '=' is accepted only as a named argument inside a call,
      // for example limit(f, x=0).
      if (stack[stack.length - 1] !== "(" || previous?.kind !== "name") {
        return "use '==' to write an equation";
      }
    }
  }
  if (stack.length > 0) return "unbalanced brackets";

  return null;
}
