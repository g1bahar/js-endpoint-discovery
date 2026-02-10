const fs = require("fs");
const path = require("path");

function generateHTMLReport(endpoints, outputDir) {
  const html = buildHTML(endpoints);
  const outputPath = path.join(outputDir, "report.html");

  fs.writeFileSync(outputPath, html, "utf-8");
}

function buildHTML(endpoints) {
  const rows = endpoints.map(e => `
    <tr 
      data-endpoint="${e.endpoint.toLowerCase()}"
      data-severity="${e.severity}"
      data-methods="${e.methods.join(",")}"
    >
      <td>${e.endpoint}</td>
      <td>${e.methods.join(", ")}</td>
      <td>${e.severity}</td>
      <td>${e.riskScore}</td>
      <td>${e.auth ? "Yes" : "No"}</td>
      <td>${e.types.join(", ")}</td>
    </tr>
  `).join("");

  return `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>AltaySec – JS Endpoint Discovery Report</title>

<style>
  body {
    font-family: Arial, sans-serif;
    background: #0f172a;
    color: #e5e7eb;
    padding: 20px;
  }
  h1 { color: #38bdf8; }

  .controls {
    display: flex;
    gap: 10px;
    margin-bottom: 15px;
  }

  input, select {
    padding: 6px;
    background: #1e293b;
    color: #e5e7eb;
    border: 1px solid #334155;
  }

  table {
    width: 100%;
    border-collapse: collapse;
  }
  th, td {
    border: 1px solid #334155;
    padding: 8px;
  }
  th { background: #1e293b; }

  tr[data-severity="HIGH"] { background: #7f1d1d; }
  tr[data-severity="MEDIUM"] { background: #78350f; }
  tr[data-severity="LOW"] { background: #064e3b; }
</style>
</head>

<body>

<h1>AltaySec – JS Endpoint Discovery Report</h1>
<p>Toplam Endpoint: <b>${endpoints.length}</b></p>

<div class="controls">
  <input type="text" id="search" placeholder="Search endpoint..." />
  
  <select id="severityFilter">
    <option value="">All Severities</option>
    <option value="HIGH">HIGH</option>
    <option value="MEDIUM">MEDIUM</option>
    <option value="LOW">LOW</option>
  </select>

  <select id="methodFilter">
    <option value="">All Methods</option>
    <option value="GET">GET</option>
    <option value="POST">POST</option>
  </select>
</div>

<table>
<thead>
<tr>
  <th>Endpoint</th>
  <th>Methods</th>
  <th>Severity</th>
  <th>Risk</th>
  <th>Auth</th>
  <th>Discovery</th>
</tr>
</thead>
<tbody id="endpointTable">
${rows}
</tbody>
</table>

<script>
  const searchInput = document.getElementById("search");
  const severityFilter = document.getElementById("severityFilter");
  const methodFilter = document.getElementById("methodFilter");
  const rows = document.querySelectorAll("#endpointTable tr");

  function applyFilters() {
    const search = searchInput.value.toLowerCase();
    const severity = severityFilter.value;
    const method = methodFilter.value;

    rows.forEach(row => {
      const endpoint = row.dataset.endpoint;
      const rowSeverity = row.dataset.severity;
      const methods = row.dataset.methods;

      let visible = true;

      if (search && !endpoint.includes(search)) visible = false;
      if (severity && rowSeverity !== severity) visible = false;
      if (method && !methods.includes(method)) visible = false;

      row.style.display = visible ? "" : "none";
    });
  }

  searchInput.addEventListener("input", applyFilters);
  severityFilter.addEventListener("change", applyFilters);
  methodFilter.addEventListener("change", applyFilters);
</script>

</body>
</html>
`;
}

module.exports = {
  generateHTMLReport
};
