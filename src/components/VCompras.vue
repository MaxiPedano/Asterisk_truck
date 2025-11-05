<template>
  <v-container>
    <v-row>
      <v-col cols="12" class="d-flex align-center justify-space-between">
        <h2 class="text-h5 font-weight-bold">Listado de Compras</h2>

        <v-btn
          @click="cols"
          color="primary"
          variant="flat"
          prepend-icon="mdi-refresh"
        >
          Actualizar
        </v-btn>

        <v-select
          v-model="vista"
          :items="[
            { title: 'Compras A', value: 'A' },
            { title: 'Compras B', value: 'B' },
          ]"
          label="Seleccionar vista"
          variant="outlined"
          density="compact"
          style="max-width: 200px"
        />
      </v-col>

      <v-col cols="12">
        <v-data-table
          :headers="headers"
          :items="rows"
          :items-per-page="10"
          class="elevation-2"
        >
          <template #item.creationdate="{ item }">
            {{ formatFecha(item.creationdate) }}
          </template>

          <template #no-data>
            <v-alert type="info" variant="outlined" class="ma-4">
              No hay registros disponibles.
            </v-alert>
          </template>
        </v-data-table>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { useComprasStore } from "@/stores/useComprasStore";

const store = useComprasStore();
const vista = ref("A");

onMounted(async () => {
  await store.fetchCompras();
});

const cols = () => {
  store.updateCols();
};

const headers = computed(() => {
  const currentCols =
    vista.value === "A" ? store.comprasA.cols : store.comprasB.cols;

  // transformar ["col1", "col2"] → [{ title: "col1", key: "col1" }, ...]
  return (
    currentCols?.map((col) => ({
      title: col,
      key: col,
      align: "start",
      sortable: true,
    })) || []
  );
});

const rows = computed(() =>
  vista.value === "A" ? store.comprasA.rows : store.comprasB.rows
);

const formatFecha = (fecha) =>
  fecha ? new Date(fecha).toLocaleDateString("es-AR") : "";
</script>
