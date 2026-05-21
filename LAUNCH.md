# Profesni mapa - final launch checklist

## Produkcni URL

- Web: https://profesni-mapa.vercel.app
- API: https://profesni-mapa-api-production.up.railway.app
- Sitemap: https://profesni-mapa.vercel.app/sitemap.xml
- Ukazkovy PDF report: https://profesni-mapa.vercel.app/api/reports/sample.pdf

## Co je hotove

- Verejna landing page pro rodice, studenty a skoly.
- Pilotni vstup chraneny kodem.
- Lead formular pro zajemce o betu.
- Interni analytika udalosti a leadu v API.
- 100 profesi pro CR.
- 403 regionalnich profesnich SEO stranek.
- 12 poradenskych SEO pruvodcu.
- 16 srovnavacich SEO stranek.
- Nove verejne stranky: `/navod/`, `/soukromi/`, `/podminky/`.
- Automaticky generovana sitemap a robots.txt.
- IndexNow submit workflow.
- Railway API pro case board, leady, udalosti a PDF reporty.
- MCP stdio server pro datovy katalog profesi.

## Pred kazdym deployem

```bash
npm run deploy:check
```

Tento prikaz spusti lint, frontend build, PDF/report build a MCP build.

## Po deployi

Overit:

```bash
curl https://profesni-mapa.vercel.app
curl https://profesni-mapa.vercel.app/sitemap.xml
curl https://profesni-mapa.vercel.app/api/status
curl -I https://profesni-mapa.vercel.app/api/reports/sample.pdf
```

Znovu odeslat IndexNow:

```bash
npm run seo:indexnow
```

## Co nejde dokoncit jen kodem

### Google Search Console

Hotovo 2026-05-21:

- URL prefix property: `https://profesni-mapa.vercel.app/`
- Overeni vlastnictvi: HTML soubor `googleaa0e2bdae7d8057d.html`
- Sitemap odeslana: `sitemap.xml`

Poznamka: rucni pozadavek na indexaci homepage v Search Console vratil denni limit uctu. To neblokuje zpracovani sitemap; Google ji bude zpracovavat automaticky.

### Vlastni domena

Doporucena domena:

- `profesnimapa.cz`
- `app.profesnimapa.cz`
- `api.profesnimapa.cz`

Dokud neni domena koupena a pripojena ve Vercelu/Railway, produkcni provoz jede na `vercel.app` a Railway domene.

## Bezpecnost pilotu

- Nepouzivat rodna cisla, adresy, zdravotni udaje ani citliva data zaku.
- V pilotu pracovat s anonymnim profilem.
- Skola musi mit interni pravidla, kde se uchovavaji PDF reporty a kdo k nim ma pristup.
- Produkt je poradensky podklad, ne zavazne rozhodnuti o prijeti, mzde ani zdravotni zpusobilosti.

## Minimum pro verejne testovani

Produkt je pripraveny pro pasivni verejne testovani:

- uzivatel prijde z vyhledavani nebo odkazu,
- projde demo,
- otevre ukazkovy report,
- vyplni lead formular,
- ty uvidis leady a udalosti v pilotni administraci.

Aktivni placeni pres Stripe zatim neni zapnute. Pred napojenim plateb je lepsi nasbirat prvni realne signaly pres lead formular a ukazkovy PDF report.
