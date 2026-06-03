const DEFAULT_TIMEOUT_MS = 3500

export function withSupabaseTimeout<T>(query: PromiseLike<T>, ms = DEFAULT_TIMEOUT_MS): Promise<T> {
  return Promise.race([
    Promise.resolve(query),
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error('Supabase timeout')), ms)
    }),
  ])
}
