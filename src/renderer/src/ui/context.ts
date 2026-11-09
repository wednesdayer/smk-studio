import { createContext, useContext } from 'react'
import { useStore } from 'zustand'
import type { Runtime } from '../runtime/runtime'
import { liveStore, type LiveState } from '../state/liveStore'
import type { AppStore, AppStoreApi } from '../state/store'

export interface AppContextValue {
  readonly store: AppStoreApi
  readonly runtime: Runtime | null
}

export const AppContext = createContext<AppContextValue | null>(null)

function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('AppContext ausente')
  return ctx
}

export function useApp<T>(selector: (s: AppStore) => T): T {
  return useStore(useAppContext().store, selector)
}

export const useLive = <T,>(selector: (s: LiveState) => T): T => useStore(liveStore, selector)

/** Ações do store: funções estáveis, não causam re-render. */
export const useActions = (): AppStore => useAppContext().store.getState()

export const useStoreApi = (): AppStoreApi => useAppContext().store

export const useRuntime = (): Runtime | null => useAppContext().runtime
