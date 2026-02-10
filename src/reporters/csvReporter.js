const fs = require("fs");
const path = require("path");

function generateCSVReport(endpoints, outputDir) {
  if (endpoints.length === 0) {
    return;
  }

  const headers = [
    "Endpoint",
    "Methods",
    "Severity",
    "Risk Score",
    "Auth",
    "Types",
    "Context",
    "Reasons"
  ];

  const rows = endpoints.map(e => [
    `"${e.endpoint.replace(/"/g, '""')}"`,
    e.methods.join(";"),
    e.severity,
    e.riskScore,
    e.auth ? "Yes" : "No",
    e.types.join(";"),
    e.context || "unknown",
    e.reasons ? e.reasons.join("; ") : ""
  ]);

  const csv = [
    headers.join(","),
    ...rows.map(row => row.join(","))
  ].join("\n");

  const outputPath = path.join(outputDir, "endpoints.csv");
  fs.writeFileSync(outputPath, csv, "utf-8");
  
  return outputPath;
}

module.exports = { generateCSVReport };

