import { z } from "zod";
import { checkMathExpression } from "../services/expression-guard.js";

// Expression fields of the structured tools accept plain mathematics only
// (see services/expression-guard.ts). sage_evaluate is the one tool that
// accepts arbitrary SageMath code.
const refuseNonMath = (value: string, ctx: z.RefinementCtx) => {
  const problem = checkMathExpression(value);
  if (problem) ctx.addIssue({ code: z.ZodIssueCode.custom, message: problem });
};

const mathExpression = (description: string) =>
  z.string().superRefine(refuseNonMath).describe(`${description} (math only)`);

const optionalMathExpression = (description: string) =>
  z
    .string()
    .superRefine((value, ctx) => {
      if (value.trim() !== "") refuseNonMath(value, ctx);
    })
    .optional()
    .default("")
    .describe(`${description} (math only)`);

// Variable names are interpolated into var('...') declarations and call
// arguments. They are never legitimately anything but identifiers, so they
// are restricted to identifiers here.
const IDENTIFIER_LIST = /^\s*[A-Za-z_][A-Za-z0-9_]*(\s*[,\s]\s*[A-Za-z_][A-Za-z0-9_]*)*\s*$/;
const IDENTIFIER_MESSAGE = "must be one or more variable names (letters, digits, underscore), separated by commas";

const variableName = (description: string) =>
  z.string().max(200).regex(IDENTIFIER_LIST, IDENTIFIER_MESSAGE).describe(description);

const optionalVariableNames = (description: string) =>
  z
    .string()
    .max(500)
    .refine((v) => v.trim() === "" || IDENTIFIER_LIST.test(v), IDENTIFIER_MESSAGE)
    .optional()
    .default("")
    .describe(description);

export const ExpressionSchema = z.object({
  expression: z.string().describe("SageMath expression to evaluate"),
});

export const VariablesSchema = z.object({
  variables: optionalVariableNames("Variables to declare (comma-separated)"),
});

export const SolveEquationSchema = z.object({
  equation: mathExpression("Equation to solve"),
  variable: variableName("Variable to solve for"),
  variables: optionalVariableNames("Other variables (comma-separated)"),
});

export const DifferentiateSchema = z.object({
  expression: mathExpression("Expression to differentiate"),
  variable: variableName("Variable to differentiate with respect to"),
  order: z.number().int().min(1).max(100).optional().default(1).describe("Order of differentiation"),
  variables: optionalVariableNames("Other variables (comma-separated)"),
});

export const IntegrateSchema = z.object({
  expression: mathExpression("Expression to integrate"),
  variable: variableName("Integration variable"),
  lower_limit: optionalMathExpression("Lower limit for definite integral"),
  upper_limit: optionalMathExpression("Upper limit for definite integral"),
  variables: optionalVariableNames("Other variables (comma-separated)"),
});

export const SimplifySchema = z.object({
  expression: mathExpression("Expression to simplify"),
  simplification_type: z.string().optional().default("default").describe("Type: 'default', 'full', 'trig', or 'rational'"),
  variables: optionalVariableNames("Variables to declare (comma-separated)"),
});

export const FactorSchema = z.object({
  expression: mathExpression("Expression or integer to factor"),
  variables: optionalVariableNames("Variables to declare (comma-separated)"),
});

export const MatrixOpsSchema = z.object({
  matrix: mathExpression("Matrix definition"),
  operation: z.string().describe("Operation: determinant, inverse, eigenvalues, rank, rref, transpose"),
  ring: z.string().optional().default("QQ").describe("Ring: QQ, RR, ZZ, or CC"),
});

export const PlotSchema = z.object({
  expression: mathExpression("Expression to plot"),
  variable: z.string().max(200).regex(/^[A-Za-z_][A-Za-z0-9_]*$/, "must be a single variable name").optional().default("x").describe("Variable for x-axis"),
  x_min: z.number().optional().default(-10).describe("Minimum x value"),
  x_max: z.number().optional().default(10).describe("Maximum x value"),
  title: z.string().optional().default("").describe("Plot title"),
});

export const LatexConvertSchema = z.object({
  expression: mathExpression("Expression to convert"),
  variables: optionalVariableNames("Variables to declare (comma-separated)"),
});

export const NumberTheorySchema = z.object({
  operation: z.string().describe("Operation: is_prime, next_prime, factor, euler_phi, gcd, lcm, prime_range, sigma, moebius"),
  value: mathExpression("Primary value for the operation"),
  second_value: optionalMathExpression("Secondary value for gcd/lcm"),
});