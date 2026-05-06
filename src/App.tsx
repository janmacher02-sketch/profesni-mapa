import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
  ArrowRight,
  Check,
  Bell,
  Briefcase,
  Buildings,
  ChartLineUp,
  CheckCircle,
  ClipboardText,
  Clock,
  Compass,
  CurrencyDollar,
  Database,
  DownloadSimple,
  FilePdf,
  ArrowSquareOut,
  GraduationCap,
  LockKey,
  MagnifyingGlass,
  MapPin,
  Question,
  SealCheck,
  SlidersHorizontal,
  Student,
  TrendUp,
  Trash,
  UsersThree,
  WarningCircle,
  Wrench,
} from '@phosphor-icons/react'
import './App.css'
import { caseStatusLabels, caseStatuses, type CaseStatus, type StudentCase, type StudentCaseInput } from './cases'
import {
  careers,
  defaultProfile,
  type Budget,
  type Environment,
  type Interest,
  type MathComfort,
  type PeopleMode,
  type PhysicalPreference,
  type Region,
  type StudentProfile,
  type TrainingWindow,
} from './data'
import { getMarketSignal, mpsvMarketSource } from './marketSignals'
import { getSchoolPrograms } from './schoolPrograms'
import { licensePricing, type ReportPayload, type SchoolLicense } from './reporting'
import { formatCurrency, formatMonths, scoreCareers, type CareerMatch } from './scoring'

const REPORT_API_URL = (import.meta.env.VITE_REPORT_API_URL as string | undefined)?.replace(/\/$/, '') ?? 'http://127.0.0.1:8787'

function reportApiUrl(path: string) {
  return `${REPORT_API_URL}${path.startsWith('/') ? path : `/${path}`}`
}

type Option<T extends string> = {
  value: T
  label: string
}

const interestOptions: Option<Interest>[] = [
  { value: 'building', label: 'Řemeslo a opravy' },
  { value: 'healthcare', label: 'Zdravotnictví' },
  { value: 'technology', label: 'Technika a IT' },
  { value: 'transport', label: 'Doprava a logistika' },
  { value: 'energy', label: 'Energetika' },
  { value: 'service', label: 'Služby' },
]

const environmentOptions: Option<Environment>[] = [
  { value: 'mixed', label: 'Kombinované' },
  { value: 'indoor', label: 'Uvnitř' },
  { value: 'outdoor', label: 'Venku' },
]

const trainingOptions: Option<TrainingWindow>[] = [
  { value: 'fast', label: 'Rekvalifikace / do 12 měsíců' },
  { value: 'moderate', label: 'Učební obor / 3 roky' },
  { value: 'patient', label: 'Maturita / 4 roky a více' },
]

const physicalOptions: Option<PhysicalPreference>[] = [
  { value: 'low', label: 'Nízká' },
  { value: 'medium', label: 'Střední' },
  { value: 'high', label: 'Vyšší manuální' },
]

const mathOptions: Option<MathComfort>[] = [
  { value: 'low', label: 'Základní' },
  { value: 'medium', label: 'Běžná' },
  { value: 'high', label: 'Silná' },
]

const peopleOptions: Option<PeopleMode>[] = [
  { value: 'solo', label: 'Spíše samostatně' },
  { value: 'balanced', label: 'Vyváženě' },
  { value: 'people', label: 'Hodně s lidmi' },
]

const budgetOptions: Option<Budget>[] = [
  { value: 'low', label: 'Veřejná škola / nízké náklady' },
  { value: 'medium', label: 'Kurzy a pomůcky možné' },
  { value: 'high', label: 'Rodina může investovat' },
]

const regionOptions: Option<Region>[] = [
  { value: 'praha', label: 'Hlavní město Praha' },
  { value: 'stredocesky', label: 'Středočeský kraj' },
  { value: 'jihocesky', label: 'Jihočeský kraj' },
  { value: 'plzensky', label: 'Plzeňský kraj' },
  { value: 'karlovarsky', label: 'Karlovarský kraj' },
  { value: 'ustecky', label: 'Ústecký kraj' },
  { value: 'liberecky', label: 'Liberecký kraj' },
  { value: 'kralovehradecky', label: 'Královéhradecký kraj' },
  { value: 'pardubicky', label: 'Pardubický kraj' },
  { value: 'vysocina', label: 'Kraj Vysočina' },
  { value: 'jihomoravsky', label: 'Jihomoravský kraj' },
  { value: 'olomoucky', label: 'Olomoucký kraj' },
  { value: 'zlinsky', label: 'Zlínský kraj' },
  { value: 'moravskoslezsky', label: 'Moravskoslezský kraj' },
]

const licensePlanOptions: Option<SchoolLicense['plan']>[] = [
  { value: 'pilot', label: 'Pilot / 1 poradce' },
  { value: 'school', label: 'Školní licence' },
  { value: 'region', label: 'Zřizovatel / kraj' },
]

const coverageSegments = [
  {
    label: 'Řemesla a stavebnictví',
    target: 24,
    careerIds: [
      'elektromechanik',
      'instalater',
      'truhlar',
      'zednik',
      'fve-technik',
      'elektrikar-silnoproud',
      'klempir',
      'malir-naterac',
      'obkladac',
      'spravce-budovy',
      'tesar',
      'pokryvac',
      'monter-suchych-staveb',
      'podlahar',
      'kominik',
      'stavebni-technik',
    ],
    missing: ['rozpočtář staveb', 'stavbyvedoucí junior', 'technolog staveb', 'geodetická četa'],
  },
  {
    label: 'Výroba, strojírenství a kvalita',
    target: 22,
    careerIds: [
      'nastrojar',
      'operator-vyroby',
      'kontrolor-kvality',
      'strojni-mechanik',
      'svarovac',
      'facility-technik',
      'mechatronik',
      'serizovac',
      'obrabec-kovu',
      'cad-konstrukter-junior',
      'lakyrnik',
      'technik-udrzby',
    ],
    missing: ['technik robotiky', 'programátor CNC', 'metrolog', 'lean koordinátor'],
  },
  {
    label: 'Zdravotnictví a sociální péče',
    target: 20,
    careerIds: [
      'prakticka-sestra',
      'pecovatel',
      'zdravotnicky-zachranar',
      'laborant',
      'farmaceuticky-asistent',
      'veterinarni-technik',
      'zubni-instrumentarka',
      'sanitar',
      'osetrovatel',
      'nutricni-asistent',
      'radiologicky-asistent',
      'zubni-technik',
    ],
    missing: ['fyzioterapeut asistent', 'ergoterapeut asistent', 'zdravotnický administrátor'],
  },
  {
    label: 'Doprava, logistika a infrastruktura',
    target: 18,
    careerIds: [
      'automechanik',
      'logistik',
      'skladnik',
      'ridic-nakladni',
      'ridic-autobusu',
      'strojvedouci',
      'dorucovatel',
      'vodohospodarsky-technik',
      'dispecer',
      'zeleznicni-technik',
      'spediter',
      'ecommerce-logistik',
      'technik-silnicni-udrzby',
    ],
    missing: ['letecký mechanik', 'dopravní plánovač', 'technik vodní dopravy'],
  },
  {
    label: 'Služby, obchod a administrativa',
    target: 24,
    careerIds: [
      'kuchar',
      'cisnik',
      'prodavac',
      'mzdova-ucetni',
      'administrativa',
      'bezpecnost',
      'kosmeticka',
      'kadernik',
      'zakaznicka-podpora',
      'recepcni',
      'marketingovy-asistent',
      'odevni-technik',
      'ucetni',
      'personalista',
      'nakupci',
      'cukrar',
      'florista',
      'pracovnik-ecommerce',
      'pokojskya',
      'uklizec-provozu',
      'barista',
      'fotograf-videomaker',
      'realitni-makler',
    ],
    missing: ['event koordinátor', 'pracovník cestovní kanceláře', 'pojišťovací poradce'],
  },
  {
    label: 'IT, digitální a technické kancelářské role',
    target: 16,
    careerIds: ['technik-pc', 'kyberbezpecnost-junior', 'junior-vyvojar', 'tester-softwaru', 'spravce-siti', 'data-analytik-junior', 'web-administrator', 'gis-technik'],
    missing: ['AI data anotátor', 'cloud administrátor', 'low-code specialista', 'technická podpora SaaS'],
  },
  {
    label: 'Školství, veřejná služba a komunita',
    target: 14,
    careerIds: ['asistent-pedagoga', 'ucitel-ms', 'vychovatel', 'pedagog-volneho-casu', 'hasic', 'policista', 'pracovnik-vezenske-sluzby'],
    missing: ['sociální pracovník', 'pracovník nízkoprahového centra', 'komunitní koordinátor'],
  },
  {
    label: 'Zemědělství, potraviny a regionální obory',
    target: 16,
    careerIds: ['zemedelsky-mechanizator', 'pekar', 'reznik-uzenar', 'sklar', 'zahradnik', 'chovatel', 'lesni-mechanizator', 'mlekarenstvi', 'potravinarsky-technik'],
    missing: ['rybářství', 'vinařský technik', 'technik bioplynové stanice'],
  },
]

const pilotChannels = [
  {
    label: '5 pilotních ZŠ/SŠ',
    owner: 'Ředitel, výchovný poradce, kariérový poradce',
    offer: 'Roční pilot za 9 900 Kč, 60 PDF reportů a společná evaluace po 8 týdnech.',
    proof: 'Ukázkový report pro rodičovskou schůzku a regionální data MPSV.',
  },
  {
    label: 'PPP, MAP a krajské odbory školství',
    owner: 'Koordinátor kariérového poradenství',
    offer: 'Workshop pro poradce a přehled profesních mezer podle kraje.',
    proof: 'Coverage Matrix, audit zdrojů a export pro poradenskou dokumentaci.',
  },
  {
    label: 'Hospodářské komory a zaměstnavatelé',
    owner: 'HR, nábor učňů, spolupráce se školami',
    offer: 'Partnerství u profesních cest, exkurze, stipendia a praxe.',
    proof: 'Seznam profesí navázaných na CZ-ISCO a školní obory.',
  },
  {
    label: 'Veřejná demo stránka',
    owner: 'Produktový web',
    offer: 'Vyzkoušet 1 žákovský profil zdarma, PDF report pouze po registraci školy.',
    proof: 'Krátký formulář, anonymní ukázková data a jasný ceník školní licence.',
  },
]

const defensibilityLayers = [
  {
    label: 'Datová vrstva',
    value: '100 profesí / 84 CZ-ISCO',
    detail: 'Katalog není jen UI. Má CZ-ISCO, MPSV signály, Infoabsolvent/NSP/NSK odkazy, regiony, rizika a poradenské kroky.',
  },
  {
    label: 'Audit a důvěryhodnost',
    value: 'PDF + JSONL audit',
    detail: 'Serverové reporty se ukládají, číslují a zapisují do auditní stopy. To je pro školy důležitější než hezký screenshot.',
  },
  {
    label: 'Workflow pro školy',
    value: 'licence / reporty / poradce',
    detail: 'Školní licence řeší počet poradců, profily žáků, reporty pro rodiče a opakovatelné poradenské schůzky.',
  },
  {
    label: 'Integrace a agentní vrstva',
    value: 'MCP + reporting API',
    detail: 'Data lze používat ve webu, report serveru i agentním nástroji. Kopie obrazovky nezíská datové pipeline ani provozní proces.',
  },
]

function App() {
  const [profile, setProfile] = useState<StudentProfile>(defaultProfile)
  const [license, setLicense] = useState<SchoolLicense>({
    schoolName: 'ZŠ a SŠ Demo Praha',
    schoolId: 'pilot-2026-001',
    counselorSeats: 5,
    studentProfiles: 128,
    reportsIncluded: 300,
    plan: 'school',
  })
  const [exportStatus, setExportStatus] = useState<'idle' | 'copied' | 'downloaded'>('idle')
  const [pdfStatus, setPdfStatus] = useState<'idle' | 'ready'>('idle')
  const [caseSaveStatus, setCaseSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle')
  const [studentCases, setStudentCases] = useState<StudentCase[]>([])
  const [accessCode, setAccessCode] = useState('')
  const [accessError, setAccessError] = useState('')
  const [hasPilotAccess, setHasPilotAccess] = useState(false)
  const [accessChecked, setAccessChecked] = useState(false)
  const matches = useMemo(() => scoreCareers(profile, careers), [profile])
  const [selectedId, setSelectedId] = useState(defaultProfile.interest === 'building' ? 'elektromechanik' : matches[0].career.id)
  const selected = matches.find((match) => match.career.id === selectedId) ?? matches[0]
  const topThree = matches.slice(0, 3)
  const averageFit = Math.round(topThree.reduce((sum, match) => sum + match.score, 0) / topThree.length)
  const fastestPaid = matches.reduce((winner, match) =>
    match.career.firstPaidWorkMonths < winner.career.firstPaidWorkMonths ? match : winner,
  )
  const selectedRegionLabel = regionOptions.find((region) => region.value === profile.region)?.label ?? 'ČR'
  const selectedMarketSignal = getMarketSignal(selected.career.czIscoCode, profile.region)
  const selectedSchoolPrograms = getSchoolPrograms(selected.career, profile.region)
  const catalogIds = useMemo(() => new Set(careers.map((career) => career.id)), [])
  const coverageRows = useMemo(
    () =>
      coverageSegments.map((segment) => {
        const covered = segment.careerIds.filter((careerId) => catalogIds.has(careerId)).length
        return {
          ...segment,
          covered,
          coverage: Math.round((covered / segment.target) * 100),
        }
      }),
    [catalogIds],
  )
  const overallCoverage = Math.round(
    (coverageRows.reduce((sum, segment) => sum + segment.covered, 0) / coverageRows.reduce((sum, segment) => sum + segment.target, 0)) * 100,
  )
  const priorityGaps = coverageRows.flatMap((segment) => segment.missing.slice(0, 3).map((missing) => `${missing} / ${segment.label}`)).slice(0, 10)

  useEffect(() => {
    async function checkSession() {
      try {
        const response = await fetch(reportApiUrl('/api/auth/session'), {
          credentials: 'include',
        })
        if (!response.ok) throw new Error(`Auth service returned ${response.status}`)
        const data = (await response.json()) as { authenticated: boolean }
        setHasPilotAccess(data.authenticated)
      } catch {
        setHasPilotAccess(false)
      } finally {
        setAccessChecked(true)
      }
    }

    void checkSession()
  }, [])

  useEffect(() => {
    if (!accessChecked || !hasPilotAccess) return

    async function loadCases() {
      try {
        const response = await fetch(reportApiUrl('/api/cases'), {
          credentials: 'include',
        })
        if (!response.ok) throw new Error(`Case service returned ${response.status}`)
        const data = (await response.json()) as { cases: StudentCase[] }
        setStudentCases(data.cases)
      } catch {
        setStudentCases([])
      }
    }

    void loadCases()
  }, [accessChecked, hasPilotAccess])

  function updateProfile<T extends keyof StudentProfile>(key: T, value: StudentProfile[T]) {
    setProfile((current) => ({ ...current, [key]: value }))
  }

  function updateLicense<T extends keyof SchoolLicense>(key: T, value: SchoolLicense[T]) {
    setLicense((current) => {
      if (key === 'plan') {
        const pricing = licensePricing[value as SchoolLicense['plan']]
        return {
          ...current,
          [key]: value,
          counselorSeats: pricing.seats,
          reportsIncluded: pricing.reports,
        }
      }

      return { ...current, [key]: value }
    })
  }

  const planText = buildPlanText({
    profile,
    selected,
    topThree,
    selectedRegionLabel,
    selectedMarketSignal,
    selectedSchoolPrograms,
  })

  async function copyPlan() {
    await navigator.clipboard.writeText(planText)
    setExportStatus('copied')
    window.setTimeout(() => setExportStatus('idle'), 1800)
  }

  function downloadPlan() {
    const blob = new Blob([planText], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `profesni-plan-${profile.studentName || 'zak'}.txt`
    link.click()
    URL.revokeObjectURL(url)
    setExportStatus('downloaded')
    window.setTimeout(() => setExportStatus('idle'), 1800)
  }

  async function saveCurrentCase() {
    const payload: StudentCaseInput = {
      schoolId: license.schoolId,
      schoolName: license.schoolName,
      studentName: profile.studentName || 'Žák bez jména',
      region: profile.region,
      regionLabel: selectedRegionLabel,
      selectedCareerId: selected.career.id,
      selectedCareerTitle: selected.career.title,
      fitScore: selected.score,
      topCareerIds: topThree.map((match) => match.career.id),
      status: 'intake',
      notes: `Cílová mzda ${formatCurrency(profile.salaryGoal)}, hlavní zájem ${interestOptions.find((option) => option.value === profile.interest)?.label ?? profile.interest}.`,
    }

    try {
      const response = await fetch(reportApiUrl('/api/cases'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      })
      if (!response.ok) throw new Error(`Case service returned ${response.status}`)
      const data = (await response.json()) as { case: StudentCase }
      setStudentCases((current) => [data.case, ...current])
      setCaseSaveStatus('saved')
      window.setTimeout(() => setCaseSaveStatus('idle'), 1800)
    } catch {
      setCaseSaveStatus('error')
      window.setTimeout(() => setCaseSaveStatus('idle'), 2200)
    }
  }

  async function updateCaseStatus(caseId: string, status: CaseStatus) {
    try {
      const response = await fetch(reportApiUrl(`/api/cases/${caseId}`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status }),
      })
      if (!response.ok) throw new Error(`Case service returned ${response.status}`)
      const data = (await response.json()) as { case: StudentCase }
      setStudentCases((current) => current.map((studentCase) => (studentCase.id === caseId ? data.case : studentCase)))
    } catch {
      setCaseSaveStatus('error')
      window.setTimeout(() => setCaseSaveStatus('idle'), 2200)
    }
  }

  async function deleteCase(caseId: string) {
    const confirmed = window.confirm('Smazat tento poradenský případ? Tato akce je nevratná.')
    if (!confirmed) return

    try {
      const response = await fetch(reportApiUrl(`/api/cases/${caseId}`), {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!response.ok) throw new Error(`Case service returned ${response.status}`)
      setStudentCases((current) => current.filter((studentCase) => studentCase.id !== caseId))
    } catch {
      setCaseSaveStatus('error')
      window.setTimeout(() => setCaseSaveStatus('idle'), 2200)
    }
  }

  async function exportPdfReport() {
    const payload = buildReportPayload({
      profile,
      license,
      selected,
      topThree,
      selectedRegionLabel,
      selectedMarketSignal,
      selectedSchoolPrograms,
    })

    try {
      const response = await fetch(reportApiUrl('/api/reports/pdf'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      })

      if (!response.ok) throw new Error(`Report service returned ${response.status}`)

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      const reportId = response.headers.get('X-Report-Id') ?? `${Date.now()}`
      link.href = url
      link.download = `profesni-report-${profile.studentName || 'zak'}-${reportId}.pdf`
      link.click()
      URL.revokeObjectURL(url)
      setPdfStatus('ready')
      window.setTimeout(() => setPdfStatus('idle'), 1800)
      return
    } catch (error) {
      console.warn('Server PDF export failed, falling back to browser print.', error)
    }

    const reportHtml = buildReportHtml({
      profile,
      license,
      selected,
      topThree,
      selectedRegionLabel,
      selectedMarketSignal,
      selectedSchoolPrograms,
    })
    const reportWindow = window.open('', '_blank', 'width=960,height=1200')

    if (!reportWindow) return

    reportWindow.document.open()
    reportWindow.document.write(reportHtml)
    reportWindow.document.close()
    reportWindow.focus()
    reportWindow.setTimeout(() => {
      reportWindow.print()
    }, 350)

    setPdfStatus('ready')
    window.setTimeout(() => setPdfStatus('idle'), 1800)
  }

  async function loginWithPilotCode() {
    try {
      const response = await fetch(reportApiUrl('/api/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ code: accessCode }),
      })

      if (!response.ok) throw new Error(`Auth service returned ${response.status}`)

      setHasPilotAccess(true)
      setAccessError('')
    } catch {
      setAccessError('Neplatný pilotní kód.')
    }
  }

  if (!accessChecked) {
    return (
      <main className="access-shell">
        <section className="access-panel" aria-label="Ověření přístupu">
          <span className="brand-mark access-mark">
            <LockKey size={24} weight="duotone" />
          </span>
          <p className="eyebrow">Pilotní provoz</p>
          <h1>Ověřuji přístup.</h1>
          <p>Kontroluji zabezpečenou pilotní session.</p>
        </section>
      </main>
    )
  }

  if (!hasPilotAccess) {
    return (
      <PilotAccessGate
        accessCode={accessCode}
        accessError={accessError}
        onAccessCodeChange={(value) => {
          setAccessCode(value)
          setAccessError('')
        }}
        onSubmit={loginWithPilotCode}
      />
    )
  }

  return (
    <div className="product-shell">
      <aside className="sidebar" aria-label="Workspace navigation">
        <a className="brand-lockup" href="/" aria-label="Pathfound home">
          <span className="brand-mark">
            <Compass size={21} weight="duotone" />
          </span>
          <span>
            <strong>Profesní mapa</strong>
            <small>Průvodce profesní cestou</small>
          </span>
        </a>

        <nav className="side-nav">
          <a className="active" href="#dashboard">
            <ChartLineUp size={19} />
            Dashboard
          </a>
          <a href="#matches">
            <Briefcase size={19} />
            Profese
          </a>
          <a href="#comparison">
            <GraduationCap size={19} />
            Srovnání
          </a>
          <a href="#plan">
            <ClipboardText size={19} />
            Plánování
          </a>
          <a href="#license">
            <SealCheck size={19} />
            Licence
          </a>
          <a href="#cases">
            <Student size={19} />
            Žáci
          </a>
          <a href="#coverage">
            <Database size={19} />
            Pokrytí
          </a>
          <a href="#launch">
            <Buildings size={19} />
            Pilot
          </a>
        </nav>

        <div className="source-note">
          <Database size={18} />
          <p>NSP, Infoabsolvent, NSK a ESCO jsou primární zdroje pro českou verzi.</p>
        </div>
      </aside>

      <div className="main-shell">
        <header className="appbar">
          <div>
            <p className="crumb">Případ #8291 / {selectedRegionLabel}</p>
            <h1>Pracovní plocha pro {profile.studentName || 'žáka'}</h1>
          </div>
          <div className="appbar-actions">
            <button className="text-button" type="button" onClick={copyPlan}>
              {exportStatus === 'copied' ? <Check size={16} /> : <ClipboardText size={16} />}
              {exportStatus === 'copied' ? 'Zkopírováno' : 'Kopírovat plán'}
            </button>
            <button className="text-button" type="button" onClick={downloadPlan}>
              {exportStatus === 'downloaded' ? <Check size={16} /> : <DownloadSimple size={16} />}
              {exportStatus === 'downloaded' ? 'Staženo' : 'Stáhnout'}
            </button>
            <button className="primary-button" type="button" onClick={exportPdfReport}>
              {pdfStatus === 'ready' ? <Check size={16} /> : <FilePdf size={16} />}
              {pdfStatus === 'ready' ? 'PDF připraveno' : 'Export PDF'}
            </button>
            <button className="text-button" type="button" onClick={saveCurrentCase}>
              {caseSaveStatus === 'saved' ? <Check size={16} /> : <Student size={16} />}
              {caseSaveStatus === 'saved' ? 'Případ uložen' : caseSaveStatus === 'error' ? 'Server neběží' : 'Uložit případ'}
            </button>
            <label className="search-box">
              <MagnifyingGlass size={17} />
              <input aria-label="Search paths" placeholder="Search paths..." />
            </label>
            <button className="round-button" type="button" aria-label="Notifications">
              <Bell size={18} />
            </button>
            <button className="round-button" type="button" aria-label="Help">
              <Question size={18} />
            </button>
            <span className="avatar" aria-label="Counselor profile">JM</span>
          </div>
        </header>

        <main className="dashboard" id="dashboard">
          <section className="overview-strip" aria-label="Recommendation overview">
            <OverviewCard icon={<ChartLineUp size={20} />} label="Nejlepší shoda" value={`${matches[0].score}%`} note={matches[0].career.title} />
            <OverviewCard icon={<Briefcase size={20} />} label="Profesní cesty" value={careers.length.toString()} note="Učební, maturitní a kvalifikační cesty" />
            <OverviewCard icon={<Clock size={20} />} label="Nejrychlejší nástup" value={formatMonths(fastestPaid.career.firstPaidWorkMonths)} note={fastestPaid.career.title} />
            <OverviewCard icon={<CheckCircle size={20} />} label="Jistota plánu" value={`${averageFit}%`} note="Průměr TOP 3 shod" />
            <OverviewCard icon={<UsersThree size={20} />} label="Reporty v licenci" value={license.reportsIncluded.toString()} note={licensePricing[license.plan].price} />
          </section>

          <section className="pilot-guide" aria-label="Rychlý postup práce">
            <div>
              <p className="eyebrow">Rychlý postup</p>
              <h2>Od profilu žáka k reportu pro rodiče za jednu poradenskou schůzku.</h2>
            </div>
            <ol>
              <li>
                <span>1</span>
                <strong>Vyplň profil</strong>
                <small>Zájem, kraj, mzda, typ práce a vzdělávací cesta.</small>
              </li>
              <li>
                <span>2</span>
                <strong>Porovnej TOP profese</strong>
                <small>Zkontroluj shodu, mzdu, poptávku, školy a rizika.</small>
              </li>
              <li>
                <span>3</span>
                <strong>Ulož případ</strong>
                <small>Zařaď žáka do poradenského workflow školy.</small>
              </li>
              <li>
                <span>4</span>
                <strong>Stáhni PDF</strong>
                <small>Výstup použij pro rodiče, žáka nebo interní konzultaci.</small>
              </li>
            </ol>
          </section>

          <section className="license-workspace" id="license" aria-label="Školní licence a reporty">
            <div className="license-card">
              <div className="panel-header">
                <PanelTitle icon={<SealCheck size={21} />} kicker="Školní licence" title="Prodejný balíček pro školy" />
                <span className="sort-pill">{licensePricing[license.plan].price}</span>
              </div>
              <div className="license-grid">
                <label className="field">
                  <span>Název školy</span>
                  <input value={license.schoolName} onChange={(event) => updateLicense('schoolName', event.target.value)} />
                </label>
                <label className="field">
                  <span>ID licence</span>
                  <input value={license.schoolId} onChange={(event) => updateLicense('schoolId', event.target.value)} />
                </label>
                <SelectField label="Balíček" value={license.plan} options={licensePlanOptions} onChange={(value) => updateLicense('plan', value)} />
                <label className="field">
                  <span>Poradenská místa</span>
                  <input type="number" min="1" value={license.counselorSeats} onChange={(event) => updateLicense('counselorSeats', Number(event.target.value))} />
                </label>
                <label className="field">
                  <span>Profily žáků</span>
                  <input type="number" min="1" value={license.studentProfiles} onChange={(event) => updateLicense('studentProfiles', Number(event.target.value))} />
                </label>
                <label className="field">
                  <span>PDF reporty v ceně</span>
                  <input type="number" min="1" value={license.reportsIncluded} onChange={(event) => updateLicense('reportsIncluded', Number(event.target.value))} />
                </label>
              </div>
            </div>

            <aside className="license-summary">
              <span className="source-chip verified">Revenue MVP</span>
              <h2>{licensePricing[license.plan].price}</h2>
              <p>{licensePricing[license.plan].note}</p>
              <div className="license-metrics">
                <MetricTile icon={<UsersThree size={18} />} label="Poradci" value={license.counselorSeats.toString()} />
                <MetricTile icon={<Student size={18} />} label="Profily" value={license.studentProfiles.toString()} />
                <MetricTile icon={<FilePdf size={18} />} label="Reporty" value={license.reportsIncluded.toString()} />
                <MetricTile icon={<SealCheck size={18} />} label="Licence" value={license.schoolId} />
              </div>
              <button className="primary-button wide" type="button" onClick={exportPdfReport}>
                <FilePdf size={16} />
                Vygenerovat rodičovský PDF report
              </button>
            </aside>
          </section>

          <section className="case-board" id="cases" aria-label="Žáci a poradenské případy">
            <div className="panel-header">
              <PanelTitle icon={<Student size={21} />} kicker="Žáci / případy" title="Školní poradenský workflow" />
              <button className="primary-button compact" type="button" onClick={saveCurrentCase}>
                {caseSaveStatus === 'saved' ? <Check size={16} /> : <Student size={16} />}
                {caseSaveStatus === 'saved' ? 'Uloženo' : 'Uložit aktuální profil'}
              </button>
            </div>
            <div className="case-columns">
              {caseStatuses.map((status) => {
                const casesInColumn = studentCases.filter((studentCase) => studentCase.status === status)

                return (
                  <article className="case-column" key={status}>
                    <div className="case-column-head">
                      <strong>{caseStatusLabels[status]}</strong>
                      <span>{casesInColumn.length}</span>
                    </div>
                    <div className="case-list">
                      {casesInColumn.length > 0 ? (
                        casesInColumn.map((studentCase) => (
                          <div className="case-item" key={studentCase.id}>
                            <div>
                              <h3>{studentCase.studentName}</h3>
                              <p>{studentCase.selectedCareerTitle}</p>
                              <small>
                                {studentCase.regionLabel} / fit {studentCase.fitScore}% / {new Date(studentCase.updatedAt).toLocaleDateString('cs-CZ')}
                              </small>
                            </div>
                            <div className="case-actions">
                              {caseStatuses
                                .filter((candidate) => candidate !== status)
                                .slice(0, 2)
                                .map((candidate) => (
                                  <button type="button" key={candidate} onClick={() => updateCaseStatus(studentCase.id, candidate)}>
                                    {caseStatusLabels[candidate]}
                                  </button>
                                ))}
                              <button type="button" className="danger" onClick={() => deleteCase(studentCase.id)} aria-label={`Smazat případ ${studentCase.studentName}`}>
                                <Trash size={12} />
                                Smazat
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="case-empty">Žádný případ v tomto stavu.</div>
                      )}
                    </div>
                  </article>
                )
              })}
            </div>
          </section>

          <section className="source-health" aria-label="Stav zdrojových dat">
            <SourceHealthItem
              label="MPSV volná místa"
              value={mpsvMarketSource.period}
              note={`${Object.keys(mpsvMarketSource).length > 0 ? 'Importovatelné otevřené JSON soubory' : 'Zdroj chybí'}`}
              href={mpsvMarketSource.sourceUrl}
            />
            <SourceHealthItem
              label="Infoabsolvent"
              value={`${selectedSchoolPrograms.filter((program) => program.verification === 'listed').length}/${selectedSchoolPrograms.length}`}
              note="Konkrétní školy v kraji vs fallback na obor"
              href={selected.career.educationProgram.infoAbsolventUrl}
            />
            <SourceHealthItem
              label="NSP / mzdy"
              value={selected.career.dataConfidence === 'verified' ? 'ověřeno' : 'částečně'}
              note={selected.career.dataSourceLabel}
              href={selected.career.nspUrl}
            />
          </section>

          <section className="coverage-workspace" id="coverage" aria-label="Pokrytí katalogu profesí">
            <div className="coverage-card">
              <div className="panel-header">
                <PanelTitle icon={<Database size={21} />} kicker="Coverage Matrix" title="Jsou pokryté důležité profese?" />
                <span className="sort-pill">{overallCoverage}% cílového katalogu</span>
              </div>
              <div className="coverage-list">
                {coverageRows.map((segment) => (
                  <article className="coverage-row" key={segment.label}>
                    <div>
                      <strong>{segment.label}</strong>
                      <small>
                        {segment.covered}/{segment.target} profesí v katalogu
                      </small>
                    </div>
                    <div className="coverage-meter" aria-label={`${segment.coverage}% pokryto`}>
                      <span style={{ width: `${Math.min(100, segment.coverage)}%` }} />
                    </div>
                    <p>{segment.missing.slice(0, 4).join(', ')}</p>
                  </article>
                ))}
              </div>
            </div>

            <aside className="gap-card">
              <span className="source-chip partial">Ne pro placený rollout</span>
              <h2>Chybí hlavně IT, školství a další zdravotnické role</h2>
              <p>
                Pro pilot se školou stačí současných {careers.length} profesí. Pro škálovanou školní licenci je cílový katalog minimálně 100 až 120 profesí.
              </p>
              <div className="gap-list">
                {priorityGaps.map((gap) => (
                  <span key={gap}>{gap}</span>
                ))}
              </div>
            </aside>
          </section>

          <section className="launch-board" id="launch" aria-label="Pilot launch board">
            <div className="panel-header">
              <PanelTitle icon={<Buildings size={21} />} kicker="Pilot launch" title="Kam to poslat a kde to vyvěsit" />
              <span className="sort-pill">Cíl: 5 pilotních škol</span>
            </div>
            <div className="launch-grid">
              {pilotChannels.map((channel, index) => (
                <article className="launch-item" key={channel.label}>
                  <span>{index + 1}</span>
                  <div>
                    <h3>{channel.label}</h3>
                    <p>{channel.owner}</p>
                    <strong>{channel.offer}</strong>
                    <small>{channel.proof}</small>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="moat-board" aria-label="Přidaná hodnota produktu">
            <div className="panel-header">
              <PanelTitle icon={<SealCheck size={21} />} kicker="Defensibility" title="Co brání levné kopii podle screenshotu" />
              <span className="sort-pill">Hodnota je v datech a workflow</span>
            </div>
            <div className="moat-grid">
              {defensibilityLayers.map((layer) => (
                <article className="moat-item" key={layer.label}>
                  <p>{layer.label}</p>
                  <h3>{layer.value}</h3>
                  <span>{layer.detail}</span>
                </article>
              ))}
            </div>
          </section>

          <section className="work-grid">
            <aside className="intake-card" aria-label="Profil žáka">
              <PanelTitle icon={<SlidersHorizontal size={21} />} kicker="Profil žáka" title="Vstupy pro doporučení" />

              <label className="field">
                <span>Jméno žáka</span>
                <input value={profile.studentName} onChange={(event) => updateProfile('studentName', event.target.value)} />
              </label>

              <label className="field">
                <span>Město</span>
                <input value={profile.zipCode} onChange={(event) => updateProfile('zipCode', event.target.value)} />
              </label>

              <SelectField label="Kraj" value={profile.region} options={regionOptions} onChange={(value) => updateProfile('region', value)} />

              <SelectField label="Hlavní zájem" value={profile.interest} options={interestOptions} onChange={(value) => updateProfile('interest', value)} />
              <SelectField label="Pracovní prostředí" value={profile.environment} options={environmentOptions} onChange={(value) => updateProfile('environment', value)} />

              <label className="field">
                <span>Cílová hrubá mzda měsíčně</span>
                <div className="money-input">
                  <CurrencyDollar size={16} />
                  <input
                    type="number"
                    min="30000"
                    max="95000"
                    step="1000"
                    value={profile.salaryGoal}
                    onChange={(event) => updateProfile('salaryGoal', Number(event.target.value))}
                  />
                </div>
              </label>

              <SelectField label="Vzdělávací cesta" value={profile.trainingWindow} options={trainingOptions} onChange={(value) => updateProfile('trainingWindow', value)} />
              <SelectField label="Fyzická zátěž" value={profile.physicalPreference} options={physicalOptions} onChange={(value) => updateProfile('physicalPreference', value)} />
              <SelectField label="Vztah k matematice" value={profile.mathComfort} options={mathOptions} onChange={(value) => updateProfile('mathComfort', value)} />
              <SelectField label="Práce s lidmi" value={profile.peopleMode} options={peopleOptions} onChange={(value) => updateProfile('peopleMode', value)} />
              <SelectField label="Rozpočet rodiny" value={profile.budget} options={budgetOptions} onChange={(value) => updateProfile('budget', value)} />

              <div className="data-badge">
                <Database size={18} />
                <div>
                  <strong>Zdrojová vrstva</strong>
                  <span>NSP mzdy 2024, Infoabsolvent pro školy/obory, NSK pro kvalifikace, ESCO pro EU mapu dovedností.</span>
                </div>
              </div>
            </aside>

            <section className="matches-panel" id="matches" aria-label="Doporučené profesní cesty">
              <div className="panel-header">
                <PanelTitle icon={<TrendUp size={21} />} kicker="Doporučení" title="Nejvhodnější profesní cesty" />
                <span className="sort-pill">Seřazeno podle shody</span>
              </div>

              <div className="career-list">
                {matches.map((match) => (
                  <CareerRow
                    key={match.career.id}
                    match={match}
                    region={profile.region}
                    selected={selected.career.id === match.career.id}
                    onSelect={() => setSelectedId(match.career.id)}
                  />
                ))}
              </div>
            </section>

            <aside className="detail-card" aria-label="Detail vybrané profese">
              <div className="detail-hero">
                <FitRing score={selected.score} />
                <div>
                <span className={`source-chip ${selected.career.dataConfidence}`}>{selected.career.dataConfidence === 'verified' ? 'Ověřená data NSP' : 'Částečně ověřeno'}</span>
                <h2>{selected.career.title}</h2>
                <p>{selected.career.summary}</p>
              </div>
              </div>

              <div className="metric-grid">
                <MetricTile icon={<CurrencyDollar size={18} />} label="Medián mzdy" value={formatCurrency(selected.career.monthlyPay)} />
                <MetricTile icon={<Clock size={18} />} label="Délka cesty" value={formatMonths(selected.career.trainingMonths)} />
                <MetricTile icon={<Briefcase size={18} />} label="Nástup do práce" value={formatMonths(selected.career.firstPaidWorkMonths)} />
                <MetricTile icon={<TrendUp size={18} />} label="Poptávkový signál" value={`${selected.career.demandScore}/100`} />
              </div>

              <section className="source-panel">
                <div>
                  <small>CZ-ISCO</small>
                  <strong>{selected.career.czIscoCode}</strong>
                </div>
                <div>
                  <small>{selected.career.regionalArea ?? 'ČR'}</small>
                  <strong>{selected.career.regionalMedianPay ? formatCurrency(selected.career.regionalMedianPay) : 'Doplnit'}</strong>
                </div>
                <div>
                  <small>Medián ČR</small>
                  <strong>{formatCurrency(selected.career.nationalMedianMonthlyPay)}</strong>
                </div>
                <div>
                  <small>Cesta</small>
                  <strong>{selected.career.apprenticeshipFriendly ? 'SŠ + praxe' : 'SŠ / kvalifikace'}</strong>
                </div>
                <div>
                  <small>VPM kraj</small>
                  <strong>{selectedMarketSignal ? selectedMarketSignal.regionalOpenVacancies : 'N/A'}</strong>
                </div>
                <div>
                  <small>VPM ČR</small>
                  <strong>{selectedMarketSignal ? selectedMarketSignal.nationalOpenVacancies : 'N/A'}</strong>
                </div>
                <div className="source-links">
                  <a href={selected.career.nspUrl} target="_blank" rel="noreferrer">
                    NSP profil <ArrowSquareOut size={13} />
                  </a>
                  <a href={selected.career.infoAbsolventUrl} target="_blank" rel="noreferrer">
                    Infoabsolvent <ArrowSquareOut size={13} />
                  </a>
                  <a href={selected.career.escoUrl} target="_blank" rel="noreferrer">
                    ESCO EU <ArrowSquareOut size={13} />
                  </a>
                  <a href={mpsvMarketSource.sourceUrl} target="_blank" rel="noreferrer">
                    MPSV VPM <ArrowSquareOut size={13} />
                  </a>
                </div>
              </section>

              {selectedMarketSignal ? (
                <section className="market-card">
                  <div>
                    <span className="source-chip verified">MPSV {selectedMarketSignal.period}</span>
                    <h3>Volná místa podle CZ-ISCO</h3>
                    <p>
                      Ve zvoleném kraji: <strong>{selectedMarketSignal.regionalOpenVacancies}</strong>.
                      Celá ČR: <strong>{selectedMarketSignal.nationalOpenVacancies}</strong>.
                    </p>
                  </div>
                  <div className="bar-track">
                    <span style={{ width: `${selectedMarketSignal.regionalScore}%` }} />
                  </div>
                </section>
              ) : null}

              <section className="detail-section">
                <h3>Proč to sedí</h3>
                <ul className="icon-list">
                  {selected.reasons.map((reason) => (
                    <li key={reason}>
                      <CheckCircle size={16} weight="fill" />
                      {reason}
                    </li>
                  ))}
                </ul>
              </section>

              <section className="detail-section risk">
                <h3>Rizika a co ověřit</h3>
                <ul className="icon-list">
                  {[...selected.flags, ...selected.career.risks].slice(0, 4).map((risk) => (
                    <li key={risk}>
                      <WarningCircle size={16} />
                      {risk}
                    </li>
                  ))}
                </ul>
              </section>

              <section className="roadmap-box">
                <h3>Vzdělávací mapa</h3>
                <TimelineItem title="Ověření vhodnosti" note="Zájem, známky, dojíždění, zdravotní a fyzická zátěž" active />
                <TimelineItem title="Kontakt se školou nebo firmou" note={selected.career.partnerTargets[0]} />
                <TimelineItem title="Praxe / první pracovní kontakt" note={selected.career.apprenticeshipFriendly ? 'Praxe během studia nebo brigáda ve firmě' : 'Odborná praxe, stínování nebo kvalifikační kurz'} />
              </section>

              <section className="program-card">
                <div>
                  <span className="source-chip">Obor {selected.career.educationProgram.category}</span>
                  <h3>{selected.career.educationProgram.name}</h3>
                  <p>{selected.career.educationProgram.code}</p>
                </div>
                <a href={selected.career.educationProgram.infoAbsolventUrl} target="_blank" rel="noreferrer">
                  Otevřít obor <ArrowSquareOut size={13} />
                </a>
              </section>

              <section className="schools-card">
                <div className="schools-head">
                  <div>
                    <span className="source-chip verified">Infoabsolvent</span>
                    <h3>Školy a obory v kraji</h3>
                  </div>
                  <small>{selectedRegionLabel}</small>
                </div>
                <div className="school-list">
                  {selectedSchoolPrograms.map((program) => (
                    <a className="school-item" href={program.sourceUrl} target="_blank" rel="noreferrer" key={`${program.careerId}-${program.region}-${program.schoolName}`}>
                      <span>
                        <strong>{program.schoolName}</strong>
                        <small>{program.city} / {program.programCode} / {program.educationCategory}</small>
                      </span>
                      <span className={`school-status ${program.verification}`}>
                        {program.verification === 'listed' ? 'Škola v seznamu' : 'Ověřit seznam'}
                      </span>
                    </a>
                  ))}
                </div>
              </section>
            </aside>
          </section>

          <section className="planning-grid" id="comparison">
            <div className="comparison-card">
              <div className="panel-header">
                <PanelTitle icon={<GraduationCap size={21} />} kicker="Srovnání" title="Matice profesních cest" />
                <span className="sort-pill">{topThree.length} vybrané cesty</span>
              </div>
              <div className="matrix" role="table" aria-label="Top three career comparison">
                <div className="matrix-row matrix-head" role="row">
                  <span role="columnheader">Profese</span>
                  <span role="columnheader">Shoda</span>
                  <span role="columnheader">Mzda</span>
                  <span role="columnheader">Délka</span>
                  <span role="columnheader">Cesta</span>
                </div>
                {topThree.map((match) => (
                  <div className="matrix-row" role="row" key={match.career.id}>
                    <span role="cell">
                      <strong>{match.career.title}</strong>
                      <small>{match.career.sector}</small>
                    </span>
                    <span role="cell">{match.score}%</span>
                    <span role="cell">
                      {formatCurrency(match.career.monthlyPay)}
                      <small>{match.career.regionalMedianPay ? 'Region / ČR' : 'Medián ČR'}</small>
                    </span>
                    <span role="cell">{formatMonths(match.career.trainingMonths)}</span>
                    <span role="cell">
                      {match.career.educationPath}
                      <small>CZ-ISCO {match.career.czIscoCode}</small>
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <aside className="action-card" id="plan" aria-label="Counselor action plan">
              <div className="action-title-row">
                <PanelTitle icon={<ClipboardText size={21} />} kicker="90denní plán" title="Akční plán poradce" />
                <button className="mini-action" type="button" onClick={copyPlan} aria-label="Kopírovat akční plán">
                  <ClipboardText size={17} />
                </button>
              </div>
              <ol className="task-list">
                {selected.career.nextSteps.map((step, index) => (
                  <li key={step}>
                    <span>{index === 0 ? <CheckCircle size={15} weight="fill" /> : index + 1}</span>
                    <div>
                      <strong>{step}</strong>
                      <small>{index === 0 ? 'Priorita: vysoká' : index === 1 ? 'Škola / praxe' : 'Administrativa'}</small>
                    </div>
                  </li>
                ))}
              </ol>
              <div className="confidence-box">
                <div>
                  <strong>Jistota plánu</strong>
                  <span>{selected.score}%</span>
                </div>
                <div className="bar-track">
                  <span style={{ width: `${selected.score}%` }} />
                </div>
                <p>Vychází z aktuálních vstupů žáka a profilu vybrané profesní cesty.</p>
              </div>
            </aside>
          </section>

          <section className="partner-strip" aria-label="Partner programs">
            <PartnerCard
              icon={<Buildings size={22} />}
              kicker="Mapa partnerů"
              title="Koho kontaktovat jako první"
              body={selected.career.partnerTargets.join(', ')}
            />
            <PartnerCard
              icon={<MapPin size={22} />}
              kicker="Signál trhu"
              title="Proč stojí za zvážení"
              body={selected.career.localSignal}
            />
            <PartnerCard
              icon={<Student size={22} />}
              kicker="Kvalifikace"
              title="Požadovaná cesta"
              body={selected.career.credential}
            />
            <PartnerCard
              icon={<MapPin size={22} />}
              kicker="Regionální priorita"
              title={selectedRegionLabel}
              body={selectedMarketSignal ? `MPSV ${selectedMarketSignal.period}: ${selectedMarketSignal.regionalOpenVacancies} volných míst v kraji a ${selectedMarketSignal.nationalOpenVacancies} v ČR. Prioritní kraje: ${selected.career.priorityRegions.map(regionLabel).join(', ')}.` : `Pro tento kraj zatím nemáme ověřený signál. Prioritní kraje: ${selected.career.priorityRegions.map(regionLabel).join(', ')}.`}
            />
          </section>
        </main>
      </div>

      <nav className="mobile-nav" aria-label="Mobile navigation">
        <a className="active" href="#dashboard">
          <ChartLineUp size={20} />
          Home
        </a>
        <a href="#matches">
          <Briefcase size={20} />
          Profese
        </a>
        <a href="#comparison">
          <GraduationCap size={20} />
          Srovnat
        </a>
        <a href="#plan">
          <ClipboardText size={20} />
          Plán
        </a>
        <a href="#cases">
          <Student size={20} />
          Žáci
        </a>
        <a href="#coverage">
          <Database size={20} />
          Data
        </a>
      </nav>
    </div>
  )
}

function regionLabel(region: Region) {
  return regionOptions.find((option) => option.value === region)?.label ?? region
}

function PilotAccessGate({
  accessCode,
  accessError,
  onAccessCodeChange,
  onSubmit,
}: {
  accessCode: string
  accessError: string
  onAccessCodeChange: (value: string) => void
  onSubmit: () => void
}) {
  return (
    <main className="access-shell">
      <section className="access-landing" aria-label="Profesní mapa pilot">
        <div className="access-hero">
          <a className="brand-lockup public-brand" href="/" aria-label="Profesní mapa">
            <span className="brand-mark">
              <Compass size={21} weight="duotone" />
            </span>
            <span>
              <strong>Profesní mapa</strong>
              <small>Kariérové poradenství pro školy</small>
            </span>
          </a>
          <p className="eyebrow">Pilot pro ZŠ a SŠ</p>
          <h1>Datově podložené profesní cesty místo náhodných doporučení.</h1>
          <p>
            Webová pracovní plocha pro kariérové poradce. Spojuje profil žáka, regionální poptávku, obory škol a PDF report pro
            rodiče do jednoho opakovatelného workflow.
          </p>
          <div className="access-actions">
            <a className="primary-button" href="/api/reports/sample.pdf" target="_blank" rel="noreferrer">
              <FilePdf size={16} />
              Ukázkový PDF report
            </a>
            <a className="text-button public-cta" href="mailto:janmacher02@gmail.com?subject=Pilot%20Profesni%20mapa">
              Domluvit pilot
              <ArrowSquareOut size={14} />
            </a>
          </div>
          <div className="marketing-proof-grid" aria-label="Pilotní metriky">
            <MetricTile icon={<Briefcase size={18} />} label="Profese" value={`${careers.length}+`} />
            <MetricTile icon={<Database size={18} />} label="Zdroje" value="NSP / MPSV" />
            <MetricTile icon={<FilePdf size={18} />} label="Výstup" value="PDF report" />
            <MetricTile icon={<UsersThree size={18} />} label="Pilot" value="5 škol" />
          </div>
        </div>

        <aside className="access-panel" aria-label="Pilotní přístup">
          <span className="brand-mark access-mark">
            <LockKey size={24} weight="duotone" />
          </span>
          <p className="eyebrow">Vstup pro zapojené školy</p>
          <h2>Pracovní plocha je chráněná pilotním kódem.</h2>
          <p>Nepoužívej reálná citlivá data žáků, dokud nemá škola odsouhlasené interní pravidla práce s daty.</p>
          <form
            className="access-form"
            onSubmit={(event) => {
              event.preventDefault()
              onSubmit()
            }}
          >
            <label className="field">
              <span>Pilotní kód</span>
              <input value={accessCode} onChange={(event) => onAccessCodeChange(event.target.value)} autoFocus />
            </label>
            {accessError ? <strong className="access-error">{accessError}</strong> : null}
            <button className="primary-button wide" type="submit">
              Vstoupit do pilotu
            </button>
          </form>
          <a className="sample-link" href="/api/reports/sample.pdf" target="_blank" rel="noreferrer">
            Otevřít anonymní ukázkový PDF report
            <ArrowSquareOut size={14} />
          </a>
        </aside>

        <section className="pilot-offer-grid" aria-label="Nabídka pro školy">
          <article>
            <CheckCircle size={19} weight="fill" />
            <h3>Pro kariérové poradce</h3>
            <p>Rychlé porovnání profesních cest podle zájmu, mzdy, vzdělání, regionu a rizik.</p>
          </article>
          <article>
            <Buildings size={19} weight="duotone" />
            <h3>Pro vedení školy</h3>
            <p>Pilotní licence za 9 900 Kč ročně, 60 reportů, evaluace po 8 týdnech a jasný výstup pro rodiče.</p>
          </article>
          <article>
            <SealCheck size={19} weight="duotone" />
            <h3>Pro zřizovatele</h3>
            <p>Přehled profesních mezer podle kraje a opora pro spolupráci škol, firem a poradenských služeb.</p>
          </article>
        </section>

        <section className="public-guide" aria-label="Jak pilot probíhá">
          <div>
            <p className="eyebrow">Jak to škola použije</p>
            <h2>Jednoduchý postup pro první pilotní hodinu</h2>
          </div>
          <ol>
            <li>
              <span>01</span>
              <strong>Poradce zadá anonymní profil žáka</strong>
              <small>Bez rodného čísla, adresy nebo citlivých osobních dat.</small>
            </li>
            <li>
              <span>02</span>
              <strong>Aplikace seřadí vhodné profesní cesty</strong>
              <small>Výsledek kombinuje zájem, region, vzdělání, mzdu a dostupná data trhu práce.</small>
            </li>
            <li>
              <span>03</span>
              <strong>Škola uloží případ a stáhne PDF</strong>
              <small>Report je připravený pro schůzku s rodiči nebo pro další práci poradce.</small>
            </li>
          </ol>
        </section>
      </section>
    </main>
  )
}

function PanelTitle({ icon, kicker, title }: { icon: ReactNode; kicker: string; title: string }) {
  return (
    <div className="panel-title">
      <span>{icon}</span>
      <div>
        <p>{kicker}</p>
        <h2>{title}</h2>
      </div>
    </div>
  )
}

function OverviewCard({ icon, label, value, note }: { icon: ReactNode; label: string; value: string; note: string }) {
  return (
    <article className="overview-card">
      <span>{icon}</span>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
        <small>{note}</small>
      </div>
    </article>
  )
}

function SourceHealthItem({ label, value, note, href }: { label: string; value: string; note: string; href: string }) {
  return (
    <a className="source-health-item" href={href} target="_blank" rel="noreferrer">
      <span>
        <strong>{label}</strong>
        <small>{note}</small>
      </span>
      <em>{value}</em>
    </a>
  )
}

function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: Option<T>[]
  onChange: (value: T) => void
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value as T)}>
        {options.map((option) => (
          <option value={option.value} key={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}

function CareerRow({
  match,
  region,
  selected,
  onSelect,
}: {
  match: CareerMatch
  region: Region
  selected: boolean
  onSelect: () => void
}) {
  const marketSignal = getMarketSignal(match.career.czIscoCode, region)

  return (
    <button className={`career-row ${selected ? 'active' : ''}`} type="button" onClick={onSelect}>
      <div className="career-copy">
        <div>
          <h3>{match.career.title}</h3>
          <span className="source-chip">CZ-ISCO {match.career.czIscoCode}</span>
        </div>
        <p>{match.career.sector}</p>
        <div className="career-facts">
          <span>
            <CurrencyDollar size={16} />
            {formatCurrency(match.career.monthlyPay)}
          </span>
          <span>
            <Clock size={16} />
            {formatMonths(match.career.trainingMonths)}
          </span>
          <span>
            <Wrench size={16} />
            {marketSignal ? `${marketSignal.nationalOpenVacancies} VPM ČR` : `Signál ${match.career.demandScore}/100`}
          </span>
        </div>
      </div>
      <div className="fit-column">
        <small>Fit score</small>
        <div className="mini-bar">
          <span style={{ width: `${match.score}%` }} />
        </div>
        <strong>{match.score}%</strong>
      </div>
    </button>
  )
}

function FitRing({ score }: { score: number }) {
  const circumference = 2 * Math.PI * 42
  const offset = circumference - (score / 100) * circumference

  return (
    <div className="fit-ring" aria-label={`Fit score ${score}%`}>
      <svg viewBox="0 0 96 96" aria-hidden="true">
        <circle cx="48" cy="48" r="42" />
        <circle cx="48" cy="48" r="42" strokeDasharray={circumference} strokeDashoffset={offset} />
      </svg>
      <div>
        <strong>{score}</strong>
        <span>Fit</span>
      </div>
    </div>
  )
}

function MetricTile({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <article className="metric-tile">
      <span>{icon}</span>
      <small>{label}</small>
      <strong>{value}</strong>
    </article>
  )
}

function TimelineItem({ title, note, active = false }: { title: string; note: string; active?: boolean }) {
  return (
    <div className={`timeline-item ${active ? 'active' : ''}`}>
      <span />
      <div>
        <strong>{title}</strong>
        <small>{note}</small>
      </div>
    </div>
  )
}

function PartnerCard({ icon, kicker, title, body }: { icon: ReactNode; kicker: string; title: string; body: string }) {
  return (
    <article className="partner-card">
      <span>{icon}</span>
      <div>
        <p>{kicker}</p>
        <h3>{title}</h3>
        <span>{body}</span>
      </div>
      <ArrowRight size={18} />
    </article>
  )
}

function buildPlanText({
  profile,
  selected,
  topThree,
  selectedRegionLabel,
  selectedMarketSignal,
  selectedSchoolPrograms,
}: {
  profile: StudentProfile
  selected: CareerMatch
  topThree: CareerMatch[]
  selectedRegionLabel: string
  selectedMarketSignal: ReturnType<typeof getMarketSignal>
  selectedSchoolPrograms: ReturnType<typeof getSchoolPrograms>
}) {
  const lines = [
    `Profesní plán pro: ${profile.studentName || 'žák'}`,
    `Region: ${selectedRegionLabel}`,
    `Doporučená cesta: ${selected.career.title}`,
    `Shoda: ${selected.score}%`,
    `CZ-ISCO: ${selected.career.czIscoCode}`,
    `Obor: ${selected.career.educationProgram.code} ${selected.career.educationProgram.name}`,
    `Medián mzdy: ${formatCurrency(selected.career.monthlyPay)} měsíčně`,
    `Délka cesty: ${formatMonths(selected.career.trainingMonths)}`,
    selectedMarketSignal
      ? `Volná místa MPSV (${selectedMarketSignal.period}): ${selectedMarketSignal.regionalOpenVacancies} v kraji, ${selectedMarketSignal.nationalOpenVacancies} v ČR`
      : 'Volná místa MPSV: není dostupné',
    '',
    'Proč tato cesta:',
    ...selected.reasons.map((reason) => `- ${reason}`),
    '',
    'Rizika / ověřit:',
    ...[...selected.flags, ...selected.career.risks].slice(0, 4).map((risk) => `- ${risk}`),
    '',
    '90denní plán:',
    ...selected.career.nextSteps.map((step, index) => `${index + 1}. ${step}`),
    '',
    'Školy / obory k ověření:',
    ...selectedSchoolPrograms.map((program) => `- ${program.schoolName}, ${program.city}: ${program.programCode} ${program.programName} (${program.sourceUrl})`),
    '',
    'Top 3 srovnání:',
    ...topThree.map((match, index) => `${index + 1}. ${match.career.title}: ${match.score}%, ${formatCurrency(match.career.monthlyPay)}/měs.`),
  ]

  return lines.join('\n')
}

function buildReportPayload({
  profile,
  license,
  selected,
  topThree,
  selectedRegionLabel,
  selectedMarketSignal,
  selectedSchoolPrograms,
}: {
  profile: StudentProfile
  license: SchoolLicense
  selected: CareerMatch
  topThree: CareerMatch[]
  selectedRegionLabel: string
  selectedMarketSignal: ReturnType<typeof getMarketSignal>
  selectedSchoolPrograms: ReturnType<typeof getSchoolPrograms>
}): ReportPayload {
  return {
    profile: {
      studentName: profile.studentName,
    },
    license,
    selected,
    topThree,
    selectedRegionLabel,
    selectedMarketSignal,
    selectedSchoolPrograms,
    mpsvSourceUrl: mpsvMarketSource.sourceUrl,
    generatedAt: new Date().toISOString(),
  }
}

function escapeHtml(value: string | number | null | undefined) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function buildReportHtml({
  profile,
  license,
  selected,
  topThree,
  selectedRegionLabel,
  selectedMarketSignal,
  selectedSchoolPrograms,
}: {
  profile: StudentProfile
  license: SchoolLicense
  selected: CareerMatch
  topThree: CareerMatch[]
  selectedRegionLabel: string
  selectedMarketSignal: ReturnType<typeof getMarketSignal>
  selectedSchoolPrograms: ReturnType<typeof getSchoolPrograms>
}) {
  const risks = [...selected.flags, ...selected.career.risks].slice(0, 4)
  const today = new Intl.DateTimeFormat('cs-CZ', { dateStyle: 'medium' }).format(new Date())

  return `<!doctype html>
<html lang="cs">
<head>
  <meta charset="utf-8" />
  <title>Profesní report - ${escapeHtml(profile.studentName || 'žák')}</title>
  <style>
    @page { size: A4; margin: 14mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      color: #14211e;
      background: #ffffff;
      font-family: Inter, Arial, sans-serif;
      font-size: 12px;
      line-height: 1.45;
    }
    .report {
      display: grid;
      gap: 14px;
    }
    header {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 18px;
      align-items: start;
      border-bottom: 2px solid #00685f;
      padding-bottom: 12px;
    }
    .brand {
      color: #00685f;
      font-weight: 900;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }
    h1, h2, h3, p { margin: 0; }
    h1 {
      margin-top: 8px;
      font-size: 26px;
      line-height: 1.1;
    }
    h2 {
      font-size: 17px;
      margin-bottom: 8px;
    }
    h3 {
      font-size: 13px;
      margin-bottom: 5px;
    }
    .muted { color: #65726f; }
    .license-box {
      min-width: 215px;
      border: 1px solid #c8d7d2;
      border-radius: 8px;
      padding: 10px;
      text-align: right;
    }
    .pill {
      display: inline-block;
      border: 1px solid #b8d8d2;
      border-radius: 999px;
      color: #00685f;
      background: #e8f5f1;
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.06em;
      padding: 4px 7px;
      text-transform: uppercase;
    }
    .grid-4, .grid-3, .grid-2 {
      display: grid;
      gap: 9px;
    }
    .grid-4 { grid-template-columns: repeat(4, 1fr); }
    .grid-3 { grid-template-columns: repeat(3, 1fr); }
    .grid-2 { grid-template-columns: repeat(2, 1fr); }
    .card {
      border: 1px solid #d8e2df;
      border-radius: 8px;
      padding: 11px;
      break-inside: avoid;
    }
    .wash { background: #f5faf8; }
    .metric small, .source-row small {
      display: block;
      color: #65726f;
      font-size: 9px;
      font-weight: 800;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }
    .metric strong {
      display: block;
      margin-top: 4px;
      font-size: 18px;
    }
    ul, ol {
      margin: 8px 0 0;
      padding-left: 18px;
    }
    li { margin: 4px 0; }
    table {
      width: 100%;
      border-collapse: collapse;
      overflow: hidden;
      border: 1px solid #d8e2df;
      border-radius: 8px;
      font-size: 11px;
    }
    th, td {
      border-bottom: 1px solid #d8e2df;
      padding: 8px;
      text-align: left;
      vertical-align: top;
    }
    th {
      background: #f0f6f3;
      color: #40514d;
      font-size: 9px;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }
    tr:last-child td { border-bottom: 0; }
    .source-row {
      display: grid;
      grid-template-columns: 130px 1fr;
      gap: 10px;
      border-top: 1px solid #d8e2df;
      padding-top: 8px;
      margin-top: 8px;
    }
    .footer {
      border-top: 1px solid #d8e2df;
      color: #65726f;
      font-size: 10px;
      padding-top: 10px;
    }
    @media print {
      .no-print { display: none; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
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
      <div class="card">
        <h2>Proč tato cesta sedí</h2>
        <ul>${selected.reasons.map((reason) => `<li>${escapeHtml(reason)}</li>`).join('')}</ul>
      </div>
      <div class="card">
        <h2>Rizika a ověření</h2>
        <ul>${risks.map((risk) => `<li>${escapeHtml(risk)}</li>`).join('')}</ul>
      </div>
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
      <div class="card">
        <h2>90denní plán</h2>
        <ol>${selected.career.nextSteps.map((step) => `<li>${escapeHtml(step)}</li>`).join('')}</ol>
      </div>
      <div class="card">
        <h2>Školy a obory k ověření</h2>
        <ul>
          ${selectedSchoolPrograms
            .map((program) => `<li><strong>${escapeHtml(program.schoolName)}</strong>, ${escapeHtml(program.city)}<br><span class="muted">${escapeHtml(program.programCode)} ${escapeHtml(program.programName)}</span></li>`)
            .join('')}
        </ul>
      </div>
    </section>

    <section class="card wash">
      <h2>Zdroje a jistota dat</h2>
      <p>Report odděluje ověřené veřejné zdroje od interních seed odhadů. MPSV VPM je oficiální otevřený datový zdroj agregovaný podle CZ-ISCO a kraje; mzdy a některé regionální priority mohou být u části profesí orientační.</p>
      <div class="source-row"><small>Infoabsolvent</small><strong>${escapeHtml(selected.career.educationProgram.infoAbsolventUrl)}</strong></div>
      <div class="source-row"><small>NSP</small><strong>${escapeHtml(selected.career.nspUrl)}</strong></div>
      <div class="source-row"><small>MPSV</small><strong>${escapeHtml(mpsvMarketSource.sourceUrl)}</strong></div>
    </section>

    <p class="footer">Profesní mapa / školní licence. Tento report je poradenský podklad, ne závazné rozhodnutí o přijetí, zdravotní způsobilosti ani pracovním uplatnění.</p>
  </main>
</body>
</html>`
}

export default App
