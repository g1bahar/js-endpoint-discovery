const fs = require("fs");
const path = require("path");
const chalk = require("chalk");
const readline = require("readline");
const { exec } = require("child_process");
const os = require("os");

function showFileContent(filePath, format) {
  if (!fs.existsSync(filePath)) {
    console.log(chalk.red("[X]"), "Dosya bulunamadı:", filePath);
    return;
  }

  const content = fs.readFileSync(filePath, "utf8");
  const fileName = path.basename(filePath);

  console.log(chalk.cyan("\n" + "═".repeat(70)));
  console.log(chalk.bold.cyan(`${fileName}`));
  console.log(chalk.cyan("═".repeat(70)));

  switch (format.toLowerCase()) {
    case "json":
      showJSONContent(content);
      break;
    case "csv":
      showCSVContent(content);
      break;
    case "html":
      showHTMLInfo(filePath, content);
      break;
    default:
      console.log(content);
  }

  console.log(chalk.cyan("═".repeat(70)));
}

function showJSONContent(content) {
  try {
    const json = JSON.parse(content);
    
    // İstatistikler önce göster
    if (Array.isArray(json)) {
      console.log(chalk.green("İstatistikler:"));
      console.log(chalk.gray(`  Toplam endpoint: ${chalk.bold.white(json.length)}`));
      
      if (json.length > 0) {
        const highRisk = json.filter(e => e.severity === "HIGH").length;
        const mediumRisk = json.filter(e => e.severity === "MEDIUM").length;
        const lowRisk = json.filter(e => e.severity === "LOW").length;
        
        console.log(chalk.red(`  HIGH risk: ${chalk.bold(highRisk)}`));
        console.log(chalk.yellow(`  MEDIUM risk: ${chalk.bold(mediumRisk)}`));
        console.log(chalk.green(`  LOW risk: ${chalk.bold(lowRisk)}`));
      }
      console.log("");
    }
    
    // JSON içeriğini renkli göster
    const formatted = JSON.stringify(json, null, 2);
    const lines = formatted.split("\n");
    
    // İlk 50 satırı göster (çok uzun olmasın)
    const maxLines = 50;
    for (let i = 0; i < Math.min(lines.length, maxLines); i++) {
      const line = lines[i];
      
      // Key'leri ve değerleri renklendir
      if (line.includes('"endpoint"')) {
        console.log(line.replace(/"endpoint"/, chalk.cyan('"endpoint"')));
      } else if (line.includes('"severity"')) {
        const severityMatch = line.match(/"severity":\s*"(\w+)"/);
        if (severityMatch) {
          const severity = severityMatch[1];
          let color = chalk.white;
          if (severity === "HIGH") color = chalk.red.bold;
          else if (severity === "MEDIUM") color = chalk.yellow.bold;
          else if (severity === "LOW") color = chalk.green.bold;
          console.log(line.replace(/"severity":\s*"\w+"/, `"severity": ${color(`"${severity}"`)}`));
        } else {
          console.log(chalk.gray(line));
        }
      } else if (line.includes('"riskScore"')) {
        console.log(line.replace(/"riskScore"/, chalk.magenta('"riskScore"')));
      } else if (line.includes('"methods"')) {
        console.log(line.replace(/"methods"/, chalk.blue('"methods"')));
      } else if (line.includes('"types"')) {
        console.log(line.replace(/"types"/, chalk.yellow('"types"')));
      } else if (line.match(/^\s*"[^"]+":/)) {
        // Diğer key'leri mavi yap
        const keyMatch = line.match(/^(\s*)("[^"]+"):/);
        if (keyMatch) {
          console.log(keyMatch[1] + chalk.blue(keyMatch[2]) + line.substring(keyMatch[0].length));
        } else {
          console.log(chalk.gray(line));
        }
      } else {
        console.log(chalk.gray(line));
      }
    }
    
    if (lines.length > maxLines) {
      console.log(chalk.gray(`\n... ve ${lines.length - maxLines} satır daha`));
      console.log(chalk.yellow("[!] Tüm içeriği görmek için dosyayı bir editörde açın."));
    }
  } catch (error) {
    console.log(chalk.red("[X] JSON parse hatası:"), error.message);
    console.log(content);
  }
}

function showCSVContent(content) {
  const lines = content.split("\n").filter(line => line.trim());
  if (lines.length === 0) {
    console.log(chalk.yellow("[!] CSV dosyası boş"));
    return;
  }

  // CSV parsing - quoted values desteği
  function parseCSVLine(line) {
    const result = [];
    let current = "";
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  }

  // Tüm satırları parse et
  const parsedRows = lines.map(line => parseCSVLine(line));
  const headers = parsedRows[0].map(h => h.replace(/"/g, ""));
  
  // Sütun genişliklerini hesapla
  const columnWidths = headers.map((header, idx) => {
    let maxWidth = header.length;
    for (let i = 1; i < Math.min(parsedRows.length, 21); i++) {
      const cell = parsedRows[i][idx]?.replace(/"/g, "") || "";
      maxWidth = Math.max(maxWidth, Math.min(cell.length, 50)); // Max 50 karakter
    }
    return Math.min(maxWidth + 2, 52); // Min genişlik + padding
  });

  // Header'ı göster
  const headerStr = headers.map((h, idx) => {
    const truncated = h.length > columnWidths[idx] - 2 ? h.substring(0, columnWidths[idx] - 5) + "..." : h;
    return chalk.bold.cyan(truncated.padEnd(columnWidths[idx]));
  }).join(" │ ");
  
  console.log(headerStr);
  console.log(chalk.gray("─".repeat(headerStr.length)));

  // İlk 20 satırı göster
  const maxRows = 20;
  for (let i = 1; i < Math.min(parsedRows.length, maxRows + 1); i++) {
    const row = parsedRows[i];
    
    // Severity'ye göre renklendir (3. sütun genelde severity)
    let rowColor = chalk.white;
    const severity = row[2]?.replace(/"/g, "").trim();
    if (severity === "HIGH") rowColor = chalk.red;
    else if (severity === "MEDIUM") rowColor = chalk.yellow;
    else if (severity === "LOW") rowColor = chalk.green;
    
    const rowStr = row.map((cell, idx) => {
      let cleanCell = cell.replace(/"/g, "");
      
      // Uzun hücreleri kısalt
      if (cleanCell.length > columnWidths[idx] - 2) {
        cleanCell = cleanCell.substring(0, columnWidths[idx] - 5) + "...";
      }
      
      return cleanCell.padEnd(columnWidths[idx]);
    }).join(" │ ");
    
    console.log(rowColor(rowStr));
  }

  if (parsedRows.length > maxRows + 1) {
    console.log(chalk.gray(`\n... ve ${parsedRows.length - maxRows - 1} satır daha`));
  }

  console.log(chalk.green(`\nToplam: ${parsedRows.length - 1} endpoint`));
}

function openInBrowser(filePath) {
  const platform = os.platform();
  let command;
  
  if (platform === 'win32') {
    // Windows için
    command = `start "" "${filePath}"`;
  } else if (platform === 'darwin') {
    // macOS için
    command = `open "${filePath}"`;
  } else {
    // Linux için
    command = `xdg-open "${filePath}"`;
  }
  
  exec(command, (error) => {
    if (error) {
      console.log(chalk.yellow("\n[!] Tarayıcı otomatik açılamadı. Manuel olarak açın:"));
      console.log(chalk.gray(`  ${filePath}`));
    } else {
      console.log(chalk.green("\n[OK] Tarayıcıda açıldı!"));
    }
  });
}

function showHTMLInfo(filePath, content) {
  console.log(chalk.yellow("ℹ"), "HTML dosyası bir web tarayıcısında açılmalıdır.");
  console.log(chalk.cyan("\n📂 Dosya yolu:"));
  console.log(chalk.gray(`  ${filePath}`));
  
  // HTML'den bazı bilgileri çıkar
  const endpointCount = (content.match(/<tr/g) || []).length - 1; // Header hariç
  if (endpointCount > 0) {
    console.log(chalk.green(`\nTespit edilen endpoint sayısı: ${endpointCount}`));
  }

  console.log(chalk.cyan("\n[!] Tarayıcıda açmak için:"));
  const platform = os.platform();
  if (platform === 'win32') {
    console.log(chalk.gray(`  Windows: start "${filePath}"`));
  } else if (platform === 'darwin') {
    console.log(chalk.gray(`  Mac: open "${filePath}"`));
  } else {
    console.log(chalk.gray(`  Linux: xdg-open "${filePath}"`));
  }

  // Kısa bir önizleme (HTML içeriğinin ilk birkaç satırı)
  const preview = content.split("\n").slice(0, 10).join("\n");
  console.log(chalk.cyan("\nÖnizleme (ilk 10 satır):"));
  console.log(chalk.gray(preview));
  
  // Tarayıcıda açmak ister misiniz?
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.question(chalk.cyan("\n> Tarayıcıda açmak ister misiniz? (e/h): "), (answer) => {
    rl.close();
    const input = answer.trim().toLowerCase();
    
    if (input === "e" || input === "evet" || input === "y" || input === "yes") {
      openInBrowser(filePath);
    } else {
      console.log(chalk.cyan("\n[!] Manuel olarak açmak için:"));
      const platform = os.platform();
      if (platform === 'win32') {
        console.log(chalk.gray(`  start "${filePath}"`));
      } else if (platform === 'darwin') {
        console.log(chalk.gray(`  open "${filePath}"`));
      } else {
        console.log(chalk.gray(`  xdg-open "${filePath}"`));
      }
    }
  });
}

function askToViewFiles(outputFiles) {
  if (outputFiles.length === 0) {
    return;
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  console.log(chalk.cyan("\n" + "═".repeat(70)));
  console.log(chalk.bold.cyan("Dosya Görüntüleme"));
  console.log(chalk.cyan("═".repeat(70)));

  outputFiles.forEach((file, index) => {
    console.log(chalk.green(`  ${index + 1}.`), chalk.white(`${file.format}:`), chalk.gray(file.path));
  });
  console.log(chalk.yellow(`  ${outputFiles.length + 1}.`), chalk.white("Tümünü göster"));
  console.log(chalk.gray(`  ${outputFiles.length + 2}.`), chalk.white("Çıkış"));

  rl.question(chalk.cyan("\n> Hangi dosyayı görüntülemek istersiniz? (numara): "), (answer) => {
    rl.close();

    const choice = parseInt(answer.trim(), 10);

    if (isNaN(choice) || choice < 1 || choice > outputFiles.length + 2) {
      console.log(chalk.yellow("[!] Geçersiz seçim. Çıkılıyor..."));
      return;
    }

    if (choice === outputFiles.length + 2) {
      console.log(chalk.gray("Çıkılıyor..."));
      return;
    }

    if (choice === outputFiles.length + 1) {
      // Tümünü göster
      outputFiles.forEach((file, index) => {
        if (index > 0) {
          console.log("\n");
        }
        showFileContent(file.path, file.format);
      });
    } else {
      // Seçilen dosyayı göster
      const selectedFile = outputFiles[choice - 1];
      showFileContent(selectedFile.path, selectedFile.format);
    }

    // Tekrar sormak ister misiniz?
    askAgain(outputFiles);
  });
}

function askAgain(outputFiles) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.question(chalk.cyan("\n> Başka bir dosya görüntülemek ister misiniz? (e/h): "), (answer) => {
    const input = answer.trim().toLowerCase();
    
    if (input === "e" || input === "evet" || input === "y" || input === "yes") {
      rl.close();
      askToViewFiles(outputFiles);
    } else {
      rl.close();
      // Diğer moda geçmek ister misiniz?
      askForOtherMode();
    }
  });
}

function askForOtherMode() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.question(chalk.cyan("\n> Diğer moda geçmek ister misiniz? (e/h): "), (answer) => {
    const input = answer.trim().toLowerCase();
    
    if (input === "e" || input === "evet" || input === "y" || input === "yes") {
      rl.close();
      showHelpMenu();
    } else {
      rl.close();
      console.log(chalk.gray("\nÇıkılıyor..."));
    }
  });
}

function showHelpMenu() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  console.log(chalk.cyan("\n" + "═".repeat(70)));
  console.log(chalk.bold.cyan("YARDIM"));
  console.log(chalk.cyan("═".repeat(70)));
  
  // Help mesajını göster
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
  
  rl.question(chalk.cyan("\n> Devam etmek için Enter'a basın..."), () => {
    rl.close();
    console.log(chalk.gray("\nÇıkılıyor..."));
  });
}

module.exports = { askToViewFiles, showFileContent, showHelpMenu };

