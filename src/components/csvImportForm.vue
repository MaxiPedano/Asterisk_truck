<template> 
  <v-container fluid class="importer-root">
    <v-row justify="center">
      <v-col cols="12" md="9" lg="7">

        <!-- Header -->
        <div class="page-header mb-6">
          <div class="d-flex align-center" style="gap:14px">
            <div class="header-icon-wrap">
              <v-icon color="#22c55e" size="20">mdi-file-table-outline</v-icon>
            </div>
            <div>
              <p class="header-eyebrow">Módulo de Importación</p>
              <h1 class="header-title">Importador CSV</h1>
            </div>
          </div>
        </div>

        <!-- Credenciales -->
        <v-card class="fin-card mb-4" v-if="!credentials.saved">
          <div class="fin-card-header">
            <v-icon color="#22c55e" size="16" class="mr-2">mdi-shield-key-outline</v-icon>
            <span class="fin-card-title">Autenticación</span>
          </div>
          <v-card-text class="pt-4 pb-5">
            <div class="info-banner mb-4">
              <v-icon size="14" color="#22c55e" class="mr-2">mdi-information-outline</v-icon>
              <span>Ingresa tus credenciales para acceder a la API</span>
            </div>
            <v-row>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="authForm.username"
                  label="Usuario"
                  prepend-inner-icon="mdi-account-outline"
                  variant="outlined"
                  :rules="[rules.required]"
                  class="fin-input"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="authForm.password"
                  label="Contraseña"
                  type="password"
                  prepend-inner-icon="mdi-lock-outline"
                  variant="outlined"
                  :rules="[rules.required]"
                  class="fin-input"
                />
              </v-col>
            </v-row>
            <button
              type="button"
              class="action-btn action-btn--primary"
              :disabled="!authForm.username || !authForm.password"
              @click="saveCredentials"
            >
              <v-icon size="15" class="mr-1">mdi-check-circle-outline</v-icon>
              Confirmar Acceso
            </button>
          </v-card-text>
        </v-card>

        <!-- Formulario principal -->
        <v-card class="fin-card" :disabled="!credentials.saved">
          <div class="fin-card-header">
            <v-icon color="#22c55e" size="16" class="mr-2">mdi-cog-outline</v-icon>
            <span class="fin-card-title">Configuración de Importación</span>
          </div>

          <v-card-text class="pt-5 pb-5">
            <v-form @submit.prevent="handleSubmit" ref="form">

              <p class="section-label mb-3">Tipo de Comprobante</p>

              <div class="doctype-group mb-3">
                <div class="serie-badge serie-a">
                  <v-icon size="11" class="mr-1">mdi-circle-small</v-icon>
                  SERIE A — IVA Discriminado
                </div>
                <div class="btn-row mt-2">
                  <button type="button" class="doc-btn doc-btn--a" @click="setComprasA">
                    <v-icon size="12" class="mr-1">mdi-receipt-text-outline</v-icon>
                    Factura A
                  </button>
                  <button type="button" class="doc-btn doc-btn--a" @click="setNotaCreditoA">
                    <v-icon size="12" class="mr-1">mdi-minus-circle-outline</v-icon>
                    Nota de Crédito A
                  </button>
                  <button type="button" class="doc-btn doc-btn--a" @click="setNotaDebitoA">
                    <v-icon size="12" class="mr-1">mdi-plus-circle-outline</v-icon>
                    Nota de Débito A
                  </button>
                </div>
              </div>

              <div class="doctype-group mb-5">
                <div class="serie-badge serie-b">
                  <v-icon size="11" class="mr-1">mdi-circle-small</v-icon>
                  SERIE B — Consumidor Final
                </div>
                <div class="btn-row mt-2">
                  <button type="button" class="doc-btn doc-btn--b" @click="setComprasB">
                    <v-icon size="12" class="mr-1">mdi-receipt-text-outline</v-icon>
                    Factura B
                  </button>
                  <button type="button" class="doc-btn doc-btn--b" @click="setNotaCreditoB">
                    <v-icon size="12" class="mr-1">mdi-minus-circle-outline</v-icon>
                    Nota de Crédito B
                  </button>
                  <button type="button" class="doc-btn doc-btn--b" @click="setNotaDebitoB">
                    <v-icon size="12" class="mr-1">mdi-plus-circle-outline</v-icon>
                    Nota de Débito B
                  </button>
                </div>
              </div>

              <p class="section-label mb-3">Parámetros de Flujo</p>
              <div class="ids-panel mb-5">
                <div class="id-field">
                  <label class="id-label">FLOW ID</label>
                  <v-text-field v-model="localFormParams.flowid" type="number" :rules="[rules.required]" variant="outlined" density="compact" hide-details class="fin-input id-input"/>
                </div>
                <div class="id-sep"></div>
                <div class="id-field">
                  <label class="id-label">STATUS FLOW ID</label>
                  <v-text-field v-model="localFormParams.statusflowid" type="number" :rules="[rules.required]" variant="outlined" density="compact" hide-details class="fin-input id-input"/>
                </div>
                <div class="id-sep"></div>
                <div class="id-field">
                  <label class="id-label">STATUS ID</label>
                  <v-text-field v-model="localFormParams.statusid" type="number" :rules="[rules.required]" variant="outlined" density="compact" hide-details class="fin-input id-input"/>
                </div>
              </div>

              <div class="fin-divider mb-5"></div>

              <p class="section-label mb-3">Archivo de Datos</p>
              <v-file-input
                v-model="selectedFileArray"
                label="Seleccionar archivo .csv"
                accept=".csv"
                :rules="[rules.required]"
                variant="outlined"
                @change="handleFileSelect"
                class="fin-input"
                prepend-inner-icon="mdi-paperclip"
                prepend-icon=""
              />

              <div class="actions-row mt-2">
                <button type="button" class="action-btn action-btn--ghost" @click="testConnection">
                  <v-icon size="15" class="mr-1">mdi-lan-connect</v-icon>
                  Probar Conexión
                </button>
                <button
                  type="submit"
                  class="action-btn action-btn--primary action-btn--grow"
                  :disabled="!selectedFile || !credentials.saved"
                >
                  <v-icon size="15" class="mr-1">mdi-upload-outline</v-icon>
                  Procesar Importación
                </button>
              </div>

            </v-form>
          </v-card-text>
        </v-card>

        <CSVResults
          v-if="processingResults && !isLoading"
          :results="processingResults"
          class="mt-6"
        />

      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useCSV } from '../composables/useCSV'
import CSVResults from './csvResult.vue'

const {
  isLoading, processingResults, connectionStatus, credentials,
  processCSV, testConnection: testConn, updateFormParams, setCredentials
} = useCSV()

const selectedFile     = ref(null)
const selectedFileArray = ref([])
const localFormParams  = reactive({ flowid: '', statusid: '', statusflowid: '' })
const authForm         = reactive({ username: '', password: '' })
const rules            = { required: v => !!v || 'Requerido' }

function saveCredentials() {
  if (authForm.username && authForm.password) setCredentials(authForm.username, authForm.password)
}
function setComprasA()     { localFormParams.flowid='11080'; localFormParams.statusid='1711';  localFormParams.statusflowid='776'  }
function setNotaCreditoA() { localFormParams.flowid='11094'; localFormParams.statusid='1733';  localFormParams.statusflowid='801'  }
function setNotaDebitoA()  { localFormParams.flowid='11097'; localFormParams.statusid='806';   localFormParams.statusflowid='1691' }
function setComprasB()     { localFormParams.flowid='11079'; localFormParams.statusid='1692';  localFormParams.statusflowid='774'  }
function setNotaCreditoB() { localFormParams.flowid='11098'; localFormParams.statusid='1734';  localFormParams.statusflowid='803'  }
function setNotaDebitoB()  { localFormParams.flowid='11096'; localFormParams.statusid='1736';  localFormParams.statusflowid='807'  }

function handleFileSelect(event) {
  selectedFile.value = event?.target?.files?.[0] || selectedFileArray.value?.[0] || null
}
async function testConnection() { await testConn() }
async function handleSubmit() {
  if (!selectedFile.value || !credentials.value.saved) return
  updateFormParams(localFormParams)
  await processCSV(selectedFile.value)
}
</script>

<!-- 🔥 ESTILO NUEVO PREMIUM DASHBOARD -->
<style scoped>

.importer-root {
  background: radial-gradient(circle at 30% 0%, #1a2e1f 0%, #0e1412 70%);
  min-height: 100vh;
  padding: 60px 20px;
  font-family: 'IBM Plex Sans', sans-serif;
}

/* HEADER */
.header-icon-wrap {
  width: 48px;
  height: 48px;
  background: #13221a;
  border: 1px solid #1f3a2a;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 0 1px rgba(34,197,94,0.1), 0 10px 30px rgba(0,0,0,0.6);
}

.header-eyebrow {
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #22c55e;
  margin: 0 0 6px;
}

.header-title {
  font-size: 1.6rem;
  font-weight: 600;
  color: #ffffff;
  margin: 0;
}

/* CARDS */
.fin-card {
  background: #111815 !important;
  border: 1px solid #1e2a24 !important;
  border-radius: 16px !important;
  box-shadow: 0 15px 45px rgba(0,0,0,0.65) !important;
  overflow: hidden;
}

.fin-card-header {
  padding: 16px 22px;
  border-bottom: 1px solid #1e2a24;
  background: #0f1512;
}

.fin-card-title {
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #5e7567;
}

/* SECTION */
.section-label {
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #4b6254;
}

/* BLOQUES */
.doctype-group {
  background: #0f1512;
  border: 1px solid #1c2621;
  border-radius: 12px;
  padding: 18px;
}

/* BOTONES */
.doc-btn {
  padding: 7px 18px;
  border-radius: 10px;
  font-size: 0.8rem;
  border: 1px solid;
  transition: all 0.15s ease;
}

.doc-btn--a {
  background: rgba(34,197,94,0.08);
  border-color: rgba(34,197,94,0.4);
  color: #4ade80;
}
.doc-btn--a:hover {
  background: rgba(34,197,94,0.15);
}

.doc-btn--b {
  background: rgba(96,165,250,0.08);
  border-color: rgba(96,165,250,0.4);
  color: #93c5fd;
}
.doc-btn--b:hover {
  background: rgba(96,165,250,0.15);
}

/* 🔥 INPUTS — CORREGIDO ALTO CONTRASTE */
.fin-input :deep(.v-field) {
  background: #0c1210 !important;
  border: 1px solid #1f3a2a !important;
  border-radius: 12px !important;
}

.fin-input :deep(.v-field--focused) {
  border: 1px solid #22c55e !important;
  box-shadow: 0 0 0 2px rgba(34,197,94,0.25) !important;
}

.fin-input :deep(input),
.fin-input :deep(.v-field__input) {
  color: #ffffff !important;
  font-weight: 500;
  font-size: 0.95rem;
}

.fin-input :deep(.v-label) {
  color: #6b8577 !important;
  font-size: 0.85rem !important;
}

.fin-input :deep(.v-icon) {
  color: #3e5c4a !important;
}

/* IDS PANEL */
.ids-panel {
  background: #0f1512;
  border: 1px solid #1c2621;
  border-radius: 12px;
  padding: 20px;
}

.id-label {
  font-size: 0.65rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #4b6254;
  margin-bottom: 6px;
}

/* BOTONES PRINCIPALES */
.action-btn {
  padding: 12px 26px;
  border-radius: 12px;
  font-size: 0.85rem;
  font-weight: 600;
  transition: all 0.15s ease;
}

.action-btn--primary {
  background: #22c55e;
  border: 1px solid #22c55e;
  color: #08120d;
  box-shadow: 0 10px 30px rgba(34,197,94,0.35);
}

.action-btn--primary:hover:not(:disabled) {
  transform: translateY(-2px);
  background: #16a34a;
}

.action-btn--ghost {
  background: transparent;
  border: 1px solid #1f3a2a;
  color: #6b8577;
}

.action-btn--ghost:hover {
  border-color: #22c55e;
  color: #22c55e;
}

/* TABLA */
.ref-table {
  font-size: 0.8rem;
  color: #9fb3a6;
}

.ref-table th {
  color: #4b6254;
}

.ref-a .ref-name { color: #22c55e; }
.ref-b .ref-name { color: #60a5fa; }

</style>
