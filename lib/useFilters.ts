'use client'
import { useCallback, useMemo } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { parseFilters, buildFilterQuery, type Filters } from '@/lib/filters'

export function useFilters() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const filters = useMemo(
    () => parseFilters(new URLSearchParams(searchParams.toString())),
    [searchParams],
  )

  const setFilters = useCallback(
    (next: Filters) => {
      router.replace(`${pathname}${buildFilterQuery(next)}`, { scroll: false })
    },
    [router, pathname],
  )

  return { filters, setFilters }
}
