const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { loadConfig } = require("./config");

const config = loadConfig();

async function downloadJS(url) {
  const timeout = config.timeout || 30000;
  const userAgent = config.userAgent || "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
  
  try {
    const res = await axios.get(url, {
      headers: { "User-Agent": userAgent },
      timeout: timeout,
      maxRedirects: 5,
      validateStatus: (status) => status < 500
    });

    const urlHash = Buffer.from(url).toString('base64').replace(/[^a-zA-Z0-9]/g, '').substring(0, 10);
    const file = path.join(__dirname, "..", "output", "js", `${urlHash}-${Date.now()}.js`);
    
    const dir = path.dirname(file);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(file, res.data, "utf8");
    return file;
  } catch (error) {
    if (error.code === 'ECONNABORTED') {
      throw new Error(`Timeout: ${url}`);
    }
    throw error;
  }
}

module.exports = { downloadJS };
