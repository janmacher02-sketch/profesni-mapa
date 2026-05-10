import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..')
const dataPath = path.resolve(projectRoot, 'src', 'data.ts')
const publicRoot = path.resolve(projectRoot, 'public')
const professionRoot = path.resolve(publicRoot, 'profese')
const siteUrl = 'https://profesni-mapa.vercel.app'

const regionNames = {
  praha: 'Praha',
  stredocesky: 'Stredocesky kraj',
  jihocesky: 'Jihocesky kraj',
  plzensky: 'Plzensky kraj',
  karlovarsky: 'Karlovarsky kraj',
  ustecky: 'Ustecky kraj',
  liberecky: 'Liberecky kraj',
  kralovehradecky: 'Kralovehradecky kraj',
  pardubicky: 'Pardubicky kraj',
  vysocina: 'Vysocina',
  jihomoravsky: 'Jihomoravsky kraj',
  olomoucky: 'Olomoucky kraj',
  zlinsky: 'Zlinsky kraj',
  moravskoslezsky: 'Moravskoslezsky kraj',
}

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
    ['ĹŽ', 'Ů'],
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

function professionHtml(career) {
  const title = `${career.title}: mzda, školy a profesní cesta | Profesní mapa`
  const description = `${career.title} v ČR: orientační mzda ${career.monthlyPay?.toLocaleString('cs-CZ') ?? ''} Kč, délka přípravy, rizika, vhodné obory a další krok v Profesní mapě.`
  const canonical = `${siteUrl}/profese/${career.id}/`
  const regions = (career.priorityRegions ?? []).map((region) => regionNames[region] ?? region).slice(0, 5)

  return `<!doctype html>
<html lang="cs">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <link rel="canonical" href="${canonical}" />
    <meta property="og:type" content="article" />
    <meta property="og:site_name" content="Profesní mapa" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:url" content="${canonical}" />
    <meta property="og:image" content="${siteUrl}/og-image.svg" />
    <meta name="twitter:card" content="summary_large_image" />
    <script type="application/ld+json">${JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: `${career.title}: profesní cesta v ČR`,
      description,
      author: { '@type': 'Organization', name: 'Profesní mapa' },
      publisher: { '@type': 'Organization', name: 'Profesní mapa' },
      mainEntityOfPage: canonical,
    })}</script>
    <style>
      :root { color-scheme: light; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; --ink:#101918; --muted:#5f6f6a; --line:#d7e4df; --accent:#00796f; --wash:#e8f7f3; --surface:#ffffff; --canvas:#f5faf8; }
      * { box-sizing: border-box; }
      body { margin: 0; background: var(--canvas); color: var(--ink); }
      main { width: min(1080px, calc(100% - 32px)); margin: 0 auto; padding: 28px 0 52px; }
      nav, .hero, .grid article, .cta { border: 1px solid var(--line); border-radius: 14px; background: var(--surface); box-shadow: 0 24px 80px rgba(25,45,40,.08); }
      nav { display:flex; align-items:center; justify-content:space-between; gap:16px; padding:14px 16px; margin-bottom:16px; }
      nav a { color: var(--accent); font-weight: 800; text-decoration: none; }
      .brand { color: var(--ink); font-size: 18px; font-weight: 900; }
      .hero { padding: clamp(24px, 5vw, 56px); }
      .eyebrow { color: var(--accent); font-size: 12px; font-weight: 900; letter-spacing: .08em; text-transform: uppercase; }
      h1 { max-width: 820px; margin: 10px 0 14px; font-size: clamp(38px, 7vw, 72px); line-height: .98; letter-spacing: -.03em; }
      p { color: var(--muted); font-size: 17px; line-height: 1.6; }
      .actions { display:flex; flex-wrap:wrap; gap:10px; margin-top:24px; }
      .button { display:inline-flex; align-items:center; justify-content:center; min-height:44px; border-radius:999px; padding:0 18px; background: var(--accent); color:white; font-weight:900; text-decoration:none; }
      .button.secondary { background: var(--wash); color: var(--accent); }
      .metrics { display:grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap:10px; margin-top:22px; }
      .metric { border:1px solid var(--line); border-radius:12px; background:#fbfefd; padding:14px; }
      .metric small { display:block; color:var(--muted); font-size:12px; font-weight:800; text-transform:uppercase; }
      .metric strong { display:block; margin-top:6px; font-size:24px; }
      .grid { display:grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap:14px; margin-top:16px; }
      .grid article, .cta { padding:20px; }
      h2 { margin:0 0 10px; font-size:24px; }
      h3 { margin:0 0 8px; font-size:18px; }
      ul { margin:0; padding-left:20px; color:var(--muted); line-height:1.7; }
      .cta { display:grid; grid-template-columns:minmax(0,1fr) auto; align-items:center; gap:16px; margin-top:16px; background: #102321; color:white; }
      .cta p { color:#cfe3de; margin:0; }
      .cta .button { background:white; color:var(--accent); }
      footer { margin-top:24px; color:var(--muted); font-size:13px; }
      @media (max-width: 760px) { nav, .cta { grid-template-columns:1fr; align-items:start; } .metrics, .grid { grid-template-columns:1fr; } }
    </style>
  </head>
  <body>
    <main>
      <nav>
        <a class="brand" href="/">Profesní mapa</a>
        <a href="/#demo">Spustit demo</a>
      </nav>
      <section class="hero">
        <span class="eyebrow">Profesní cesta v ČR</span>
        <h1>${escapeHtml(career.title)}</h1>
        <p>${escapeHtml(career.summary)}</p>
        <div class="actions">
          <a class="button" href="/#demo">Zkusit profil zdarma</a>
          <a class="button secondary" href="/#pricing">Chci PDF report</a>
        </div>
        <div class="metrics">
          <div class="metric"><small>Orientační mzda</small><strong>${career.monthlyPay?.toLocaleString('cs-CZ') ?? '-'} Kč</strong></div>
          <div class="metric"><small>Příprava</small><strong>${career.trainingMonths ?? '-'} měs.</strong></div>
          <div class="metric"><small>Poptavka</small><strong>${career.demandScore ?? '-'} / 100</strong></div>
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
      </section>
      <footer>
        Data jsou orientační a slouží pro první rozhodování. Konkrétní školu, obor a aktuální poptávku je potřeba ověřit před rozhodnutím.
      </footer>
    </main>
  </body>
</html>
`
}

const source = await readFile(dataPath, 'utf8')
const careers = extractCareers(source)
const now = new Date().toISOString().slice(0, 10)

await rm(professionRoot, { recursive: true, force: true })
await mkdir(professionRoot, { recursive: true })

for (const career of careers) {
  const dir = path.resolve(professionRoot, career.id)
  await mkdir(dir, { recursive: true })
  await writeFile(path.resolve(dir, 'index.html'), professionHtml(career), 'utf8')
}

const urls = [
  { loc: `${siteUrl}/`, priority: '1.0', changefreq: 'weekly' },
  ...careers.map((career) => ({
    loc: `${siteUrl}/profese/${career.id}/`,
    priority: '0.7',
    changefreq: 'monthly',
  })),
]

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

console.log(`Generated ${careers.length} profession pages, sitemap.xml, robots.txt and og-image.svg`)
