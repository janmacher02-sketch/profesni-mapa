import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const source = {
  label: 'MPSV otevřená data: Analýza neobsazenosti VPM podle profese',
  period: '4Q 2024',
  sourceUrl:
    'https://data.mpsv.cz/od/soubory/analyza-neobsazenosti-volnych-pracovnich-mist-podle-profese/analyza-neobsazenosti-volnych-pracovnich-mist-podle-profese-4Q-2024.json',
  schemaUrl:
    'https://data.mpsv.cz/od/soubory/analyza-neobsazenosti-volnych-pracovnich-mist-podle-profese/analyza-neobsazenosti-volnych-pracovnich-mist-podle-profese.schema.json',
}

const okresyUrl = 'https://data.mpsv.cz/od/soubory/ciselniky/okresy.json'

const krajToRegion = {
  'Kraj/19': 'praha',
  'Kraj/27': 'stredocesky',
  'Kraj/35': 'jihocesky',
  'Kraj/43': 'plzensky',
  'Kraj/51': 'karlovarsky',
  'Kraj/60': 'ustecky',
  'Kraj/78': 'liberecky',
  'Kraj/86': 'kralovehradecky',
  'Kraj/94': 'pardubicky',
  'Kraj/108': 'vysocina',
  'Kraj/116': 'jihomoravsky',
  'Kraj/124': 'olomoucky',
  'Kraj/132': 'moravskoslezsky',
  'Kraj/141': 'zlinsky',
}

async function getTargetCzIscoCodes() {
  const dataSource = await readFile(path.resolve('src/data.ts'), 'utf8')
  const matches = [...dataSource.matchAll(/czIscoCode:\s*'([^']+)'/g)].map((match) => match[1])
  return [...new Set(matches)].sort()
}

async function fetchJson(url) {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`)
  }
  return response.json()
}

function count(value) {
  return Math.max(0, Number(value ?? 0))
}

function renderObject(value, indent = 0) {
  return JSON.stringify(value, null, 2)
    .replace(/"([^"]+)":/g, '$1:')
    .replace(/"/g, "'")
    .split('\n')
    .map((line) => `${' '.repeat(indent)}${line}`)
    .join('\n')
}

const [targets, vpmData, okresyData] = await Promise.all([
  getTargetCzIscoCodes(),
  fetchJson(source.sourceUrl),
  fetchJson(okresyUrl),
])

const okresToKraj = Object.fromEntries((okresyData.polozky ?? []).map((okres) => [okres.id, okres.kraj]))

const aggregates = Object.fromEntries(
  targets.map((target) => [
    target,
    {
      nationalOpenVacancies: 0,
      freshVacancies: 0,
      longOpenVacancies: 0,
      regionalOpenVacancies: {},
    },
  ]),
)

for (const item of vpmData.polozky ?? []) {
  const target = targets.find((code) => String(item.czIsco ?? '').startsWith(code))
  if (!target) continue

  const current = count(item.aktualniPocetVolnychMist)
  const fresh = count(item.pocetVolnychPracovnichMistNabizenychPoDobu0_3Mesice)
  const longOpen = count(item.pocetVolnychPracovnichMistNabizenychPoDobu12AViceMesicu)
  const region = krajToRegion[okresToKraj[item.okres]]

  aggregates[target].nationalOpenVacancies += current
  aggregates[target].freshVacancies += fresh
  aggregates[target].longOpenVacancies += longOpen

  if (region) {
    aggregates[target].regionalOpenVacancies[region] = (aggregates[target].regionalOpenVacancies[region] ?? 0) + current
  }
}

const renderedSignals = Object.entries(aggregates)
  .map(([czIscoCode, aggregate]) => {
    return `  '${czIscoCode}': {
    czIscoCode: '${czIscoCode}',
    sourceLabel: mpsvMarketSource.label,
    sourceUrl: mpsvMarketSource.sourceUrl,
    period: mpsvMarketSource.period,
    nationalOpenVacancies: ${aggregate.nationalOpenVacancies},
    freshVacancies: ${aggregate.freshVacancies},
    longOpenVacancies: ${aggregate.longOpenVacancies},
    regionalOpenVacancies: ${renderObject(aggregate.regionalOpenVacancies, 4).trim()},
  },`
  })
  .join('\n')

const output = `import type { Region } from './data.js'

export type MarketSignal = {
  czIscoCode: string
  sourceLabel: string
  sourceUrl: string
  period: string
  nationalOpenVacancies: number
  freshVacancies: number
  longOpenVacancies: number
  regionalOpenVacancies: Partial<Record<Region, number>>
}

export const mpsvMarketSource = ${renderObject(source)}

export const marketSignals: Record<string, MarketSignal> = {
${renderedSignals}
}

export function getMarketSignal(czIscoCode: string, region: Region) {
  const signal = marketSignals[czIscoCode]
  if (!signal) return null

  const regionalOpenVacancies = signal.regionalOpenVacancies[region] ?? 0
  const maxRegionalOpenVacancies = Math.max(...Object.values(signal.regionalOpenVacancies).map((value) => value ?? 0), 1)
  const regionalScore = Math.round((regionalOpenVacancies / maxRegionalOpenVacancies) * 100)

  return {
    ...signal,
    regionalOpenVacancies,
    regionalScore,
  }
}
`

await mkdir(path.resolve('src'), { recursive: true })
await writeFile(path.resolve('src/marketSignals.ts'), output, 'utf8')

console.log(`Updated src/marketSignals.ts from ${source.label} (${source.period}) for ${targets.length} CZ-ISCO groups.`)
