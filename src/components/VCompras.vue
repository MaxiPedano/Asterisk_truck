<template>
  <v-container>
    <v-row>
      <v-col cols="12" class="d-flex align-center justify-space-between">
        <h2 class="text-h5 font-weight-bold">Listado de Compras</h2>

        <div class="d-flex gap-2">
          <v-btn
            @click="cols"
            color="primary"
            variant="flat"
            prepend-icon="mdi-refresh"
            :loading="store.loading"
          >
            Actualizar
          </v-btn>
        </div>

        <v-select
          v-model="vista"
          :items="[
            { title: 'Compras A', value: 'A' },
            { title: 'Compras B', value: 'B' },
          ]"
          label="Seleccionar vista"
          variant="outlined"
          density="compact"
          style="max-width: 200px"
        />
      </v-col>

      <!-- Filtros de fecha -->
      <v-col cols="12">
        <v-expansion-panels>
          <v-expansion-panel>
            <v-expansion-panel-title>
              <v-icon start>mdi-filter</v-icon>
              Filtros de Fecha
            </v-expansion-panel-title>
            <v-expansion-panel-text>
              <v-row>
                <v-col cols="12">
                  <div class="text-subtitle-2 mb-2">Fecha</div>
                </v-col>
                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="filtroFechaDesde"
                    type="date"
                    label="Desde"
                    variant="outlined"
                    density="compact"
                    clearable
                    prepend-inner-icon="mdi-calendar"
                  />
                </v-col>
                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="filtroFechaHasta"
                    type="date"
                    label="Hasta"
                    variant="outlined"
                    density="compact"
                    clearable
                    prepend-inner-icon="mdi-calendar"
                  />
                </v-col>

                <v-col cols="12">
                  <div class="text-subtitle-2 mb-2">Fecha Compromiso</div>
                </v-col>
                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="filtroFechaCompromisoDesde"
                    type="date"
                    label="Desde"
                    variant="outlined"
                    density="compact"
                    clearable
                    prepend-inner-icon="mdi-calendar-clock"
                  />
                </v-col>
                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="filtroFechaCompromisoHasta"
                    type="date"
                    label="Hasta"
                    variant="outlined"
                    density="compact"
                    clearable
                    prepend-inner-icon="mdi-calendar-clock"
                  />
                </v-col>

                <v-col cols="12" class="text-right">
                  <v-btn
                    @click="limpiarFiltros"
                    color="secondary"
                    variant="outlined"
                    size="small"
                  >
                    Limpiar filtros
                  </v-btn>
                </v-col>
              </v-row>
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>
      </v-col>

      <v-col cols="12">
        <v-data-table
          :headers="headers"
          :items="rowsFiltradas"
          :items-per-page="10"
          class="elevation-2"
        >
          <template #item.fecha="{ item }">
            {{ formatFecha(item.fecha) }}
          </template>
          <template #item.fechacompromiso="{ item }">
            {{ formatFecha(item.fechacompromiso) }}   
          </template>
          <template #item.totalimpuestos="{ item }">
            {{ formatMoneda(item.totalimpuestos) }}
          </template>
          <template #item.totalprecio="{ item }">
            {{ formatMoneda(item.totalprecio) }}
          </template>
          <template #item.acciones="{ item }">
            <v-btn
              icon="mdi-truck-plus"
              size="small"
              variant="text"
              color="primary"
              @click="abrirDialogClasificar(item)"
            />
          </template>
          <template #no-data>
            <v-alert type="info" variant="outlined" class="ma-4">
              No hay registros disponibles.
            </v-alert>
          </template>
        </v-data-table>
      </v-col>
    </v-row>

    <!-- Dialog para clasificar e importes -->
    <v-dialog v-model="dialogClasificacion" max-width="900" scrollable>
      <v-card>
        <v-card-title class="text-h6 d-flex align-center">
          <v-icon start>mdi-truck-cargo-container</v-icon>
          Clasificar y Distribuir Importes
        </v-card-title>
        
        <v-divider />

        <v-card-text class="pt-4">
          <!-- Información de la compra -->
          <v-card variant="outlined" class="mb-4">
            <v-card-text>
              <div class="text-subtitle-2 mb-2">Compra seleccionada:</div>
              <div><strong>Cliente:</strong> {{ compraSeleccionada?.clientname || 'N/A' }}</div>
              <div><strong>Referencia:</strong> {{ compraSeleccionada?.referenciatexto || 'N/A' }}</div>
              <div class="mt-2">
                <v-chip size="small" class="mr-2">Total Impuestos: {{ formatMoneda(compraSeleccionada?.totalimpuestos) }}</v-chip>
                <v-chip size="small" class="mr-2">Total Precio: {{ formatMoneda(compraSeleccionada?.totalprecio) }}</v-chip>
                <v-chip size="small" class="mr-2">VarCN0: {{ formatMoneda(compraSeleccionada?.varcn0) }}</v-chip>
                <v-chip size="small" class="mr-2">VarCN1: {{ formatMoneda(compraSeleccionada?.varcn1) }}</v-chip>
                <v-chip size="small" class="mr-2">VarCN2: {{ formatMoneda(compraSeleccionada?.varcn2) }}</v-chip>
                <v-chip size="small">VarCN3: {{ formatMoneda(compraSeleccionada?.varcn3) }}</v-chip>
              </div>
            </v-card-text>
          </v-card>

          <!-- Distribuciones -->
          <div class="d-flex justify-space-between align-center mb-3">
            <h3 class="text-subtitle-1">Distribuciones</h3>
            <v-btn
              @click="agregarDistribucion"
              color="primary"
              variant="outlined"
              size="small"
              prepend-icon="mdi-plus"
            >
              Agregar
            </v-btn>
          </div>

          <v-card
            v-for="(dist, index) in distribuciones"
            :key="index"
            variant="outlined"
            class="mb-3"
          >
            <v-card-text>
              <v-row>
                <v-col cols="12" class="d-flex justify-space-between align-center pb-0">
                  <span class="text-subtitle-2">Distribución {{ index + 1 }}</span>
                  <v-btn
                    v-if="distribuciones.length > 1"
                    @click="eliminarDistribucion(index)"
                    icon="mdi-delete"
                    size="x-small"
                    variant="text"
                    color="error"
                  />
                </v-col>

                <v-col cols="12" md="6">
                  <v-select
                    v-model="dist.clasificacion"
                    :items="opcionesClasificacion"
                    label="Clasificación"
                    variant="outlined"
                    density="compact"
                    prepend-inner-icon="mdi-truck"
                  >
                    <template #append-inner>
                      <v-menu>
                        <template #activator="{ props }">
                          <v-btn
                            icon="mdi-plus"
                            size="x-small"
                            variant="text"
                            v-bind="props"
                          />
                        </template>
                        <v-card min-width="250">
                          <v-card-text>
                            <v-text-field
                              v-model="nuevaClasificacion"
                              label="Nueva clasificación"
                              density="compact"
                              @keyup.enter="agregarNuevaClasificacion"
                            />
                            <v-btn
                              block
                              color="primary"
                              size="small"
                              @click="agregarNuevaClasificacion"
                            >
                              Agregar
                            </v-btn>
                          </v-card-text>
                        </v-card>
                      </v-menu>
                    </template>
                  </v-select>
                </v-col>

                <v-col cols="12" md="6">
                  <v-text-field
                    v-model.number="dist.porcentaje"
                    type="number"
                    label="Porcentaje %"
                    variant="outlined"
                    density="compact"
                    prepend-inner-icon="mdi-percent"
                    min="0"
                    max="100"
                    @input="calcularImportesPorPorcentaje(index)"
                  />
                </v-col>

                <v-col cols="12" md="6">
                  <v-text-field
                    v-model.number="dist.importes.totalimpuestos"
                    type="number"
                    label="Total Impuestos"
                    variant="outlined"
                    density="compact"
                    prefix="$"
                    step="0.01"
                  />
                </v-col>

                <v-col cols="12" md="6">
                  <v-text-field
                    v-model.number="dist.importes.totalprecio"
                    type="number"
                    label="Total Precio"
                    variant="outlined"
                    density="compact"
                    prefix="$"
                    step="0.01"
                  />
                </v-col>

                <v-col cols="6" md="3">
                  <v-text-field
                    v-model.number="dist.importes.varcn0"
                    type="number"
                    label="VarCN0"
                    variant="outlined"
                    density="compact"
                    prefix="$"
                    step="0.01"
                  />
                </v-col>

                <v-col cols="6" md="3">
                  <v-text-field
                    v-model.number="dist.importes.varcn1"
                    type="number"
                    label="VarCN1"
                    variant="outlined"
                    density="compact"
                    prefix="$"
                    step="0.01"
                  />
                </v-col>

                <v-col cols="6" md="3">
                  <v-text-field
                    v-model.number="dist.importes.varcn2"
                    type="number"
                    label="VarCN2"
                    variant="outlined"
                    density="compact"
                    prefix="$"
                    step="0.01"
                  />
                </v-col>

                <v-col cols="6" md="3">
                  <v-text-field
                    v-model.number="dist.importes.varcn3"
                    type="number"
                    label="VarCN3"
                    variant="outlined"
                    density="compact"
                    prefix="$"
                    step="0.01"
                  />
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>

          <!-- Totales -->
          <v-card color="grey-lighten-4" variant="flat" class="mt-4">
            <v-card-text>
              <div class="text-subtitle-2 mb-2">Totales distribuidos:</div>
              <v-row dense>
                <v-col cols="6" md="2">
                  <div class="text-caption">Total Impuestos</div>
                  <div class="font-weight-bold">{{ formatMoneda(totalesDistribuidos.totalimpuestos) }}</div>
                </v-col>
                <v-col cols="6" md="2">
                  <div class="text-caption">Total Precio</div>
                  <div class="font-weight-bold">{{ formatMoneda(totalesDistribuidos.totalprecio) }}</div>
                </v-col>
                <v-col cols="6" md="2">
                  <div class="text-caption">VarCN0</div>
                  <div class="font-weight-bold">{{ formatMoneda(totalesDistribuidos.varcn0) }}</div>
                </v-col>
                <v-col cols="6" md="2">
                  <div class="text-caption">VarCN1</div>
                  <div class="font-weight-bold">{{ formatMoneda(totalesDistribuidos.varcn1) }}</div>
                </v-col>
                <v-col cols="6" md="2">
                  <div class="text-caption">VarCN2</div>
                  <div class="font-weight-bold">{{ formatMoneda(totalesDistribuidos.varcn2) }}</div>
                </v-col>
                <v-col cols="6" md="2">
                  <div class="text-caption">VarCN3</div>
                  <div class="font-weight-bold">{{ formatMoneda(totalesDistribuidos.varcn3) }}</div>
                </v-col>
              </v-row>

              <!-- Advertencias si no coinciden los totales -->
              <v-alert
                v-if="!totalesCoincidenCompletamente"
                type="warning"
                variant="tonal"
                density="compact"
                class="mt-3"
              >
                Los totales distribuidos no coinciden exactamente con los importes originales
              </v-alert>
            </v-card-text>
          </v-card>
        </v-card-text>
        
        <v-divider />

        <v-card-actions>
          <v-btn
            @click="prorraterarEquitativamente"
            color="info"
            variant="outlined"
            size="small"
          >
            Prorratear Equitativamente
          </v-btn>
          <v-spacer />
          <v-btn
            @click="cerrarDialog"
            variant="text"
          >
            Cancelar
          </v-btn>
          <v-btn
            @click="guardarClasificacion"
            color="primary"
            variant="flat"
            :loading="store.clasificando"
            :disabled="!puedeGuardar"
          >
            Crear {{ distribuciones.length }} Registro(s)
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Snackbar para notificaciones -->
    <v-snackbar
      v-model="snackbar.show"
      :color="snackbar.color"
      :timeout="3000"
    >
      {{ snackbar.text }}
      <template #actions>
        <v-btn
          variant="text"
          @click="snackbar.show = false"
        >
          Cerrar
        </v-btn>
      </template>
    </v-snackbar>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { useComprasStore } from "@/stores/useComprasStore";

const store = useComprasStore();
const vista = ref("A");

// Filtros de fecha
const filtroFechaDesde = ref(null);
const filtroFechaHasta = ref(null);
const filtroFechaCompromisoDesde = ref(null);
const filtroFechaCompromisoHasta = ref(null);

// Clasificación
const dialogClasificacion = ref(false);
const compraSeleccionada = ref(null);
const distribuciones = ref([]);
const nuevaClasificacion = ref("");

// Opciones de clasificación
const opcionesClasificacion = ref([
  "Camión 1",
  "Camión 2",
  "Camión 3",
  "Camión 4",
  "Transporte Propio",
  "Logística Externa",
]);

// Snackbar
const snackbar = ref({
  show: false,
  text: "",
  color: "success"
});

// Define las columnas que quieres mostrar
const columnasPermitidas = ['clientname', 'fecha', 'fechacompromiso', 'referenciatexto', 'totalimpuestos', 'totalprecio'];

onMounted(async () => {
  await store.fetchCompras();
});

const cols = async () => {
  await store.fetchCompras();
};

const limpiarFiltros = () => {
  filtroFechaDesde.value = null;
  filtroFechaHasta.value = null;
  filtroFechaCompromisoDesde.value = null;
  filtroFechaCompromisoHasta.value = null;
};

const abrirDialogClasificar = (compra) => {
  compraSeleccionada.value = compra;
  distribuciones.value = [crearDistribucionVacia()];
  dialogClasificacion.value = true;
};

const crearDistribucionVacia = () => ({
  clasificacion: null,
  porcentaje: 0,
  importes: {
    totalimpuestos: 0,
    totalprecio: 0,
    varcn0: 0,
    varcn1: 0,
    varcn2: 0,
    varcn3: 0,
  }
});

const agregarDistribucion = () => {
  distribuciones.value.push(crearDistribucionVacia());
};

const eliminarDistribucion = (index) => {
  distribuciones.value.splice(index, 1);
};

const calcularImportesPorPorcentaje = (index) => {
  const dist = distribuciones.value[index];
  const porcentaje = dist.porcentaje / 100;

  dist.importes.totalimpuestos = Math.round((compraSeleccionada.value.totalimpuestos || 0) * porcentaje * 100) / 100;
  dist.importes.totalprecio = Math.round((compraSeleccionada.value.totalprecio || 0) * porcentaje * 100) / 100;
  dist.importes.varcn0 = Math.round((compraSeleccionada.value.varcn0 || 0) * porcentaje * 100) / 100;
  dist.importes.varcn1 = Math.round((compraSeleccionada.value.varcn1 || 0) * porcentaje * 100) / 100;
  dist.importes.varcn2 = Math.round((compraSeleccionada.value.varcn2 || 0) * porcentaje * 100) / 100;
  dist.importes.varcn3 = Math.round((compraSeleccionada.value.varcn3 || 0) * porcentaje * 100) / 100;
};

const prorraterarEquitativamente = () => {
  const cantidad = distribuciones.value.length;
  const porcentaje = 100 / cantidad;

  distribuciones.value.forEach((dist, index) => {
    dist.porcentaje = Math.round(porcentaje * 100) / 100;
    calcularImportesPorPorcentaje(index);
  });
};

const agregarNuevaClasificacion = () => {
  if (nuevaClasificacion.value && !opcionesClasificacion.value.includes(nuevaClasificacion.value)) {
    opcionesClasificacion.value.push(nuevaClasificacion.value);
    nuevaClasificacion.value = "";
    
    snackbar.value = {
      show: true,
      text: "Nueva clasificación agregada",
      color: "success"
    };
  }
};

const cerrarDialog = () => {
  dialogClasificacion.value = false;
  compraSeleccionada.value = null;
  distribuciones.value = [];
};

const guardarClasificacion = async () => {
  try {
    await store.crearRegistrosClasificados(
      compraSeleccionada.value,
      distribuciones.value
    );

    snackbar.value = {
      show: true,
      text: `${distribuciones.value.length} registro(s) creado(s) correctamente`,
      color: "success"
    };

    cerrarDialog();

  } catch (error) {
    snackbar.value = {
      show: true,
      text: "Error al crear los registros clasificados",
      color: "error"
    };
  }
};

const totalesDistribuidos = computed(() => {
  return distribuciones.value.reduce((acc, dist) => {
    acc.totalimpuestos += dist.importes.totalimpuestos || 0;
    acc.totalprecio += dist.importes.totalprecio || 0;
    acc.varcn0 += dist.importes.varcn0 || 0;
    acc.varcn1 += dist.importes.varcn1 || 0;
    acc.varcn2 += dist.importes.varcn2 || 0;
    acc.varcn3 += dist.importes.varcn3 || 0;
    return acc;
  }, {
    totalimpuestos: 0,
    totalprecio: 0,
    varcn0: 0,
    varcn1: 0,
    varcn2: 0,
    varcn3: 0,
  });
});

const totalesCoincidenCompletamente = computed(() => {
  if (!compraSeleccionada.value) return true;
  
  const original = compraSeleccionada.value;
  const distribuido = totalesDistribuidos.value;
  
  const tolerance = 0.01; // Tolerancia de 1 centavo
  
  return (
    Math.abs((original.totalimpuestos || 0) - distribuido.totalimpuestos) < tolerance &&
    Math.abs((original.totalprecio || 0) - distribuido.totalprecio) < tolerance &&
    Math.abs((original.varcn0 || 0) - distribuido.varcn0) < tolerance &&
    Math.abs((original.varcn1 || 0) - distribuido.varcn1) < tolerance &&
    Math.abs((original.varcn2 || 0) - distribuido.varcn2) < tolerance &&
    Math.abs((original.varcn3 || 0) - distribuido.varcn3) < tolerance
  );
});

const puedeGuardar = computed(() => {
  return distribuciones.value.every(dist => dist.clasificacion);
});

const headers = computed(() => {
  const currentCols =
    vista.value === "A" ? store.comprasA.cols : store.comprasB.cols;

  const headersBase = currentCols
    ?.filter(col => columnasPermitidas.includes(col))
    .map((col) => ({
      title: col,
      key: col,
      align: "start",
      sortable: true,
    })) || [];

  // Agregar columna de acciones
  headersBase.push({
    title: "Acciones",
    key: "acciones",
    align: "center",
    sortable: false,
  });
  return headersBase;
});

const rows = computed(() =>
  vista.value === "A" ? store.comprasA.rows : store.comprasB.rows
);

const rowsFiltradas = computed(() => {
  let resultado = rows.value || [];

  if (filtroFechaDesde.value || filtroFechaHasta.value) {
    resultado = resultado.filter(item => {
      if (!item.fecha) return false;
      
      const fechaItem = new Date(item.fecha);
      const desde = filtroFechaDesde.value ? new Date(filtroFechaDesde.value) : null;
      const hasta = filtroFechaHasta.value ? new Date(filtroFechaHasta.value) : null;

      if (desde && fechaItem < desde) return false;
      if (hasta && fechaItem > hasta) return false;
      
      return true;
    });
  }

  if (filtroFechaCompromisoDesde.value || filtroFechaCompromisoHasta.value) {
    resultado = resultado.filter(item => {
      if (!item.fechacompromiso) return false;
      
      const fechaCompromisoItem = new Date(item.fechacompromiso);
      const desde = filtroFechaCompromisoDesde.value ? new Date(filtroFechaCompromisoDesde.value) : null;
      const hasta = filtroFechaCompromisoHasta.value ? new Date(filtroFechaCompromisoHasta.value) : null;

      if (desde && fechaCompromisoItem < desde) return false;
      if (hasta && fechaCompromisoItem > hasta) return false;
      
      return true;
    });
  }

  return resultado;
});

const formatFecha = (fecha) =>
  fecha ? new Date(fecha).toLocaleDateString("es-AR") : "";

const formatMoneda = (valor) => {
  if (valor === null || valor === undefined) return "$0.00";
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2
  }).format(valor);
};
</script>
```

## Características principales implementadas:

### 1. **Distribución de importes**
- Cada compra tiene un botón de acción para clasificarla
- Se puede crear múltiples distribuciones para una misma compra
- Cada distribución tiene su propia clasificación (camión)

### 2. **Campos de importes**
- `totalimpuestos`
- `totalprecio`
- `varcn0`, `varcn1`, `varcn2`, `varcn3`
- Todos son editables individualmente

### 3. **Prorrateo automático**
- **Por porcentaje**: Ingresa un porcentaje y calcula automáticamente los importes
- **Equitativamente**: Botón que divide los importes en partes iguales entre todas las distribuciones

### 4. **Validaciones**
- Muestra totales distribuidos en tiempo real
- Alerta si los totales no coinciden con el original
- No permite guardar sin clasificación

### 5. **Ejemplos de uso**

**Ejemplo 1: Dividir entre 2 camiones equitativamente**
```
Compra original: $1000
- Camión 1: 50% → $500
- Camión 2: 50% → $500
```

**Ejemplo 2: Distribución personalizada**
```
Compra original: $1000
- Camión 1: 60% → $600
- Camión 2: 30% → $300
- Camión 3: 10% → $100
```

**Ejemplo 3: Importes manuales**
```
Compra original: totalimpuestos: $100, totalprecio: $500
- Camión 1: totalimpuestos: $40, totalprecio: $200
- Camión 2: totalimpuestos: $60, totalprecio: $300