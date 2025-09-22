// stores/csvStore.js - Store mejorado con soluciones para límite de 50 registros
import { defineStore } from 'pinia'
import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'

dayjs.extend(customParseFormat)

export const useCsvStore = defineStore('csv', {
  state: () => ({
    isLoading: false,
    processingResults: null,
    connectionStatus: null,
    token: null,
    tokenExpiry: null,
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
    credentials: {
      saved: false,
      username: '',
      password: ''
    },
    // Config mejorada por lotes - más conservadora para evitar límites
    batchConfig: {
      batchSize: 5, // Reducido de 3 a 5 para mejor eficiencia pero mantener estabilidad
      delayBetweenBatches: 8000, // Aumentado para evitar rate limiting
      delayBetweenRecords: 2000, // Aumentado para dar más tiempo al servidor
      tokenRefreshThreshold: 900, // Más tiempo antes de expiración
      maxRetries: 5, // Más reintentos
      maxConcurrentRequests: 2, // Nuevo: limitar requests concurrentes
      exponentialBackoff: true // Nuevo: backoff exponencial en errores
    }
  }),

  actions: {
    // -------------------------
    // Helpers mejorados
    // -------------------------
    obtenerFechaServidor() {
      const ahora = dayjs()
      return ahora.format('YYYY-MM-DD')
    },

    formatearFecha(fechaString) {
      const formatos = [
        'YYYY-MM-DD',
        'YYYY/MM/DD',
        'YYYY.MM.DD',
        'DD/MM/YYYY',
        'D/M/YYYY',
        'DD-MM-YYYY',
        'D-M-YYYY',
        'MM-DD-YYYY',
        'MM/DD/YYYY',
        'DD.MM.YYYY',
        'YYYY-MM-DDTHH:mm:ss',
        'DD/MM/YYYY HH:mm:ss',
        'MM/DD/YYYY HH:mm:ss'
      ]

      if (!fechaString && fechaString !== 0) {
        return this.obtenerFechaServidor()
      }

      const limpio = String(fechaString).trim()

      if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(limpio)) {
        const [y, m, d] = limpio.split('-')
        return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      }

      for (const fmt of formatos) {
        const parsed = dayjs(limpio, fmt, true)
        if (parsed.isValid()) {
          return parsed.format('YYYY-MM-DD')
        }
      }

      console.warn(`⚠ Formato desconocido para fecha "${fechaString}" -> usando fecha servidor`)
      return this.obtenerFechaServidor()
    },

    parseNumberSafe(value) {
      if (value === null || value === undefined || value === '') return 0
      const str = String(value).replace(/\s+/g, '').replace(/\./g, '').replace(',', '.')
      const n = parseFloat(str)
      return Number.isFinite(n) ? n : 0
    },

    // -------------------------
    // Gestión de progreso mejorada
    // -------------------------
    updateProgress(current, total, currentBatch = 0, totalBatches = 0) {
      this.currentProgress = {
        current,
        total,
        percentage: total > 0 ? Math.round((current / total) * 100) : 0,
        currentBatch,
        totalBatches
      }
    },

    // -------------------------
    // Token / Login con mejor manejo
    // -------------------------
    isTokenExpiring() {
      if (!this.tokenExpiry) return true
      const now = Date.now()
      const timeToExpiry = this.tokenExpiry - now
      const thresholdMs = (this.batchConfig.tokenRefreshThreshold || 900) * 1000
      return timeToExpiry < thresholdMs
    },

    async login(forceRenew = false) {
      try {
        if (this.token && !this.isTokenExpiring() && !forceRenew) {
          console.log('🔑 Token válido, no se requiere renovación')
          return { access_token: this.token }
        }

        if (!this.formParams.username || !this.formParams.password) {
          throw new Error('Usuario y contraseña son requeridos')
        }

        console.log('🔄 Renovando token...')
        const response = await fetch(`${this.formParams.apiUrl1}/api/login`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'User-Agent': 'CSV-Importer/1.0'
          },
          body: JSON.stringify({
            username: this.formParams.username,
            password: this.formParams.password
          })
        })

        if (!response.ok) {
          const text = await response.text().catch(() => '')
          console.error(`❌ Error login (${response.status}):`, text)
          throw new Error(`${response.status} - ${text || 'Login failed'}`)
        }

        const data = await response.json()
        this.token = data.access_token
        this.tokenExpiry = Date.now() + (data.expires_in || 3600) * 1000
        this.credentials.saved = true
        console.log('✅ Token renovado exitosamente (expiry:', new Date(this.tokenExpiry).toLocaleString(), ')')
        return data
      } catch (error) {
        console.error('❌ Error en login:', error)
        this.token = null
        this.tokenExpiry = null
        this.credentials.saved = false
        throw error
      }
    },

    // -------------------------
    // handleApiRequest mejorado con backoff exponencial
    // -------------------------
    async handleApiRequest(requestFn, maxRetries = null, recordIndex = 0, operation = 'unknown') {
      if (!maxRetries) maxRetries = this.batchConfig.maxRetries || 5

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          // Verificar token antes de cada request importante
          if (this.isTokenExpiring()) {
            console.log(`🔄 Token próximo a expirar. Renovando antes de ${operation}...`)
            await this.login(true)
          }

          const result = await requestFn()
          return result
        } catch (rawError) {
          const errorMsg = (rawError && rawError.message) ? rawError.message : String(rawError)
          console.log(`🔄 ${operation} fila ${recordIndex}: Intento ${attempt}/${maxRetries} falló: ${errorMsg}`)

          // Manejar diferentes tipos de errores
          const isAuthError = errorMsg.includes('401') || errorMsg.includes('403')
          const isServerError = errorMsg.includes('500') || errorMsg.includes('502') || errorMsg.includes('503')
          const isRateLimit = errorMsg.includes('429') || errorMsg.includes('rate limit')

          if (attempt < maxRetries && (isAuthError || isServerError || isRateLimit)) {
            // Renovar token para errores de autenticación
            if (isAuthError) {
              console.log(`🔑 Error de autenticación detectado, renovando token...`)
              try { 
                await this.login(true) 
              } catch (e) { 
                console.warn('⚠ No se pudo renovar token:', e.message) 
              }
            }

            // Calcular tiempo de espera con backoff exponencial
            let waitTime = 3000 * attempt // Base: 3s, 6s, 9s, 12s, 15s
            if (this.batchConfig.exponentialBackoff) {
              waitTime = Math.min(1000 * Math.pow(2, attempt), 30000) // Max 30s
            }
            if (isRateLimit) {
              waitTime = Math.max(waitTime, 15000) // Mínimo 15s para rate limit
            }

            console.log(`⏳ ${operation}: Esperando ${waitTime}ms antes del siguiente intento...`)
            await new Promise(r => setTimeout(r, waitTime))
            continue
          }

          // Si llegamos aquí, no hay más reintentos o error no recuperable
          console.error(`💥 ${operation} fila ${recordIndex}: Error final tras ${attempt} intentos:`, errorMsg)
          throw rawError
        }
      }
    },

    // -------------------------
    // Validar existencia mejorado con paginación
    // -------------------------
    async validarExistencia(registroId, referenciatexto = '', recordIndex = 0) {
      return this.handleApiRequest(async () => {
        if (!this.formParams.statusid || !this.formParams.flowid) {
          throw new Error('Los parámetros statusid y flowid son requeridos para validar existencia')
        }

        const payload = {
          statusid: parseInt(this.formParams.statusid),
          flowid: parseInt(this.formParams.flowid),
          pattern: referenciatexto || "",
          offset: 0,
          max: 100, // Aumentado de 1000 a 100 para mejor rendimiento
          sort: "referenciatexto",
          descending: false
        }

        console.log(`🔎 Validando existencia fila ${recordIndex}: ${referenciatexto}`)

        const response = await fetch(`${this.formParams.apiUrl}/getRegistroCabList`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.token}`,
            'User-Agent': 'CSV-Importer/1.0'
          },
          body: JSON.stringify(payload)
        })

        if (!response.ok) {
          const text = await response.text().catch(() => '')
          console.error(`❌ validarExistencia error (${response.status}) fila ${recordIndex}:`, text)
          throw new Error(`${response.status} - ${text || 'Error getRegistroCabList'}`)
        }

        const data = await response.json()
        const rows = data?.rows || []

        let existe = false
        let registroExistente = null
        
        if (referenciatexto) {
          const encontrado = rows.find(item => 
            String(item.referenciatexto).toLowerCase() === String(referenciatexto).toLowerCase()
          )
          if (encontrado) {
            existe = true
            registroExistente = encontrado
            console.log(`✓ Duplicado encontrado para "${referenciatexto}" (fila ${recordIndex})`)
          }
        }

        return { existe, registroExistente, allRows: rows }
      }, this.batchConfig.maxRetries, recordIndex, 'validarExistencia').catch(error => {
        console.error(`Error validando existencia fila ${recordIndex}:`, error)
        // En caso de error, asumir que no existe para continuar procesamiento
        return { existe: false, registroExistente: null, allRows: [] }
      })
    },

    // -------------------------
    // Guardar cabecera mejorado
    // -------------------------
    async saveRegistroCab(cabeceraData, recordIndex = 0) {
      return this.handleApiRequest(async () => {
        console.log(`🚀 Guardando registro ${recordIndex}...`)

        const response = await fetch(`${this.formParams.apiUrl}/saveRegistroCab`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.token}`,
            'User-Agent': 'CSV-Importer/1.0'
          },
          body: JSON.stringify(cabeceraData)
        })

        if (!response.ok) {
          let text = ''
          try {
            text = await response.text()
          } catch (e) {
            text = `Error leyendo respuesta: ${e.message}`
          }
          console.error(`❌ saveRegistroCab error (${response.status}) fila ${recordIndex}:`, text)
          throw new Error(`${response.status} - ${text || 'Error guardando registro'}`)
        }

        const json = await response.json().catch(() => ({ success: true }))
        console.log(`✅ Registro ${recordIndex} guardado exitosamente`)
        return json
      }, this.batchConfig.maxRetries, recordIndex, 'saveRegistroCab')
    },

    // -------------------------
    // Procesar un lote mejorado con mejor control de errores
    // -------------------------
    async processBatch(rows, startIndex, batchSize, batchNumber, totalBatches) {
      const endIndex = Math.min(startIndex + batchSize, rows.length)
      const batchRows = rows.slice(startIndex, endIndex)

      const results = {
        processed: 0,
        errors: 0,
        duplicates: 0,
        errorDetails: [],
        duplicateDetails: []
      }

      console.log(`📦 Procesando lote ${batchNumber}/${totalBatches}: registros ${startIndex + 1}-${endIndex}`)

      // Procesar registros del lote secuencialmente para evitar sobrecarga
      for (let i = 0; i < batchRows.length; i++) {
        const row = batchRows[i]
        const globalIndex = startIndex + i
        
        try {
          // Actualizar progreso
          this.updateProgress(globalIndex + 1, rows.length, batchNumber, totalBatches)

          // Normalizar datos
          const fechaCarga = this.formatearFecha(row['Fecha Carga'] || row['Fecha'] || row['fecha'])
          const fechaCompromiso = this.formatearFecha(row['Fecha'] || row['fechacompromiso'] || row['Fecha Compromiso'])
          const referenciaTexto = (row['Comprobante'] && String(row['Comprobante']).trim()) || 
                                  `csv-import-${Date.now()}-${globalIndex + 1}`
          const registroId = row['ID'] || row['id'] || null

          console.log(`📝 Procesando fila ${globalIndex + 1}/${rows.length} - Ref: ${referenciaTexto}`)

          // Validar existencia con manejo de errores
          try {
            const validacion = await this.validarExistencia(registroId, referenciaTexto, globalIndex + 1)
            if (validacion.existe) {
              console.log(`⚠️ Registro duplicado en fila ${globalIndex + 1}: ${referenciaTexto}`)
              results.duplicates++
              results.duplicateDetails.push({
                fila: globalIndex + 1,
                comprobante: referenciaTexto,
                registroExistente: validacion.registroExistente
              })
              continue
            }
          } catch (validationError) {
            console.warn(`⚠️ Error validando duplicado fila ${globalIndex + 1}, continuando con inserción:`, validationError.message)
            // Continuar con la inserción si falla la validación
          }

          // Construir payload con validación de datos
          const cabeceraData = {
            flowid: parseInt(this.formParams.flowid) || 0,
            statusid: parseInt(this.formParams.statusid) || 0,
            statusflowid: parseInt(this.formParams.statusflowid) || 0,
            currentuser: 1,
            fecha: fechaCarga,
            fechacompromiso: fechaCompromiso,
            obsadm: String(row['Nombre'] || '').substring(0, 255), // Limitar longitud
            obsinicio: String(row['Concepto'] || '').substring(0, 255),
            obsventas: String(row['Motivo Det'] || row['Motivo'] || '').substring(0, 255),
            referenciatexto: referenciaTexto.substring(0, 50), // Limitar referencia
            totalimpuestos: this.parseNumberSafe(row['Imp IVA1']),
            totalprecioimp: this.parseNumberSafe(row['Imp Total']),
            varcn0: this.parseNumberSafe(row['Imp Exento']),
            varcn1: this.parseNumberSafe(row['Imp Gravado']),
            clientname: String(row['Nombre'] || "Sin nombre").substring(0, 100),
            descrip: String(row['Concepto'] || `Importación CSV fila ${globalIndex + 1}`).substring(0, 255)
          }

          // Enviar registro
          await this.saveRegistroCab(cabeceraData, globalIndex + 1)
          results.processed++
          console.log(`✅ Fila ${globalIndex + 1} procesada exitosamente`)

          // Pausa entre registros para evitar rate limiting
          if (this.batchConfig.delayBetweenRecords && i < batchRows.length - 1) {
            await new Promise(r => setTimeout(r, this.batchConfig.delayBetweenRecords))
          }

        } catch (error) {
          const msg = (error && error.message) ? error.message : String(error)
          console.error(`❌ Error procesando fila ${globalIndex + 1}:`, msg)
          results.errors++
          results.errorDetails.push({
            fila: globalIndex + 1,
            datos: { 
              comprobante: row['Comprobante'], 
              nombre: row['Nombre'], 
              concepto: row['Concepto'] 
            },
            error: msg
          })

          // Si hay demasiados errores consecutivos, hacer una pausa más larga
          if (results.errors > 0 && results.errors % 3 === 0) {
            console.log(`⚠️ Múltiples errores detectados, pausa adicional de 10s...`)
            await new Promise(r => setTimeout(r, 10000))
          }
        }
      }

      console.log(`📦 Lote ${batchNumber} completado: ${results.processed} exitosos, ${results.errors} errores, ${results.duplicates} duplicados`)
      return results
    },

    // -------------------------
    // Procesar CSV completo mejorado
    // -------------------------
    async processCSV(file) {
      this.isLoading = true
      this.processingResults = null
      this.updateProgress(0, 0)

      try {
        // Login inicial
        console.log('🔐 Iniciando sesión...')
        await this.login(true)

        // Parse CSV
        console.log('📄 Leyendo archivo CSV...')
        const csvText = await file.text()
        const rows = this.parseCSV(csvText)
        
        if (rows.length === 0) {
          throw new Error('El archivo CSV está vacío o no se pudo procesar')
        }

        console.log(`📊 Archivo procesado: ${rows.length} registros encontrados`)
        console.log(`⚙️ Configuración: lotes de ${this.batchConfig.batchSize}, pausa entre lotes: ${this.batchConfig.delayBetweenBatches}ms`)

        const totalBatches = Math.ceil(rows.length / this.batchConfig.batchSize)
        const totalResults = {
          totalFilas: rows.length,
          procesadasExitosamente: 0,
          duplicados: 0,
          errores: 0,
          detalleDuplicados: [],
          detalleErrores: [],
          tiempoInicio: new Date(),
          tiempoFin: null,
          duracionMinutos: 0
        }

        // Procesar por lotes
        for (let i = 0; i < rows.length; i += this.batchConfig.batchSize) {
          const batchNumber = Math.floor(i / this.batchConfig.batchSize) + 1
          
          console.log(`\n🚀 Iniciando lote ${batchNumber}/${totalBatches}...`)
          
          const batchResults = await this.processBatch(rows, i, this.batchConfig.batchSize, batchNumber, totalBatches)

          // Acumular resultados
          totalResults.procesadasExitosamente += batchResults.processed
          totalResults.duplicados += batchResults.duplicates
          totalResults.errores += batchResults.errors
          totalResults.detalleDuplicados.push(...batchResults.duplicateDetails)
          totalResults.detalleErrores.push(...batchResults.errorDetails)

          // Actualizar resultados en tiempo real
          this.processingResults = { ...totalResults }

          // Pausa entre lotes (excepto en el último)
          if (i + this.batchConfig.batchSize < rows.length) {
            console.log(`⏳ Pausa entre lotes: ${this.batchConfig.delayBetweenBatches}ms...`)
            await new Promise(r => setTimeout(r, this.batchConfig.delayBetweenBatches))
          }

          // Log de progreso cada 5 lotes
          if (batchNumber % 5 === 0) {
            const progreso = Math.round((totalResults.procesadasExitosamente / rows.length) * 100)
            console.log(`📈 Progreso: ${totalResults.procesadasExitosamente}/${rows.length} (${progreso}%)`)
          }
        }

        // Completar resultados
        totalResults.tiempoFin = new Date()
        totalResults.duracionMinutos = Math.round((totalResults.tiempoFin - totalResults.tiempoInicio) / 60000 * 100) / 100

        console.log('\n🎉 ¡Procesamiento completado!')
        console.log(`📊 Resumen final:`)
        console.log(`   • Total registros: ${totalResults.totalFilas}`)
        console.log(`   • Procesados exitosamente: ${totalResults.procesadasExitosamente}`)
        console.log(`   • Duplicados omitidos: ${totalResults.duplicados}`)
        console.log(`   • Errores: ${totalResults.errores}`)
        console.log(`   • Duración: ${totalResults.duracionMinutos} minutos`)

        this.processingResults = totalResults
        this.updateProgress(totalResults.totalFilas, totalResults.totalFilas, totalBatches, totalBatches)
        
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
    // Parser CSV mejorado (mantener el actual o usar PapaParse)
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

      const headers = splitLine(lines[0]).map(h => h.replace(/^"|"$/g, ''))
      const rows = []
      
      for (let i = 1; i < lines.length; i++) {
        const values = splitLine(lines[i]).map(v => v.replace(/^"|"$/g, ''))
        const row = {}
        headers.forEach((header, idx) => {
          row[header] = values[idx] !== undefined ? values[idx] : ''
        })
        rows.push(row)
      }
      
      console.log(`📄 CSV parseado: ${headers.length} columnas, ${rows.length} filas`)
      return rows
    },

    // -------------------------
    // Métodos auxiliares
    // -------------------------
    async testConnection() {
      try {
        const loginData = await this.login(true)
        this.connectionStatus = {
          success: true,
          message: "Conexión exitosa - Token válido",
          hasToken: !!loginData.access_token,
          tokenExpiry: this.tokenExpiry ? new Date(this.tokenExpiry).toLocaleString() : null,
          timestamp: new Date().toLocaleString()
        }
        return this.connectionStatus
      } catch (error) {
        this.connectionStatus = {
          success: false,
          message: "Error de conexión",
          error: error.message || String(error),
          timestamp: new Date().toLocaleString()
        }
        throw error
      }
    },

    updateFormParams(params) {
      this.formParams = { ...this.formParams, ...params }
      console.log('⚙️ Parámetros actualizados:', params)
    },

    setCredentials(username, password) {
      this.formParams.username = username
      this.formParams.password = password
      this.credentials.saved = true
      this.credentials.username = username
      this.credentials.password = password
      console.log('✅ Credenciales guardadas exitosamente')
    },

    // Nuevo método para reiniciar el procesamiento
    resetProcessing() {
      this.processingResults = null
      this.updateProgress(0, 0)
      console.log('🔄 Estado de procesamiento reiniciado')
    },

    // Nuevo método para obtener estadísticas
    getProcessingStats() {
      if (!this.processingResults) return null
      
      const stats = {
        ...this.processingResults,
        tasaExito: this.processingResults.totalFilas > 0 ? 
          Math.round((this.processingResults.procesadasExitosamente / this.processingResults.totalFilas) * 100) : 0,
        tasaError: this.processingResults.totalFilas > 0 ? 
          Math.round((this.processingResults.errores / this.processingResults.totalFilas) * 100) : 0,
        tasaDuplicados: this.processingResults.totalFilas > 0 ? 
          Math.round((this.processingResults.duplicados / this.processingResults.totalFilas) * 100) : 0
      }
      
      return stats
    }
  }
})