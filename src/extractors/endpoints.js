const fs = require("fs");

const networkPatterns = [
  { type: "fetch", regex: /fetch\(\s*["'`](.*?)["'`]/g },
  { type: "fetch-template", regex: /fetch\s*\(\s*`([^`]+)`/g },
  { type: "axios", regex: /axios\.(get|post|put|delete|patch)\(\s*["'`](.*?)["'`]/g },
  { type: "axios-template", regex: /axios\.(get|post|put|delete|patch)\s*\(\s*`([^`]+)`/g },
  { type: "xhr", regex: /\.open\(\s*["'`](GET|POST|PUT|DELETE|PATCH)["'`]\s*,\s*["'`](.*?)["'`]/g },
  { type: "xhr-template", regex: /\.open\(\s*["'`](GET|POST|PUT|DELETE|PATCH)["'`]\s*,\s*`([^`]+)`/g },
  { type: "graphql", regex: /["'`](\/graphql[^"'`\s]*)["'`]/g },
  { type: "graphql-alt", regex: /graphql\s*\(\s*["'`](.*?)["'`]/g },
  { type: "websocket", regex: /new\s+WebSocket\s*\(\s*["'`](.*?)["'`]/g },
  { type: "websocket-template", regex: /new\s+WebSocket\s*\(\s*`([^`]+)`/g }
];

const directPaths = [
  /["'`](\/api\/[^"'`\s]+)["'`]/g,
  /["'`](\/sessions\/[^"'`\s]+)["'`]/g,
  /["'`](\/v\d+\/[^"'`\s]+)["'`]/g,
  /["'`](\/rest\/[^"'`\s]+)["'`]/g,
  /["'`](\/graphql[^"'`\s]*)["'`]/g,
  /`(\/api\/[^`\s]+)`/g,
  /`(\/v\d+\/[^`\s]+)`/g
];

const blacklist = [
  "w3.org",
  "schema.org",
  "svg",
  "xlink",
  "facebook.com",
  "instagram.com",
  "youtube.com",
  "tiktok.com",
  "linkedin.com",
  "githubassets.com/images",
  ".svg",
  ".png",
  ".jpg",
  "dummy-base.url"
];

function isNoise(url) {
  if (!url) return true;
  if (url.includes("${") || url.includes("${")) return true;
  if (url.length < 3 || url.length > 500) return true;
  if (!url.includes("/") && !url.startsWith("http")) return true;
  return blacklist.some(b => url.includes(b));
}

function cleanEndpoint(url) {
  let cleaned = url.replace(/\$\{[^}]+\}/g, "");
  cleaned = cleaned.trim();
  if (!cleaned || cleaned.length < 2) return null;
  return cleaned;
}

function extractEndpoints(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const map = new Map();

  networkPatterns.forEach(p => {
    let match;
    const regex = new RegExp(p.regex.source, p.regex.flags);
    while ((match = regex.exec(content)) !== null) {
      let url = match[2] || match[1];
      if (!url) continue;
      
      url = cleanEndpoint(url);
      if (!url || isNoise(url)) continue;

      if (url.startsWith("//")) url = "https:" + url;

      if (!map.has(url)) map.set(url, new Set());
      map.get(url).add(p.type);
    }
  });

  directPaths.forEach(regex => {
    let match;
    while ((match = regex.exec(content)) !== null) {
      const url = match[1];
      if (isNoise(url)) continue;

      if (!map.has(url)) map.set(url, new Set());
      map.get(url).add("direct");
    }
  });

  return [...map.entries()].map(([endpoint, types]) => ({
    endpoint,
    types: [...types]
  }));
}

module.exports = { extractEndpoints };
