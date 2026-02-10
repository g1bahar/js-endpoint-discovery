const fs = require("fs");
const path = require("path");

const DEFAULT_CONFIG = {
  minRiskScore: 0,
  outputFormats: ["json", "html", "csv"],
  excludePatterns: [],
  includePatterns: [],
  timeout: 30000,
  concurrent: 3,
  userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  verbose: false
};

function loadConfig() {
  const configPath = path.join(process.cwd(), ".js-endpoint-discovery.json");
  
  if (fs.existsSync(configPath)) {
    try {
      const userConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
      return { ...DEFAULT_CONFIG, ...userConfig };
    } catch (error) {
      console.warn("[!] Config dosyası okunamadı, varsayılan ayarlar kullanılıyor");
      return DEFAULT_CONFIG;
    }
  }
  
  return DEFAULT_CONFIG;
}

function saveDefaultConfig() {
  const configPath = path.join(process.cwd(), ".js-endpoint-discovery.json");
  if (!fs.existsSync(configPath)) {
    fs.writeFileSync(
      configPath,
      JSON.stringify(DEFAULT_CONFIG, null, 2),
      "utf8"
    );
    return configPath;
  }
  return null;
}

module.exports = { loadConfig, saveDefaultConfig, DEFAULT_CONFIG };

