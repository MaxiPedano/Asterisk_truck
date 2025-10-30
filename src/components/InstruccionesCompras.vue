<script setup></script>

<template>
  <v-expansion-panels>
    <v-expansion-panel>
      <v-expansion-panel-title>
        <v-card-title class="d-flex align-center py-4">
          <v-icon class="mr-3" size="large" color="info">
            mdi-clipboard-text-outline
          </v-icon>
          <span class="text-h6 font-weight-regular">Instrucciones de Uso</span>
        </v-card-title>
      </v-expansion-panel-title>

      <v-expansion-panel-text>
        <v-list density="compact">
          <v-list-item>
            <template #prepend>
              <v-avatar size="24" color="primary" class="text-white">
                <span class="text-caption">1</span>
              </v-avatar>
            </template>
            <v-list-item-title class="text-body-1">
              Selecciona un archivo CSV con los datos a importar desde tu
              computadora.
            </v-list-item-title>
          </v-list-item>

          <v-list-item>
            <template #prepend>
              <v-avatar size="24" color="primary" class="text-white">
                <span class="text-caption">2</span>
              </v-avatar>
            </template>
            <v-list-item-title class="text-body-1 mb-3">
              Completa los campos requeridos con los valores correspondientes:
            </v-list-item-title>
            <div class="ml-8">
              <v-alert
                variant="tonal"
                color="success"
                density="compact"
                class="mb-2"
                icon="mdi-shopping"
              >
                <div class="text-body-2">
                  <strong>COMPRAS B:</strong> FLOWID: 11079 | STATUSFLOW: 774 |
                  STATUSID: 1692
                </div>
              </v-alert>
              <v-alert
                variant="tonal"
                color="info"
                density="compact"
                icon="mdi-shopping-outline"
              >
                <div class="text-body-2">
                  <strong>COMPRAS A:</strong> FLOWID: 11080 | STATUSFLOW: 776 |
                  STATUSID: 1711
                </div>
              </v-alert>
            </div>
          </v-list-item>

          <v-list-item>
            <template #prepend>
              <v-avatar size="24" color="primary" class="text-white">
                <span class="text-caption">3</span>
              </v-avatar>
            </template>
            <v-list-item-title class="text-body-1">
              Verifica que todos los campos obligatorios estén completos antes
              de continuar.
            </v-list-item-title>
          </v-list-item>

          <v-list-item>
            <template #prepend>
              <v-avatar size="24" color="primary" class="text-white">
                <span class="text-caption">4</span>
              </v-avatar>
            </template>
            <v-list-item-title class="text-body-1">
              Haz clic en "Importar CSV" para iniciar la importación de datos.
            </v-list-item-title>
          </v-list-item>

          <v-list-item>
            <template #prepend>
              <v-avatar size="24" color="primary" class="text-white">
                <span class="text-caption">5</span>
              </v-avatar>
            </template>
            <v-list-item-title class="text-body-1">
              Espera a que se complete el proceso. Los registros se procesarán
              en lotes de 10 para evitar desconexiones.
            </v-list-item-title>
          </v-list-item>
        </v-list>
      </v-expansion-panel-text>
    </v-expansion-panel>
  </v-expansion-panels>
</template>
