import type { Career, Region } from './data.js'

export type SchoolProgram = {
  careerId: string
  region: Region
  schoolName: string
  city: string
  programCode: string
  programName: string
  educationCategory: string
  sourceUrl: string
  sourceLabel: string
  verification: 'listed' | 'program-page'
}

export const schoolProgramSource = {
  label: 'Infoabsolvent: školy a obory vzdělání',
  url: 'https://www.infoabsolvent.cz/',
}

export const schoolPrograms: SchoolProgram[] = [
  {
    careerId: 'elektromechanik',
    region: 'praha',
    schoolName: 'Střední průmyslová škola dopravní, a.s.',
    city: 'Praha 5',
    programCode: '26-52-H/01',
    programName: 'Elektromechanik pro zařízení a přístroje',
    educationCategory: 'Střední vzdělání s výučním listem',
    sourceUrl: 'https://infoabsolvent.cz/Skoly/Skola/600005658/Stredni-prumyslova-skola-dopravni-a-s-/SOS?kodOboru=2652H01',
    sourceLabel: schoolProgramSource.label,
    verification: 'listed',
  },
  {
    careerId: 'elektromechanik',
    region: 'praha',
    schoolName: 'Střední škola elektrotechniky a strojírenství',
    city: 'Praha 10',
    programCode: '26-52-H/01',
    programName: 'Elektromechanik pro zařízení a přístroje',
    educationCategory: 'Střední vzdělání s výučním listem',
    sourceUrl: 'https://www.infoabsolvent.cz/Obory/KartaOboru/2652H01/Elektromechanik-pro-zarizeni-a-pristroje',
    sourceLabel: schoolProgramSource.label,
    verification: 'listed',
  },
  {
    careerId: 'automechanik',
    region: 'praha',
    schoolName: 'Střední průmyslová škola dopravní, a.s.',
    city: 'Praha 5',
    programCode: '23-68-H/01',
    programName: 'Mechanik opravář motorových vozidel',
    educationCategory: 'Střední vzdělání s výučním listem',
    sourceUrl: 'https://www.infoabsolvent.cz/Obory/KartaOboru/2368H01/Mechanik-opravar-motorovych-vozidel',
    sourceLabel: schoolProgramSource.label,
    verification: 'listed',
  },
  {
    careerId: 'automechanik',
    region: 'stredocesky',
    schoolName: 'Integrovaná střední škola technická',
    city: 'Mělník',
    programCode: '23-68-H/01',
    programName: 'Mechanik opravář motorových vozidel',
    educationCategory: 'Střední vzdělání s výučním listem',
    sourceUrl: 'https://www.infoabsolvent.cz/Obory/KartaOboru/2368H01/Mechanik-opravar-motorovych-vozidel',
    sourceLabel: schoolProgramSource.label,
    verification: 'listed',
  },
  {
    careerId: 'prakticka-sestra',
    region: 'praha',
    schoolName: 'Střední zdravotnická škola, Ruská',
    city: 'Praha 10',
    programCode: '53-41-M/03',
    programName: 'Praktická sestra',
    educationCategory: 'Střední vzdělání s maturitní zkouškou',
    sourceUrl: 'https://www.infoabsolvent.cz/Obory/KartaOboru/5341M03/Prakticka-sestra',
    sourceLabel: schoolProgramSource.label,
    verification: 'listed',
  },
  {
    careerId: 'prakticka-sestra',
    region: 'praha',
    schoolName: 'Vyšší odborná škola zdravotnická a Střední zdravotnická škola',
    city: 'Praha 4',
    programCode: '53-41-M/03',
    programName: 'Praktická sestra',
    educationCategory: 'Střední vzdělání s maturitní zkouškou',
    sourceUrl: 'https://www.infoabsolvent.cz/Obory/KartaOboru/5341M03/Prakticka-sestra',
    sourceLabel: schoolProgramSource.label,
    verification: 'listed',
  },
  {
    careerId: 'technik-pc',
    region: 'praha',
    schoolName: 'Střední průmyslová škola elektrotechnická',
    city: 'Praha',
    programCode: '18-20-M/01',
    programName: 'Informační technologie',
    educationCategory: 'Střední vzdělání s maturitní zkouškou',
    sourceUrl: 'https://www.infoabsolvent.cz/Obory/KartaOboru/1820M01/Informacni-technologie',
    sourceLabel: schoolProgramSource.label,
    verification: 'listed',
  },
  {
    careerId: 'instalater',
    region: 'praha',
    schoolName: 'Ověřit školy na stránce oboru',
    city: 'Praha',
    programCode: '36-52-H/01',
    programName: 'Instalatér',
    educationCategory: 'Střední vzdělání s výučním listem',
    sourceUrl: 'https://www.infoabsolvent.cz/Obory/KartaOboru/3652H01/Instalater',
    sourceLabel: schoolProgramSource.label,
    verification: 'program-page',
  },
]

export function getSchoolPrograms(career: Career, region: Region) {
  const listedPrograms = schoolPrograms.filter((program) => program.careerId === career.id && program.region === region)

  if (listedPrograms.length > 0) {
    return listedPrograms
  }

  return [
    {
      careerId: career.id,
      region,
      schoolName: 'Ověřit školy na stránce oboru',
      city: 'Zvolený kraj',
      programCode: career.educationProgram.code,
      programName: career.educationProgram.name,
      educationCategory: career.educationProgram.category === 'H' ? 'Střední vzdělání s výučním listem' : 'Střední vzdělání s maturitní zkouškou',
      sourceUrl: career.educationProgram.infoAbsolventUrl,
      sourceLabel: schoolProgramSource.label,
      verification: 'program-page' as const,
    },
  ]
}
