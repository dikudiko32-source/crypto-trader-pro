'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

/**
 * Custom hook for safe async data fetching in useEffect.
 * Automatically handles:
 * - AbortController (cancels fetch when component unmounts)
 * - Silent error handling (ignores "Failed to fetch" / abort errors)
 * - isMounted flag (prevents setState after unmount)
 * 
 * Usage:
 * const { data, loading, error, refetch } = useSafeAsync(async (signal) => {
 *   const res = await fetch('/api/data', { signal })
 *   return res.json()
 * }, [])
 */
export function useSafeAsync<T>(
  asyncFn: (signal: AbortSignal) => Promise<T>,
  deps: React.DependencyList = [],
  options: { refetchInterval?: number } = {}
) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const isMountedRef = useRef(true)
  const abortControllerRef = useRef<AbortController | null>(null)

  const execute = useCallback(async () => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    
    const controller = new AbortController()
    abortControllerRef.current = controller
    
    if (isMountedRef.current) setLoading(true)
    
    try {
      const result = await asyncFn(controller.signal)
      if (isMountedRef.current && !controller.signal.aborted) {
        setData(result)
        setError(null)
      }
    } catch (err) {
      // Silent ignore abort errors and network errors when switching tabs
      if (isMountedRef.current && !controller.signal.aborted) {
        const errMsg = err instanceof Error ? err.message : 'Unknown error'
        // Don't show error for aborted requests or network failures during tab switch
        if (!errMsg.includes('Failed to fetch') && 
            !errMsg.includes('aborted') && 
            !errMsg.includes('The user aborted a request')) {
          setError(errMsg)
        }
      }
    } finally {
      if (isMountedRef.current && !controller.signal.aborted) {
        setLoading(false)
      }
    }
  }, deps)

  useEffect(() => {
    isMountedRef.current = true
    
    execute()
    
    // Set up refetch interval if specified
    let intervalId: ReturnType<typeof setInterval> | null = null
    if (options.refetchInterval) {
      intervalId = setInterval(execute, options.refetchInterval)
    }
    
    return () => {
      isMountedRef.current = false
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      if (intervalId) clearInterval(intervalId)
    }
  }, [execute, options.refetchInterval])

  return { data, loading, error, refetch: execute }
}

/**
 * Wrapper for fetch that accepts AbortSignal and silently handles abort errors.
 * Use this in components that can't use useSafeAsync (e.g., event handlers).
 */
export async function safeFetch(
  url: string,
  options: RequestInit = {},
  signal?: AbortSignal
): Promise<Response | null> {
  try {
    const res = await fetch(url, { ...options, signal })
    return res
  } catch (err) {
    // Silent ignore abort and network errors
    const errMsg = err instanceof Error ? err.message : ''
    if (errMsg.includes('Failed to fetch') || 
        errMsg.includes('aborted') || 
        errMsg.includes('The user aborted a request')) {
      return null
    }
    throw err
  }
}

/**
 * Safe error handler for catch blocks.
 * Returns true if error should be ignored (abort/network during tab switch).
 */
export function isAbortError(err: unknown): boolean {
  const errMsg = err instanceof Error ? err.message : ''
  return errMsg.includes('Failed to fetch') || 
         errMsg.includes('aborted') || 
         errMsg.includes('The user aborted a request') ||
         errMsg.includes('NetworkError')
}
