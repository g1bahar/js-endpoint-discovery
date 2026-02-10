const fs = require("fs");
const acorn = require("acorn");
const walk = require("acorn-walk");

function extractConditionalFetches(ast) {
  const results = [];

  walk.ancestor(ast, {
    CallExpression(node, ancestors) {
      if (
        node.callee.type === "Identifier" &&
        node.callee.name === "fetch"
      ) {
        const conditionNode = ancestors
          .slice()
          .reverse()
          .find(a => a.type === "IfStatement");

        if (!conditionNode) return;

        const arg = node.arguments[0];
        if (arg && arg.type === "Literal") {
          results.push({
            endpoint: arg.value,
            condition: "if-condition"
          });
        }
      }
    }
  });

  return results;
}

function extractWithAST(filePath) {
  const code = fs.readFileSync(filePath, "utf8");

  let ast;
  try {
    ast = acorn.parse(code, {
      ecmaVersion: "latest",
      sourceType: "script"
    });
  } catch {
    return [];
  }

  const variables = {};
  const endpoints = [];

  // const X = "string"
  walk.simple(ast, {
    VariableDeclarator(node) {
      if (
        node.id.type === "Identifier" &&
        node.init &&
        node.init.type === "Literal"
      ) {
        variables[node.id.name] = node.init.value;
      }
    }
  });

  // fetch(...) + binary expression
  walk.simple(ast, {
    CallExpression(node) {
      if (
        node.callee.type === "Identifier" &&
        node.callee.name === "fetch"
      ) {
        const arg = node.arguments[0];
        if (!arg) return;

        // fetch("...")
        if (arg.type === "Literal") {
          endpoints.push({
            endpoint: arg.value,
            types: ["ast"]
          });
        }

        // fetch(base + "/path")
        if (
          arg.type === "BinaryExpression" &&
          arg.operator === "+"
        ) {
          const left =
            arg.left.type === "Identifier"
              ? variables[arg.left.name]
              : arg.left.value;

          const right =
            arg.right.type === "Identifier"
              ? variables[arg.right.name]
              : arg.right.value;

          if (left && right) {
            endpoints.push({
              endpoint: left + right,
              types: ["ast"]
            });
          }
        }
      }
    }
  });

  // Koşullu fetch'ler
  const conditional = extractConditionalFetches(ast);

  conditional.forEach(c => {
    endpoints.push({
      endpoint: c.endpoint,
      types: ["conditional"],
      condition: c.condition
    });
  });

  return endpoints;
}

module.exports = { extractWithAST };
