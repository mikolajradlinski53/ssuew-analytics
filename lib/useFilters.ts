'use client'
import { useCallback, useMemo } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { parseFilters, buildFilterQuery, type Filters } from '@/lib/filters'

export function useFilters() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // searchParams (ReadonlyURLSearchParams) rozszerza URLSearchParams — parseFilters tylko czyta.
  const filters = useMemo(() => parseFilters(searchParams), [searchParams])

  const setFilters = useCallback(
    (next: Filters) => {
      router.replace(`${pathname}${buildFilterQuery(next)}`, { scroll: false })
    },
    [router, pathname],
  )

  return { filters, setFilters }
}
