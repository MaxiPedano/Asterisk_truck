<template>
  <v-container fluid>
    <v-row justify="center">
      <v-col cols="12" md="8" lg="6">
        <v-card elevation="3">
          <v-card-title class="text-h4 text-center py-6">
            <v-icon left size="large" color="primary">mdi-file-table-outline</v-icon>
            Importador de CSV
          </v-card-title>
          
          <v-card-text>
            <v-form @submit.prevent="handleSubmit" ref="form">
              <!-- Parámetros del formulario -->
              <v-row>
                <v-col cols="12" md="4">
                  <v-text-field
                    v-model="localFormParams.flowid"
                    label="Flow ID"
                    type="number"
                    :rules="[rules.required]"
                    prepend-icon="mdi-flow-icon"
                    variant="outlined"
                    density="comfortable"
                  />
                </v-col>
                
                <v-col cols="12" md="4">
                  <v-text-field
                    v-model="localFormParams.statusid"
                    label="Status ID"
                    type="number"
                    :rules="[rules.required]"
                    prepend-icon="mdi-information-outline"
                    variant="outlined"
                    density="comfortable"
                  />
                </v-col>
                
                <v-col cols="12" md="4">
                  <v-text-field
                    v-model="localFormParams.statusflowid"
                    label="Status Flow ID"
                    type="number"
                    :rules="[rules.required]"
                    prepend-icon="mdi-state-machine"
                    variant="outlined"
                    density="comfortable"
                  />
                </v-col>
              </v-row>

              <!-- Selector de archivo CSV -->
              <v-row>
                <v-col cols="12">
                  <v-file-input
                    v-model="selectedFileArray"
                    label="Archivo CSV"
                    accept=".csv"
                    :rules="[rules.required]"
                    prepend-icon="mdi-file-csv"
                    variant="outlined"
                    density="comfortable"
                    show-size
                    @change="handleFileSelect"
                  >
                    <template #append-inner>
                      <v-tooltip text="Selecciona un archivo CSV válido">
                        <template #activator="{ props }">
                          <v-icon v-bind="props">mdi-help-circle-outline</v-icon>
                        </template>
                      </v-tooltip>
                    </template>
                  </v-file-input>
                </v-col>
              </v-row>

              <!-- Estado de conexión -->
              <v-row v-if="connectionStatus">
                <v-col cols="12">
                  <v-alert
                    :type="connectionStatus.success ? 'success' : 'error'"
                    :text="connectionStatus.message"
                    variant="tonal"
                  >
                    <template v-if="connectionStatus.error">
                      <div class="text-caption mt-2">{{ connectionStatus.error }}</div>
                    </template>
                  </v-alert>
                </v-col>
              </v-row>

              <!-- Indicador de carga -->
              <v-row v-if="isLoading">
                <v-col cols="12">
                  <v-card variant="tonal" color="primary">
                    <v-card-text class="text-center">
                      <v-progress-circular
                        indeterminate
                        color="primary"
                        size="32"
                        class="mb-3"
                      />
                      <div class="text-h6">Procesando archivo CSV...</div>
                      <div class="text-body-2 mt-2">
                        Por favor espera mientras se procesa el archivo
                      </div>
                    </v-card-text>
                  </v-card>
                </v-col>
              </v-row>

              <!-- Botones de acción -->
              <v-row class="mt-4">
                <v-col cols="12" md="6">
                  <v-btn
                    @click="testConnection"
                    :loading="isLoading"
                    variant="outlined"
                    color="secondary"
                    size="large"
                    block
                    prepend-icon="mdi-connection"
                  >
                    Probar Conexión
                  </v-btn>
                </v-col>
                
                <v-col cols="12" md="6">
                  <v-btn
                    type="submit"
                    :loading="isLoading"
                    :disabled="!selectedFile"
                    variant="elevated"
                    color="primary"
                    size="large"
                    block
                    prepend-icon="mdi-upload"
                  >
                    Importar CSV
                  </v-btn>
                </v-col>
              </v-row>
            </v-form>
          </v-card-text>
        </v-card>

        <!-- Componente de resultados -->
        <CSVResults v-if="processingResults" :results="processingResults" class="mt-6" />
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useCSV } from  '../composables/useCSV'
import CSVResults from './csvResult.vue'

const { 
  isLoading, 
  processingResults, 
  connectionStatus,
  processCSV, 
  testConnection: testConn, 
  updateFormParams 
} = useCSV()

const form = ref(null)
const selectedFile = ref(null)
const selectedFileArray = ref([])

const localFormParams = reactive({
  flowid: '',
  statusid: '',
  statusflowid: ''
})

const rules = {
  required: value => !!value || 'Este campo es requerido'
}

function handleFileSelect() {
   console.log('=== DEBUG FILE SELECT ===')
  console.log('selectedFileArray.value:', selectedFileArray.value)
  console.log('selectedFileArray.value[0]:', selectedFileArray.value[0])
    const file = event.target?.files?.[0] || selectedFileArray.value?.[0] || null
  selectedFile.value = file
  console.log('selectedFile.value después:', selectedFile.value)
  console.log('Botón debería estar:', selectedFile.value ? 'HABILITADO' : 'DESHABILITADO')
}

async function testConnection() {
  try {
    await testConn()
  } catch (error) {
    console.error('Error probando conexión:', error)
  }
}

async function handleSubmit() {
  console.log('=== DEBUG IMPORTAR ===')
  console.log('Form params:', localFormParams)
  console.log('Selected file:', selectedFile.value)
  console.log('File array:', selectedFileArray.value)
 /*  const { valid } = await form.value.validate()
  
  if (!valid) {
    return
  } */

  if (!selectedFile.value) {
    return
  }

  // Actualizar parámetros en el store
  updateFormParams(localFormParams)

  try {
    await processCSV(selectedFile.value)
    console.log('✅ Procesamiento completado')
  } catch (error) {
    console.error('Error procesando CSV:', error)
  }
}
</script>