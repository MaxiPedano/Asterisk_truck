<template>
  <v-app>
    <v-app-bar elevation="0" color="primary" density="compact">
      <v-app-bar-title class="text-subtitle-1 font-weight-normal">
        <v-icon class="mr-1">mdi-file-table</v-icon>
        CSV Import Manager
      </v-app-bar-title>
    </v-app-bar>

    <v-main>
      <div class="bg-grey-lighten-4 min-h-screen py-8">
        <VHome />
      </div>
    </v-main>
  </v-app>
</template>

<script setup>
import VHome from "./view/VHome.vue";
</script>
