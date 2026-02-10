const axios = require("axios");
const cheerio = require("cheerio");
const { loadConfig } = require("./config");

const config = loadConfig();

async function fetchJSFiles(url) {
  const timeout = config.timeout || 30000;
  const userAgent = config.userAgent || "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
  
  const res = await axios.get(url, {
    headers: { 
      "User-Agent": userAgent,
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
    },
    timeout: timeout,
    maxRedirects: 5
  });

  const $ = cheerio.load(res.data);
  const scripts = new Set();

  $("script[src]").each((_, el) => {
    let src = $(el).attr("src");
    if (!src) return;
    
    if (src.startsWith("//")) {
      src = "https:" + src;
    } else if (src.startsWith("/")) {
      const base = new URL(url).origin;
      src = base + src;
    } else if (!src.startsWith("http")) {
      // Relative path
      try {
        const baseUrl = new URL(url);
        src = new URL(src, baseUrl).href;
      } catch {
        return;
      }
    }
    
    if (src.match(/\.js($|\?|#)/i) || src.includes("/js/") || src.includes("/javascript/")) {
      scripts.add(src);
    }
  });

  return [...scripts];
}

module.exports = { fetchJSFiles };
