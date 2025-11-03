// stores/csvStore.js - Store con diagnóstico profundo para identificar el problema de los 50 registros
import { defineStore } from 'pinia'
import { formatearFecha } from '../utils/formatDate'
import { parseNumberSafe } from '../utils/parseNumber'
import { useAuthStore } from '../stores/authStore'


export const useCsvStore = defineStore('csv', {
  state: () => ({
    isLoading: false,
    processingResults: null,
    connectionStatus: null,

    diagnosticData: {
      requestsLog: [],
      responsesLog: [],
      insertionVerification: [],
      apiLimitsDetected: null
    },
    currentProgress: {
      current: 0,
      total: 0,
      percentage: 0,
      currentBatch: 0,
      totalBatches: 0
    },
    formParams: {
      flowid: '',
      statusid: '',
      statusflowid: '',
      apiUrl: 'https://api.flowsma.com/donandres/workspace',
      apiUrl1: 'https://api.flowsma.com/donandres',
      username: '',
      password: ''
    },

    // Config ultra conservadora para diagnóstico
    batchConfig: {
      batchSize: 1, // UNO por vez para diagnóstico preciso
      delayBetweenBatches: 3000,
      delayBetweenRecords: 3000, // 3 segundos entre cada registro
      tokenRefreshThreshold: 1200,
      maxRetries: 3,
      enableDiagnostics: true,
      verifyInsertions: true, // Nuevo: verificar que realmente se insertaron
      stopOnFailure: false // Para seguir aunque fallen algunos
    }
  }),

  actions: {
    getAuth() {
      return useAuthStore()
    },
    logRequest(operation, payload, recordIndex) {
      if (!this.batchConfig.enableDiagnostics) return

      this.diagnosticData.requestsLog.push({
        timestamp: new Date().toISOString(),
        operation,
        recordIndex,
        payload: JSON.parse(JSON.stringify(payload)), // Deep clone
        tokenUsed: this.token ? this.token.substring(0, 20) + '...' : null
      })

      // Mantener solo los últimos 100 requests
      if (this.diagnosticData.requestsLog.length > 100) {
        this.diagnosticData.requestsLog.shift()
      }
    },

    logResponse(operation, response, success, recordIndex, actualData = null) {
      if (!this.batchConfig.enableDiagnostics) return

      this.diagnosticData.responsesLog.push({
        timestamp: new Date().toISOString(),
        operation,
        recordIndex,
        success,
        httpStatus: response?.status || null,
        responseData: actualData ? JSON.parse(JSON.stringify(actualData)) : null,
        responseSize: actualData ? JSON.stringify(actualData).length : 0
      })

      // Mantener solo las últimas 100 respuestas
      if (this.diagnosticData.responsesLog.length > 100) {
        this.diagnosticData.responsesLog.shift()
      }
    },

    async verifyInsertion(referenciatexto, recordIndex) {
      if (!this.batchConfig.verifyInsertions) return { verified: true, found: true }

      try {
        console.log(`🔍 VERIFICACIÓN: Confirmando inserción de registro ${recordIndex} (ref: ${referenciatexto})`)

        // Esperar un poco para que el servidor procese
        await new Promise(r => setTimeout(r, 1000))

        const validacion = await this.validarExistencia(null, referenciatexto, recordIndex, true)

        const verification = {
          recordIndex,
          referenciatexto,
          verified: true,
          found: validacion.existe,
          timestamp: new Date().toISOString(),
          searchResults: validacion.allRows?.length || 0
        }

        this.diagnosticData.insertionVerification.push(verification)

        if (!validacion.existe) {
          console.error(`❌ VERIFICACIÓN FALLÓ: Registro ${recordIndex} no encontrado después de inserción!`)
          console.error(`   Referencia buscada: "${referenciatexto}"`)
          console.error(`   Resultados búsqueda: ${validacion.allRows?.length || 0}`)
        } else {
          console.log(`✅ VERIFICACIÓN OK: Registro ${recordIndex} confirmado en base de datos`)
        }

        return verification
      } catch (error) {
        console.warn(`⚠️ Error verificando inserción del registro ${recordIndex}:`, error.message)
        return { verified: false, error: error.message, recordIndex }
      }
    },

    // -------------------------
    // API Request Handler con diagnóstico profundo
    // -------------------------
    async handleApiRequest(requestFn, maxRetries = 3, recordIndex = 0, operation = 'unknown') {
      const { login, isTokenExpiring } = this.getAuth()

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          if (isTokenExpiring()) {
            console.log(`🔄 Renovando token antes de ${operation} (registro ${recordIndex})`)
            await login(true)
          }

          const result = await requestFn()
          return result
        } catch (rawError) {
          const errorMsg = String(rawError?.message || rawError)
          console.log(`🔄 ${operation} registro ${recordIndex}: Intento ${attempt}/${maxRetries} falló: ${errorMsg}`)

          if (attempt < maxRetries) {
            const waitTime = 2000 * attempt
            if (errorMsg.includes('401') || errorMsg.includes('403')) {
              console.log('🔑 Error de autorización - renovando token')
              try { await login(true) } catch (e) { console.warn('No se pudo renovar token:', e.message) }
            }

            console.log(`⏳ Esperando ${waitTime}ms antes del siguiente intento...`)
            await new Promise(r => setTimeout(r, waitTime))
            continue
          }

          throw rawError
        }
      }
    },

    // -------------------------
    // Validar existencia con modo verificación
    // -------------------------
    async validarExistencia(registroId, referenciatexto = '', recordIndex = 0, isVerification = false) {
      return this.handleApiRequest(async () => {
        if (!this.formParams.statusid || !this.formParams.flowid) {
          throw new Error('statusid y flowid requeridos')
        }

        const payload = {
          statusid: parseInt(this.formParams.statusid),
          flowid: parseInt(this.formParams.flowid),
          pattern: referenciatexto || "",
          offset: 0,
          max: 50, // Reducido para mejor rendimiento
          sort: "referenciatexto",
          descending: false
        }

        if (!isVerification) {
          this.logRequest('validarExistencia', payload, recordIndex)
        }

        console.log(`🔎 ${isVerification ? 'VERIFICANDO' : 'VALIDANDO'} registro ${recordIndex}: "${referenciatexto}"`)

        const response = await fetch(`${this.formParams.apiUrl}/getRegistroCabList`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.token}`
          },
          body: JSON.stringify(payload)
        })

        if (!response.ok) {
          const text = await response.text().catch(() => '')
          console.error(`❌ getRegistroCabList error (${response.status}) registro ${recordIndex}:`, text)
          throw new Error(`${response.status} - ${text}`)
        }

        const data = await response.json()
        const rows = data?.rows || []

        if (!isVerification) {
          this.logResponse('validarExistencia', response, true, recordIndex, { totalRows: rows.length })
        }

        let existe = false
        let registroExistente = null

        if (referenciatexto) {
          // Búsqueda exacta primero
          const encontradoExacto = rows.find(item =>
            String(item.referenciatexto).trim() === String(referenciatexto).trim()
          )

          if (encontradoExacto) {
            existe = true
            registroExistente = encontradoExacto
            if (!isVerification) {
              console.log(`✓ Duplicado encontrado (exacto): "${referenciatexto}"`)
            }
          } else {
            // Búsqueda case-insensitive como fallback
            const encontradoInsensitive = rows.find(item =>
              String(item.referenciatexto).toLowerCase().trim() === String(referenciatexto).toLowerCase().trim()
            )
            if (encontradoInsensitive) {
              existe = true
              registroExistente = encontradoInsensitive
              if (!isVerification) {
                console.log(`✓ Duplicado encontrado (case-insensitive): "${referenciatexto}"`)
              }
            }
          }
        }

        return { existe, registroExistente, allRows: rows }
      }, this.batchConfig.maxRetries, recordIndex, 'validarExistencia').catch(error => {
        console.error(`Error validando existencia registro ${recordIndex}:`, error.message)
        return { existe: false, registroExistente: null, allRows: [] }
      })
    },

    // -------------------------
    // Guardar cabecera con diagnóstico completo
    // -------------------------
    async saveRegistroCab(cabeceraData, recordIndex = 0) {
      return this.handleApiRequest(async () => {
        // Log del payload completo
        this.logRequest('saveRegistroCab', cabeceraData, recordIndex)

        console.log(`🚀 ENVIANDO registro ${recordIndex}:`)
        console.log(`   Referencia: "${cabeceraData.referenciatexto}"`)
        console.log(`   Token usado: ${this.token ? this.token.substring(0, 20) + '...' : 'NINGUNO'}`)
        console.log(`   Payload size: ${JSON.stringify(cabeceraData).length} chars`)

        const startTime = Date.now()
        const response = await fetch(`${this.formParams.apiUrl}/saveRegistroCab`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.token}`
          },
          body: JSON.stringify(cabeceraData)
        })

        const responseTime = Date.now() - startTime
        console.log(`⏱️ Tiempo respuesta registro ${recordIndex}: ${responseTime}ms`)

        if (!response.ok) {
          let text = ''
          try {
            text = await response.text()
            console.error(`❌ RESPUESTA ERROR ${response.status} registro ${recordIndex}:`, text)
          } catch (e) {
            console.error(`❌ Error leyendo respuesta error registro ${recordIndex}:`, e.message)
            text = `Error reading response: ${e.message}`
          }

          this.logResponse('saveRegistroCab', response, false, recordIndex, { error: text })
          throw new Error(`${response.status} - ${text || 'Error guardando registro'}`)
        }

        let json
        try {
          json = await response.json()
          console.log(`✅ RESPUESTA EXITOSA registro ${recordIndex}:`, JSON.stringify(json))
          this.logResponse('saveRegistroCab', response, true, recordIndex, json)
        } catch (e) {
          console.warn(`⚠️ Respuesta no es JSON válido registro ${recordIndex}, asumiendo éxito`)
          json = { success: true, message: 'Response was not JSON but status was OK' }
          this.logResponse('saveRegistroCab', response, true, recordIndex, json)
        }

        return json
      }, this.batchConfig.maxRetries, recordIndex, 'saveRegistroCab')
    },

    // -------------------------
    // Procesar CSV con diagnóstico completo
    // -------------------------
    async processCSV(file) {
      this.isLoading = true
      this.processingResults = null
      this.diagnosticData = {
        requestsLog: [],
        responsesLog: [],
        insertionVerification: [],
        apiLimitsDetected: null
      }
      this.updateProgress(0, 0)

      try {
        console.log('🔐 Iniciando sesión...')
        await login(true)

        console.log('📄 Leyendo archivo CSV...')
        const csvText = await file.text()
        const rows = this.parseCSV(csvText)

        if (rows.length === 0) {
          throw new Error('El archivo CSV está vacío')
        }

        console.log(`📊 INICIANDO DIAGNÓSTICO COMPLETO`)
        console.log(`📊 Total registros: ${rows.length}`)
        console.log(`⚙️ Procesando de a ${this.batchConfig.batchSize} con ${this.batchConfig.delayBetweenRecords}ms entre registros`)
        console.log(`🔍 Diagnósticos habilitados: ${this.batchConfig.enableDiagnostics}`)
        console.log(`✔️ Verificación inserción habilitada: ${this.batchConfig.verifyInsertions}`)

        const totalResults = {
          totalFilas: rows.length,
          procesadasExitosamente: 0,
          duplicados: 0,
          errores: 0,
          verificacionesFallidas: 0,
          detalleDuplicados: [],
          detalleErrores: [],
          detalleVerificaciones: [],
          tiempoInicio: new Date()
        }

        // PROCESAR REGISTRO POR REGISTRO para diagnóstico máximo
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i]
          const recordIndex = i + 1

          try {
            this.updateProgress(recordIndex, rows.length)

            console.log(`\n📝 =================== REGISTRO ${recordIndex}/${rows.length} ===================`)

            // Preparar datos
            const fechaCarga = formatearFecha(row['Fecha Carga'] || row['Fecha'] || row['fecha'])
            const fechaCompromiso = formatearFecha(row['Fecha'] || row['fechacompromiso'] || row['Fecha Compromiso'])
            const referenciaTexto = (row['Comprobante'] && String(row['Comprobante']).trim()) ||
              `diagnostic-${Date.now()}-${recordIndex}`

            console.log(`📋 Datos del registro ${recordIndex}:`)
            console.log(`   Referencia: "${referenciaTexto}"`)
            console.log(`   Fecha carga: ${fechaCarga}`)
            console.log(`   Fecha compromiso: ${fechaCompromiso}`)
            console.log(`   Nombre: "${row['Nombre'] || ''}"`)
            console.log(`   Concepto: "${row['Concepto'] || ''}"`)

            // Validar duplicados
            console.log(`🔍 Validando duplicados...`)
            const validacion = await this.validarExistencia(null, referenciaTexto, recordIndex)

            if (validacion.existe) {
              console.log(`⚠️ DUPLICADO DETECTADO registro ${recordIndex}`)
              totalResults.duplicados++
              totalResults.detalleDuplicados.push({
                fila: recordIndex,
                comprobante: referenciaTexto,
                registroExistente: validacion.registroExistente
              })
              continue
            }

            // Construir payload
            const cabeceraData = {
              flowid: parseInt(this.formParams.flowid) || 0,
              statusid: parseInt(this.formParams.statusid) || 0,
              statusflowid: parseInt(this.formParams.statusflowid) || 0,
              currentuser: 1,
              fecha: fechaCarga,
              fechacompromiso: fechaCompromiso,
              obsadm: String(row['Nombre'] || '').substring(0, 255),
              obsinicio: String(row['Concepto'] || '').substring(0, 255),
              obsventas: String(row['Motivo Det'] || row['Motivo'] || '').substring(0, 255),
              referenciatexto: referenciaTexto.substring(0, 50),
              totalimpuestos: parseNumberSafe(row['Imp IVA1']),
              totalprecio: parseNumberSafe(row['Imp Total']),
              varcn0: parseNumberSafe(row['Imp Exento']),
              varcn1: parseNumberSafe(row['Imp Gravado']),
              clientname: String(row['Nombre'] || "Sin nombre").substring(0, 100),
              descrip: String(row['Concepto'] || `Importación CSV fila ${recordIndex}`).substring(0, 255)
            }

            console.log(`💾 Enviando a base de datos...`)
            const saveResult = await this.saveRegistroCab(cabeceraData, recordIndex)

            console.log(`✅ Guardado exitoso registro ${recordIndex}`)
            totalResults.procesadasExitosamente++

            // VERIFICACIÓN CRÍTICA: Confirmar que realmente se insertó
            if (this.batchConfig.verifyInsertions) {
              console.log(`🔍 VERIFICANDO inserción real...`)
              const verification = await this.verifyInsertion(referenciaTexto, recordIndex)
              totalResults.detalleVerificaciones.push(verification)

              if (verification.verified && !verification.found) {
                console.error(`💥 PROBLEMA CRÍTICO: Registro ${recordIndex} reportó éxito pero NO está en la base!`)
                totalResults.verificacionesFallidas++

                // Detectar si llegamos al límite de 50
                if (recordIndex === 51 || recordIndex === 52) {
                  console.error(`🚨 LÍMITE DETECTADO: Falla de verificación en registro ${recordIndex} - posible límite de API`)
                  this.diagnosticData.apiLimitsDetected = {
                    limitDetectedAt: recordIndex,
                    message: `API parece tener límite en registro ${recordIndex}`,
                    timestamp: new Date()
                  }
                }
              }
            }

            // Pausa entre registros
            if (this.batchConfig.delayBetweenRecords && recordIndex < rows.length) {
              console.log(`⏳ Pausa de ${this.batchConfig.delayBetweenRecords}ms...`)
              await new Promise(r => setTimeout(r, this.batchConfig.delayBetweenRecords))
            }

            // Actualizar resultados cada 10 registros
            if (recordIndex % 10 === 0) {
              this.processingResults = { ...totalResults }
              console.log(`📈 PROGRESO: ${recordIndex}/${rows.length} - Exitosos: ${totalResults.procesadasExitosamente}, Errores: ${totalResults.errores}, Verificaciones fallidas: ${totalResults.verificacionesFallidas}`)
            }

          } catch (error) {
            const msg = String(error?.message || error)
            console.error(`❌ ERROR registro ${recordIndex}:`, msg)
            totalResults.errores++
            totalResults.detalleErrores.push({
              fila: recordIndex,
              datos: {
                comprobante: row['Comprobante'],
                nombre: row['Nombre'],
                concepto: row['Concepto']
              },
              error: msg
            })

            if (this.batchConfig.stopOnFailure) {
              console.error(`🛑 Deteniendo procesamiento por configuración`)
              break
            }
          }
        }

        // Finalizar diagnóstico
        totalResults.tiempoFin = new Date()
        totalResults.duracionMinutos = Math.round((totalResults.tiempoFin - totalResults.tiempoInicio) / 60000 * 100) / 100

        console.log(`\n🎯 =================== DIAGNÓSTICO FINAL ===================`)
        console.log(`📊 RESULTADOS:`)
        console.log(`   Total registros: ${totalResults.totalFilas}`)
        console.log(`   Procesados exitosamente: ${totalResults.procesadasExitosamente}`)
        console.log(`   Duplicados omitidos: ${totalResults.duplicados}`)
        console.log(`   Errores: ${totalResults.errores}`)
        console.log(`   Verificaciones fallidas: ${totalResults.verificacionesFallidas}`)
        console.log(`   Duración: ${totalResults.duracionMinutos} minutos`)

        if (this.diagnosticData.apiLimitsDetected) {
          console.error(`🚨 LÍMITE DE API DETECTADO:`, this.diagnosticData.apiLimitsDetected)
        }

        console.log(`\n📋 LOGS DISPONIBLES:`)
        console.log(`   Requests logged: ${this.diagnosticData.requestsLog.length}`)
        console.log(`   Responses logged: ${this.diagnosticData.responsesLog.length}`)
        console.log(`   Verificaciones: ${this.diagnosticData.insertionVerification.length}`)

        this.processingResults = totalResults
        return totalResults

      } catch (error) {
        console.error('💥 Error general procesando CSV:', error)
        this.processingResults = {
          error: true,
          message: error.message || String(error),
          timestamp: new Date()
        }
        throw error
      } finally {
        this.isLoading = false
      }
    },

    // -------------------------
    // Parser CSV CORREGIDO - detecta si la primera fila son headers reales
    // -------------------------
    parseCSV(csvText) {
      if (!csvText) return []
      const lines = csvText.trim().split(/\r?\n/).filter(l => l.trim() !== '')
      if (lines.length === 0) return []

      const splitLine = (line) => {
        const result = []
        let current = ''
        let inQuotes = false

        for (let i = 0; i < line.length; i++) {
          const char = line[i]

          if (char === '"') {
            inQuotes = !inQuotes
          } else if (char === ',' && !inQuotes) {
            result.push(current.trim())
            current = ''
          } else {
            current += char
          }
        }
        result.push(current.trim())
        return result
      }

      // Parsear primera línea
      const firstLine = splitLine(lines[0]).map(h => h.replace(/^"|"$/g, ''))

      // DETECCIÓN INTELIGENTE: ¿La primera fila son headers o datos?
      const hasRealHeaders = this.detectHeaders(firstLine)

      let headers = []
      let dataStartIndex = 0

      if (hasRealHeaders) {
        console.log(`📄 Headers reales detectados`)
        headers = firstLine
        dataStartIndex = 1
      } else {
        console.log(`📄 Primera fila son DATOS, no headers. Creando headers sintéticos...`)
        // Crear headers sintéticos basados en el patrón que veo en tus datos
        headers = [
          'ID',                    // 0: 4965
          'Numero',               // 1: 1  
          'Comprobante',          // 2: A-00052-00089115
          'Fecha',                // 3: 15/1/2025
          'Concepto',             // 4: COMBUSTIBLE PARA TERCEROS
          'Fecha Compromiso',     // 5: 21/1/2025
          'Motivo',               // 6: IUA 150
          'Nombre',               // 7: GAS NATURAL COMPRIMIDO...
          'Direccion',            // 8: AV CARRANZA ESQUINA LIMA
          'Localidad',            // 9: VILLA NUEVA
          'Imp Gravado',          // 10: 57183.63
          'Imp IVA1',             // 11: 4552.39
          'Imp Exento',           // 12: 12008.56
          'Imp Total',            // 13: 77274
          'Estado',               // 14: HISTORICO
          'Flag'                  // 15: 0
        ]
        dataStartIndex = 0 // Empezar desde la primera fila
      }

      const rows = []

      // Procesar filas de datos
      for (let i = dataStartIndex; i < lines.length; i++) {
        const values = splitLine(lines[i]).map(v => v.replace(/^"|"$/g, ''))
        const row = {}
        headers.forEach((header, idx) => {
          row[header] = values[idx] !== undefined ? values[idx] : ''
        })
        rows.push(row)
      }

      console.log(`📄 CSV parseado correctamente: ${headers.length} columnas, ${rows.length} filas`)
      console.log(`📄 Headers finales:`, headers)

      // Log de muestra de datos para verificar
      if (rows.length > 0) {
        console.log(`📄 Muestra del primer registro:`)
        console.log(`   Comprobante: "${rows[0]['Comprobante'] || 'N/A'}"`)
        console.log(`   Fecha: "${rows[0]['Fecha'] || 'N/A'}"`)
        console.log(`   Concepto: "${rows[0]['Concepto'] || 'N/A'}"`)
        console.log(`   Nombre: "${rows[0]['Nombre'] || 'N/A'}"`)
        console.log(`   Imp Total: "${rows[0]['Imp Total'] || 'N/A'}"`)
      }

      return rows
    },

    // -------------------------
    // Detecta si la primera fila contiene headers reales
    // -------------------------
    detectHeaders(firstLine) {
      // Criterios para detectar headers reales vs datos:

      // 1. Si hay nombres típicos de columnas
      const commonHeaders = [
        'id', 'nombre', 'concepto', 'fecha', 'comprobante', 'importe', 'total',
        'cliente', 'direccion', 'localidad', 'motivo', 'estado', 'gravado',
        'exento', 'iva', 'impuesto'
      ]

      const hasCommonHeaders = firstLine.some(field =>
        commonHeaders.some(header =>
          field.toLowerCase().includes(header)
        )
      )

      // 2. Si la primera columna es claramente un número (ID numérico)
      const firstFieldIsNumericId = /^\d+$/.test(firstLine[0])

      // 3. Si hay fechas en formato típico en posiciones esperadas  
      const hasDateFormats = firstLine.some(field =>
        /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(field) ||
        /^\d{4}-\d{1,2}-\d{1,2}$/.test(field)
      )

      // 4. Si hay importes con decimales en las últimas columnas
      const hasDecimalAmounts = firstLine.slice(-6).some(field =>
        /^\d+\.\d{2}$/.test(field)
      )

      console.log(`🔍 Análisis de headers:`)
      console.log(`   Tiene headers comunes: ${hasCommonHeaders}`)
      console.log(`   Primer campo es ID numérico: ${firstFieldIsNumericId}`)
      console.log(`   Tiene formatos de fecha: ${hasDateFormats}`)
      console.log(`   Tiene importes decimales: ${hasDecimalAmounts}`)

      // Si tiene fechas e importes, probablemente son DATOS, no headers
      const looksLikeData = firstFieldIsNumericId && hasDateFormats && hasDecimalAmounts

      if (looksLikeData) {
        console.log(`📋 CONCLUSIÓN: Primera fila parece ser DATOS`)
        return false
      }

      if (hasCommonHeaders) {
        console.log(`📋 CONCLUSIÓN: Primera fila parece ser HEADERS`)
        return true
      }

      console.log(`📋 CONCLUSIÓN: No está claro, asumiendo DATOS por seguridad`)
      return false
    },

    // -------------------------
    // Métodos de diagnóstico
    // -------------------------
    exportDiagnosticData() {
      const diagnostic = {
        timestamp: new Date().toISOString(),
        processingResults: this.processingResults,
        diagnosticData: this.diagnosticData,
        currentProgress: this.currentProgress,
        batchConfig: this.batchConfig
      }

      const blob = new Blob([JSON.stringify(diagnostic, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `csv-import-diagnostic-${Date.now()}.json`
      a.click()
      URL.revokeObjectURL(url)

      console.log('📋 Datos de diagnóstico exportados')
      return diagnostic
    },


    updateFormParams(params) {
      this.formParams = { ...this.formParams, ...params }
    },

    setCredentials(username, password) {
      this.formParams.username = username
      this.formParams.password = password
      this.credentials.saved = true
      this.credentials.username = username
      this.credentials.password = password
    },

    resetProcessing() {
      this.processingResults = null
      this.diagnosticData = {
        requestsLog: [],
        responsesLog: [],
        insertionVerification: [],
        apiLimitsDetected: null
      }
      this.updateProgress(0, 0)
    },
    updateProgress(current, total) {
      this.currentProgress.current = current
      this.currentProgress.total = total
      this.currentProgress.percentage = total > 0
        ? Math.round((current / total) * 100)
        : 0
    }
  }
})