import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..')
const dataPath = path.resolve(projectRoot, 'src', 'data.ts')
const publicRoot = path.resolve(projectRoot, 'public')
const professionRoot = path.resolve(publicRoot, 'profese')
const guideRoot = path.resolve(publicRoot, 'pruvodce')
const comparisonRoot = path.resolve(publicRoot, 'srovnani')
const siteUrl = 'https://profesni-mapa.vercel.app'

const regionNames = {
  praha: 'Praha',
  stredocesky: 'Středočeský kraj',
  jihocesky: 'Jihočeský kraj',
  plzensky: 'Plzeňský kraj',
  karlovarsky: 'Karlovarský kraj',
  ustecky: 'Ústecký kraj',
  liberecky: 'Liberecký kraj',
  kralovehradecky: 'Královéhradecký kraj',
  pardubicky: 'Pardubický kraj',
  vysocina: 'Kraj Vysočina',
  jihomoravsky: 'Jihomoravský kraj',
  olomoucky: 'Olomoucký kraj',
  zlinsky: 'Zlínský kraj',
  moravskoslezsky: 'Moravskoslezský kraj',
}

const guidePages = [
  {
    slug: 'jak-vybrat-stredni-skolu',
    title: 'Jak vybrat střední školu podle profese, ne jen podle známek',
    description: 'Praktický postup pro rodiče a žáky, jak vybírat střední školu podle zájmů, oboru, regionu, mzdy a reálné praxe.',
    sections: [
      ['Začni cílem, ne názvem školy', 'Nejdřív si ujasni, jaký typ práce má žákovi dávat smysl: práce rukama, technika, lidé, kancelář, zdraví, logistika nebo služby. Teprve potom má smysl porovnávat školy.'],
      ['Ověř obor a praxi', 'Dobrá volba není jen hezký web školy. Ptej se na dílny, praxe, partnerské firmy, dojezd, návazné obory a reálné uplatnění po dokončení.'],
      ['Porovnej rizika', 'Každá profese má cenu: fyzická náročnost, směny, stres, dojíždění nebo nutnost další kvalifikace. Rozumné rozhodnutí tyto věci pojmenuje dopředu.'],
    ],
  },
  {
    slug: 'kam-na-stredni-kdyz-me-nic-nebavi',
    title: 'Kam na střední, když mě nic nebaví',
    description: 'Návod pro nerozhodnuté žáky: jak zúžit výběr oboru, když nemají jasný sen ani oblíbený předmět.',
    sections: [
      ['Hledej snesitelnou realitu', 'Ne každý má vysněné povolání. Často stačí najít směr, který není proti osobnosti žáka: prostředí, tempo, lidé, fyzická náročnost a délka studia.'],
      ['Vyřazuj špatné varianty', 'Začni tím, co žák určitě nechce: hodně lidí, čistě kancelář, těžká fyzická práce, dlouhé studium nebo nepravidelné směny. Zbytek se dá porovnat.'],
      ['Dej tomu krátký test', 'Krátké demo v Profesní mapě pomůže ukázat první tři směry, které stojí za ověření, i když žák nemá jasnou představu.'],
    ],
  },
  {
    slug: 'ucnak-nebo-maturita',
    title: 'Učňák nebo maturita: jak se rozhodnout bez předsudků',
    description: 'Srovnání učebních a maturitních cest podle praxe, mzdy, flexibility a dalšího studia.',
    sections: [
      ['Učňák není slepá ulička', 'U řady technických a řemeslných profesí může být učební obor rychlejší cesta k praxi, příjmu a samostatnosti. Důležité je ověřit kvalitu oboru a praxe.'],
      ['Maturita dává širší manévrovací prostor', 'Maturitní obor může být lepší pro žáky, kteří chtějí více času, širší teorii nebo možnost pokračovat na vyšší odborné či vysoké škole.'],
      ['Rozhodni podle profese', 'Nejde o prestiž názvu. Jde o to, jaká cesta nejrychleji a nejbezpečněji vede k práci, která žákovi sedí.'],
    ],
  },
  {
    slug: 'dobre-placene-obory-po-ucnaku',
    title: 'Dobře placené obory po učňáku',
    description: 'Přehled směrů, kde může učební obor vést k dobrému příjmu: elektro, stavebnictví, servis, výroba a logistika.',
    sections: [
      ['Elektro a technická údržba', 'Elektromechanik, silnoproud, servis FVE nebo technik údržby patří mezi směry, kde praxe a oprávnění rychle zvyšují hodnotu na trhu.'],
      ['Stavebnictví a technická zařízení budov', 'Instalatér, topenář, tesař, pokrývač nebo správce budovy mohou mít stabilní poptávku, hlavně pokud se spojí s moderními technologiemi.'],
      ['Servis a specializace', 'Automechanik, CNC, svářeč nebo nástrojař rostou s praxí, diagnostikou, přesností a ochotou dál se učit.'],
    ],
  },
  {
    slug: 'profese-bez-vysoke-skoly',
    title: 'Profese bez vysoké školy, které dávají smysl',
    description: 'Jak hledat praktické profese bez vysoké školy podle mzdy, stability a reálné poptávky v kraji.',
    sections: [
      ['Sleduj praxi a certifikace', 'U řady profesí nerozhoduje diplom, ale praxe, oprávnění, portfolio, bezpečnostní školení nebo konkrétní technologie.'],
      ['Porovnej region', 'Stejná profese může dávat jiný smysl v Praze, průmyslovém kraji nebo menším městě. Proto Profesní mapa používá kraj jako parametr.'],
      ['Nenech se vést jen názvem', 'Názvy profesí se mění. Důležité je, co člověk reálně dělá, jak se učí, kolik si může vydělat a kam může růst.'],
    ],
  },
  {
    slug: 'nejlepsi-remesla-v-cr',
    title: 'Nejlepší řemesla v ČR: jak je porovnat',
    description: 'Řemesla podle poptávky, mzdy, náročnosti a možnosti samostatné práce.',
    sections: [
      ['Dobré řemeslo řeší skutečný problém', 'Elektro, voda, topení, střechy, dřevo, servis nebo údržba budov mají výhodu v tom, že poptávka není čistě módní.'],
      ['Ne každé řemeslo sedí každému', 'Rozhoduje fyzická zátěž, práce venku, bezpečnost, matematika, komunikace se zákazníkem a ochota jezdit na zakázky.'],
      ['Hledej cestu k praxi', 'Nejlepší signál je škola nebo firma, která umí ukázat konkrétní praxi a první placenou zkušenost.'],
    ],
  },
  {
    slug: 'jak-vybrat-povolani-podle-kraje',
    title: 'Jak vybrat povolání podle kraje',
    description: 'Proč region mění výběr profese a jak uvažovat o školách, dojezdu, praxi a pracovních příležitostech.',
    sections: [
      ['Kraj mění dostupnost škol', 'Některé obory jsou v kraji dostupné snadno, jiné znamenají internát, dlouhé dojíždění nebo kompromis v kvalitě školy.'],
      ['Kraj mění poptávku', 'Průmyslové regiony, velká města, turistické oblasti a zemědělské oblasti nabízejí jiné pracovní příležitosti.'],
      ['Kraj není vězení', 'Regionální výběr je výchozí bod. Dobrý report má ukázat, kdy se vyplatí zůstat a kdy má smysl hledat obor mimo kraj.'],
    ],
  },
  {
    slug: 'test-povolani-pro-devatak',
    title: 'Test povolání pro deváťáka: co má opravdu měřit',
    description: 'Dobrý test povolání nemá jen vypsat zájmy. Musí zohlednit kraj, školu, mzdu, délku přípravy a rizika.',
    sections: [
      ['Zájmy nestačí', 'Žák může mít rád techniku, ale nemusí chtít těžkou fyzickou práci. Může mít rád lidi, ale nemusí zvládat stres. Test musí jít pod povrch.'],
      ['Výstup musí být konkrétní', 'Nestačí napsat „technický typ“. Užitečný výstup má ukázat profese, obory, rizika a první kroky.'],
      ['Rodič potřebuje report', 'Rozhodování doma funguje lépe, když mají rodiče a žák společný podklad, ne jen pocit z jednoho odpoledne.'],
    ],
  },
  {
    slug: 'jakou-profesi-si-vybrat',
    title: 'Jakou profesi si vybrat: jednoduchý postup',
    description: 'Postup pro žáky, kteří chtějí zúžit výběr profese podle zájmů, peněz, prostředí a délky přípravy.',
    sections: [
      ['Vyber prostředí', 'Začni otázkou, kde chceš trávit čas: dílna, kancelář, venek, provoz, zdravotnictví, sklad, servis nebo práce s lidmi.'],
      ['Nastav hranice', 'Kolik let se chceš připravovat, jakou mzdu očekáváš, jak moc ti vadí fyzická práce a jak moc chceš pracovat s lidmi?'],
      ['Porovnej top tři varianty', 'Jedna profese může vypadat dobře, ale srovnání tří možností často odhalí lepší nebo bezpečnější cestu.'],
    ],
  },
  {
    slug: 'stredni-skola-pro-technicky-typ',
    title: 'Střední škola pro technický typ',
    description: 'Jak technicky zaměřenému žákovi vybrat obor: elektro, IT, strojařina, servis, stavebnictví nebo energetika.',
    sections: [
      ['Technika má víc podob', 'Technický žák nemusí automaticky na IT. Může dávat smysl elektro, servis, výroba, CAD, strojírenství, FVE nebo správa sítí.'],
      ['Rozliš ruce a hlavu', 'Někdo chce montovat a opravovat, jiný chce kreslit, nastavovat systémy nebo diagnostikovat. Podle toho se mění obor.'],
      ['Ověř matematiku a bezpečnost', 'Technické obory se liší nároky na matematiku, přesnost a bezpečnost. To je potřeba říct před přihláškou.'],
    ],
  },
  {
    slug: 'stredni-skola-pro-praci-s-lidmi',
    title: 'Střední škola pro práci s lidmi',
    description: 'Jak vybírat obor pro žáka, kterého baví lidé: zdravotnictví, služby, pedagogika, obchod nebo administrativa.',
    sections: [
      ['Práce s lidmi není jedna kategorie', 'Zdravotnictví, sociální péče, školství, služby a obchod vyžadují jiný typ trpělivosti, komunikace a odolnosti.'],
      ['Ověř stres a směny', 'Profese s lidmi mohou být smysluplné, ale často znamenají emoce, tlak, směny nebo konfliktní situace.'],
      ['Hledej praxi co nejdřív', 'Krátká zkušenost v provozu, škole, službách nebo dobrovolnictví rychle ukáže, jestli směr opravdu sedí.'],
    ],
  },
  {
    slug: 'jak-si-overit-obor-pred-prihlaskou',
    title: 'Jak si ověřit obor před přihláškou',
    description: 'Checklist pro rodiče a žáky: co ověřit před tím, než podají přihlášku na střední školu.',
    sections: [
      ['Podívej se na praxi', 'Zjisti, kde žáci praxi dělají, kdo jsou partnerské firmy a jestli škola umí ukázat konkrétní výsledky absolventů.'],
      ['Zeptej se na slabá místa', 'Každý obor má rizika. Dobrý poradce nebo škola by je měla umět pojmenovat, ne jen prodávat výhody.'],
      ['Porovnej dvě alternativy', 'Před přihláškou je dobré mít minimálně jednu záložní cestu, která pořád odpovídá profilu žáka.'],
    ],
  },
]

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function decodeEscapes(value) {
  return repairCzechMojibake(
    String(value ?? '')
      .replace(/\\u([0-9a-fA-F]{4})/g, (_, code) => String.fromCharCode(Number.parseInt(code, 16)))
      .replace(/\\'/g, "'")
      .replace(/\\"/g, '"'),
  )
}

function repairCzechMojibake(value) {
  const replacements = [
    ['Ăˇ', 'á'],
    ['Ă', 'Á'],
    ['ÄŤ', 'č'],
    ['ÄŚ', 'Č'],
    ['ÄŹ', 'ď'],
    ['ÄŽ', 'Ď'],
    ['Ă©', 'é'],
    ['Ă‰', 'É'],
    ['Ä›', 'ě'],
    ['Äš', 'Ě'],
    ['Ă­', 'í'],
    ['ĂŤ', 'Í'],
    ['Ĺ', 'ň'],
    ['Ĺ', 'Ň'],
    ['Ăł', 'ó'],
    ['Ă“', 'Ó'],
    ['Ĺ™', 'ř'],
    ['Ĺ', 'Ř'],
    ['Ĺˇ', 'š'],
    ['Ĺ ', 'Š'],
    ['ĹĄ', 'ť'],
    ['Ĺ¤', 'Ť'],
    ['Ăş', 'ú'],
    ['Ăš', 'Ú'],
    ['ĹŻ', 'ů'],
    ['Ĺ®', 'Ů'],
    ['Ă˝', 'ý'],
    ['Ăť', 'Ý'],
    ['Ĺľ', 'ž'],
    ['Ĺ˝', 'Ž'],
    ['Â ', ' '],
    ['â€“', '-'],
    ['â€ž', '„'],
    ['â€ś', '“'],
    ['â€ť', '”'],
    ['â€™', '’'],
  ]

  return replacements.reduce((text, [broken, fixed]) => text.split(broken).join(fixed), value)
}

function readString(line, key) {
  const match = line.match(new RegExp(`${key}:\\s*'((?:\\\\'|[^'])*)'`))
  return match ? decodeEscapes(match[1]) : undefined
}

function readNumber(line, key) {
  const match = line.match(new RegExp(`${key}:\\s*(\\d+)`))
  return match ? Number(match[1]) : undefined
}

function readRegions(line) {
  const match = line.match(/priorityRegions:\s*\[([^\]]*)\]/)
  if (!match) return undefined
  return [...match[1].matchAll(/'([^']+)'/g)].map((region) => region[1])
}

function extractCareers(source) {
  const careers = new Map()
  let current = null
  let pendingStringKey = null

  for (const line of source.split(/\r?\n/)) {
    if (current && pendingStringKey) {
      const continued = line.match(/^\s*'((?:\\'|[^'])*)'/)
      if (continued) current[pendingStringKey] = decodeEscapes(continued[1])
      pendingStringKey = null
    }

    const id = readString(line, 'id')
    if (id && !['schoolId'].includes(id)) {
      if (current?.id && current.title && current.summary) careers.set(current.id, current)
      current = { id }
      pendingStringKey = null
      continue
    }

    if (!current) continue

    const stringFields = ['title', 'sector', 'programName', 'summary', 'educationPath', 'credential', 'localSignal']
    for (const field of stringFields) {
      const value = readString(line, field)
      if (value && !current[field]) current[field] = value
      if (!value && line.includes(`${field}:`)) pendingStringKey = field
    }

    const educationProgramName = readString(line, 'name')
    if (educationProgramName && !current.programName) current.programName = educationProgramName

    const numberFields = ['monthlyPay', 'demandScore', 'trainingMonths', 'firstPaidWorkMonths']
    for (const field of numberFields) {
      const value = readNumber(line, field)
      if (Number.isFinite(value) && current[field] === undefined) current[field] = value
    }

    const regions = readRegions(line)
    if (regions?.length) current.priorityRegions = regions
  }

  if (current?.id && current.title && current.summary) careers.set(current.id, current)

  return [...careers.values()]
    .filter((career) => career.id && career.title && career.summary)
    .sort((a, b) => a.title.localeCompare(b.title, 'cs'))
}

function baseStyles() {
  return `:root { color-scheme: light; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; --ink:#101918; --muted:#5f6f6a; --line:#d7e4df; --accent:#00796f; --wash:#e8f7f3; --surface:#ffffff; --canvas:#f5faf8; }
* { box-sizing: border-box; }
body { margin: 0; background: var(--canvas); color: var(--ink); }
main { width: min(1080px, calc(100% - 32px)); margin: 0 auto; padding: 28px 0 52px; }
nav, .hero, .grid article, .cta, .content-card { border: 1px solid var(--line); border-radius: 14px; background: var(--surface); box-shadow: 0 24px 80px rgba(25,45,40,.08); }
nav { display:flex; align-items:center; justify-content:space-between; gap:16px; padding:14px 16px; margin-bottom:16px; }
nav a { color: var(--accent); font-weight: 800; text-decoration: none; }
.brand { color: var(--ink); font-size: 18px; font-weight: 900; }
.hero { padding: clamp(24px, 5vw, 56px); }
.eyebrow { color: var(--accent); font-size: 12px; font-weight: 900; letter-spacing: .08em; text-transform: uppercase; }
h1 { max-width: 860px; margin: 10px 0 14px; font-size: clamp(38px, 7vw, 72px); line-height: .98; letter-spacing: -.03em; }
h2 { margin:0 0 10px; font-size:24px; }
h3 { margin:0 0 8px; font-size:18px; }
p { color: var(--muted); font-size: 17px; line-height: 1.6; }
.actions { display:flex; flex-wrap:wrap; gap:10px; margin-top:24px; }
.button { display:inline-flex; align-items:center; justify-content:center; min-height:44px; border-radius:999px; padding:0 18px; background: var(--accent); color:white; font-weight:900; text-decoration:none; }
.button.secondary { background: var(--wash); color: var(--accent); }
.metrics { display:grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap:10px; margin-top:22px; }
.metric { border:1px solid var(--line); border-radius:12px; background:#fbfefd; padding:14px; }
.metric small { display:block; color:var(--muted); font-size:12px; font-weight:800; text-transform:uppercase; }
.metric strong { display:block; margin-top:6px; font-size:24px; }
.grid { display:grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap:14px; margin-top:16px; }
.grid article, .cta, .content-card { padding:20px; }
.content-card { margin-top:16px; }
ul { margin:0; padding-left:20px; color:var(--muted); line-height:1.7; }
.cta { display:grid; grid-template-columns:minmax(0,1fr) auto; align-items:center; gap:16px; margin-top:16px; background: #102321; color:white; }
.cta p { color:#cfe3de; margin:0; }
.cta .button { background:white; color:var(--accent); }
.link-list { display:grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap:10px; margin-top:14px; }
.link-list a { border:1px solid var(--line); border-radius:12px; background:#fbfefd; color:var(--ink); padding:12px; text-decoration:none; font-weight:800; }
footer { margin-top:24px; color:var(--muted); font-size:13px; }
@media (max-width: 760px) { nav, .cta { grid-template-columns:1fr; align-items:start; } .metrics, .grid, .link-list { grid-template-columns:1fr; } }`
}

function pageShell({ title, description, canonical, type = 'article', body, structuredData }) {
  return `<!doctype html>
<html lang="cs">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <link rel="canonical" href="${canonical}" />
    <meta property="og:type" content="${type}" />
    <meta property="og:site_name" content="Profesní mapa" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:url" content="${canonical}" />
    <meta property="og:image" content="${siteUrl}/og-image.svg" />
    <meta name="twitter:card" content="summary_large_image" />
    <script type="application/ld+json">${JSON.stringify(structuredData)}</script>
    <style>${baseStyles()}</style>
  </head>
  <body>
    <main>
      <nav>
        <a class="brand" href="/">Profesní mapa</a>
        <a href="/#demo">Spustit demo</a>
      </nav>
      ${body}
      <footer>Data jsou orientační a slouží pro první rozhodování. Konkrétní školu, obor a aktuální poptávku je potřeba ověřit před rozhodnutím.</footer>
    </main>
  </body>
</html>
`
}

function professionBody(career, canonical, regionKey = null) {
  const regionName = regionKey ? regionNames[regionKey] : null
  const regions = (career.priorityRegions ?? []).map((region) => regionNames[region] ?? region).slice(0, 5)
  const h1 = regionName ? `${career.title} v regionu ${regionName}` : career.title
  const intro = regionName
    ? `${career.summary} Tato regionální stránka pomáhá ověřit, jestli dává profese smysl pro žáka v kraji ${regionName}.`
    : career.summary

  return `<section class="hero">
  <span class="eyebrow">Profesní cesta v ČR</span>
  <h1>${escapeHtml(h1)}</h1>
  <p>${escapeHtml(intro)}</p>
  <div class="actions">
    <a class="button" href="/#demo">Zkusit profil zdarma</a>
    <a class="button secondary" href="/#pricing">Chci PDF report</a>
  </div>
  <div class="metrics">
    <div class="metric"><small>Orientační mzda</small><strong>${career.monthlyPay?.toLocaleString('cs-CZ') ?? '-'} Kč</strong></div>
    <div class="metric"><small>Příprava</small><strong>${career.trainingMonths ?? '-'} měs.</strong></div>
    <div class="metric"><small>Poptávka</small><strong>${career.demandScore ?? '-'} / 100</strong></div>
    <div class="metric"><small>Obor</small><strong>${escapeHtml(career.programName ?? career.sector ?? '-')}</strong></div>
  </div>
</section>
<section class="grid">
  <article>
    <h2>Pro koho dává smysl</h2>
    <p>${escapeHtml(career.localSignal ?? 'Dává smysl pro studenty, kteří chtějí konkrétní cestu, ověřitelnou praxi a rychlejší rozhodování.')}</p>
  </article>
  <article>
    <h2>Co ověřit</h2>
    <ul>
      <li>Vhodný školní obor a dostupnost v kraji.</li>
      <li>Reálnou praxi, pracoviště a zdravotní náročnost.</li>
      <li>Mzdu v regionu a další navazující kvalifikace.</li>
    </ul>
  </article>
  <article>
    <h2>Silné regiony</h2>
    <p>${escapeHtml(regions.length ? regions.join(', ') : 'Region se vyhodnotí podle profilu v aplikaci.')}</p>
  </article>
</section>
<section class="cta">
  <div>
    <h2>Nech si porovnat ${escapeHtml(career.title)} s dalšími profesemi.</h2>
    <p>Profesní mapa porovná zájmy, kraj, očekávanou mzdu, délku přípravy a reálné další kroky.</p>
  </div>
  <a class="button" href="/#demo">Otevřít aplikaci</a>
</section>`
}

function professionHtml(career) {
  const title = `${career.title}: mzda, školy a profesní cesta | Profesní mapa`
  const description = `${career.title} v ČR: orientační mzda ${career.monthlyPay?.toLocaleString('cs-CZ') ?? ''} Kč, délka přípravy, rizika, vhodné obory a další krok v Profesní mapě.`
  const canonical = `${siteUrl}/profese/${career.id}/`

  return pageShell({
    title,
    description,
    canonical,
    body: professionBody(career, canonical),
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: `${career.title}: profesní cesta v ČR`,
      description,
      author: { '@type': 'Organization', name: 'Profesní mapa' },
      publisher: { '@type': 'Organization', name: 'Profesní mapa' },
      mainEntityOfPage: canonical,
    },
  })
}

function regionalProfessionHtml(career, regionKey) {
  const regionName = regionNames[regionKey] ?? regionKey
  const title = `${career.title} v kraji ${regionName}: školy, mzda a uplatnění | Profesní mapa`
  const description = `${career.title} a ${regionName}: orientační mzda, příprava, obor, rizika a další kroky pro výběr školy nebo profese.`
  const canonical = `${siteUrl}/profese/${career.id}/${regionKey}/`

  return pageShell({
    title,
    description,
    canonical,
    body: professionBody(career, canonical, regionKey),
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: `${career.title} v kraji ${regionName}`,
      description,
      author: { '@type': 'Organization', name: 'Profesní mapa' },
      publisher: { '@type': 'Organization', name: 'Profesní mapa' },
      mainEntityOfPage: canonical,
    },
  })
}

function guideHtml(page, relatedCareers) {
  const canonical = `${siteUrl}/pruvodce/${page.slug}/`
  const body = `<section class="hero">
  <span class="eyebrow">Průvodce výběrem profese</span>
  <h1>${escapeHtml(page.title)}</h1>
  <p>${escapeHtml(page.description)}</p>
  <div class="actions">
    <a class="button" href="/#demo">Zkusit demo zdarma</a>
    <a class="button secondary" href="/#pricing">Chci PDF report</a>
  </div>
</section>
${page.sections
  .map(
    ([heading, text]) => `<section class="content-card">
  <h2>${escapeHtml(heading)}</h2>
  <p>${escapeHtml(text)}</p>
</section>`,
  )
  .join('\n')}
<section class="content-card">
  <h2>Profese k porovnání</h2>
  <div class="link-list">
    ${relatedCareers
      .map((career) => `<a href="/profese/${career.id}/">${escapeHtml(career.title)}<br><small>${career.monthlyPay?.toLocaleString('cs-CZ') ?? '-'} Kč / poptávka ${career.demandScore ?? '-'}</small></a>`)
      .join('\n')}
  </div>
</section>
<section class="cta">
  <div>
    <h2>Chceš konkrétní doporučení pro svůj profil?</h2>
    <p>Vyplň krátké demo a uvidíš první tři profesní cesty podle zájmů, kraje a očekávání.</p>
  </div>
  <a class="button" href="/#demo">Otevřít aplikaci</a>
</section>`

  return pageShell({
    title: `${page.title} | Profesní mapa`,
    description: page.description,
    canonical,
    body,
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: page.title,
      description: page.description,
      author: { '@type': 'Organization', name: 'Profesní mapa' },
      publisher: { '@type': 'Organization', name: 'Profesní mapa' },
      mainEntityOfPage: canonical,
    },
  })
}

function comparisonHtml(left, right) {
  const slug = `${left.id}-vs-${right.id}`
  const canonical = `${siteUrl}/srovnani/${slug}/`
  const title = `${left.title} vs ${right.title}: co vybrat | Profesní mapa`
  const description = `Srovnání profesí ${left.title} a ${right.title}: mzda, délka přípravy, poptávka, obor a další krok pro výběr střední školy.`
  const body = `<section class="hero">
  <span class="eyebrow">Srovnání profesí</span>
  <h1>${escapeHtml(left.title)} vs ${escapeHtml(right.title)}</h1>
  <p>${escapeHtml(description)}</p>
  <div class="actions">
    <a class="button" href="/#demo">Porovnat podle profilu</a>
    <a class="button secondary" href="/#pricing">Chci PDF report</a>
  </div>
</section>
<section class="grid">
  ${[left, right]
    .map(
      (career) => `<article>
    <h2>${escapeHtml(career.title)}</h2>
    <ul>
      <li>Mzda: ${career.monthlyPay?.toLocaleString('cs-CZ') ?? '-'} Kč</li>
      <li>Příprava: ${career.trainingMonths ?? '-'} měsíců</li>
      <li>Poptávka: ${career.demandScore ?? '-'} / 100</li>
      <li>Obor: ${escapeHtml(career.programName ?? career.sector ?? '-')}</li>
    </ul>
  </article>`,
    )
    .join('\n')}
  <article>
    <h2>Jak rozhodnout</h2>
    <p>Nejde jen o vyšší mzdu. Rozhoduje prostředí práce, fyzická náročnost, vztah k lidem, dostupnost školy v kraji a ochota dál se učit.</p>
  </article>
</section>
<section class="cta">
  <div>
    <h2>Nech aplikaci vybrat podle profilu žáka.</h2>
    <p>Demo porovná víc profesí najednou a ukáže, která cesta vychází nejlépe podle konkrétních preferencí.</p>
  </div>
  <a class="button" href="/#demo">Spustit demo</a>
</section>`

  return {
    slug,
    html: pageShell({
      title,
      description,
      canonical,
      body,
      structuredData: {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: title,
        description,
        author: { '@type': 'Organization', name: 'Profesní mapa' },
        publisher: { '@type': 'Organization', name: 'Profesní mapa' },
        mainEntityOfPage: canonical,
      },
    }),
  }
}

const source = await readFile(dataPath, 'utf8')
const careers = extractCareers(source)
const now = new Date().toISOString().slice(0, 10)
const topCareers = [...careers].sort((a, b) => (b.demandScore ?? 0) - (a.demandScore ?? 0))
const comparisonPairs = topCareers.slice(0, 16).map((career, index, list) => [career, list[(index + 1) % list.length]])

await rm(professionRoot, { recursive: true, force: true })
await rm(guideRoot, { recursive: true, force: true })
await rm(comparisonRoot, { recursive: true, force: true })
await mkdir(professionRoot, { recursive: true })
await mkdir(guideRoot, { recursive: true })
await mkdir(comparisonRoot, { recursive: true })

const urls = [{ loc: `${siteUrl}/`, priority: '1.0', changefreq: 'weekly' }]
let regionalPageCount = 0

for (const career of careers) {
  const dir = path.resolve(professionRoot, career.id)
  await mkdir(dir, { recursive: true })
  await writeFile(path.resolve(dir, 'index.html'), professionHtml(career), 'utf8')
  urls.push({ loc: `${siteUrl}/profese/${career.id}/`, priority: '0.7', changefreq: 'monthly' })

  for (const regionKey of career.priorityRegions ?? []) {
    if (!regionNames[regionKey]) continue
    const regionDir = path.resolve(dir, regionKey)
    await mkdir(regionDir, { recursive: true })
    await writeFile(path.resolve(regionDir, 'index.html'), regionalProfessionHtml(career, regionKey), 'utf8')
    urls.push({ loc: `${siteUrl}/profese/${career.id}/${regionKey}/`, priority: '0.55', changefreq: 'monthly' })
    regionalPageCount += 1
  }
}

for (const [index, page] of guidePages.entries()) {
  const dir = path.resolve(guideRoot, page.slug)
  await mkdir(dir, { recursive: true })
  await writeFile(path.resolve(dir, 'index.html'), guideHtml(page, topCareers.slice(index, index + 6)), 'utf8')
  urls.push({ loc: `${siteUrl}/pruvodce/${page.slug}/`, priority: '0.75', changefreq: 'monthly' })
}

for (const [left, right] of comparisonPairs) {
  const comparison = comparisonHtml(left, right)
  const dir = path.resolve(comparisonRoot, comparison.slug)
  await mkdir(dir, { recursive: true })
  await writeFile(path.resolve(dir, 'index.html'), comparison.html, 'utf8')
  urls.push({ loc: `${siteUrl}/srovnani/${comparison.slug}/`, priority: '0.6', changefreq: 'monthly' })
}

await writeFile(
  path.resolve(publicRoot, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map(
      (url) => `  <url>
    <loc>${url.loc}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`,
    )
    .join('\n')}\n</urlset>\n`,
  'utf8',
)

await writeFile(
  path.resolve(publicRoot, 'robots.txt'),
  `User-agent: *
Allow: /

Sitemap: ${siteUrl}/sitemap.xml
`,
  'utf8',
)

await writeFile(
  path.resolve(publicRoot, 'og-image.svg'),
  `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#f5faf8"/>
  <rect x="72" y="72" width="1056" height="486" rx="28" fill="#ffffff" stroke="#d7e4df"/>
  <circle cx="145" cy="150" r="34" fill="#e8f7f3"/>
  <path d="M145 128l19 11v22l-19 11-19-11v-22z" fill="none" stroke="#00796f" stroke-width="5"/>
  <text x="104" y="245" fill="#00796f" font-family="Inter, Arial, sans-serif" font-size="30" font-weight="800" letter-spacing="3">PROFESNÍ MAPA</text>
  <text x="104" y="330" fill="#101918" font-family="Inter, Arial, sans-serif" font-size="72" font-weight="900">Vyber profesi podle dat.</text>
  <text x="104" y="395" fill="#5f6f6a" font-family="Inter, Arial, sans-serif" font-size="34">Mzda, školy, region a plán v jednom reportu.</text>
  <rect x="104" y="448" width="254" height="58" rx="29" fill="#00796f"/>
  <text x="134" y="486" fill="#ffffff" font-family="Inter, Arial, sans-serif" font-size="22" font-weight="800">profesni-mapa.vercel.app</text>
</svg>
`,
  'utf8',
)

console.log(`Generated ${careers.length} profession pages, ${regionalPageCount} regional pages, ${guidePages.length} guides, ${comparisonPairs.length} comparisons and sitemap.xml`)
