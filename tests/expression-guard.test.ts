import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { checkMathExpression } from "../src/services/expression-guard.ts";
import {
  ExpressionSchema,
  IntegrateSchema,
  MatrixOpsSchema,
  NumberTheorySchema,
  SolveEquationSchema,
} from "../src/schemas/common.ts";

describe("math-only guard", () => {
  it("accepts ordinary mathematics", () => {
    const fine = [
      "1+1",
      "x^2 - 5*x + 6",
      "x**2 == 4",
      "sin(x)^2 + cos(x)^2",
      "sqrt(2)*pi + e^(I*pi)",
      "-oo",
      "1.5e-3 * x",
      ".5 + 2.",
      "2^127 - 1",
      "factorial(20) / binomial(10, 3)",
      "[[1, 2], [3, 4]]",
      "[x + y == 1, x - y == 0]",
      "limit(sin(x)/x, x=0)",
      "integrate(exp(-x^2), x, -oo, oo)",
      "n(pi, digits=50)",
      "abs(x) <= 3",
      "17 % 5 + 7 // 2",
      "matrix(QQ, [[1, 2], [3, 4]])",
      "x_1 + alpha*beta",
    ];
    for (const expression of fine) {
      assert.equal(checkMathExpression(expression), null, expression);
    }
  });

  it("refuses anything that is not mathematics", () => {
    const hostile = [
      "__import__('os').system('id')",
      "__import__",
      "open('/etc/passwd').read()",
      "os.system",
      "x.__class__",
      "(1).real",
      "1 .real",
      "eval(x)",
      "exec(x)",
      "getattr(x, y)",
      "globals()",
      "sage_eval(x)",
      "load(x)",
      "lambda: 1",
      "[i for i in x]",
      "1 if x else 2",
      "x; y",
      "x\ny",
      "x = 5",
      "(x := 5)",
      "'a'",
      '"a"',
      "`id`",
      "$(id)",
      "x # comment",
      "x \\ y",
      "{1: 2}",
      "x @ y",
      "x | y",
      "sin(x)(y)",
      "(sin)(x)",
      "[sin][0](x)",
      "2(x)",
      "0x1F",
      "1_000",
      "_x",
      "x²",
      "sin(x",
      "sin(x))",
      "(x]",
      "",
      "   ",
      "1".repeat(10_001),
    ];
    for (const expression of hostile) {
      assert.notEqual(checkMathExpression(expression), null, JSON.stringify(expression));
    }
  });

  it("points the caller at sage_evaluate", () => {
    assert.match(checkMathExpression("foo(x)") ?? "", /'foo' is not available.*sage_evaluate/);
    assert.match(checkMathExpression("x = 5") ?? "", /==/);
  });
});

describe("tool schemas apply the guard", () => {
  const code = "__import__('os').system('id')";

  it("refuses code in every structured expression field", () => {
    assert.equal(SolveEquationSchema.safeParse({ equation: code, variable: "x" }).success, false);
    assert.equal(IntegrateSchema.safeParse({ expression: code, variable: "x" }).success, false);
    assert.equal(
      IntegrateSchema.safeParse({ expression: "x", variable: "x", lower_limit: "0", upper_limit: code }).success,
      false
    );
    assert.equal(MatrixOpsSchema.safeParse({ matrix: code, operation: "rank" }).success, false);
    assert.equal(NumberTheorySchema.safeParse({ operation: "gcd", value: "12", second_value: code }).success, false);
  });

  it("accepts mathematics and empty optional limits", () => {
    assert.ok(IntegrateSchema.safeParse({ expression: "x^2", variable: "x" }).success);
    assert.ok(IntegrateSchema.safeParse({ expression: "x^2", variable: "x", lower_limit: "0", upper_limit: "pi/2" }).success);
    assert.ok(MatrixOpsSchema.safeParse({ matrix: "[[1,2],[3,4]]", operation: "determinant" }).success);
    assert.ok(NumberTheorySchema.safeParse({ operation: "is_prime", value: "2^127 - 1" }).success);
  });

  it("leaves sage_evaluate unrestricted", () => {
    assert.ok(ExpressionSchema.safeParse({ expression: "[i^2 for i in range(5)]" }).success);
  });
});
