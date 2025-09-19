import { computed } from 'vue'
import { useCsvStore } from './../stores/csvStore'

export function useCSV() {
  const csvStore = useCsvStore()

  return {
    // State
    isLoading: computed(() => csvStore.isLoading),
    processingResults: computed(() => csvStore.processingResults),
    connectionStatus: computed(() => csvStore.connectionStatus),
    formParams: computed(() => csvStore.formParams),

    // Actions
    processCSV: csvStore.processCSV,
    testConnection: csvStore.testConnection,
    updateFormParams: csvStore.updateFormParams
  }
}