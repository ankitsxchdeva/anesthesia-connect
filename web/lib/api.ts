// Typed client for the api service. Contract file — do not edit.
// Token storage lives here; lib/auth.tsx re-exports the helpers.

import type {
  Application,
  ApplicationStatus,
  Calculator,
  CalendarEvent,
  Card,
  Comment,
  Deck,
  EventCategory,
  Group,
  GroupMember,
  Message,
  Post,
  Program,
  Quiz,
  QuizAttempt,
  QuizDetail,
  Resource,
  Role,
  User,
} from './types'

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? ''
const TOKEN_KEY = 'ac_token'

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
  }
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return window.localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string) {
  window.localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken() {
  window.localStorage.removeItem(TOKEN_KEY)
}

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  const token = getToken()
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE}/api${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  if (res.status === 204) return undefined as T
  const data = (await res.json().catch(() => ({}))) as { error?: string } & T
  if (!res.ok) throw new ApiError(res.status, data.error ?? `Request failed (${res.status})`)
  return data
}

function qs(params: Record<string, string | undefined>): string {
  const search = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) if (v) search.set(k, v)
  const s = search.toString()
  return s ? `?${s}` : ''
}

// --- auth ---
export const signup = (body: { email: string; password: string; display_name: string; role: Role }) =>
  call<{ token: string; user: User }>('POST', '/auth/signup', body)
export const login = (body: { email: string; password: string }) =>
  call<{ token: string; user: User }>('POST', '/auth/login', body)
export const me = () => call<User>('GET', '/auth/me')

// --- resources ---
export const listResources = (params?: { q?: string; category?: string; source?: string }) =>
  call<Resource[]>('GET', `/resources${qs(params ?? {})}`)
export const getResource = (id: string) => call<Resource>('GET', `/resources/${id}`)
export const listRecentResources = () => call<Resource[]>('GET', '/resources/recent')
export const listBookmarkedResources = () => call<Resource[]>('GET', '/resources/bookmarks/list')
export const bookmarkResource = (id: string) => call<void>('POST', `/resources/${id}/bookmark`)
export const unbookmarkResource = (id: string) => call<void>('DELETE', `/resources/${id}/bookmark`)

// --- programs & application tracker ---
export const listPrograms = (params?: { q?: string; state?: string }) =>
  call<Program[]>('GET', `/programs${qs(params ?? {})}`)
export const getProgram = (id: string) => call<Program>('GET', `/programs/${id}`)
export const listApplications = () => call<Application[]>('GET', '/applications')
export const createApplication = (body: {
  program_id: string
  status?: ApplicationStatus
  deadline?: string | null
  notes?: string | null
}) => call<Application>('POST', '/applications', body)
export const updateApplication = (
  id: string,
  patch: { status?: ApplicationStatus; deadline?: string | null; notes?: string | null },
) => call<Application>('PATCH', `/applications/${id}`, patch)
export const deleteApplication = (id: string) => call<void>('DELETE', `/applications/${id}`)

// --- discussion board ---
export const listPosts = (params?: { category?: string; q?: string }) =>
  call<Post[]>('GET', `/posts${qs(params ?? {})}`)
export const getPost = (id: string) => call<{ post: Post; comments: Comment[] }>('GET', `/posts/${id}`)
export const createPost = (body: { category: string; title: string; body: string; is_anonymous?: boolean }) =>
  call<Post>('POST', '/posts', body)
export const createComment = (postId: string, body: { body: string; parent_id?: string }) =>
  call<Comment>('POST', `/posts/${postId}/comments`, body)
export const markHelpful = (commentId: string) =>
  call<{ helpful_count: number }>('POST', `/posts/comments/${commentId}/helpful`)

// --- groups & chat ---
export const listGroups = () => call<Group[]>('GET', '/groups')
export const createGroup = (body: { name: string; description?: string; kind: Group['kind']; category?: string }) =>
  call<Group>('POST', '/groups', body)
export const getGroup = (id: string) => call<{ group: Group; members: GroupMember[] }>('GET', `/groups/${id}`)
export const joinGroup = (id: string) => call<void>('POST', `/groups/${id}/join`)
export const leaveGroup = (id: string) => call<void>('POST', `/groups/${id}/leave`)
export const listMessages = (groupId: string, after?: string) =>
  call<Message[]>('GET', `/groups/${groupId}/messages${qs({ after })}`)
export const sendMessage = (groupId: string, body: string) =>
  call<Message>('POST', `/groups/${groupId}/messages`, { body })
export const pinMessage = (messageId: string, pinned: boolean) =>
  call<void>('POST', `/groups/messages/${messageId}/pin`, { pinned })

// --- calendar ---
export const listEvents = (params?: { from?: string; to?: string }) =>
  call<CalendarEvent[]>('GET', `/events${qs(params ?? {})}`)
export const createEvent = (body: {
  title: string
  category: EventCategory
  starts_at: string
  ends_at?: string | null
  all_day?: boolean
  recurrence?: string | null
  notes?: string | null
  group_id?: string | null
}) => call<CalendarEvent>('POST', '/events', body)
export const updateEvent = (
  id: string,
  patch: Partial<{
    title: string
    category: EventCategory
    starts_at: string
    ends_at: string | null
    all_day: boolean
    recurrence: string | null
    notes: string | null
  }>,
) => call<CalendarEvent>('PATCH', `/events/${id}`, patch)
export const deleteEvent = (id: string) => call<void>('DELETE', `/events/${id}`)

// --- study ---
export const listDecks = () => call<Deck[]>('GET', '/decks')
export const getDeck = (id: string) => call<{ deck: Deck; cards: Card[] }>('GET', `/decks/${id}`)
export const saveDeck = (id: string) => call<void>('POST', `/decks/${id}/save`)
export const unsaveDeck = (id: string) => call<void>('DELETE', `/decks/${id}/save`)
export const listQuizzes = () => call<Quiz[]>('GET', '/quizzes')
export const getQuiz = (id: string) => call<QuizDetail>('GET', `/quizzes/${id}`)
export const submitQuizAttempt = (quizId: string, body: { score: number; total: number }) =>
  call<QuizAttempt>('POST', `/quizzes/${quizId}/attempts`, body)
export const listMyAttempts = () => call<QuizAttempt[]>('GET', '/quizzes/attempts/mine')

// --- calculators ---
export const listCalculators = () => call<Calculator[]>('GET', '/calculators')
export const getCalculator = (slug: string) => call<Calculator>('GET', `/calculators/${slug}`)
