function getSeverity(score) {
  if (score >= 8) return "HIGH";
  if (score >= 4) return "MEDIUM";
  return "LOW";
}

function scoreEndpoint(e) {
  let score = 0;
  const reasons = [];

  // Method riskleri
  if (e.methods.includes("POST")) {
    score += 3;
    reasons.push("POST request");
  }
  if (e.methods.includes("PUT") || e.methods.includes("PATCH")) {
    score += 4;
    reasons.push("PUT/PATCH request");
  }
  if (e.methods.includes("DELETE")) {
    score += 5;
    reasons.push("DELETE request");
  }

  // Context riskleri
  if (e.context === "pre-login") {
    score += 3;
    reasons.push("pre-login endpoint");
  }

  // Auth riskleri
  if (e.auth === false) {
    score += 2;
    reasons.push("no auth");
  }

  // Endpoint pattern riskleri
  if (e.endpoint.toLowerCase().includes("json")) {
    score += 2;
    reasons.push("JSON endpoint");
  }

  if (/(login|auth|session|cookie|token|password|secret)/i.test(e.endpoint)) {
    score += 4;
    reasons.push("auth/session related");
  }

  if (/(admin|delete|remove|destroy|drop)/i.test(e.endpoint)) {
    score += 5;
    reasons.push("destructive operation");
  }

  if (/(user|profile|account)/i.test(e.endpoint)) {
    score += 3;
    reasons.push("user data endpoint");
  }

  // Parametre riskleri
  if (e.params && e.params.total > 0) {
    if (e.params.path.length > 0) {
      score += 1;
      reasons.push("path parameters");
    }
    if (e.params.query.length > 3) {
      score += 2;
      reasons.push("many query parameters");
    }
  }

  // GraphQL ve WebSocket riskleri
  if (e.types.some(t => t.includes("graphql"))) {
    score += 3;
    reasons.push("GraphQL endpoint");
  }
  if (e.types.some(t => t.includes("websocket"))) {
    score += 2;
    reasons.push("WebSocket connection");
  }

  return {
    ...e,
    riskScore: score,
    severity: getSeverity(score),
    reasons
  };
}

module.exports = {
  scoreEndpoint
};
