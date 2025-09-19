<template>
  <v-app>
    <v-app-bar elevation="2" color="primary">
      <v-app-bar-title class="text-h5 font-weight-bold">
        <v-icon class="mr-2">mdi-file-table</v-icon>
        CSV Import Manager
      </v-app-bar-title>
    </v-app-bar>

    <v-main>
      <div class="bg-grey-lighten-4 min-h-screen py-8">
        <CSVImportForm />
      </div>
    </v-main>
  </v-app>
</template>

<script setup>
import CSVImportForm from './components/csvImportForm.vue'
</script>

