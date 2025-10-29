// composables/useCSV.js
import { storeToRefs } from 'pinia'
import { useCsvStore } from '@/stores/csvStore'

export function useCSV() {
  const csvStore = useCsvStore()

  // storeToRefs convierte el estado en refs reactivas automáticamente
  const {
    isLoading,
    processingResults,
    connectionStatus,
    formParams,
    credentials
  } = storeToRefs(csvStore)

  return {
    // State (ya son refs, no computed)
    isLoading,
    processingResults,
    connectionStatus,
    formParams,
    credentials,

    // Actions
    processCSV: (...args) => csvStore.processCSV(...args),
    testConnection: (...args) => csvStore.testConnection(...args),
    updateFormParams: (...args) => csvStore.updateFormParams(...args),
    setCredentials: (...args) => csvStore.setCredentials(...args),
  }
}