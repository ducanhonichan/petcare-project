const configuredBase = import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/+$/, '')

export const API_BASE = configuredBase || (import.meta.env.DEV ? 'http://localhost:3000/api' : '/api')
