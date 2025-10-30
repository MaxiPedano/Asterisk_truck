<script setup>
import { ref } from "vue";
import VForm from "../components/VForm.vue";
import InstruccionesCompras from "../components/InstruccionesCompras.vue";
import CsvKilometros from "@/components/csvKilometros.vue";
const tab = ref("one"); // 👈 valor inicial
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
        </v-tabs>

        <!-- Contenido sincronizado -->
        <v-tabs-window v-model="tab">
          <v-tabs-window-item value="one">
            <InstruccionesCompras />
          </v-tabs-window-item>

          <v-tabs-window-item value="two">
            <CsvKilometros />
          </v-tabs-window-item>
        </v-tabs-window>
      </v-col>
    </v-row>
  </v-container>
</template>
