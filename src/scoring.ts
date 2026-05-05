import type { Budget, Career, StudentProfile, TrainingWindow } from './data.js'
import { getMarketSignal } from './marketSignals.js'

export type CareerMatch = {
  career: Career
  score: number
  reasons: string[]
  flags: string[]
}

const trainingTargets: Record<TrainingWindow, number> = {
  fast: 6,
  moderate: 14,
  patient: 30,
}

const budgetCeilings: Record<Budget, number> = {
  low: 6500,
  medium: 12000,
  high: 22000,
}

function closeness(value: number, target: number, spread: number) {
  return Math.max(0, 1 - Math.abs(value - target) / spread)
}

function normalizePay(pay: number, goal: number) {
  if (pay >= goal) return 1
  return Math.max(0, pay / goal)
}

export function scoreCareers(profile: StudentProfile, careerList: Career[]): CareerMatch[] {
  return careerList
    .map((career) => {
      const reasons: string[] = []
      const flags: string[] = []
      let score = 0

      if (career.interest === profile.interest) {
        score += 18
        reasons.push('Odpovídá hlavnímu zájmu žáka')
      }

      if (career.environment === profile.environment || profile.environment === 'mixed' || career.environment === 'mixed') {
        score += 10
        reasons.push('Pracovní prostředí je kompatibilní')
      }

      if (career.physicalLoad === profile.physicalPreference) {
        score += 9
        reasons.push('Fyzická zátěž odpovídá preferenci')
      } else if (profile.physicalPreference === 'medium') {
        score += 4
      } else {
        flags.push('Fyzickou náročnost je potřeba probrat přímo se žákem')
      }

      if (career.mathLevel === profile.mathComfort) {
        score += 8
        reasons.push('Matematika a technická náročnost vypadají přiměřeně')
      } else if (profile.mathComfort === 'medium') {
        score += 4
      } else if (career.mathLevel === 'high' && profile.mathComfort === 'low') {
        flags.push('Bude potřeba podpora v matematice nebo technickém kreslení')
      }

      if (career.peopleMode === profile.peopleMode || profile.peopleMode === 'balanced' || career.peopleMode === 'balanced') {
        score += 7
      } else {
        flags.push('Denní styl komunikace nemusí sedět')
      }

      const payScore = normalizePay(career.monthlyPay, profile.salaryGoal)
      score += payScore * 14
      if (payScore >= 1) reasons.push('Splňuje cílovou hrubou měsíční mzdu')

      const trainingScore = closeness(career.trainingMonths, trainingTargets[profile.trainingWindow], 24)
      score += trainingScore * 12
      if (career.firstPaidWorkMonths <= trainingTargets[profile.trainingWindow]) {
        reasons.push('Do práce se dá nastoupit v preferovaném horizontu')
      }

      const budgetScore = career.estimatedCost <= budgetCeilings[profile.budget] ? 1 : budgetCeilings[profile.budget] / career.estimatedCost
      score += budgetScore * 10
      if (budgetScore < 0.85) flags.push('Náklady na cestu jsou nad zvoleným rozpočtem')

      score += (career.demandScore / 100) * 9

      const marketSignal = getMarketSignal(career.czIscoCode, profile.region)
      if (marketSignal) {
        score += (marketSignal.regionalScore / 100) * 10
        if (marketSignal.regionalOpenVacancies >= 100) {
          reasons.push('MPSV eviduje ve zvoleném kraji vyšší počet volných míst')
        } else if (marketSignal.regionalOpenVacancies > 0) {
          reasons.push('MPSV eviduje ve zvoleném kraji volná místa pro tuto profesi')
        } else {
          flags.push('MPSV pro zvolený kraj neukazuje aktuální volná místa v této skupině')
        }
      } else if (career.priorityRegions.includes(profile.region)) {
        score += 4
        reasons.push('Kraj patří mezi prioritní regiony pro tuto cestu')
      } else {
        flags.push('Regionální dostupnost škol a praxe je potřeba ručně ověřit')
      }

      if (career.apprenticeshipFriendly) {
        score += 3
        reasons.push('Má realistickou cestu přes školní praxi nebo firmu')
      }

      return {
        career,
        score: Math.round(Math.min(100, score)),
        reasons: reasons.slice(0, 4),
        flags: flags.slice(0, 3),
      }
    })
    .sort((a, b) => b.score - a.score)
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('cs-CZ', {
    style: 'currency',
    currency: 'CZK',
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatMonths(value: number) {
  if (value < 12) return `${value} měs.`
  const years = value / 12
  return Number.isInteger(years) ? `${years} roky` : `${years.toFixed(1).replace('.', ',')} roku`
}
