import cors from 'cors'
import express from 'express'
import { randomUUID } from 'node:crypto'
import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { z } from 'zod'

import { caseStatuses, type CaseStatus, type StudentCase, type StudentCaseInput } from './cases.js'
import { buildReportHtml, type ReportPayload } from './reporting.js'

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

const app = express()
const portSource = process.env.PORT ?? process.env.RAILWAY_TCP_PROXY_PORT ?? process.env.REPORT_PORT ?? '8787'
const parsedPort = Number(portSource)
const port = Number.isFinite(parsedPort) && parsedPort > 0 ? parsedPort : 8787
const host = process.env.HOST ?? (process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1')
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..', '..')
const storageRoot = path.resolve(process.env.REPORT_STORAGE_DIR ?? path.resolve(projectRoot, 'storage'))
const reportRoot = path.resolve(storageRoot, 'reports')
const auditPath = path.resolve(storageRoot, 'report-audit.jsonl')
const casesPath = path.resolve(storageRoot, 'cases.json')
const allowedOrigins = (process.env.CORS_ORIGIN ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

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
    origin: [/^http:\/\/127\.0\.0\.1:\d+$/, /^http:\/\/localhost:\d+$/, ...allowedOrigins],
    exposedHeaders: ['X-Report-Id', 'X-Report-Path'],
  }),
)
app.use(express.json({ limit: '4mb' }))

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

app.get('/health', (_request, response) => {
  response.json({ ok: true, service: 'profesni-mapa-reporting' })
})

app.get('/api/cases', async (_request, response) => {
  const cases = await readCases()
  response.json({ cases: cases.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)) })
})

app.post('/api/cases', async (request, response) => {
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

app.patch('/api/cases/:id', async (request, response) => {
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

app.get('/api/reports', async (_request, response) => {
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

app.post('/api/reports/pdf', async (request, response) => {
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
