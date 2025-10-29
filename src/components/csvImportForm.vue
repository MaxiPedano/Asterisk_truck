<template>
  <v-container fluid>
    <v-row justify="center">
      <v-col cols="12" md="8" lg="6">
        <!-- Sección de credenciales -->
        <CredentialsForm />
        <!-- Instrucciones de Uso -->
        <v-card elevation="2" class="mb-6">
          <v-card-title class="d-flex align-center py-4">
            <v-icon class="mr-3" size="large" color="info"
              >mdi-clipboard-text-outline</v-icon
            >
            <span class="text-h5">Instrucciones de Uso</span>
          </v-card-title>

          <v-card-text>
            <v-list density="compact">
              <v-list-item>
                <template #prepend>
                  <v-avatar size="24" color="primary" class="text-white">
                    <span class="text-caption">1</span>
                  </v-avatar>
                </template>
                <v-list-item-title class="text-body-1">
                  Selecciona un archivo CSV con los datos a importar desde tu
                  computadora.
                </v-list-item-title>
              </v-list-item>

              <v-list-item>
                <template #prepend>
                  <v-avatar size="24" color="primary" class="text-white">
                    <span class="text-caption">2</span>
                  </v-avatar>
                </template>
                <v-list-item-title class="text-body-1 mb-3">
                  Completa los campos requeridos con los valores
                  correspondientes:
                </v-list-item-title>
                <div class="ml-8">
                  <v-alert
                    variant="tonal"
                    color="success"
                    density="compact"
                    class="mb-2"
                    icon="mdi-shopping"
                  >
                    <div class="text-body-2">
                      <strong>COMPRAS B:</strong> FLOWID: 11079 | STATUSFLOW:
                      774 | STATUSID: 1692
                    </div>
                  </v-alert>
                  <v-alert
                    variant="tonal"
                    color="info"
                    density="compact"
                    icon="mdi-shopping-outline"
                  >
                    <div class="text-body-2">
                      <strong>COMPRAS A:</strong> FLOWID: 11080 | STATUSFLOW:
                      776 | STATUSID: 1711
                    </div>
                  </v-alert>
                </div>
              </v-list-item>

              <v-list-item>
                <template #prepend>
                  <v-avatar size="24" color="primary" class="text-white">
                    <span class="text-caption">3</span>
                  </v-avatar>
                </template>
                <v-list-item-title class="text-body-1">
                  Verifica que todos los campos obligatorios estén completos
                  antes de continuar.
                </v-list-item-title>
              </v-list-item>

              <v-list-item>
                <template #prepend>
                  <v-avatar size="24" color="primary" class="text-white">
                    <span class="text-caption">4</span>
                  </v-avatar>
                </template>
                <v-list-item-title class="text-body-1">
                  Haz clic en "Importar CSV" para iniciar la importación de
                  datos.
                </v-list-item-title>
              </v-list-item>

              <v-list-item>
                <template #prepend>
                  <v-avatar size="24" color="primary" class="text-white">
                    <span class="text-caption">5</span>
                  </v-avatar>
                </template>
                <v-list-item-title class="text-body-1">
                  Espera a que se complete el proceso. Los registros se
                  procesarán en lotes de 10 para evitar desconexiones.
                </v-list-item-title>
              </v-list-item>
            </v-list>
          </v-card-text>
        </v-card>

        <!-- Formulario Principal -->
        <v-card elevation="3" :disabled="!credentials.saved">
          <v-card-title class="text-h4 text-center py-6">
            <v-icon left size="large" color="primary"
              >mdi-file-table-outline</v-icon
            >
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
                      <div class="text-subtitle-2 mb-3">
                        🚀 Configuración rápida:
                      </div>
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
                          <v-icon v-bind="props"
                            >mdi-help-circle-outline</v-icon
                          >
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

              <!-- Indicador de carga con progreso -->
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
                        Los registros se procesan en lotes para evitar
                        desconexiones
                      </div>
                      <!-- Mostrar progreso si hay resultados parciales -->
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
                    :disabled="!credentials.saved"
                  >
                    Probar Conexión
                  </v-btn>
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

        <!-- Componente de resultados -->
        <CSVResults
          v-if="processingResults && !isLoading"
          :results="processingResults"
          class="mt-6"
        />
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, reactive, computed } from "vue";
import { useCSV } from "../composables/useCSV";
import CredentialsForm from "./VForm.vue";
import CSVResults from "./csvResult.vue";

const {
  isLoading,
  processingResults,
  connectionStatus,
  credentials,
  processCSV,
  testConnection: testConn,
  updateFormParams,
  setCredentials,
} = useCSV();

const form = ref(null);
const selectedFile = ref(null);
const selectedFileArray = ref([]);

const localFormParams = reactive({
  flowid: "",
  statusid: "",
  statusflowid: "",
});

const authForm = reactive({
  username: "",
  password: "",
});

const rules = {
  required: (value) => !!value || "Este campo es requerido",
};

// Guardar credenciales
function saveCredentials() {
  if (authForm.username && authForm.password) {
    setCredentials(authForm.username, authForm.password);
  }
}

// Funciones para configuración rápida
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

function handleFileSelect() {
  console.log("=== DEBUG FILE SELECT ===");
  console.log("selectedFileArray.value:", selectedFileArray.value);
  console.log("selectedFileArray.value[0]:", selectedFileArray.value[0]);
  const file = event.target?.files?.[0] || selectedFileArray.value?.[0] || null;
  selectedFile.value = file;
  console.log("selectedFile.value después:", selectedFile.value);
  console.log(
    "Botón debería estar:",
    selectedFile.value ? "HABILITADO" : "DESHABILITADO"
  );
}

async function testConnection() {
  try {
    await testConn();
  } catch (error) {
    console.error("Error probando conexión:", error);
  }
}

async function handleSubmit() {
  console.log("=== DEBUG IMPORTAR ===");
  console.log("Form params:", localFormParams);
  console.log("Selected file:", selectedFile.value);
  console.log("Credentials saved:", credentials.value.saved);

  if (!selectedFile.value || !credentials.value.saved) {
    return;
  }

  // Actualizar parámetros en el store
  updateFormParams(localFormParams);

  try {
    await processCSV(selectedFile.value);
    console.log("✅ Procesamiento completado");
  } catch (error) {
    console.error("Error procesando CSV:", error);
    // Mostrar error al usuario
    alert(`Error procesando CSV: ${error.message}`);
  }
}
</script>

<style scoped>
.v-card--disabled {
  opacity: 0.6;
}
</style>
