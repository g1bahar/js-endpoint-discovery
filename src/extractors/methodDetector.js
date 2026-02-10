function detectMethod(code, endpoint) {
  const methods = new Set();

  const fetchRegex = new RegExp(
    `fetch\\(\\s*['"\`]${endpoint}['"\`][\\s\\S]*?method\\s*:\\s*['"\`](GET|POST|PUT|DELETE)`,
    "i"
  );

  const axiosRegex = new RegExp(
    `axios\\.(get|post|put|delete)\\(\\s*['"\`]${endpoint}`,
    "i"
  );

  if (fetchRegex.test(code)) {
    const m = code.match(fetchRegex);
    if (m && m[1]) methods.add(m[1].toUpperCase());
  }

  if (axiosRegex.test(code)) {
    const m = code.match(axiosRegex);
    if (m && m[1]) methods.add(m[1].toUpperCase());
  }

  if (methods.size === 0) return ["GET"];
  return [...methods];
}

module.exports = { detectMethod };
