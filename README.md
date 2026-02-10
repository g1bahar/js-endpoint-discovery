# JS Endpoint Discovery Tool

Web sitelerindeki JavaScript dosyalarını analiz ederek API endpoint'lerini keşfeden araç.

## Kurulum

```bash
git clone https://github.com/G1BAHAR/js-endpoint-discovery.git
cd js-endpoint-discovery
npm install
```

## Kullanım

### Temel Kullanım

```bash
node index.js --url https://github.com
```

### Interaktif Mod

```bash
node index.js
```

### Seçenekler

- `--url <url>` - Hedef site (zorunlu)
- `--format <fmt>` - Çıktı formatları: json,html,csv
- `--min-risk <n>` - Minimum risk skoru
- `--only-method <METHOD>` - HTTP method filtresi (GET, POST, PUT, DELETE, PATCH)
- `--verbose, -v` - Detaylı çıktı
- `--silent, -s` - Sessiz mod
- `--init-config` - Config dosyası oluştur

### Örnekler

```bash
node index.js --url https://github.com
node index.js --url https://github.com --format json,csv
node index.js --url https://github.com --min-risk 5
node index.js --url https://github.com --only-method POST
node index.js --init-config
```

## Çıktı Dosyaları

`output/` klasöründe:
- `endpoints.json` - JSON formatında endpoint listesi
- `endpoints.csv` - CSV formatında endpoint listesi
- `report.html` - HTML raporu

## Yapılandırma

```bash
node index.js --init-config
```

`.js-endpoint-discovery.json` dosyası ile varsayılan ayarları özelleştirebilirsiniz.

## Özellikler

- JavaScript dosyalarından otomatik endpoint keşfi
- Risk skorlama sistemi
- Authentication tespiti
- HTTP method tespiti
- GraphQL ve WebSocket desteği
- Çoklu format desteği (JSON, HTML, CSV)
- Paralel işleme

## Sistem Gereksinimleri

- Node.js >= 12.0.0
- Windows, macOS, Linux

## Lisans

ISC License

## Yazar

**Gülbahar DİRİK** 
