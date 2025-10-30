<script setup>
import { reactive } from "vue";
import { useAuthStore } from "../stores/authStore";

const authStore = useAuthStore();
const { credentials } = authStore;

const authForm = reactive({
  username: "",
  password: "",
});

const loading = reactive({
  saving: false,
});

const error = reactive({
  message: "",
});

const rules = {
  required: (value) => !!value || "Este campo es requerido",
};

async function handleSaveCredentials() {
  try {
    loading.saving = true;
    error.message = "";

    // Guardar credenciales en el store (esto ya guarda en localStorage)
    authStore.saveCredentials({
      username: authForm.username,
      password: authForm.password,
    });

    // Ahora intentamos hacer login real para validar
    await authStore.testConnection();

    console.log("✅ Credenciales guardadas y validadas");
  } catch (err) {
    console.error("❌ Error al validar credenciales:", err);
    error.message = err.message || "Credenciales inválidas";

    // Limpiamos todo si falló
    authStore.clearCredentials();
  } finally {
    loading.saving = false;
  }
}
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

      <!-- Mostrar error si existe -->
      <v-alert
        v-if="error.message"
        type="error"
        variant="tonal"
        class="mb-4"
        closable
        @click:close="error.message = ''"
      >
        {{ error.message }}
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
            :disabled="loading.saving"
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
            :disabled="loading.saving"
            @keyup.enter="handleSaveCredentials"
          />
        </v-col>
      </v-row>
      <v-btn
        @click="handleSaveCredentials"
        color="primary"
        :disabled="!authForm.username || !authForm.password"
        :loading="loading.saving"
        prepend-icon="mdi-check"
      >
        Guardar y Validar Credenciales
      </v-btn>
    </v-card-text>
  </v-card>

  <!-- Card cuando ya está logueado -->
  <v-card elevation="2" class="mb-4" v-else>
    <v-card-title class="d-flex align-center">
      <v-icon class="mr-1" color="success">mdi-check-circle</v-icon>
      <span class="text-subtitle-1 font-weight-light">Sesión Activa</span>
    </v-card-title>
    <v-card-text>
      <v-alert type="success" variant="tonal" class="mb-4">
        Conectado como: <strong>{{ credentials.username }}</strong>
      </v-alert>
      <v-btn
        @click="authStore.clearCredentials()"
        color="error"
        variant="outlined"
        prepend-icon="mdi-logout"
      >
        Cerrar Sesión
      </v-btn>
    </v-card-text>
  </v-card>
</template>
