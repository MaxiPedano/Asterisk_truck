<script setup>
import { ref } from "vue";
import { useCSVStore } from "@/stores/useCsvStore";

const csvStore = useCSVStore();

function handleFileUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (event) => csvStore.parseCSV(event.target.result);
  reader.readAsText(file, "UTF-8");
}
</script>

<template>
  <div class="p-8 max-w-6xl mx-auto bg-white rounded-2xl shadow-lg">
    <h1 class="text-3xl font-bold mb-2">🚚 Transformador CSV → Odoo</h1>
    <p class="text-gray-500 mb-6">
      Convierte automáticamente tu CSV de kilómetros en formato de flujo.
    </p>

    <label
      class="flex items-center justify-center w-full h-32 border-2 border-dashed border-blue-400 rounded-xl cursor-pointer bg-blue-50 hover:bg-blue-100 transition mb-6"
    >
      <div class="text-center">
        <p class="font-semibold text-blue-700 mb-2">Subir archivo CSV</p>
        <input
          type="file"
          accept=".csv"
          @change="handleFileUpload"
          class="hidden"
        />
      </div>
    </label>

    <div v-if="csvStore.detectedPairs.length > 0" class="mb-6">
      <div class="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg">
        <h3 class="font-bold text-blue-800 mb-2">
          ✅ Pares detectados: {{ csvStore.detectedPairs.length }} camiones
        </h3>
        <div class="space-y-1">
          <div
            v-for="(pair, i) in csvStore.detectedPairs"
            :key="i"
            class="text-sm text-blue-700"
          >
            {{ i + 1 }}. <strong>{{ pair.camion }}</strong>
            <span class="text-gray-500 ml-2">
              (Filas {{ pair.fechaRowIndex + 1 }} y {{ pair.kmRowIndex + 1 }})
            </span>
          </div>
        </div>
      </div>
    </div>

    <button
      v-if="csvStore.csvData.length"
      @click="csvStore.transformData"
      class="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-6 py-4 rounded-lg font-bold text-lg hover:from-blue-600 hover:to-indigo-700 transition shadow-lg"
    >
      Transformar Datos Automáticamente
    </button>

    <div v-if="csvStore.transformedData.length" class="mt-6">
      <table class="w-full text-sm border rounded-lg overflow-hidden">
        <thead class="bg-green-600 text-white">
          <tr>
            <th class="p-2 text-left">#</th>
            <th class="p-2 text-left">Descripción</th>
            <th class="p-2 text-left">Fecha</th>
            <th class="p-2 text-left">Kilómetros</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(row, i) in csvStore.transformedData"
            :key="i"
            class="border-b"
          >
            <td class="p-2">{{ i + 1 }}</td>
            <td class="p-2">{{ row.descripcion }}</td>
            <td class="p-2">{{ row.fecha }}</td>
            <td class="p-2 text-right">{{ row.kilometros }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
