<script setup>
import { ref } from "vue";
import VForm from "../components/VForm.vue";
import InstruccionesCompras from "../components/InstruccionesCompras.vue";
import CsvKilometros from "@/components/csvKilometros.vue";
import CsvImportForm from "@/components/csvImportForm.vue";

const tab = ref("one");
</script>

<template>
  <v-container fluid>
    <v-row justify="center">
      <v-col cols="12" md="10" lg="8">
        <VForm />

        <v-tabs v-model="tab" color="primary">
          <v-tab value="one">Csv Kilometros</v-tab>
          <v-tab value="two">Csv Compras</v-tab>
        </v-tabs>

        <v-tabs-window v-model="tab">
          <v-tabs-window-item value="one">
            <CsvKilometros />
          </v-tabs-window-item>

          <v-tabs-window-item value="two">
            <InstruccionesCompras />
            <CsvImportForm />
          </v-tabs-window-item>
        </v-tabs-window>
      </v-col>
    </v-row>
  </v-container>
</template>
