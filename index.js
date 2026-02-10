#!/usr/bin/env node

const readline = require("readline");
const fs = require("fs");
const path = require("path");
const chalk = require("chalk");
const cliProgress = require("cli-progress");

const { showBanner } = require("./src/banner");
const { generateHTMLReport } = require("./src/reporters/htmlReporter");
const { generateCSVReport } = require("./src/reporters/csvReporter");
const { loadConfig, saveDefaultConfig } = require("./src/config");
const { askToViewFiles } = require("./src/utils/fileViewer");

const { fetchJSFiles } = require("./src/fetcher");
const { downloadJS } = require("./src/downloader");
const { extractEndpoints } = require("./src/extractors/endpoints");
const { extractParams } = require("./src/extractors/paramExtractor");

const { detectMethod } = require("./src/extractors/methodDetector");
const { detectAuth } = require("./src/extractors/authDetector");
const { detectContext } = require("./src/extractors/contextDetector");

const { scoreEndpoint } = require("./src/analyzer/riskScorer");

showBanner();

let config = loadConfig();
const args = process.argv.slice(2);
if (args.includes("--init-config")) {
  const configPath = saveDefaultConfig();
  if (configPath) {
    console.log(chalk.green("[OK]"), chalk.cyan("Config dosyası oluşturuldu:"), configPath);
  } else {
    console.log(chalk.yellow("[!]"), "Config dosyası zaten mevcut");
  }
  process.exit(0);
}

let VERBOSE = args.includes("--verbose") || args.includes("-v") || config.verbose;
let SILENT = args.includes("--silent") || args.includes("-s");

let OUTPUT_FORMATS = config.outputFormats || ["json", "html", "csv"];
if (args.includes("--format")) {
  const formatArg = args[args.indexOf("--format") + 1];
  if (formatArg) {
    OUTPUT_FORMATS = formatArg.split(",").map(f => f.trim());
  }
}

if (args.includes("--no-html")) {
  OUTPUT_FORMATS = OUTPUT_FORMATS.filter(f => f !== "html");
}
if (args.includes("--html-only")) {
  OUTPUT_FORMATS = ["html"];
}
if (args.includes("--no-html") && args.includes("--html-only")) {
  console.error(chalk.red("[ERROR]"), "--no-html ve --html-only birlikte kullanılamaz");
  process.exit(1);
}

let targetUrl = null;
if (args.includes("--url")) {
  targetUrl = args[args.indexOf("--url") + 1];
}
let MIN_RISK = config.minRiskScore || 0;
if (args.includes("--min-risk")) {
  MIN_RISK = parseInt(args[args.indexOf("--min-risk") + 1], 10) || 0;
}

let ONLY_METHOD = null;
if (args.includes("--only-method")) {
  ONLY_METHOD = args[args.indexOf("--only-method") + 1]?.toUpperCase();
}

function showUsage() {
  console.log(chalk.cyan(`
AltaySec – JS Endpoint Discovery Tool

KULLANIM:
  node index.js --url https://github.com

OPSİYONLAR:
  --url <url>           Hedef site (zorunlu)
  --min-risk <n>       Minimum riskScore (ör: 5)
  --only-method <M>     Sadece belirli method (GET, POST, PUT, DELETE)
  --verbose, -v         Detaylı çıktı
  --silent, -s          Sessiz mod
  --init-config         Varsayılan config dosyası oluştur

Eski Opsiyonlar (hala çalışıyor):
  --no-html             HTML report üretme
  --html-only           Sadece HTML report üret

ÖRNEKLER:
  node index.js --url https://github.com
  node index.js --url https://github.com --min-risk 5 --verbose
  node index.js --url https://github.com --only-method POST
  node index.js --init-config

NOT: URL parametresi olmadan çalıştırırsanız interaktif mod açılır.
     Interaktif modda CLI'de 6 seçenek ile tüm parametreleri adım adım girebilirsiniz.
`));
}

function normalizeUrl(url) {
  if (!url) return null;
  url = url.trim();
  if (!url.startsWith("http")) {
    url = "https://" + url;
  }
  return url.replace(/\/$/, "");
}

function askForParameters() {

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const params = {
    url: null,
    formats: OUTPUT_FORMATS,
    minRisk: MIN_RISK,
    onlyMethod: ONLY_METHOD,
    verbose: VERBOSE,
    silent: SILENT
  };

  rl.question(chalk.cyan("1. Hedef site URL'si") + chalk.gray(` (zorunlu):\n> `), (url) => {
    const inputUrl = url.trim();
    
    if (!inputUrl) {
      console.error(chalk.red("\n[ERROR]"), "URL girilmedi. Çıkılıyor...");
      rl.close();
      process.exit(1);
    }

    if (inputUrl.includes(" ") || inputUrl.startsWith("node") || inputUrl.includes("--")) {
      console.error(chalk.red("\n[ERROR]"), "Lütfen sadece URL girin (komut satırı değil!).");
      console.error(chalk.gray("Örnek: https://github.com veya github.com\n"));
      rl.close();
      process.exit(1);
    }

    params.url = normalizeUrl(inputUrl);

    const defaultFormats = OUTPUT_FORMATS.join(",");
    rl.question(chalk.cyan("\n2. Çıktı formatları") + chalk.gray(` (json,html,csv) [varsayılan: ${defaultFormats}]:\n> `), (format) => {
      const inputFormat = format.trim();
      if (inputFormat) {
        params.formats = inputFormat.split(",").map(f => f.trim()).filter(f => f);
      }

      rl.question(chalk.cyan("\n3. Minimum risk skoru") + chalk.gray(` [varsayılan: ${MIN_RISK}]:\n> `), (risk) => {
        const inputRisk = risk.trim();
        if (inputRisk) {
          const riskNum = parseInt(inputRisk, 10);
          if (!isNaN(riskNum)) {
            params.minRisk = riskNum;
          }
        }

        rl.question(chalk.cyan("\n4. Sadece belirli HTTP method") + chalk.gray(` (GET,POST,PUT,DELETE,PATCH) [varsayılan: tümü]:\n> `), (method) => {
          const inputMethod = method.trim().toUpperCase();
          if (inputMethod && ["GET", "POST", "PUT", "DELETE", "PATCH"].includes(inputMethod)) {
            params.onlyMethod = inputMethod;
          }

          rl.question(chalk.cyan("\n5. Detaylı çıktı (verbose)") + chalk.gray(` [varsayılan: ${VERBOSE ? "evet" : "hayır"}] (e/h):\n> `), (verbose) => {
            const inputVerbose = verbose.trim().toLowerCase();
            if (inputVerbose === "e" || inputVerbose === "evet" || inputVerbose === "y" || inputVerbose === "yes") {
              params.verbose = true;
            } else if (inputVerbose === "h" || inputVerbose === "hayır" || inputVerbose === "n" || inputVerbose === "no") {
              params.verbose = false;
            }

            rl.question(chalk.cyan("\n6. Sessiz mod") + chalk.gray(` [varsayılan: ${SILENT ? "evet" : "hayır"}] (e/h):\n> `), (silent) => {
              const inputSilent = silent.trim().toLowerCase();
              if (inputSilent === "e" || inputSilent === "evet" || inputSilent === "y" || inputSilent === "yes") {
                params.silent = true;
              } else if (inputSilent === "h" || inputSilent === "hayır" || inputSilent === "n" || inputSilent === "no") {
                params.silent = false;
              }

              rl.close();


              OUTPUT_FORMATS = params.formats;
              MIN_RISK = params.minRisk;
              ONLY_METHOD = params.onlyMethod;
              startScanWithParams(params.url, params.formats, params.minRisk, params.onlyMethod, params.verbose, params.silent);
            });
          });
        });
      });
    });
  });
}

function createProgressBar(total, label) {
  if (SILENT) return null;
  
  const bar = new cliProgress.SingleBar({
    format: chalk.cyan('{bar}') + ' | {percentage}% | {value}/{total} | ' + chalk.yellow('{label}'),
    barCompleteChar: '\u2588',
    barIncompleteChar: '\u2591',
    hideCursor: true
  }, cliProgress.Presets.shades_classic);
  
  bar.start(total, 0, { label });
  return bar;
}

async function startScanWithParams(url, formats, minRisk, onlyMethod, verbose, silent) {
  const originalFormats = OUTPUT_FORMATS;
  const originalMinRisk = MIN_RISK;
  const originalOnlyMethod = ONLY_METHOD;
  const originalVerbose = VERBOSE;
  const originalSilent = SILENT;
  
  OUTPUT_FORMATS = formats;
  MIN_RISK = minRisk;
  ONLY_METHOD = onlyMethod;
  VERBOSE = verbose;
  SILENT = silent;
  
  await startScan(url);
  
  OUTPUT_FORMATS = originalFormats;
  MIN_RISK = originalMinRisk;
  ONLY_METHOD = originalOnlyMethod;
  VERBOSE = originalVerbose;
  SILENT = originalSilent;
}

async function startScan(url) {
  const startTime = Date.now();
  
  if (!SILENT) {
    console.log(chalk.blue("\n[*]"), chalk.white("Hedef:"), chalk.cyan(url));
  }

  const allEndpoints = {};
  let jsFiles = [];
  
  try {
    jsFiles = await fetchJSFiles(url);
    
    
    if (jsFiles.length === 0) {
      console.log(chalk.yellow("[!]"), "JS dosyası bulunamadı");
      process.exit(0);
    }
  } catch (error) {
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      console.error(chalk.red("[X]"), "Timeout hatası: Site çok yavaş yanıt veriyor.");
    } else {
      console.error(chalk.red("[X]"), "JS dosyaları alınırken hata:", error.message);
    }
    process.exit(1);
  }

  const progressBar = createProgressBar(jsFiles.length, "Analiz ediliyor");
  let processed = 0;
  const CONCURRENT = config.concurrent || 3;
  const batches = [];
  for (let i = 0; i < jsFiles.length; i += CONCURRENT) {
    batches.push(jsFiles.slice(i, i + CONCURRENT));
  }

  for (const batch of batches) {
    await Promise.all(batch.map(async (js) => {
      try {

        const file = await downloadJS(js);
        const endpoints = extractEndpoints(file);
        
        if (!endpoints.length) {
          processed++;
          if (progressBar) progressBar.update(processed);
          return;
        }

        endpoints.forEach(e => {
          const params = extractParams(e.endpoint);
          
          const methods = detectMethod(file, e.endpoint);
          const auth = detectAuth(file);
          const context = detectContext(file);

          if (!allEndpoints[e.endpoint]) {
            allEndpoints[e.endpoint] = {
              endpoint: e.endpoint,
              types: new Set(),
              methods: new Set(),
              auth,
              context,
              params: params
            };
          }

          e.types.forEach(t => allEndpoints[e.endpoint].types.add(t));
          methods.forEach(m => allEndpoints[e.endpoint].methods.add(m));
        });

        processed++;
        if (progressBar) progressBar.update(processed, { label: path.basename(js) });

      } catch (error) {
        processed++;
        if (progressBar) progressBar.update(processed);
      }
    }));
  }

  if (progressBar) {
    progressBar.stop();
  }

  const outputDir = path.join(__dirname, "output");
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  let result = Object.values(allEndpoints)
    .map(e => {
      const scored = scoreEndpoint({
        endpoint: e.endpoint,
        types: [...e.types],
        methods: [...e.methods],
        auth: e.auth,
        context: e.context,
        params: e.params
      });
      return scored;
    })
    .sort((a, b) => b.riskScore - a.riskScore);

  if (MIN_RISK > 0) {
    const before = result.length;
    result = result.filter(e => e.riskScore >= MIN_RISK);
    if (VERBOSE && !SILENT) {
    }
  }

  if (ONLY_METHOD) {
    const before = result.length;
    result = result.filter(e => e.methods.includes(ONLY_METHOD));
    if (VERBOSE && !SILENT) {
    }
  }

  const outputFiles = [];
  
  if (OUTPUT_FORMATS.includes("json")) {
    const jsonPath = path.join(outputDir, "endpoints.json");
    fs.writeFileSync(jsonPath, JSON.stringify(result, null, 2));
    outputFiles.push({ format: "JSON", path: jsonPath });
  }

  if (OUTPUT_FORMATS.includes("csv")) {
    const csvPath = generateCSVReport(result, outputDir);
    if (csvPath) outputFiles.push({ format: "CSV", path: csvPath });
  }

  if (OUTPUT_FORMATS.includes("html")) {
    generateHTMLReport(result, outputDir);
    outputFiles.push({ format: "HTML", path: path.join(outputDir, "report.html") });
  }

  if (!SILENT) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(chalk.green("\n[OK]"), chalk.white("Tarama tamamlandı!"));
    console.log(chalk.cyan(`  Endpoint: ${chalk.bold(result.length)} | Süre: ${chalk.bold(duration)}s`));
    
    if (result.length > 0) {
      const highRisk = result.filter(e => e.severity === "HIGH").length;
      const mediumRisk = result.filter(e => e.severity === "MEDIUM").length;
      const lowRisk = result.filter(e => e.severity === "LOW").length;
      console.log(chalk.gray(`  Risk: HIGH(${highRisk}) MEDIUM(${mediumRisk}) LOW(${lowRisk})`));
    }
    

    if (outputFiles.length > 0 && !SILENT) {
      askToViewFiles(outputFiles);
    }
  }
}

if (!targetUrl) {
  askForParameters();
} else {
  startScan(normalizeUrl(targetUrl));
}
