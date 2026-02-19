<template>
  <v-app theme="dark">
    <v-app-bar
      flat
      class="app-bar-dark"
    >
      <v-app-bar-title class="text-h6 font-weight-semibold d-flex align-center">
        <v-icon class="mr-3 text-green-accent-3">
          mdi-file-table
        </v-icon>
        CSV Import Manager
      </v-app-bar-title>
    </v-app-bar>

    <v-main class="main-dark">
      <CSVImportForm />
    </v-main>
  </v-app>
</template>

<script setup>
import CSVImportForm from './components/csvImportForm.vue'
</script>

<style scoped>
.app-bar-dark {
  background: #0f172a !important; /* slate-900 */
  border-bottom: 1px solid rgba(255,255,255,0.05);
}

.main-dark {
  background: radial-gradient(
    circle at top left,
    #0b1f17,
    #07140f 60%,
    #050b08
  );
  min-height: 100vh;
}
</style>
