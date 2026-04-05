// ─── JWT Payload ──────────────────────────────────────────────────────────────

export type Role = 'admin' | 'reseller' | 'user'

export interface JwtPayload {
  sub: number
  role: Role
  username: string
  iat?: number
  exp?: number
}

// ─── @fastify/jwt type augmentation ───────────────────────────────────────────

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: JwtPayload
    user: JwtPayload
  }
}

// ─── API Response helpers ─────────────────────────────────────────────────────

export interface ApiSuccess<T = unknown> {
  success: true
  data: T
}

export interface ApiError {
  success: false
  error: string
  code?: string
}

export type ApiResponse<T = unknown> = ApiSuccess<T> | ApiError

// ─── Pagination ───────────────────────────────────────────────────────────────

export interface PaginationQuery {
  page?: number
  limit?: number
  search?: string
  status?: string
  sortBy?: string
  sortDir?: 'asc' | 'desc'
}

export interface PaginatedResult<T> {
  items: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

// ─── System ───────────────────────────────────────────────────────────────────

export interface SystemStats {
  cpu: number
  memory: { total: number; used: number; free: number; percent: number }
  disk: { total: number; used: number; free: number; percent: number }
  load: [number, number, number]
  uptime: number
}

export interface ServiceStatus {
  name: string
  status: 'running' | 'stopped' | 'failed' | 'unknown'
  enabled: boolean
}
