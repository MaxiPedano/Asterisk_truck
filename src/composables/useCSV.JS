// composables/useCSV.js
import { computed } from 'vue'
import { useCsvStore } from '@/stores/csvStore'

export function useCSV() {
  const csvStore = useCsvStore()

  return {
    // State
    isLoading: computed(() => csvStore.isLoading),
    processingResults: computed(() => csvStore.processingResults),
    connectionStatus: computed(() => csvStore.connectionStatus),
    formParams: computed(() => csvStore.formParams),
    credentials: computed(() => csvStore.credentials),

    // Actions (con wrapper para no perder el this del store)
    processCSV: (...args) => csvStore.processCSV(...args),
    testConnection: (...args) => csvStore.testConnection(...args),
    updateFormParams: (...args) => csvStore.updateFormParams(...args),
    setCredentials: (...args) => csvStore.setCredentials(...args),
  }
}
