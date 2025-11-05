// useComprasStore.js
import { defineStore } from "pinia";
import { postData } from "@/service/apiService";

export const useComprasStore = defineStore("compras", {
  state: () => ({
    comprasA: [],
    comprasB: [],
    loading: false,
    error: null,
  }),
  actions: {
    async fetchCompras() {
      this.loading = true; // 👈 empieza el loading
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
      } finally {
        this.loading = false; // 👈 termina el loading
      }
    },
  },
});
