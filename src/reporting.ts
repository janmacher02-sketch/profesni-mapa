import type { Career } from './data.js'
import type { MarketSignal } from './marketSignals.js'
import type { SchoolProgram } from './schoolPrograms.js'

export type SchoolLicense = {
  schoolName: string
  schoolId: string
  counselorSeats: number
  studentProfiles: number
  reportsIncluded: number
  plan: 'pilot' | 'school' | 'region'
}

export type LicensePlan = SchoolLicense['plan']

export const licensePricing: Record<LicensePlan, { price: string; note: string; reports: number; seats: number }> = {
  pilot: {
    price: '9 900 Kč / rok',
    note: 'Startovací balíček pro ověření na jedné škole.',
    reports: 60,
    seats: 1,
  },
  school: {
    price: '29 000 Kč / rok',
    note: 'Plná školní licence pro kariérové poradenství a třídní učitele.',
    reports: 300,
    seats: 5,
  },
  region: {
    price: 'od 190 000 Kč / rok',
    note: 'Více škol, agregované přehledy a reporting pro zřizovatele.',
    reports: 2500,
    seats: 40,
  },
}

export type ReportCareerMatch = {
  career: Career
  score: number
  reasons: string[]
  flags: string[]
}

export type ReportPayload = {
  profile: {
    studentName: string
  }
  license: SchoolLicense
  selected: ReportCareerMatch
  topThree: ReportCareerMatch[]
  selectedRegionLabel: string
  selectedMarketSignal: (MarketSignal & { regionalOpenVacancies: number; regionalScore: number }) | null
  selectedSchoolPrograms: SchoolProgram[]
  mpsvSourceUrl: string
  generatedAt?: string
}

function escapeHtml(value: string | number | null | undefined) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('cs-CZ', {
    style: 'currency',
    currency: 'CZK',
    maximumFractionDigits: 0,
  }).format(value)
}

function formatMonths(value: number) {
  if (value < 12) return `${value} měs.`
  const years = value / 12
  return Number.isInteger(years) ? `${years} roky` : `${years.toFixed(1).replace('.', ',')} roku`
}

export function buildReportHtml(payload: ReportPayload) {
  const {
    profile,
    license,
    selected,
    topThree,
    selectedRegionLabel,
    selectedMarketSignal,
    selectedSchoolPrograms,
    mpsvSourceUrl,
  } = payload
  const risks = [...selected.flags, ...selected.career.risks].slice(0, 4)
  const today = payload.generatedAt
    ? new Intl.DateTimeFormat('cs-CZ', { dateStyle: 'medium' }).format(new Date(payload.generatedAt))
    : new Intl.DateTimeFormat('cs-CZ', { dateStyle: 'medium' }).format(new Date())

  return `<!doctype html>
<html lang="cs">
<head>
  <meta charset="utf-8" />
  <title>Profesní report - ${escapeHtml(profile.studentName || 'žák')}</title>
  <style>
    @page { size: A4; margin: 14mm; }
    * { box-sizing: border-box; }
    body { margin: 0; color: #14211e; background: #ffffff; font-family: Inter, Arial, sans-serif; font-size: 12px; line-height: 1.45; }
    .report { display: grid; gap: 14px; }
    header { display: grid; grid-template-columns: 1fr auto; gap: 18px; align-items: start; border-bottom: 2px solid #00685f; padding-bottom: 12px; }
    .brand { color: #00685f; font-weight: 900; letter-spacing: 0.04em; text-transform: uppercase; }
    h1, h2, h3, p { margin: 0; }
    h1 { margin-top: 8px; font-size: 26px; line-height: 1.1; }
    h2 { font-size: 17px; margin-bottom: 8px; }
    h3 { font-size: 13px; margin-bottom: 5px; }
    .muted { color: #65726f; }
    .license-box { min-width: 215px; border: 1px solid #c8d7d2; border-radius: 8px; padding: 10px; text-align: right; }
    .pill { display: inline-block; border: 1px solid #b8d8d2; border-radius: 999px; color: #00685f; background: #e8f5f1; font-size: 10px; font-weight: 800; letter-spacing: 0.06em; padding: 4px 7px; text-transform: uppercase; }
    .grid-4, .grid-2 { display: grid; gap: 9px; }
    .grid-4 { grid-template-columns: repeat(4, 1fr); }
    .grid-2 { grid-template-columns: repeat(2, 1fr); }
    .card { border: 1px solid #d8e2df; border-radius: 8px; padding: 11px; break-inside: avoid; }
    .wash { background: #f5faf8; }
    .metric small, .source-row small { display: block; color: #65726f; font-size: 9px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; }
    .metric strong { display: block; margin-top: 4px; font-size: 18px; }
    ul, ol { margin: 8px 0 0; padding-left: 18px; }
    li { margin: 4px 0; }
    table { width: 100%; border-collapse: collapse; overflow: hidden; border: 1px solid #d8e2df; border-radius: 8px; font-size: 11px; }
    th, td { border-bottom: 1px solid #d8e2df; padding: 8px; text-align: left; vertical-align: top; }
    th { background: #f0f6f3; color: #40514d; font-size: 9px; letter-spacing: 0.06em; text-transform: uppercase; }
    tr:last-child td { border-bottom: 0; }
    .source-row { display: grid; grid-template-columns: 130px 1fr; gap: 10px; border-top: 1px solid #d8e2df; padding-top: 8px; margin-top: 8px; }
    .footer { border-top: 1px solid #d8e2df; color: #65726f; font-size: 10px; padding-top: 10px; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style>
</head>
<body>
  <main class="report">
    <header>
      <div>
        <div class="brand">Profesní mapa</div>
        <h1>Kariérní report pro ${escapeHtml(profile.studentName || 'žáka')}</h1>
        <p class="muted">${escapeHtml(selectedRegionLabel)} / ${escapeHtml(today)} / poradenský podklad pro školu a rodiče</p>
      </div>
      <div class="license-box">
        <span class="pill">${escapeHtml(licensePricing[license.plan].price)}</span>
        <h3>${escapeHtml(license.schoolName)}</h3>
        <p class="muted">Licence ${escapeHtml(license.schoolId)}</p>
        <p class="muted">${escapeHtml(license.counselorSeats)} poradců / ${escapeHtml(license.reportsIncluded)} reportů</p>
      </div>
    </header>

    <section class="grid-4">
      <div class="card metric wash"><small>Hlavní doporučení</small><strong>${escapeHtml(selected.career.title)}</strong></div>
      <div class="card metric wash"><small>Shoda</small><strong>${escapeHtml(selected.score)} %</strong></div>
      <div class="card metric wash"><small>Medián mzdy</small><strong>${escapeHtml(formatCurrency(selected.career.monthlyPay))}</strong></div>
      <div class="card metric wash"><small>Délka cesty</small><strong>${escapeHtml(formatMonths(selected.career.trainingMonths))}</strong></div>
    </section>

    <section class="card">
      <h2>Souhrn doporučené cesty</h2>
      <p>${escapeHtml(selected.career.summary)}</p>
      <div class="source-row"><small>CZ-ISCO</small><strong>${escapeHtml(selected.career.czIscoCode)}</strong></div>
      <div class="source-row"><small>Obor</small><strong>${escapeHtml(selected.career.educationProgram.code)} ${escapeHtml(selected.career.educationProgram.name)}</strong></div>
      <div class="source-row"><small>MPSV volná místa</small><strong>${selectedMarketSignal ? `${escapeHtml(selectedMarketSignal.regionalOpenVacancies)} v kraji / ${escapeHtml(selectedMarketSignal.nationalOpenVacancies)} v ČR (${escapeHtml(selectedMarketSignal.period)})` : 'Pro tuto skupinu nejsou dostupná v regionálním signálu'}</strong></div>
    </section>

    <section class="grid-2">
      <div class="card"><h2>Proč tato cesta sedí</h2><ul>${selected.reasons.map((reason) => `<li>${escapeHtml(reason)}</li>`).join('')}</ul></div>
      <div class="card"><h2>Rizika a ověření</h2><ul>${risks.map((risk) => `<li>${escapeHtml(risk)}</li>`).join('')}</ul></div>
    </section>

    <section class="card">
      <h2>Top 3 srovnání</h2>
      <table>
        <thead><tr><th>Profese</th><th>Shoda</th><th>Mzda</th><th>Délka</th><th>Obor</th></tr></thead>
        <tbody>
          ${topThree
            .map(
              (match) => `<tr>
                <td><strong>${escapeHtml(match.career.title)}</strong><br><span class="muted">${escapeHtml(match.career.sector)}</span></td>
                <td>${escapeHtml(match.score)} %</td>
                <td>${escapeHtml(formatCurrency(match.career.monthlyPay))}</td>
                <td>${escapeHtml(formatMonths(match.career.trainingMonths))}</td>
                <td>${escapeHtml(match.career.educationProgram.code)}</td>
              </tr>`,
            )
            .join('')}
        </tbody>
      </table>
    </section>

    <section class="grid-2">
      <div class="card"><h2>90denní plán</h2><ol>${selected.career.nextSteps.map((step) => `<li>${escapeHtml(step)}</li>`).join('')}</ol></div>
      <div class="card">
        <h2>Školy a obory k ověření</h2>
        <ul>${selectedSchoolPrograms
          .map((program) => `<li><strong>${escapeHtml(program.schoolName)}</strong>, ${escapeHtml(program.city)}<br><span class="muted">${escapeHtml(program.programCode)} ${escapeHtml(program.programName)}</span></li>`)
          .join('')}</ul>
      </div>
    </section>

    <section class="card wash">
      <h2>Zdroje a jistota dat</h2>
      <p>Report odděluje ověřené veřejné zdroje od interních seed odhadů. MPSV VPM je oficiální otevřený datový zdroj agregovaný podle CZ-ISCO a kraje; mzdy a některé regionální priority mohou být u části profesí orientační.</p>
      <div class="source-row"><small>Infoabsolvent</small><strong>${escapeHtml(selected.career.educationProgram.infoAbsolventUrl)}</strong></div>
      <div class="source-row"><small>NSP</small><strong>${escapeHtml(selected.career.nspUrl)}</strong></div>
      <div class="source-row"><small>MPSV</small><strong>${escapeHtml(mpsvSourceUrl)}</strong></div>
    </section>

    <p class="footer">Profesní mapa / školní licence. Tento report je poradenský podklad, ne závazné rozhodnutí o přijetí, zdravotní způsobilosti ani pracovním uplatnění.</p>
  </main>
</body>
</html>`
}
