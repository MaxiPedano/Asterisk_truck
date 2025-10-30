<script setup>
import { reactive } from "vue";
import { useAuthStore } from "../stores/authStore";

const { credentials, saveCredentials } = useAuthStore();

const authForm = reactive({
  username: "",
  password: "",
});

const rules = {
  required: (value) => !!value || "Este campo es requerido",
};
</script>
<template>
  <v-card elevation="2" class="mb-4" v-if="!credentials.saved">
    <v-card-title class="d-flex align-center">
      <v-icon class="mr-1" color="warning">mdi-key</v-icon>
      <span class="text-subtitle-1 font-weight-light"
        >Credenciales de Acceso</span
      >
    </v-card-title>
    <v-card-text>
      <v-alert type="info" variant="tonal" class="mb-4" closable>
        Ingresa tus credenciales para acceder a la API
      </v-alert>
      <v-row>
        <v-col cols="12" md="6">
          <v-text-field
            v-model="authForm.username"
            label="Usuario"
            prepend-icon="mdi-account"
            variant="outlined"
            density="compact"
            :rules="[rules.required]"
          />
        </v-col>
        <v-col cols="12" md="6">
          <v-text-field
            v-model="authForm.password"
            label="Contraseña"
            type="password"
            prepend-icon="mdi-lock"
            variant="outlined"
            density="compact"
            :rules="[rules.required]"
          />
        </v-col>
      </v-row>
      <v-btn
        @click="saveCredentials"
        color="primary"
        :disabled="!authForm.username || !authForm.password"
        prepend-icon="mdi-check"
      >
        Guardar Credenciales
      </v-btn>
    </v-card-text>
  </v-card>
</template>
