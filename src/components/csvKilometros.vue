<script setup>
import { ref, computed, watchEffect } from "vue";
import { useKilometrosStore } from "@/stores/useKilometrosStore";
import DialogEnvioFlow from "./DialogEnvioFlow.vue";

const csvStore = useKilometrosStore();
const fileInput = ref(null);
const selectedCamiones = ref([]);
const downloadMenu = ref(false);
const dialogEnvio = ref(false);
const headers = ref([]);

headers.value = [
  { title: "#", value: "id" },
  { title: "Patente", value: "descripcion" },
  { title: "Fecha", value: "fecha" },
  { title: "Kilómetros", value: "kilometros" },
];

async function handleFileUpload(files) {
  const file = files?.[0] || files;
  if (!file) return;

  await csvStore.loadFile(file);

  if (csvStore.detectedPairs.length > 0) {
    selectedCamiones.value = csvStore.detectedPairs.map((p) => p.patente);
  }
}

// Resto de tu código...
const filteredData = computed(() => {
  if (selectedCamiones.value.length === 0) {
    return csvStore.transformedData;
  }
  return csvStore.transformedData.filter((row) =>
    selectedCamiones.value.includes(row.descripcion)
  );
});

const enviarAFlow = () => {
  dialogEnvio.value = true; // Solo abre el dialog
};

const camionesOptions = computed(() => {
  return csvStore.detectedPairs.map((pair) => ({
    title: `${pair.camion} (${pair.patente})`,
    value: pair.patente,
  }));
});

function toggleSelectAll() {
  if (selectedCamiones.value.length === csvStore.detectedPairs.length) {
    selectedCamiones.value = [];
  } else {
    selectedCamiones.value = csvStore.detectedPairs.map((p) => p.patente);
  }
}

const filteredPairs = computed(() => {
  return csvStore.detectedPairs.filter((pair) =>
    selectedCamiones.value.includes(pair.patente)
  );
});

function downloadCSV() {
  const success = csvStore.exportCSV(filteredData.value);
  if (success) downloadMenu.value = false;
}

function downloadXLSX() {
  const success = csvStore.exportXLSX(filteredData.value);
  if (success) downloadMenu.value = false;
}

function downloadJSON() {
  const success = csvStore.exportJSON(filteredData.value);
  if (success) downloadMenu.value = false;
}

// Función para resetear y mostrar el upload nuevamente
function resetAndLoadNew() {
  csvStore.reset();
  selectedCamiones.value = [];
  fileInput.value = null; // Limpiar el input
}
</script>

<template>
  <div class="p-8 max-w-6xl mx-auto bg-white rounded-2xl shadow-lg">
    <h1 class="text-3xl font-bold mb-2">🚚 Kilómetros</h1>
    <p class="text-gray-500 mb-6">
      Convierte automáticamente tu CSV de kilómetros en formato de flujo.
    </p>

    <!-- File Upload - Solo se muestra si NO hay datos cargados -->
    <v-expand-transition>
      <v-file-upload
        v-if="csvStore.csvData.length === 0"
        v-model="fileInput"
        variant="outlined"
        accept=".csv,.xlsx,.xls"
        label="Click para subir tu archivo CSV o Excel"
        prepend-icon="mdi-file-upload"
        class="mb-6"
        density="comfortable"
        color="blue"
        :loading="csvStore.loading"
        :disabled="csvStore.loading"
        @update:model-value="handleFileUpload"
      />
    </v-expand-transition>

    <!-- Botón para cargar otro archivo (se muestra cuando hay datos) -->
    <v-expand-transition>
      <div
        v-if="
          csvStore.csvData.length > 0 && csvStore.transformedData.length === 0
        "
        class="mb-6"
      >
        <v-alert type="success" variant="tonal" border="start">
          <div class="d-flex justify-space-between align-center">
            <span>✅ Archivo cargado correctamente</span>
            <v-btn
              @click="resetAndLoadNew"
              variant="outlined"
              color="blue"
              size="small"
              prepend-icon="mdi-file-replace"
            >
              Cargar otro archivo
            </v-btn>
          </div>
        </v-alert>
      </div>
    </v-expand-transition>

    <!-- 👆 QUITAR DialogEnvioFlow de aquí -->

    <!-- Error -->
    <v-expand-transition>
      <v-alert
        v-if="csvStore.error"
        type="error"
        variant="tonal"
        closable
        class="mb-4"
        @click:close="csvStore.error = null"
      >
        {{ csvStore.error }}
      </v-alert>
    </v-expand-transition>

    <!-- Loading -->
    <v-expand-transition>
      <div v-if="csvStore.loading" class="text-center mb-6">
        <v-progress-circular
          indeterminate
          color="blue"
          size="64"
        ></v-progress-circular>
        <p class="mt-3 text-gray-600">Procesando archivo...</p>
      </div>
    </v-expand-transition>

    <!-- Selector de Camiones -->
    <v-expand-transition>
      <div v-if="csvStore.detectedPairs.length > 0" class="mb-6">
        <v-card variant="outlined">
          <v-card-title class="d-flex justify-space-between align-center">
            <span>
              <v-icon class="mr-2">mdi-truck</v-icon>
              Seleccionar Camiones
            </span>
            <v-btn
              @click="toggleSelectAll"
              size="small"
              variant="text"
              color="blue"
            >
              {{
                selectedCamiones.length === csvStore.detectedPairs.length
                  ? "Deseleccionar"
                  : "Seleccionar"
              }}
              Todos
            </v-btn>
          </v-card-title>

          <v-card-text>
            <v-select
              v-model="selectedCamiones"
              :items="camionesOptions"
              label="Camiones a incluir"
              multiple
              chips
              closable-chips
              variant="outlined"
              density="comfortable"
              color="blue"
              item-color="blue"
            >
              <template v-slot:prepend-item>
                <v-list-item @click="toggleSelectAll" ripple>
                  <template v-slot:prepend>
                    <v-checkbox-btn
                      :model-value="
                        selectedCamiones.length ===
                        csvStore.detectedPairs.length
                      "
                      :indeterminate="
                        selectedCamiones.length > 0 &&
                        selectedCamiones.length < csvStore.detectedPairs.length
                      "
                      color="blue"
                    ></v-checkbox-btn>
                  </template>
                  <v-list-item-title>Seleccionar Todos</v-list-item-title>
                </v-list-item>
                <v-divider class="mt-2"></v-divider>
              </template>
            </v-select>

            <v-alert
              v-if="selectedCamiones.length === 0"
              type="warning"
              variant="tonal"
              density="compact"
              class="mt-2"
            >
              Selecciona al menos un camión para continuar
            </v-alert>
          </v-card-text>
        </v-card>
      </div>
    </v-expand-transition>

    <!-- Botón Transformar -->
    <v-expand-transition>
      <v-btn
        v-if="
          csvStore.csvData.length &&
          !csvStore.transformedData.length &&
          selectedCamiones.length > 0
        "
        @click="csvStore.transformData"
        block
        size="x-large"
        color="blue-darken-1"
        variant="flat"
        class="mb-6"
        prepend-icon="mdi-auto-fix"
      >
        <span class="text-lg font-bold">
          Transformar Datos ({{ selectedCamiones.length }} camiones)
        </span>
      </v-btn>
    </v-expand-transition>

    <!-- Datos Transformados -->
    <v-expand-transition>
      <div v-if="csvStore.transformedData.length" class="mt-6">
        <v-card>
          <v-card-title
            class="d-flex justify-space-between align-center bg-green-darken-1 text-white"
          >
            <span>
              ✅ Datos Filtrados ({{ filteredData.length }} /
              {{ csvStore.transformedData.length }} registros)
            </span>

            <!-- Botón Enviar a Flow - 👇 AGREGAR AQUÍ -->
            <v-btn
              size="small"
              color="white"
              variant="outlined"
              @click="enviarAFlow"
              prepend-icon="mdi-send"
              :disabled="filteredData.length === 0"
            >
              Enviar a Flow
            </v-btn>

            <!-- Menú de descarga -->
            <v-menu v-model="downloadMenu" location="bottom">
              <template v-slot:activator="{ props }">
                <v-btn
                  v-bind="props"
                  color="white"
                  variant="outlined"
                  prepend-icon="mdi-download"
                  append-icon="mdi-chevron-down"
                  size="small"
                >
                  Descargar
                </v-btn>
              </template>

              <v-list density="compact">
                <v-list-item @click="downloadCSV">
                  <template v-slot:prepend>
                    <v-icon>mdi-file-delimited</v-icon>
                  </template>
                  <v-list-item-title>Descargar como CSV</v-list-item-title>
                  <v-list-item-subtitle class="text-caption">
                    Archivo de texto separado por comas
                  </v-list-item-subtitle>
                </v-list-item>

                <v-list-item @click="downloadXLSX">
                  <template v-slot:prepend>
                    <v-icon color="green">mdi-file-excel</v-icon>
                  </template>
                  <v-list-item-title>Descargar como Excel</v-list-item-title>
                  <v-list-item-subtitle class="text-caption">
                    Archivo de Microsoft Excel (.xlsx)
                  </v-list-item-subtitle>
                </v-list-item>

                <v-list-item @click="downloadJSON">
                  <template v-slot:prepend>
                    <v-icon color="orange">mdi-code-json</v-icon>
                  </template>
                  <v-list-item-title>Descargar como JSON</v-list-item-title>
                  <v-list-item-subtitle class="text-caption">
                    Formato JavaScript Object Notation
                  </v-list-item-subtitle>
                </v-list-item>
              </v-list>
            </v-menu>
          </v-card-title>

          <v-card-text class="pa-0">
            <v-data-table
              :headers="headers"
              :items="filteredData"
              :items-per-page="10"
            >
              <template v-slot:no-data>
                <div class="text-center pa-8">
                  <v-icon size="64" color="grey">mdi-filter-off</v-icon>
                  <p class="text-grey mt-4">
                    No hay datos para los camiones seleccionados
                  </p>
                </div>
              </template>
              <template v-slot:item.id="{ index }">
                {{ index + 1 }}
              </template>
            </v-data-table>

            <div v-if="filteredData.length === 0" class="text-center pa-8">
              <v-icon size="64" color="grey">mdi-filter-off</v-icon>
              <p class="text-grey mt-4">
                No hay datos para los camiones seleccionados
              </p>
            </div>
          </v-card-text>
        </v-card>

        <!-- Resumen por Camión -->
        <v-row class="mt-6">
          <v-col
            v-for="pair in filteredPairs"
            :key="pair.patente"
            cols="12"
            md="4"
          >
            <v-card>
              <v-card-text>
                <div class="text-caption text-grey-darken-1 mb-1">
                  {{ pair.camion }}
                </div>
                <div class="text-h5 font-weight-bold text-blue-darken-2">
                  {{
                    csvStore.transformedData
                      .filter((d) => d.descripcion === pair.patente)
                      .reduce((sum, d) => sum + parseFloat(d.kilometros), 0)
                      .toFixed(2)
                  }}
                  km
                </div>
                <div class="text-caption text-grey">
                  {{
                    csvStore.transformedData.filter(
                      (d) => d.descripcion === pair.patente
                    ).length
                  }}
                  registros
                </div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>

        <!-- Botón Reset al final -->
        <div class="text-center mt-6">
          <v-btn
            @click="resetAndLoadNew"
            variant="outlined"
            color="grey"
            prepend-icon="mdi-refresh"
          >
            Cargar otro archivo
          </v-btn>
        </div>
      </div>
    </v-expand-transition>
  </div>

  <!-- 👇 DIALOG VA AQUÍ AL FINAL, FUERA DEL DIV PRINCIPAL -->
  <DialogEnvioFlow v-model="dialogEnvio" :registros="filteredData" />
</template>

<style scoped>
.v-table {
  font-size: 0.875rem;
}

.font-mono {
  font-family: "Courier New", monospace;
}
</style>
