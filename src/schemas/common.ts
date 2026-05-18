import { z } from "zod";

export const ExpressionSchema = z.object({
  expression: z.string().describe("SageMath expression to evaluate"),
});

export const VariablesSchema = z.object({
  variables: z.string().optional().default("").describe("Variables to declare (comma-separated)"),
});

export const SolveEquationSchema = z.object({
  equation: z.string().describe("Equation to solve"),
  variable: z.string().describe("Variable to solve for"),
  variables: z.string().optional().default("").describe("Other variables (comma-separated)"),
});

export const DifferentiateSchema = z.object({
  expression: z.string().describe("Expression to differentiate"),
  variable: z.string().describe("Variable to differentiate with respect to"),
  order: z.number().optional().default(1).describe("Order of differentiation"),
  variables: z.string().optional().default("").describe("Other variables (comma-separated)"),
});

export const IntegrateSchema = z.object({
  expression: z.string().describe("Expression to integrate"),
  variable: z.string().describe("Integration variable"),
  lower_limit: z.string().optional().default("").describe("Lower limit for definite integral"),
  upper_limit: z.string().optional().default("").describe("Upper limit for definite integral"),
  variables: z.string().optional().default("").describe("Other variables (comma-separated)"),
});

export const SimplifySchema = z.object({
  expression: z.string().describe("Expression to simplify"),
  simplification_type: z.string().optional().default("default").describe("Type: 'default', 'full', 'trig', or 'rational'"),
  variables: z.string().optional().default("").describe("Variables to declare (comma-separated)"),
});

export const FactorSchema = z.object({
  expression: z.string().describe("Expression or integer to factor"),
  variables: z.string().optional().default("").describe("Variables to declare (comma-separated)"),
});

export const MatrixOpsSchema = z.object({
  matrix: z.string().describe("Matrix definition"),
  operation: z.string().describe("Operation: determinant, inverse, eigenvalues, rank, rref, transpose"),
  ring: z.string().optional().default("QQ").describe("Ring: QQ, RR, ZZ, or CC"),
});

export const PlotSchema = z.object({
  expression: z.string().describe("Expression to plot"),
  variable: z.string().optional().default("x").describe("Variable for x-axis"),
  x_min: z.number().optional().default(-10).describe("Minimum x value"),
  x_max: z.number().optional().default(10).describe("Maximum x value"),
  title: z.string().optional().default("").describe("Plot title"),
});

export const LatexConvertSchema = z.object({
  expression: z.string().describe("Expression to convert"),
  variables: z.string().optional().default("").describe("Variables to declare (comma-separated)"),
});

export const NumberTheorySchema = z.object({
  operation: z.string().describe("Operation: is_prime, next_prime, factor, euler_phi, gcd, lcm, prime_range, sigma, moebius"),
  value: z.string().describe("Primary value for the operation"),
  second_value: z.string().optional().default("").describe("Secondary value for gcd/lcm"),
});