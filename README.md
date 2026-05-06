# Profesní mapa

ČR-first MVP pro kariérní poradce, žáky a rodiče. Aplikace porovnává profesní cesty podle profilu žáka, CZ-ISCO, vzdělávacího oboru, mzdového signálu, volných míst MPSV a školních programů z Infoabsolventu.

## Lokální spuštění

```bash
npm install
npm run dev
```

Frontend běží typicky na `http://127.0.0.1:5174/`.

## Datová aktualizace

```bash
npm run data:mpsv
```

Příkaz regeneruje `src/marketSignals.ts` z oficiálního MPSV open-data JSON pro volná místa podle CZ-ISCO.

## Server pro PDF reporty a případy

```bash
npm run report:build
npm run report:start
```

Lokálně report server běží na `http://127.0.0.1:8787` a vystavuje:

- `GET /health`
- `GET /api/status`
- `GET /api/cases`
- `POST /api/cases`
- `PATCH /api/cases/:id`
- `DELETE /api/cases/:id`
- `GET /api/reports`
- `GET /api/reports/sample.pdf`
- `POST /api/reports/pdf`

Webová aplikace používá tento server pro školní case board a serverový PDF export. Případy žáků se ukládají do `storage/cases.json`. Vygenerované PDF reporty se ukládají do `storage/reports/YYYY-MM/` a každý export zapíše auditní řádek do `storage/report-audit.jsonl`. Když report server neběží, aplikace spadne zpět na tiskové okno prohlížeče.

Produkční smoke testy:

```bash
curl https://profesni-mapa.vercel.app/api/status
curl -I https://profesni-mapa.vercel.app/api/reports/sample.pdf
```

## MCP datový server

```bash
npm run mcp:build
npm run mcp:start
```

MCP server zpřístupňuje stejný katalog profesí a regionální data přes stdio. Dostupné nástroje:

- `list_careers`
- `get_career_detail`
- `rank_careers_for_profile`
- `compare_careers`
- `get_data_sources`

Příklad konfigurace klienta:

```json
{
  "mcpServers": {
    "profesni-mapa-data": {
      "command": "node",
      "args": ["C:/Users/Machy/Documents/New project/build/mcp/mcpServer.js"]
    }
  }
}
```

Po změně dat nebo MCP serveru spusť `npm run mcp:build`.

## Deploy

Doporučené rozdělení produkce:

- Frontend: Vercel, statický Vite build z adresáře `dist`.
- Backend/API: Railway nebo Render přes `Dockerfile.report`.
- Domény: `app.profesnimapa.cz` pro aplikaci a `api.profesnimapa.cz` pro report/case API.

### Frontend na Vercel

Repo připoj jako Vite projekt. Soubor `vercel.json` nastavuje:

- install command: `npm ci`
- build command: `npm run build`
- output directory: `dist`

Ve Vercelu nastav proměnnou:

```bash
VITE_REPORT_API_URL=https://api.profesnimapa.cz
```

Pro staging může být například:

```bash
VITE_REPORT_API_URL=https://profesni-mapa-api.up.railway.app
```

V produkčním nastavení přes Vercel rewrite může být `VITE_REPORT_API_URL=/`, aby frontend volal `/api/*` na stejné doméně a Vercel požadavky přeposlal na Railway backend.

### Backend na Railway

Railway použije `railway.json` a `Dockerfile.report`. Nastav proměnné:

```bash
NODE_ENV=production
HOST=0.0.0.0
CORS_ORIGIN=https://app.profesnimapa.cz,https://profesnimapa.cz
REPORT_STORAGE_DIR=/data
PILOT_ACCESS_CODE=PILOT2026
PILOT_SESSION_SECRET=<dlouhy-nahodny-secret>
```

`PORT` obvykle dodá Railway automaticky. Pro trvalé reporty a případy přidej persistent volume namountovaný do `/data`.

### Backend na Render

Alternativně lze použít `render.yaml`, který spouští stejný Docker image. Na Renderu nastav stejné proměnné jako na Railway a přidej disk/persistent storage s cestou `/data`.

### Před nasazením

```bash
npm run deploy:check
```

Tento příkaz spustí lint, frontend build, report build a MCP build.

## Co je zahrnuto

- React a TypeScript Vite aplikace
- český katalog v `src/data.ts` se 100 seed profesemi
- matching engine v `src/scoring.ts`
- MPSV vacancy signály v `src/marketSignals.ts`
- Infoabsolvent školní/programová vrstva v `src/schoolPrograms.ts`
- školní licence s pilot/school/region balíčky a kvótami reportů
- perzistentní case board pro školní poradenský workflow
- Coverage Matrix pro rozhodování, které segmenty profesí dál doplnit
- Pilot Launch board pro školy, PPP/MAP/kraje, zaměstnavatele a veřejné demo
- serverové A4 PDF reporty pro rodičovské schůzky a poradenskou dokumentaci
- MCP stdio server v `src/mcpServer.ts`
- reporting API v `src/reportServer.ts`
- poradenský dashboard v `src/App.tsx`
- responzivní produktový styling v `src/App.css`
