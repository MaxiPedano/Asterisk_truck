<template>
  <v-dialog v-model="dialogVisible" max-width="600" persistent>
    <v-card>
      <v-card-title class="bg-primary text-white">
        <v-icon class="mr-2">mdi-send</v-icon>
        Enviando registros a Flow
      </v-card-title>

      <v-card-text class="pa-6">
        <!-- Progreso general -->
        <div v-if="!envioCompleto" class="mb-4">
          <div class="d-flex justify-space-between mb-2">
            <span class="font-weight-medium">
              Procesando: {{ progresoActual }} / {{ totalRegistros }}
            </span>
            <span class="text-grey">
              {{ Math.round((progresoActual / totalRegistros) * 100) }}%
            </span>
          </div>
          <v-progress-linear
            :model-value="(progresoActual / totalRegistros) * 100"
            color="primary"
            height="8"
            rounded
          ></v-progress-linear>
        </div>

        <!-- Registro actual -->
        <v-card
          v-if="registroActual && !envioCompleto"
          variant="outlined"
          class="mb-4"
        >
          <v-card-text>
            <div class="d-flex align-center">
              <v-progress-circular
                indeterminate
                color="primary"
                size="24"
                width="3"
                class="mr-3"
              ></v-progress-circular>
              <div>
                <div class="font-weight-medium">
                  {{ registroActual.patente }}
                </div>
                <div class="text-caption text-grey">
                  {{ registroActual.kilometros }} km -
                  {{ registroActual.fecha }}
                </div>
              </div>
            </div>
          </v-card-text>
        </v-card>

        <!-- Resultados finales -->
        <div v-if="envioCompleto">
          <v-alert
            :type="
              resultadosEnvio.fallidos.length === 0 ? 'success' : 'warning'
            "
            variant="tonal"
            class="mb-4"
          >
            <div class="d-flex align-center">
              <v-icon size="32" class="mr-3">
                {{
                  resultadosEnvio.fallidos.length === 0
                    ? "mdi-check-circle"
                    : "mdi-alert-circle"
                }}
              </v-icon>
              <div>
                <div class="font-weight-bold">
                  {{
                    resultadosEnvio.fallidos.length === 0
                      ? "¡Envío completado!"
                      : "Envío completado con errores"
                  }}
                </div>
                <div class="text-caption">
                  {{ resultadosEnvio.exitosos.length }} exitosos,
                  {{ resultadosEnvio.fallidos.length }} fallidos
                </div>
              </div>
            </div>
          </v-alert>

          <!-- Lista de exitosos -->
          <v-expansion-panels
            v-if="resultadosEnvio.exitosos.length > 0"
            class="mb-3"
          >
            <v-expansion-panel>
              <v-expansion-panel-title>
                <div class="d-flex align-center">
                  <v-icon color="success" class="mr-2">mdi-check-circle</v-icon>
                  <span class="font-weight-medium">
                    Registros exitosos ({{ resultadosEnvio.exitosos.length }})
                  </span>
                </div>
              </v-expansion-panel-title>
              <v-expansion-panel-text>
                <v-list density="compact">
                  <v-list-item
                    v-for="(item, idx) in resultadosEnvio.exitosos"
                    :key="idx"
                  >
                    <template v-slot:prepend>
                      <v-icon color="success" size="small">mdi-check</v-icon>
                    </template>
                    <v-list-item-title>{{ item.patente }}</v-list-item-title>
                    <v-list-item-subtitle>
                      {{ item.kilometros }} km - {{ item.fecha }}
                    </v-list-item-subtitle>
                  </v-list-item>
                </v-list>
              </v-expansion-panel-text>
            </v-expansion-panel>
          </v-expansion-panels>

          <!-- Lista de fallidos -->
          <v-expansion-panels v-if="resultadosEnvio.fallidos.length > 0">
            <v-expansion-panel>
              <v-expansion-panel-title>
                <div class="d-flex align-center">
                  <v-icon color="error" class="mr-2">mdi-alert-circle</v-icon>
                  <span class="font-weight-medium">
                    Registros fallidos ({{ resultadosEnvio.fallidos.length }})
                  </span>
                </div>
              </v-expansion-panel-title>
              <v-expansion-panel-text>
                <v-list density="compact">
                  <v-list-item
                    v-for="(item, idx) in resultadosEnvio.fallidos"
                    :key="idx"
                  >
                    <template v-slot:prepend>
                      <v-icon color="error" size="small">mdi-close</v-icon>
                    </template>
                    <v-list-item-title>{{ item.patente }}</v-list-item-title>
                    <v-list-item-subtitle class="text-error">
                      {{ item.error }}
                    </v-list-item-subtitle>
                  </v-list-item>
                </v-list>
              </v-expansion-panel-text>
            </v-expansion-panel>
          </v-expansion-panels>
        </div>
      </v-card-text>

      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn
          v-if="envioCompleto"
          color="primary"
          variant="flat"
          @click="cerrarDialog"
        >
          Cerrar
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, watch } from "vue";
import { useKilometrosStore } from "@/stores/useKilometrosStore";

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  registros: {
    type: Array,
    default: () => [],
  },
});

const emit = defineEmits(["update:modelValue", "completado"]);

const csvStore = useKilometrosStore();

const dialogVisible = ref(false);
const envioCompleto = ref(false);
const progresoActual = ref(0);
const totalRegistros = ref(0);
const registroActual = ref(null);
const resultadosEnvio = ref({
  exitosos: [],
  fallidos: [],
});

// Sincronizar con v-model
watch(
  () => props.modelValue,
  (newVal) => {
    dialogVisible.value = newVal;
    if (newVal) {
      iniciarEnvio();
    }
  }
);

watch(dialogVisible, (newVal) => {
  emit("update:modelValue", newVal);
});

const iniciarEnvio = async () => {
  // Resetear estados
  envioCompleto.value = false;
  progresoActual.value = 0;
  registroActual.value = null;
  resultadosEnvio.value = { exitosos: [], fallidos: [] };
  totalRegistros.value = props.registros.length;

  // Preparar datos
  const datosParaEnviar = props.registros.map((registro) => ({
    patente: registro.descripcion,
    kilometros: parseFloat(registro.kilometros),
    fecha: registro.fecha,
  }));

  // Llamar al método del store con callback de progreso
  const resultado = await csvStore.saveRegistroCabyCuerpo(
    datosParaEnviar,
    (actual, registro) => {
      progresoActual.value = actual;
      registroActual.value = registro;
    }
  );

  // Mostrar resultados
  resultadosEnvio.value = resultado.resultados;
  envioCompleto.value = true;

  // Emitir evento de completado
  emit("completado", resultado);
};

const cerrarDialog = () => {
  dialogVisible.value = false;
};
</script>
