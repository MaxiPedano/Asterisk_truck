<script setup>
import { ref } from "vue";
import VForm from "../components/VForm.vue";
import InstruccionesCompras from "../components/InstruccionesCompras.vue";
import CsvKilometros from "@/components/csvKilometros.vue";
import csvImportForm from "@/components/csvImportForm.vue";
const tab = ref("one"); // 👈 valor inicial

import { postData } from "@/service/apiService";
import CsvImportForm from "@/components/csvImportForm.vue";
</script>

<template>
  <v-container fluid>
    <v-row justify="center">
      <v-col cols="12" md="10" lg="8">
        <VForm />

        <!-- Tabs con v-model -->
        <v-tabs v-model="tab" color="primary">
          <v-tab value="one">Csv Compras</v-tab>
          <v-tab value="two">Csv Kilometros</v-tab>
          <v-tab value="tres">Prueba</v-tab>
        </v-tabs>

        <!-- Contenido sincronizado -->
        <v-tabs-window v-model="tab">
          <v-tabs-window-item value="one">
            <InstruccionesCompras />
            <CsvImportForm />
          </v-tabs-window-item>

          <v-tabs-window-item value="two">
            <CsvKilometros />
          </v-tabs-window-item>

          <v-tabs-window-item value="tres">
            <h1>Prueba</h1>
          </v-tabs-window-item>
        </v-tabs-window>
      </v-col>
    </v-row>
  </v-container>
</template>
