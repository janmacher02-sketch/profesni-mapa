import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'

import { careers, type Career, type Region } from './data.js'
import { getMarketSignal, marketSignals, mpsvMarketSource } from './marketSignals.js'
import { getSchoolPrograms } from './schoolPrograms.js'
import { scoreCareers } from './scoring.js'

const regions = [
  'praha',
  'stredocesky',
  'jihocesky',
  'plzensky',
  'karlovarsky',
  'ustecky',
  'liberecky',
  'kralovehradecky',
  'pardubicky',
  'vysocina',
  'jihomoravsky',
  'olomoucky',
  'zlinsky',
  'moravskoslezsky',
] as const

const interests = ['building', 'healthcare', 'technology', 'transport', 'energy', 'service'] as const

const regionSchema = z.enum(regions)
const interestSchema = z.enum(interests)

const server = new McpServer({
  name: 'profesni-mapa-data',
  version: '0.1.0',
})

function jsonText(value: unknown) {
  return JSON.stringify(value, null, 2)
}

function careerSummary(career: Career, region: Region) {
  const signal = getMarketSignal(career.czIscoCode, region)

  return {
    id: career.id,
    title: career.title,
    sector: career.sector,
    czIscoCode: career.czIscoCode,
    educationProgram: career.educationProgram,
    monthlyPay: career.monthlyPay,
    payRange: career.payRange,
    trainingMonths: career.trainingMonths,
    firstPaidWorkMonths: career.firstPaidWorkMonths,
    dataConfidence: career.dataConfidence,
    demandScore: career.demandScore,
    regionalDemandSeed: career.regionalDemand[region] ?? null,
    mpsvOpenVacanciesInRegion: signal?.regionalOpenVacancies ?? null,
    mpsvNationalOpenVacancies: signal?.nationalOpenVacancies ?? null,
    source: career.dataSourceLabel,
  }
}

function getCareer(careerId: string) {
  return careers.find((career) => career.id === careerId)
}

server.registerResource(
  'career-catalog',
  'profesni-mapa://careers',
  {
    title: 'Profesni mapa career catalog',
    description: 'Full Czech career catalog used by the Profesni mapa recommendation UI.',
    mimeType: 'application/json',
  },
  async (uri) => ({
    contents: [
      {
        uri: uri.href,
        mimeType: 'application/json',
        text: jsonText(careers),
      },
    ],
  }),
)

server.registerResource(
  'mpsv-market-signals',
  'profesni-mapa://market-signals',
  {
    title: 'MPSV vacancy signals',
    description: 'Aggregated MPSV open vacancy signals by CZ-ISCO and Czech region.',
    mimeType: 'application/json',
  },
  async (uri) => ({
    contents: [
      {
        uri: uri.href,
        mimeType: 'application/json',
        text: jsonText({ source: mpsvMarketSource, marketSignals }),
      },
    ],
  }),
)

server.registerTool(
  'list_careers',
  {
    title: 'List Czech career paths',
    description: 'List career paths from the Profesni mapa catalog, optionally filtered by region, interest, and training duration.',
    inputSchema: {
      region: regionSchema.default('praha').describe('Czech region used for regional vacancy and demand context.'),
      interest: interestSchema.optional().describe('Optional interest category filter.'),
      maxTrainingMonths: z.number().int().positive().optional().describe('Optional maximum training duration in months.'),
      limit: z.number().int().min(1).max(50).default(20).describe('Maximum number of career summaries to return.'),
    },
  },
  async ({ region, interest, maxTrainingMonths, limit }) => {
    const filtered = careers
      .filter((career) => !interest || career.interest === interest)
      .filter((career) => !maxTrainingMonths || career.trainingMonths <= maxTrainingMonths)
      .sort((a, b) => {
        const aSignal = getMarketSignal(a.czIscoCode, region)
        const bSignal = getMarketSignal(b.czIscoCode, region)
        const aDemand = aSignal?.regionalOpenVacancies ?? a.regionalDemand[region] ?? a.demandScore
        const bDemand = bSignal?.regionalOpenVacancies ?? b.regionalDemand[region] ?? b.demandScore
        return bDemand - aDemand
      })
      .slice(0, limit)
      .map((career) => careerSummary(career, region))

    return {
      content: [{ type: 'text', text: jsonText(filtered) }],
      structuredContent: { careers: filtered },
    }
  },
)

server.registerTool(
  'get_career_detail',
  {
    title: 'Get career detail',
    description: 'Return full career detail with MPSV market signal and Infoabsolvent/NSP/NSK source links.',
    inputSchema: {
      careerId: z.string().describe('Career id from list_careers or the career catalog.'),
      region: regionSchema.default('praha').describe('Czech region used for regional context.'),
    },
  },
  async ({ careerId, region }) => {
    const career = getCareer(careerId)

    if (!career) {
      return {
        content: [{ type: 'text', text: `Career '${careerId}' was not found.` }],
        isError: true,
      }
    }

    const detail = {
      career,
      marketSignal: getMarketSignal(career.czIscoCode, region),
      schoolPrograms: getSchoolPrograms(career, region),
    }

    return {
      content: [{ type: 'text', text: jsonText(detail) }],
      structuredContent: detail,
    }
  },
)

server.registerTool(
  'rank_careers_for_profile',
  {
    title: 'Rank careers for a student profile',
    description: 'Run the same matching logic as the web app for a compact student profile.',
    inputSchema: {
      region: regionSchema.default('praha'),
      interest: interestSchema.default('building'),
      salaryGoal: z.number().int().positive().default(42000),
      trainingWindow: z.enum(['fast', 'moderate', 'patient']).default('moderate'),
      environment: z.enum(['indoor', 'outdoor', 'mixed']).default('mixed'),
      physicalPreference: z.enum(['low', 'medium', 'high']).default('medium'),
      mathComfort: z.enum(['low', 'medium', 'high']).default('medium'),
      peopleMode: z.enum(['solo', 'balanced', 'people']).default('balanced'),
      budget: z.enum(['low', 'medium', 'high']).default('low'),
      limit: z.number().int().min(1).max(50).default(10),
    },
  },
  async (profileInput) => {
    const profile = {
      studentName: 'MCP student',
      zipCode: '',
      ...profileInput,
    }

    const ranked = scoreCareers(profile, careers)
      .map((match) => ({
        ...careerSummary(match.career, profile.region),
        fitScore: match.score,
        reasons: match.reasons,
        flags: match.flags,
      }))
      .slice(0, profileInput.limit)

    return {
      content: [{ type: 'text', text: jsonText(ranked) }],
      structuredContent: { rankedCareers: ranked },
    }
  },
)

server.registerTool(
  'compare_careers',
  {
    title: 'Compare career paths',
    description: 'Compare selected career paths by pay, training, first paid work, demand, and regional MPSV vacancies.',
    inputSchema: {
      careerIds: z.array(z.string()).min(2).max(6).describe('Career ids to compare.'),
      region: regionSchema.default('praha'),
    },
  },
  async ({ careerIds, region }) => {
    const found = careerIds.map((careerId) => getCareer(careerId)).filter((career): career is Career => Boolean(career))
    const missing = careerIds.filter((careerId) => !getCareer(careerId))

    const comparison = found.map((career) => careerSummary(career, region))

    return {
      content: [{ type: 'text', text: jsonText({ comparison, missing }) }],
      structuredContent: { comparison, missing },
      isError: missing.length > 0,
    }
  },
)

server.registerTool(
  'get_data_sources',
  {
    title: 'Get data sources',
    description: 'Return source metadata and source URLs used by the catalog and MPSV layer.',
  },
  async () => {
    const sourceSummary = {
      mpsv: mpsvMarketSource,
      catalogSources: [
        'https://www.infoabsolvent.cz/',
        'https://nsp.cz/',
        'https://www.narodnikvalifikace.cz/',
        'https://esco.ec.europa.eu/cs',
      ],
      notes: [
        'MPSV vacancy signals are official open data aggregated by CZ-ISCO and region.',
        'Some pay and demand fields are seed estimates and are marked through dataConfidence/source labels in each career.',
      ],
    }

    return {
      content: [{ type: 'text', text: jsonText(sourceSummary) }],
      structuredContent: sourceSummary,
    }
  },
)

server.registerPrompt(
  'career_counselor_brief',
  {
    title: 'Career counselor brief',
    description: 'Create a Czech counselor brief for a selected career and region.',
    argsSchema: {
      careerId: z.string(),
      region: regionSchema.default('praha'),
    },
  },
  ({ careerId, region }) => ({
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `Připrav stručný poradenský brief pro profesi '${careerId}' v kraji '${region}'. Použij nástroje get_career_detail a get_data_sources. Jasně odděl ověřená MPSV/Infoabsolvent/NSP data od interních seed odhadů.`,
        },
      },
    ],
  }),
)

async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error('Profesni mapa MCP server running on stdio')
}

main().catch((error: unknown) => {
  console.error('Fatal error in Profesni mapa MCP server:', error)
  process.exit(1)
})
