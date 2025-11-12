// useComprasStore.js
import { defineStore } from "pinia";
import { postData } from "@/service/apiService";

export const useComprasStore = defineStore("compras", {
  state: () => ({
    comprasA: [],
    comprasB: [],
    loading: false,
    error: null,
    comprasSeleccionadas: [],
    clasificando: false,
  }),
  actions: {
    async fetchCompras() {
      this.loading = true;
      this.error = null;

      try {
        const flowidA = 11080;
        const statusidA = 1711;
        const flowidB = 11079;
        const statusidB = 1692;

        const dataA = {
          flowid: flowidA,
          statusid: statusidA,
          pattern: "",
          offset: 0,
          sort: "referenciatexto",
          descending: false,
        };

        const dataB = {
          flowid: flowidB,
          statusid: statusidB,
          pattern: "",
          offset: 0,
          sort: "referenciatexto",
          descending: false,
        };

        const [comprasARes, comprasBRes] = await Promise.all([
          postData("/workspace/getRegistroCabList", dataA),
          postData("/workspace/getRegistroCabList", dataB),
        ]);

        this.comprasA = comprasARes?.data || [];
        this.comprasB = comprasBRes?.data || [];

        console.log("Compras A:", this.comprasA.cols);
        console.log("Compras B:", this.comprasB);
      } catch (error) {
        console.error("Error al obtener compras:", error);
        this.error = "Error al cargar las compras";
        throw error;
      } finally {
        this.loading = false;
      }
    },

    // 👇 Acción para crear registros clasificados con distribución de importes
    async crearRegistrosClasificados(compra, distribuciones) {
      this.clasificando = true;
      this.error = null;

      try {
        // distribuciones es un array como:
        // [
        //   { clasificacion: "Camión 1", importes: { totalimpuestos: 100, totalprecio: 500, varcn0: 50, ... } },
        //   { clasificacion: "Camión 2", importes: { totalimpuestos: 50, totalprecio: 250, varcn0: 25, ... } }
        // ]

        const promesas = distribuciones.map(distribucion => {
          const nuevoRegistro = {
            id: -1,
            flowid: 11088,
            statusid: 1715,
            statusflowid: 781,
            
            // Datos de la clasificación
            opciondesplegabletexto: distribucion.clasificacion,
            opciondesplegableid: null,
            
            // Copiar datos de la compra original
            clientid: compra.clientid || null,
            clientname: compra.clientname || null,
            referenciatexto: compra.referenciatexto || null,
            fecha: compra.fecha || null,
            fechacompromiso: compra.fechacompromiso || null,
            
            // Importes distribuidos
            totalimpuestos: distribucion.importes.totalimpuestos || null,
            totalprecio: distribucion.importes.totalprecio || null,
            varcn0: distribucion.importes.varcn0 || 0,
            varcn1: distribucion.importes.varcn1 || 0,
            varcn2: distribucion.importes.varcn2 || 0,
            varcn3: distribucion.importes.varcn3 || 0,
            
            // Responsable actual
            responsableactactualid: "358",
            responsableactactual: {
              id: "358",
              identificador: ""
            },
            
            // Ubicación
            xlatitud: -32.4193186,
            xlongitud: -63.2334244,
            
            // Campos null/vacíos por defecto
            articuloGenerar: null,
            articuloGenerarId: null,
            articulocantidad: 0,
            auditor: null,
            auditorid: null,
            calidadfinal: null,
            condventaid: null,
            contactosid: null,
            cuentacontableid: null,
            cuerpos: [],
            dependeDe: [],
            depositoarticuloid: null,
            descrip: null,
            ejecutor: null,
            ejecutorid: null,
            envcontact: null,
            envcp: null,
            envdirec: null,
            envlocalid: null,
            envmail: null,
            envpais: null,
            envprov: null,
            envtelef: null,
            externalid: null,
            fechavencimiento: null,
            instructivoExec: [],
            listaprecioid: null,
            macroprocesoid: null,
            notas: null,
            obsactuar: null,
            obsadm: null,
            obsinicio: null,
            obsoo: null,
            obsprod: null,
            obsventas: null,
            obsverificar: null,
            parteinteresadatipoid: null,
            procesoid: null,
            puestotrabajoid: null,
            showDependeDe: false,
            vendedor: null,
            vendedorid: null,
          };

          return postData("/workspace/saveRegistroCab", nuevoRegistro);
        });

        // Ejecutar todas las creaciones en paralelo
        const resultados = await Promise.all(promesas);

        // Recargar los datos después de crear
        await this.fetchCompras();

        return {
          success: true,
          creados: resultados.length,
          resultados
        };

      } catch (error) {
        console.error("Error al crear registros clasificados:", error);
        this.error = "Error al clasificar las compras";
        throw error;
      } finally {
        this.clasificando = false;
      }
    },

    limpiarSeleccion() {
      this.comprasSeleccionadas = [];
    },
  },

  getters: {
    cantidadSeleccionadas: (state) => state.comprasSeleccionadas.length,
    haySeleccion: (state) => state.comprasSeleccionadas.length > 0,
  },
});