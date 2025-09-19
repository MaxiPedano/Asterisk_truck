<template>
  <v-card elevation="3">
    <v-card-title class="text-h5 d-flex align-center">
      <v-icon left color="success">mdi-chart-box-outline</v-icon>
      Resultados del Procesamiento
    </v-card-title>
    
    <v-card-text>
      <!-- Estadísticas principales -->
      <v-row class="mb-4">
        <v-col cols="6" sm="3">
          <v-card variant="tonal" color="info">
            <v-card-text class="text-center">
              <div class="text-h4 font-weight-bold">{{ results.totalFilas }}</div>
              <div class="text-body-2">Total Filas</div>
            </v-card-text>
          </v-card>
        </v-col>
        
        <v-col cols="6" sm="3">
          <v-card variant="tonal" color="success">
            <v-card-text class="text-center">
              <div class="text-h4 font-weight-bold">{{ results.procesadasExitosamente }}</div>
              <div class="text-body-2">Procesadas</div>
            </v-card-text>
          </v-card>
        </v-col>
        
        <v-col cols="6" sm="3">
          <v-card variant="tonal" color="warning">
            <v-card-text class="text-center">
              <div class="text-h4 font-weight-bold">{{ results.duplicados }}</div>
              <div class="text-body-2">Duplicados</div>
            </v-card-text>
          </v-card>
        </v-col>
        
        <v-col cols="6" sm="3">
          <v-card variant="tonal" color="error">
            <v-card-text class="text-center">
              <div class="text-h4 font-weight-bold">{{ results.errores }}</div>
              <div class="text-body-2">Errores</div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Resumen con progress bars -->
      <v-row class="mb-4">
        <v-col cols="12">
          <v-card variant="outlined">
            <v-card-text>
              <div class="text-h6 mb-3">Resumen del Procesamiento</div>
              
              <div class="mb-3">
                <div class="d-flex justify-space-between mb-1">
                  <span>Procesadas exitosamente</span>
                  <span>{{ Math.round((results.procesadasExitosamente / results.totalFilas) * 100) }}%</span>
                </div>
                <v-progress-linear 
                  :model-value="(results.procesadasExitosamente / results.totalFilas) * 100"
                  color="success"
                  height="8"
                />
              </div>
              
              <div class="mb-3" v-if="results.duplicados > 0">
                <div class="d-flex justify-space-between mb-1">
                  <span>Duplicados encontrados</span>
                  <span>{{ Math.round((results.duplicados / results.totalFilas) * 100) }}%</span>
                </div>
                <v-progress-linear 
                  :model-value="(results.duplicados / results.totalFilas) * 100"
                  color="warning"
                  height="8"
                />
              </div>
              
              <div v-if="results.errores > 0">
                <div class="d-flex justify-space-between mb-1">
                  <span>Errores encontrados</span>
                  <span>{{ Math.round((results.errores / results.totalFilas) * 100) }}%</span>
                </div>
                <v-progress-linear 
                  :model-value="(results.errores / results.totalFilas) * 100"
                  color="error"
                  height="8"
                />
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Expansión panels para detalles -->
      <v-expansion-panels variant="accordion" multiple>
        <!-- Panel de duplicados -->
        <v-expansion-panel v-if="results.detalleDuplicados?.length > 0">
          <v-expansion-panel-title>
            <div class="d-flex align-center">
              <v-icon color="warning" class="mr-2">mdi-content-duplicate</v-icon>
              Registros Duplicados ({{ results.duplicados }})
            </div>
          </v-expansion-panel-title>
          <v-expansion-panel-text>
            <v-list density="compact">
              <v-list-item
                v-for="duplicado in results.detalleDuplicados"
                :key="duplicado.fila"
                :title="`Fila ${duplicado.fila}: ${duplicado.comprobante}`"
                :subtitle="`Comprobante ya existe en el sistema`"
              >
                <template #prepend>
                  <v-icon color="warning">mdi-alert</v-icon>
                </template>
              </v-list-item>
            </v-list>
          </v-expansion-panel-text>
        </v-expansion-panel>

        <!-- Panel de errores -->
        <v-expansion-panel v-if="results.detalleErrores?.length > 0">
          <v-expansion-panel-title>
            <div class="d-flex align-center">
              <v-icon color="error" class="mr-2">mdi-alert-circle</v-icon>
              Errores Encontrados ({{ results.errores }})
            </div>
          </v-expansion-panel-title>
          <v-expansion-panel-text>
            <v-list density="compact">
              <v-list-item
                v-for="error in results.detalleErrores"
                :key="error.fila"
                :title="`Fila ${error.fila}`"
                :subtitle="error.error"
              >
                <template #prepend>
                  <v-icon color="error">mdi-close-circle</v-icon>
                </template>
              </v-list-item>
            </v-list>
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>
    </v-card-text>
  </v-card>
</template>

<script setup>
defineProps({
  results: {
    type: Object,
    required: true
  }
})
</script>
