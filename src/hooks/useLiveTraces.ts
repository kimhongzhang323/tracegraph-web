import { useEffect, useRef, useState } from 'react'
import { api } from '@/lib/api.js'
import { sseManager } from '@/lib/sse.js'
import type { TraceSummary } from '@/types'
import { MOCK_TRACE_LIST } from '@/data/mock'

function toSummaries(data: unknown): TraceSummary[] {
  const ids: string[] = Array.isArray(data) ? data : ((data as { items?: string[] }).items ?? [])
  return ids.map((id) => ({ id, graph: 'graph', status: 'COMPLETED' }))
}

export function useLiveTraces(): TraceSummary[] {
  const [list, setList] = useState<TraceSummary[]>(MOCK_TRACE_LIST)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let cancelled = false

    function fetchList() {
      api.traces
        .list(20)
        .then((data) => {
          if (cancelled) return
          const summaries = toSummaries(data)
          if (summaries.length > 0) setList(summaries)
        })
        .catch(() => {
          // backend not available — keep current data
        })
    }

    function fetchListDebounced() {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = setTimeout(() => {
        fetchList()
      }, 500)
    }

    fetchList()

    const unsubscribe = sseManager.subscribe((e) => {
      if (e.type === 'Complete') {
        fetchListDebounced()
      }
    })

    return () => {
      cancelled = true
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
      unsubscribe()
    }
  }, [])

  return list
}
