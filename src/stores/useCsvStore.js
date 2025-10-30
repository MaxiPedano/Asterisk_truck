import { defineStore } from "pinia";

export const useCSVStore = defineStore("csv", {
    state: () => ({
        csvData: [],
        headers: [],
        transformedData: [],
        detectedPairs: []
    }),

    actions: {
        parseCSV(text) {
            const lines = text.trim().split("\n");
            const data = lines.map(line => {
                const values = [];
                let current = "";
                let inQuotes = false;

                for (let char of line) {
                    if (char === '"') {
                        inQuotes = !inQuotes;
                    } else if (char === "," && !inQuotes) {
                        values.push(current.trim());
                        current = "";
                    } else {
                        current += char;
                    }
                }
                values.push(current.trim());
                return values;
            });

            this.headers = data[0] || [];
            this.csvData = data.slice(1);
            this.detectPairs();
        },

        detectPairs() {
            const pairs = [];
            const data = this.csvData;

            for (let i = 0; i < data.length - 1; i++) {
                const currentRow = data[i];
                const nextRow = data[i + 1];

                const isFechaRow =
                    currentRow[1] && currentRow[1].toLowerCase().includes("fecha");
                const isKmRow =
                    nextRow[0] &&
                    nextRow[0].trim() !== "" &&
                    nextRow[1] &&
                    nextRow[1].toLowerCase().includes("km");

                if (isFechaRow && isKmRow) {
                    pairs.push({
                        fechaRowIndex: i,
                        kmRowIndex: i + 1,
                        camion: nextRow[0].trim()
                    });
                }
            }

            this.detectedPairs = pairs;
        },

        transformData() {
            if (this.detectedPairs.length === 0) return [];

            const result = [];

            this.detectedPairs.forEach(pair => {
                const fechaRow = this.csvData[pair.fechaRowIndex];
                const kmRow = this.csvData[pair.kmRowIndex];
                const camion = pair.camion;

                for (let col = 2; col < fechaRow.length; col++) {
                    const fecha = fechaRow[col];
                    const km = kmRow[col];
                    if (fecha && km && km !== "0" && km !== "") {
                        result.push({
                            descripcion: camion,
                            fecha,
                            kilometros: km.replace(",", ".")
                        });
                    }
                }
            });

            this.transformedData = result;
            return result;
        },

        exportCSV() {
            if (this.transformedData.length === 0) return;

            const csvContent = [
                "Descripción,Fecha,Kilómetros",
                ...this.transformedData.map(
                    row => `"${row.descripcion}","${row.fecha}",${row.kilometros}`
                )
            ].join("\n");

            const blob = new Blob([csvContent], {
                type: "text/csv;charset=utf-8;"
            });
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = "kilometros_transformado.csv";
            link.click();
        }
    }
});
