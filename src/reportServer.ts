import cors from 'cors'
import express, { type NextFunction, type Request, type Response } from 'express'
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto'
import { appendFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { z } from 'zod'

import { caseStatuses, type CaseStatus, type StudentCase, type StudentCaseInput } from './cases.js'
import { careers, defaultProfile } from './data.js'
import { getMarketSignal, mpsvMarketSource } from './marketSignals.js'
import { buildReportHtml, type ReportPayload } from './reporting.js'
import { getSchoolPrograms } from './schoolPrograms.js'
import { scoreCareers } from './scoring.js'

const reportRequestSchema = z.object({
  profile: z.object({
    studentName: z.string().optional().default('žák'),
  }),
  license: z.object({
    schoolName: z.string(),
    schoolId: z.string(),
    counselorSeats: z.number(),
    studentProfiles: z.number(),
    reportsIncluded: z.number(),
    plan: z.enum(['pilot', 'school', 'region']),
  }),
  selected: z.unknown(),
  topThree: z.array(z.unknown()),
  selectedRegionLabel: z.string(),
  selectedMarketSignal: z.unknown().nullable(),
  selectedSchoolPrograms: z.array(z.unknown()),
  mpsvSourceUrl: z.string(),
  generatedAt: z.string().optional(),
})

const loginSchema = z.object({
  code: z.string().min(1),
})

const leadSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(180),
  role: z.string().trim().max(120).optional().default(''),
  note: z.string().trim().max(700).optional().default(''),
  source: z.string().trim().max(80).optional().default('landing'),
})

const eventSchema = z.object({
  name: z.string().trim().min(2).max(80),
  path: z.string().trim().max(240).optional().default('/'),
  source: z.string().trim().max(80).optional().default('web'),
  properties: z.record(z.unknown()).optional().default({}),
})

const app = express()
const portSource = process.env.PORT ?? process.env.RAILWAY_TCP_PROXY_PORT ?? process.env.REPORT_PORT ?? '8787'
const parsedPort = Number(portSource)
const port = Number.isFinite(parsedPort) && parsedPort > 0 ? parsedPort : 8787
const requestedHost = process.env.HOST
const host =
  process.env.RAILWAY_SERVICE_NAME || requestedHost === '[::]' || requestedHost === '::'
    ? '0.0.0.0'
    : (requestedHost ?? (process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1'))
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..', '..')
const storageRoot = path.resolve(process.env.REPORT_STORAGE_DIR ?? path.resolve(projectRoot, 'storage'))
const reportRoot = path.resolve(storageRoot, 'reports')
const auditPath = path.resolve(storageRoot, 'report-audit.jsonl')
const casesPath = path.resolve(storageRoot, 'cases.json')
const leadsPath = path.resolve(storageRoot, 'leads.jsonl')
const eventsPath = path.resolve(storageRoot, 'events.jsonl')
const allowedOrigins = (process.env.CORS_ORIGIN ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)
const defaultProductionOrigins = [
  'https://profesni-mapa.vercel.app',
  'https://profesni-mapa-machys-projects-42993293.vercel.app',
  'https://profesni-mapa-janmacher02-sketch-machys-projects-42993293.vercel.app',
  'https://profesnimapa.cz',
  'https://app.profesnimapa.cz',
]
const authCookieName = 'pm_pilot_session'
const isProduction = process.env.NODE_ENV === 'production'
const pilotAccessCode = process.env.PILOT_ACCESS_CODE?.trim() || (isProduction ? '' : 'PILOT2026')
const sessionSecret = process.env.PILOT_SESSION_SECRET?.trim() || (isProduction ? randomUUID() : pilotAccessCode)
const sessionMaxAgeSeconds = 60 * 60 * 12

const caseStatusSchema = z.enum(caseStatuses)

const caseInputSchema = z.object({
  schoolId: z.string().min(1),
  schoolName: z.string().min(1),
  studentName: z.string().min(1),
  region: z.string().min(1),
  regionLabel: z.string().min(1),
  selectedCareerId: z.string().min(1),
  selectedCareerTitle: z.string().min(1),
  fitScore: z.number().min(0).max(100),
  topCareerIds: z.array(z.string()).default([]),
  status: caseStatusSchema.default('intake'),
  notes: z.string().optional(),
})

const casePatchSchema = z.object({
  status: caseStatusSchema.optional(),
  notes: z.string().optional(),
})

app.use(
  cors({
    origin: [/^http:\/\/127\.0\.0\.1:\d+$/, /^http:\/\/localhost:\d+$/, ...defaultProductionOrigins, ...allowedOrigins],
    credentials: true,
    exposedHeaders: ['X-Report-Id', 'X-Report-Path'],
  }),
)
app.use(express.json({ limit: '4mb' }))

function safeCompare(a: string, b: string) {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  return left.length === right.length && timingSafeEqual(left, right)
}

function signSession(value: string) {
  return createHmac('sha256', sessionSecret).update(value).digest('base64url')
}

function createSessionToken() {
  const issuedAt = Date.now().toString()
  return `${issuedAt}.${signSession(issuedAt)}`
}

function parseCookies(header: string | undefined) {
  const cookies = new Map<string, string>()
  if (!header) return cookies

  for (const part of header.split(';')) {
    const [rawName, ...rawValue] = part.trim().split('=')
    if (!rawName || rawValue.length === 0) continue
    cookies.set(rawName, decodeURIComponent(rawValue.join('=')))
  }

  return cookies
}

function isValidSessionToken(token: string | undefined) {
  if (!token) return false
  const [issuedAt, signature] = token.split('.')
  if (!issuedAt || !signature) return false

  const issuedAtNumber = Number(issuedAt)
  if (!Number.isFinite(issuedAtNumber)) return false
  if (Date.now() - issuedAtNumber > sessionMaxAgeSeconds * 1000) return false

  return safeCompare(signature, signSession(issuedAt))
}

function hasPilotSession(request: Request) {
  return isValidSessionToken(parseCookies(request.headers.cookie).get(authCookieName))
}

function setPilotSessionCookie(response: Response) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  response.setHeader('Set-Cookie', `${authCookieName}=${encodeURIComponent(createSessionToken())}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${sessionMaxAgeSeconds}${secure}`)
}

function clearPilotSessionCookie(response: Response) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  response.setHeader('Set-Cookie', `${authCookieName}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secure}`)
}

function requirePilotAccess(request: Request, response: Response, next: NextFunction) {
  if (hasPilotSession(request)) {
    next()
    return
  }

  response.status(401).json({ error: 'Pilot access required' })
}

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
}

function reportPeriod(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

async function renderPdf(html: string) {
  const browser = await chromium.launch({ headless: true })
  try {
    const page = await browser.newPage({ viewport: { width: 1240, height: 1754 } })
    await page.setContent(html, { waitUntil: 'networkidle' })
    return await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    })
  } finally {
    await browser.close()
  }
}

async function readCases() {
  try {
    const raw = await readFile(casesPath, 'utf8')
    return JSON.parse(raw) as StudentCase[]
  } catch {
    return []
  }
}

async function writeCases(cases: StudentCase[]) {
  await mkdir(storageRoot, { recursive: true })
  await writeFile(casesPath, JSON.stringify(cases, null, 2), 'utf8')
}

async function checkStorageWritable() {
  const probePath = path.resolve(storageRoot, `.probe-${randomUUID()}.txt`)

  try {
    await mkdir(storageRoot, { recursive: true })
    await writeFile(probePath, 'ok', 'utf8')
    const probe = await readFile(probePath, 'utf8')
    await rm(probePath, { force: true })
    return probe === 'ok'
  } catch {
    await rm(probePath, { force: true }).catch(() => undefined)
    return false
  }
}

async function readReportCount() {
  try {
    const auditLog = await readFile(auditPath, 'utf8')
    return auditLog
      .trim()
      .split('\n')
      .filter(Boolean).length
  } catch {
    return 0
  }
}

async function readLeads() {
  try {
    const raw = await readFile(leadsPath, 'utf8')
    return raw
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line) as unknown)
  } catch {
    return []
  }
}

async function readEvents() {
  try {
    const raw = await readFile(eventsPath, 'utf8')
    return raw
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line) as { id: string; createdAt: string; name: string })
  } catch {
    return []
  }
}

function summarizeEvents(events: { createdAt: string; name: string }[]) {
  const since = Date.now() - 24 * 60 * 60 * 1000
  const byName = events.reduce<Record<string, number>>((summary, event) => {
    summary[event.name] = (summary[event.name] ?? 0) + 1
    return summary
  }, {})

  return {
    total: events.length,
    last24h: events.filter((event) => new Date(event.createdAt).getTime() >= since).length,
    byName,
  }
}

function buildSampleReportPayload(): ReportPayload {
  const profile = {
    ...defaultProfile,
    studentName: 'Demo žák',
    region: 'praha' as const,
    zipCode: 'Praha',
  }
  const matches = scoreCareers(profile, careers)
  const selected = matches[0]

  return {
    profile: {
      studentName: profile.studentName,
    },
    license: {
      schoolName: 'Demo škola',
      schoolId: 'demo-production-smoke',
      counselorSeats: 1,
      studentProfiles: 30,
      reportsIncluded: 30,
      plan: 'pilot',
    },
    selected,
    topThree: matches.slice(0, 3),
    selectedRegionLabel: 'Hlavní město Praha',
    selectedMarketSignal: getMarketSignal(selected.career.czIscoCode, profile.region),
    selectedSchoolPrograms: getSchoolPrograms(selected.career, profile.region),
    mpsvSourceUrl: mpsvMarketSource.sourceUrl,
  }
}

app.get('/', (_request, response) => {
  response.status(200).json({ ok: true, service: 'profesni-mapa-reporting' })
})

app.get('/health', (_request, response) => {
  response.json({ ok: true, service: 'profesni-mapa-reporting' })
})

app.get('/favicon.ico', (_request, response) => {
  response.status(204).end()
})

app.get('/api/status', async (_request, response) => {
  const [cases, leads, events, storageWritable, reportCount] = await Promise.all([readCases(), readLeads(), readEvents(), checkStorageWritable(), readReportCount()])

  response.json({
    ok: true,
    service: 'profesni-mapa-reporting',
    storageWritable,
    storageConfigured: Boolean(process.env.REPORT_STORAGE_DIR),
    caseCount: cases.length,
    leadCount: leads.length,
    eventCount: events.length,
    reportCount,
    runtime: {
      host,
      requestedHost: requestedHost ?? null,
      port,
      portSource,
      nodeEnv: process.env.NODE_ENV ?? null,
      railwayService: process.env.RAILWAY_SERVICE_NAME ?? null,
    },
  })
})

app.get('/api/auth/session', (request, response) => {
  response.json({ authenticated: hasPilotSession(request) })
})

app.post('/api/auth/login', (request, response) => {
  const parsed = loginSchema.safeParse(request.body)

  if (!parsed.success || !safeCompare(parsed.data.code.trim(), pilotAccessCode)) {
    response.status(401).json({ error: 'Invalid pilot code' })
    return
  }

  setPilotSessionCookie(response)
  response.json({ authenticated: true })
})

app.post('/api/auth/logout', (_request, response) => {
  clearPilotSessionCookie(response)
  response.json({ authenticated: false })
})

app.post('/api/events', async (request, response) => {
  const parsed = eventSchema.safeParse(request.body)

  if (!parsed.success) {
    response.status(400).json({ error: 'Invalid event payload', issues: parsed.error.issues })
    return
  }

  const event = {
    id: `evt-${randomUUID().slice(0, 10)}`,
    createdAt: new Date().toISOString(),
    ...parsed.data,
    userAgent: request.headers['user-agent'] ?? null,
    referer: request.headers.referer ?? null,
  }

  await mkdir(storageRoot, { recursive: true })
  await appendFile(eventsPath, `${JSON.stringify(event)}\n`, 'utf8')

  response.status(201).json({ ok: true })
})

app.get('/api/events', requirePilotAccess, async (_request, response) => {
  const events = await readEvents()
  response.json({ events: events.slice(-300).reverse(), summary: summarizeEvents(events) })
})

app.post('/api/leads', async (request, response) => {
  const parsed = leadSchema.safeParse(request.body)

  if (!parsed.success) {
    response.status(400).json({ error: 'Invalid lead payload', issues: parsed.error.issues })
    return
  }

  const lead = {
    id: `lead-${randomUUID().slice(0, 10)}`,
    createdAt: new Date().toISOString(),
    ...parsed.data,
    userAgent: request.headers['user-agent'] ?? null,
    referer: request.headers.referer ?? null,
  }

  await mkdir(storageRoot, { recursive: true })
  await appendFile(leadsPath, `${JSON.stringify(lead)}\n`, 'utf8')

  response.status(201).json({ lead: { id: lead.id, createdAt: lead.createdAt } })
})

app.get('/api/leads', requirePilotAccess, async (_request, response) => {
  const leads = await readLeads()
  response.json({ leads: leads.slice(-200).reverse() })
})

app.get('/api/cases', requirePilotAccess, async (_request, response) => {
  const cases = await readCases()
  response.json({ cases: cases.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)) })
})

app.post('/api/cases', requirePilotAccess, async (request, response) => {
  const parsed = caseInputSchema.safeParse(request.body)

  if (!parsed.success) {
    response.status(400).json({ error: 'Invalid case payload', issues: parsed.error.issues })
    return
  }

  const now = new Date().toISOString()
  const input = parsed.data as StudentCaseInput
  const studentCase: StudentCase = {
    ...input,
    id: `case-${randomUUID().slice(0, 10)}`,
    createdAt: now,
    updatedAt: now,
  }
  const cases = await readCases()
  await writeCases([studentCase, ...cases])

  response.status(201).json({ case: studentCase })
})

app.patch('/api/cases/:id', requirePilotAccess, async (request, response) => {
  const parsed = casePatchSchema.safeParse(request.body)

  if (!parsed.success) {
    response.status(400).json({ error: 'Invalid case patch', issues: parsed.error.issues })
    return
  }

  const cases = await readCases()
  const targetIndex = cases.findIndex((studentCase) => studentCase.id === request.params.id)

  if (targetIndex === -1) {
    response.status(404).json({ error: 'Case not found' })
    return
  }

  const current = cases[targetIndex]
  const updated: StudentCase = {
    ...current,
    ...parsed.data,
    status: (parsed.data.status ?? current.status) as CaseStatus,
    updatedAt: new Date().toISOString(),
  }
  cases[targetIndex] = updated
  await writeCases(cases)

  response.json({ case: updated })
})

app.delete('/api/cases/:id', requirePilotAccess, async (request, response) => {
  const cases = await readCases()
  const remainingCases = cases.filter((studentCase) => studentCase.id !== request.params.id)

  if (remainingCases.length === cases.length) {
    response.status(404).json({ error: 'Case not found' })
    return
  }

  await writeCases(remainingCases)
  response.status(204).end()
})

app.get('/api/reports', requirePilotAccess, async (_request, response) => {
  try {
    const auditLog = await readFile(auditPath, 'utf8')
    const reports = auditLog
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line) as unknown)
      .slice(-50)
      .reverse()
    response.json({ reports })
  } catch {
    response.json({ reports: [] })
  }
})

app.get('/api/reports/sample.pdf', async (_request, response) => {
  const generatedAt = new Date()
  const payload = buildSampleReportPayload()
  const html = buildReportHtml({ ...payload, generatedAt: generatedAt.toISOString() })
  const pdf = await renderPdf(html)

  response.setHeader('Content-Type', 'application/pdf')
  response.setHeader('Content-Disposition', 'inline; filename="profesni-mapa-sample-report.pdf"')
  response.setHeader('X-Report-Id', `sample-${generatedAt.getTime()}`)
  response.send(pdf)
})

app.post('/api/reports/pdf', requirePilotAccess, async (request, response) => {
  const parsed = reportRequestSchema.safeParse(request.body)

  if (!parsed.success) {
    response.status(400).json({ error: 'Invalid report payload', issues: parsed.error.issues })
    return
  }

  const payload = request.body as ReportPayload
  const generatedAt = new Date()
  const reportId = `rpt-${generatedAt.getFullYear()}${String(generatedAt.getMonth() + 1).padStart(2, '0')}${String(generatedAt.getDate()).padStart(2, '0')}-${randomUUID().slice(0, 8)}`
  const studentSlug = slugify(payload.profile.studentName || 'zak')
  const schoolSlug = slugify(payload.license.schoolName || 'skola')
  const period = reportPeriod(generatedAt)
  const reportDir = path.resolve(reportRoot, period)
  const pdfPath = path.resolve(reportDir, `${reportId}-${schoolSlug}-${studentSlug}.pdf`)
  const html = buildReportHtml({ ...payload, generatedAt: generatedAt.toISOString() })
  const pdf = await renderPdf(html)

  await mkdir(reportDir, { recursive: true })
  await writeFile(pdfPath, pdf)

  const auditRecord = {
    reportId,
    createdAt: generatedAt.toISOString(),
    schoolId: payload.license.schoolId,
    schoolName: payload.license.schoolName,
    plan: payload.license.plan,
    studentName: payload.profile.studentName,
    selectedCareerId: payload.selected.career.id,
    selectedCareerTitle: payload.selected.career.title,
    selectedRegionLabel: payload.selectedRegionLabel,
    pdfPath,
  }

  await mkdir(storageRoot, { recursive: true })
  await appendFile(auditPath, `${JSON.stringify(auditRecord)}\n`, 'utf8')

  response.setHeader('Content-Type', 'application/pdf')
  response.setHeader('Content-Disposition', `attachment; filename="${path.basename(pdfPath)}"`)
  response.setHeader('X-Report-Id', reportId)
  response.setHeader('X-Report-Path', pdfPath)
  response.send(pdf)
})

app.listen(port, host, () => {
  console.log(
    JSON.stringify({
      event: 'report_server_started',
      host,
      requestedHost: requestedHost ?? null,
      port,
      portSource,
      envPort: process.env.PORT ?? null,
      railwayTcpProxyPort: process.env.RAILWAY_TCP_PROXY_PORT ?? null,
      reportPort: process.env.REPORT_PORT ?? null,
      nodeEnv: process.env.NODE_ENV ?? null,
      railwayService: process.env.RAILWAY_SERVICE_NAME ?? null,
    }),
  )
})
