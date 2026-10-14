// API response shapes. Mirror of SPEC.md — do not edit (contract file).

export type Role = 'prospective' | 'srna' | 'crna'

export interface User {
  id: string
  email: string
  display_name: string
  role: Role
  school: string | null
  grad_year: number | null
  bio: string | null
  created_at: string
}

export interface Program {
  id: string
  name: string
  city: string | null
  state: string | null
  degree: string | null
  length_months: number | null
  deadline: string | null
  tuition: string | null
  website: string | null
  source_url: string | null
  notes: string | null
}

export type ApplicationStatus =
  | 'researching'
  | 'preparing'
  | 'submitted'
  | 'interview'
  | 'accepted'
  | 'rejected'
  | 'waitlisted'

export interface Application {
  id: string
  program_id: string
  status: ApplicationStatus
  deadline: string | null
  notes: string | null
  updated_at: string
  program: Program
}

export interface Resource {
  id: string
  title: string
  url: string
  source: string
  category: string
  description: string | null
  revision_date: string | null
  bookmarked?: boolean
}

export interface Post {
  id: string
  category: string
  title: string
  body: string
  is_anonymous: boolean
  author: string
  user_id: string | null
  created_at: string
  comment_count?: number
}

export interface Comment {
  id: string
  post_id: string
  parent_id: string | null
  author: string
  body: string
  helpful_count: number
  created_at: string
  voted?: boolean
}

export interface Group {
  id: string
  name: string
  description: string | null
  kind: 'public' | 'private' | 'invite'
  category: string | null
  member_count?: number
  is_member?: boolean
}

export interface GroupMember {
  user_id: string
  display_name: string
  role: string
}

export interface Message {
  id: string
  group_id: string
  author: string
  body: string
  pinned: boolean
  created_at: string
}

export type EventCategory =
  | 'shift'
  | 'class'
  | 'clinical'
  | 'exam'
  | 'shadowing'
  | 'interview'
  | 'deadline'
  | 'study'
  | 'other'

export interface CalendarEvent {
  id: string
  title: string
  category: EventCategory
  starts_at: string
  ends_at: string | null
  all_day: boolean
  recurrence: string | null
  notes: string | null
  group_id: string | null
}

export interface Deck {
  id: string
  title: string
  description: string | null
  author: string
  card_count?: number
  saved?: boolean
}

export interface Card {
  id: string
  deck_id: string
  front: string
  back: string
  position: number
}

export interface Quiz {
  id: string
  title: string
  description: string | null
  question_count?: number
}

export interface QuizQuestion {
  id: string
  prompt: string
  options: string[]
  correct_index: number
  explanation: string | null
  position: number
}

export interface QuizDetail extends Quiz {
  questions: QuizQuestion[]
}

export interface QuizAttempt {
  id: string
  quiz_id: string
  score: number
  total: number
  created_at: string
}

export interface Calculator {
  id: string
  slug: string
  name: string
  description: string | null
  formula: string
  source: string | null
  version: string
  reviewed_by: string | null
  review_date: string | null
}

export const POST_CATEGORIES = ['admissions', 'study', 'practice', 'networking'] as const
export const EVENT_CATEGORIES: EventCategory[] = [
  'shift',
  'class',
  'clinical',
  'exam',
  'shadowing',
  'interview',
  'deadline',
  'study',
  'other',
]

export const ROLE_LABELS: Record<Role, string> = {
  prospective: 'Prospective SRNA',
  srna: 'Current SRNA',
  crna: 'CRNA',
}
