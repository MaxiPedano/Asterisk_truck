<template>
  <!-- Formulario Principal -->
  <v-card elevation="3" :disabled="!credentials.saved">
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
              hint="Ej: 11079 (Compras B) o 11080 (Compras A)"
              persistent-hint
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
              hint="Ej: 1692 (Compras B) o 1711 (Compras A)"
              persistent-hint
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
              hint="Ej: 774 (Compras B) o 776 (Compras A)"
              persistent-hint
            />
          </v-col>
        </v-row>

        <!-- Botones de acceso rápido -->
        <v-row class="mb-4">
          <v-col cols="12">
            <v-card variant="outlined" color="grey-lighten-4">
              <v-card-text>
                <div class="text-subtitle-2 mb-3">🚀 Configuración rápida:</div>
                <div class="d-flex flex-wrap gap-2">
                  <v-btn
                    size="small"
                    variant="tonal"
                    color="success"
                    @click="setComprasB"
                    prepend-icon="mdi-shopping"
                  >
                    Compras B
                  </v-btn>
                  <v-btn
                    size="small"
                    variant="tonal"
                    color="info"
                    @click="setComprasA"
                    prepend-icon="mdi-shopping-outline"
                  >
                    Compras A
                  </v-btn>
                </div>
              </v-card-text>
            </v-card>
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
                <div class="text-caption mt-2">
                  {{ connectionStatus.error }}
                </div>
              </template>
              <template v-if="connectionStatus.tokenExpiry">
                <div class="text-caption mt-2">
                  Token expira: {{ connectionStatus.tokenExpiry }}
                </div>
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
                  Los registros se procesan en lotes para evitar desconexiones
                </div>

                <!-- Progreso parcial -->
                <div v-if="processingResults" class="mt-4">
                  <v-progress-linear
                    :model-value="
                      ((processingResults.procesadasExitosamente +
                        processingResults.duplicados +
                        processingResults.errores) /
                        processingResults.totalFilas) *
                      100
                    "
                    color="success"
                    height="6"
                    rounded
                  />
                  <div class="text-caption mt-2">
                    Procesados:
                    {{
                      processingResults.procesadasExitosamente +
                      processingResults.duplicados +
                      processingResults.errores
                    }}
                    / {{ processingResults.totalFilas }}
                  </div>
                </div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>

        <!-- Botones -->
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
              :disabled="!credentials.saved"
            >
              Probar Conexión
            </v-btn>

            <!-- Diálogo -->
            <v-dialog v-model="dialog" max-width="450">
              <v-card>
                <v-card-title class="text-white" :class="dialogColor">
                  {{ dialogTitle }}
                </v-card-title>
                <v-card-text>
                  <div>{{ dialogMessage }}</div>
                  <div
                    v-if="connectionInfo?.timestamp"
                    class="text-caption mt-2"
                  >
                    {{ connectionInfo.timestamp }}
                  </div>
                </v-card-text>
                <v-card-actions>
                  <v-spacer />
                  <v-btn text @click="dialog = false">Cerrar</v-btn>
                </v-card-actions>
              </v-card>
            </v-dialog>
          </v-col>

          <v-col cols="12" md="6">
            <v-btn
              type="submit"
              :loading="isLoading"
              :disabled="!selectedFile || !credentials.saved"
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

  <!-- Resultados -->
  <CSVResults
    v-if="processingResults && !isLoading"
    :results="processingResults"
    class="mt-6"
  />
</template>

<script setup>
import { ref, reactive } from "vue";
import CSVResults from "./csvResult.vue";
import { useAuthStore } from "../stores/authStore";
import { useCsvStore } from "../stores/csvStore";

const { credentials, testConnection: testConn } = useAuthStore();
const loading = ref(false);
const {
  processingResults,
  connectionStatus,
  processCSV,
  updateFormParams,
  isLoading,
} = useCsvStore();

const form = ref(null);
const selectedFile = ref(null);
const selectedFileArray = ref([]);
const dialog = ref(false);
const dialogTitle = ref("");
const dialogMessage = ref("");
const dialogColor = ref("bg-primary");
const connectionInfo = ref(null);

const localFormParams = reactive({
  flowid: "",
  statusid: "",
  statusflowid: "",
});

const rules = {
  required: (value) => !!value || "Este campo es requerido",
};

// Configuración rápida
function setComprasB() {
  localFormParams.flowid = "11079";
  localFormParams.statusid = "1692";
  localFormParams.statusflowid = "774";
}

function setComprasA() {
  localFormParams.flowid = "11080";
  localFormParams.statusid = "1711";
  localFormParams.statusflowid = "776";
}

function handleFileSelect(event) {
  const file =
    event?.target?.files?.[0] || selectedFileArray.value?.[0] || null;
  selectedFile.value = file;
}

// Test de conexión con diálogo
async function testConnection() {
  loading.value = true;
  try {
    const result = await testConn();
    dialogTitle.value = "✅ Conexión exitosa";
    dialogColor.value = "bg-success";
    dialogMessage.value = result.message;
    connectionInfo.value = result;
  } catch (error) {
    dialogTitle.value = "❌ Error de conexión";
    dialogColor.value = "bg-error";
    dialogMessage.value =
      error.message || "Ocurrió un error al probar la conexión";
    connectionInfo.value = { timestamp: new Date().toLocaleString() };
  } finally {
    loading.value = false;
    dialog.value = true;
  }
}

// Procesar CSV
async function handleSubmit() {
  if (!selectedFile.value || !credentials.value.saved) return;
  updateFormParams(localFormParams);

  try {
    await processCSV(selectedFile.value);
  } catch (error) {
    alert(`Error procesando CSV: ${error.message}`);
  }
}
</script>

<style scoped>
.v-card--disabled {
  opacity: 0.6;
}
</style>
