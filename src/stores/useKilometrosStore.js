// stores/useCSVStore.js
import { defineStore } from "pinia";
import { useFileParser } from "@/composables/useFileParser";
import { useAuthStore } from "../stores/authStore";
import { fetchData, postData } from "../service/apiService";
import { formatearFecha } from "../utils/formatDate";
import * as XLSX from 'xlsx';
import { ar } from "vuetify/locale";



export const useKilometrosStore = defineStore("csv", {
    state: () => ({
        csvData: [],
        headers: [],
        transformedData: [],
        detectedPairs: [],
        loading: false,
        error: null
    }),

    actions: {
        async loadFile(file) {
            this.loading = true
            this.error = null

            try {
                const { parseFile } = useFileParser()
                const data = await parseFile(file, { header: false })

                console.log('✅ Archivo cargado:', data)

                this.headers = data[0] || []
                this.csvData = data.slice(1)
                this.detectPairs()

                return true
            } catch (err) {
                this.error = err.message
                console.error('❌ Error cargando archivo:', err)
                return false
            } finally {
                this.loading = false
            }
        },

        detectPairs() {
            const pairs = [];
            const data = this.csvData;

            for (let i = 0; i < data.length - 1; i++) {
                const currentRow = data[i];
                const nextRow = data[i + 1];

                const isFechaRow =
                    currentRow[1] &&
                    String(currentRow[1]).toLowerCase().includes("fecha");
                const isKmRow =
                    nextRow[0] &&
                    String(nextRow[0]).trim() !== "" &&
                    nextRow[1] &&
                    String(nextRow[1]).toLowerCase().includes("km");

                if (isFechaRow && isKmRow) {
                    const textoCamion = String(nextRow[0]).trim();
                    const index = textoCamion.lastIndexOf('-');

                    let nombreCamion = textoCamion;
                    let patente = "";

                    if (index !== -1) {
                        nombreCamion = textoCamion.slice(0, index).trim();
                        patente = textoCamion.slice(index + 1).trim();
                    }

                    pairs.push({
                        fechaRowIndex: i,
                        kmRowIndex: i + 1,
                        camion: nombreCamion,
                        patente: patente,
                    });
                }
            }

            this.detectedPairs = pairs;
            console.log('🚚 Pares detectados:', pairs.length)
        },

        transformData() {
            if (this.detectedPairs.length === 0) {
                console.warn('⚠️ No hay pares detectados')
                return []
            }

            const result = [];

            this.detectedPairs.forEach(pair => {
                const fechaRow = this.csvData[pair.fechaRowIndex];
                const kmRow = this.csvData[pair.kmRowIndex];
                const patente = pair.patente;

                for (let col = 2; col < fechaRow.length; col++) {
                    const fecha = fechaRow[col];
                    const km = kmRow[col];

                    if (fecha && km && km !== "0" && km !== "" && km !== "0,00") {
                        result.push({
                            descripcion: patente,
                            fecha: String(fecha).trim(),
                            kilometros: String(km).replace(",", ".")
                        });
                    }
                }
            });

            this.transformedData = result;
            console.log('✨ Datos transformados:', result.length, 'registros')
            return result;
        },

        // Método auxiliar para descargar archivos
        _downloadFile(blob, filename) {
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = filename;
            link.click();
            URL.revokeObjectURL(link.href);
        },

        // Exportar como CSV
        exportCSV(filteredData = null) {
            const data = filteredData || this.transformedData;

            if (data.length === 0) {
                console.warn('⚠️ No hay datos para exportar')
                return false
            }

            const csvContent = [
                "Descripción,Fecha,Kilómetros",
                ...data.map(
                    row => `"${row.descripcion}","${row.fecha}",${row.kilometros}`
                )
            ].join("\n");

            const blob = new Blob([csvContent], {
                type: "text/csv;charset=utf-8;"
            });

            this._downloadFile(blob, "kilometros_transformado.csv");
            console.log('💾 CSV exportado:', data.length, 'registros')
            return true
        },

        // Exportar como Excel
        exportXLSX(filteredData = null) {
            const data = filteredData || this.transformedData;

            if (data.length === 0) {
                console.warn('⚠️ No hay datos para exportar')
                return false
            }

            try {
                // Crear worksheet con datos formateados
                const worksheet = XLSX.utils.json_to_sheet(
                    data.map(row => ({
                        'Descripción': row.descripcion,
                        'Fecha': row.fecha,
                        'Kilómetros': parseFloat(row.kilometros)
                    }))
                );

                // Configurar anchos de columna
                worksheet['!cols'] = [
                    { wch: 30 }, // Descripción
                    { wch: 12 }, // Fecha
                    { wch: 12 }  // Kilómetros
                ];

                // Crear workbook
                const workbook = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(workbook, worksheet, 'Kilómetros');

                // Descargar archivo
                XLSX.writeFile(workbook, 'kilometros_transformado.xlsx');
                console.log('📊 Excel exportado:', data.length, 'registros')
                return true
            } catch (err) {
                console.error('❌ Error exportando Excel:', err)
                this.error = err.message
                return false
            }
        },

        // Exportar como JSON
        exportJSON(filteredData = null) {
            const data = filteredData || this.transformedData;

            if (data.length === 0) {
                console.warn('⚠️ No hay datos para exportar')
                return false
            }

            const jsonContent = JSON.stringify(data, null, 2);
            const blob = new Blob([jsonContent], {
                type: "application/json;charset=utf-8;"
            });

            this._downloadFile(blob, "kilometros_transformado.json");
            console.log('📄 JSON exportado:', data.length, 'registros')
            return true
        },

        async saveRegistroCabyCuerpo(registros, onProgress = null) {
            const authStore = useAuthStore();

            // Asegurarse de tener token válido
            if (!authStore.token || authStore.isTokenExpiring()) {
                await authStore.login();
            }

            const resultados = {
                exitosos: [],
                fallidos: [],
                total: registros.length
            };

            console.log(`🚀 Iniciando envío de ${registros.length} registros...`);

            try {
                // Obtener datos del artículo una sola vez
                const artKilometros = await fetchData('/articulo/show/1860');
                const depositos = artKilometros.data.articulosDepositos;
                const flowid = 11087;
                const statusid = 1713;
                const statusflowid = 779;
                const sigstatusid = 1714;


                // Procesar cada registro
                for (let i = 0; i < registros.length; i++) {
                    const registro = registros[i];

                    // Reportar progreso al componente
                    if (onProgress) {
                        onProgress(i + 1, registro);
                    }

                    try {
                        console.log(`📦 [${i + 1}/${registros.length}] ${registro.patente}`);

                        // Buscar el depósito correspondiente
                        const depositoEncontrado = depositos.find(
                            d => d.deposito?.descrip?.trim().toLowerCase() === registro.patente.trim().toLowerCase()
                        );

                        if (!depositoEncontrado) {
                            throw new Error(`Depósito no encontrado para patente: ${registro.patente}`);
                        }

                        const depositoArticuloId = depositoEncontrado.id;

                        // Crear registro de cabecera
                        const dataCab = {
                            "id": -1,
                            "flowid": flowid,
                            "fecha": formatearFecha(registro.fecha),
                            "statusid": statusid,
                            "responsableactactualid": authStore.userData.perfilid,
                            "statusflowid": statusflowid,
                            "responsableactactual": {
                                "id": authStore.userData.perfilid,
                                "identificador": ""
                            },
                            "xlatitud": -32.4097451,
                            "xlongitud": -63.2385806,
                            "showDependeDe": false,
                        };

                        const respCab = await postData('/workspace/saveRegistroCab', dataCab);
                        console.log('   📋 Cabecera guardada:', respCab.data.id);

                        if (respCab.status === 200) {
                            // Crear registro de cuerpo
                            const dataCuerpo = {
                                "id": -1,
                                "presupcabid": respCab.data.id,
                                "articulo": "kilometros",
                                "articulodepositoid": depositoArticuloId,
                                "cuerpoflowid": flowid,
                                "cuerpostatusid": statusid,
                                "cantidad": parseFloat(registro.kilometros),
                                "articulospecresult": "{}",
                                "medidasancho": 1,
                                "medidasalto": 1,
                                "medidaslargo": 1,
                                "porcentajuste": 0,
                                "impuestoalic": 0,
                                "xlatitud": -32.4097451,
                                "xlongitud": -63.2385806,
                            };

                            const respCuerpo = await postData('/workspace/saveRegistroCuerpo', dataCuerpo);
                            console.log('   📝 Cuerpo guardado');

                            if (respCuerpo.status === 200) {

                                const save = await postData('/workspace/getRegistroCabGeneric', {
                                    "id": respCab.data.id,
                                    "checkuser": true
                                })
                                await postData('/workspace/getRegistroCabGeneric', save.data)
                                console.log(save);
                                const respuestaSiguiente = {
                                    "siguienteEstadoCommandList": [{
                                        "id": respCuerpo.data.id,
                                        "macroProcesoSiguienteId": flowid,
                                        "sigstatusid": sigstatusid,
                                    }]
                                }

                                console.log('   ⏭️  Intentando cambiar estado a 1714...');
                                const respEstadoSiguiente = await postData('workspace/setProximoEstadoCuerposYCab', respuestaSiguiente);

                                // 👇 LOGS DETALLADOS AQUÍ
                                console.log('   🔍 Respuesta setEstadoSiguiente:', respEstadoSiguiente);

                                if (respEstadoSiguiente.status === 200 || respEstadoSiguiente.status === 204) {
                                    resultados.exitosos.push({
                                        patente: registro.patente,
                                        kilometros: registro.kilometros,
                                        fecha: registro.fecha,
                                    });
                                    console.log('   ✅ Exitoso - Estado cambiado correctamente');
                                } else {
                                    console.log('   ⚠️ Estado inesperado:', respEstadoSiguiente.status);
                                    throw new Error(`Error al actualizar estado. Status: ${respEstadoSiguiente.status}`);
                                }

                            } else {
                                throw new Error('Error al guardar el cuerpo del registro');
                            }
                        } else {
                            throw new Error('Error al guardar la cabecera del registro');
                        }

                    } catch (error) {
                        console.error('   ❌ Error detallado:', error);
                        resultados.fallidos.push({
                            patente: registro.patente,
                            kilometros: registro.kilometros,
                            fecha: registro.fecha,
                            error: error.message
                        });
                        console.log(`   ❌ Error - ${error.message}`);
                    }

                    // Pausa entre registros
                    if (i < registros.length - 1) {
                        await new Promise(resolve => setTimeout(resolve, 300));
                    }
                }

            } catch (error) {
                console.error('❌ Error crítico:', error);
                this.error = error.message;
            }

            // Resumen en consola
            console.log('\n📊 RESUMEN:');
            console.log(`✅ Exitosos: ${resultados.exitosos.length}`);
            console.log(`❌ Fallidos: ${resultados.fallidos.length}`);

            return {
                success: resultados.fallidos.length === 0,
                resultados: resultados
            };
        },


        reset() {
            this.csvData = []
            this.headers = []
            this.transformedData = []
            this.detectedPairs = []
            this.error = null
        }

    }
});