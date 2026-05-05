export const caseStatuses = ['intake', 'report-ready', 'parent-meeting', 'closed'] as const

export type CaseStatus = (typeof caseStatuses)[number]

export const caseStatusLabels: Record<CaseStatus, string> = {
  intake: 'Rozpracováno',
  'report-ready': 'Report hotov',
  'parent-meeting': 'Schůzka s rodiči',
  closed: 'Uzavřeno',
}

export type StudentCase = {
  id: string
  schoolId: string
  schoolName: string
  studentName: string
  region: string
  regionLabel: string
  selectedCareerId: string
  selectedCareerTitle: string
  fitScore: number
  topCareerIds: string[]
  status: CaseStatus
  notes?: string
  createdAt: string
  updatedAt: string
}

export type StudentCaseInput = Omit<StudentCase, 'id' | 'createdAt' | 'updatedAt'>
