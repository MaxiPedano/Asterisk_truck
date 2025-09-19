// stores/csvStore.js - Versión mejorada con manejo de token expiration y procesamiento por lotes
import { defineStore } from 'pinia'

export const useCsvStore = defineStore('csv', {
  state: () => ({
    isLoading: false,
    processingResults: null,
    connectionStatus: null,
    token: null,
    tokenExpiry: null,
    formParams: {
      flowid: '',
      statusid: '',
      statusflowid: '',
      apiUrl: 'https://api.flowsma.com/donandres/workspace',
      username: '',
      password: ''
    },
    credentials: {
      saved: false,
      username: '',
      password: ''
    },
    // Configuración para procesamiento por lotes
    batchConfig: {
      batchSize: 10,           // Procesar de 10 en 10 registros
      delayBetweenBatches: 500, // 500ms de delay entre lotes
      tokenRefreshThreshold: 300 // Renovar token si faltan menos de 5 minutos
    }
  }),

  actions: {
    // Función para formatear fecha
    formatearFecha(fechaString) {
      if (!fechaString || typeof fechaString !== 'string') return null

      const limpio = fechaString.trim()

      // Caso: ya está en formato YYYY-MM-DD
      if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(limpio)) {
        return limpio
      }

      // Caso: formato M/D/YYYY HH:mm:ss
      if (/^\d{1,2}\/\d{1,2}\/\d{4}(?:\s+\d{1,2}:\d{2}:\d{2})?$/.test(limpio)) {
        const [fechaParte] = limpio.split(' ')
        const [mes, dia, anio] = fechaParte.split('/')
        return `${anio}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`
      }

      // Caso: formato D/M/YYYY
      if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(limpio)) {
        const [dia, mes, anio] = limpio.split('/')
        return `${anio}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`
      }

      // Caso: formato D-M-YYYY
      if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(limpio)) {
        const [dia, mes, anio] = limpio.split('-')
        return `${anio}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`
      }

      console.warn(`⚠ Formato desconocido recibido: "${fechaString}", devolviendo nulo`)
      return null
    },

    // Verificar si el token está próximo a expirar
    isTokenExpiring() {
      if (!this.tokenExpiry) return true
      
      const now = Date.now()
      const timeToExpiry = this.tokenExpiry - now
      const thresholdMs = this.batchConfig.tokenRefreshThreshold * 1000
      
      return timeToExpiry < thresholdMs
    },

    // Login mejorado con manejo de expiración
    async login(forceRenew = false) {
      try {
        // Si el token existe y no está próximo a expirar, no hacer nada
        if (this.token && !this.isTokenExpiring() && !forceRenew) {
          console.log('🔑 Token válido, no se requiere renovación')
          return { access_token: this.token }
        }

        if (!this.formParams.username || !this.formParams.password) {
          throw new Error('Usuario y contraseña son requeridos')
        }

        console.log('🔄 Renovando token...')
        
        const response = await fetch(`${this.formParams.apiUrl}/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            username: this.formParams.username,
            password: this.formParams.password
          })
        })

        if (!response.ok) {
          throw new Error(`Error de login: ${response.status} - Credenciales inválidas`)
        }

        const data = await response.json()
        this.token = data.access_token
        
        // Establecer tiempo de expiración (asumimos 1 hora por defecto)
        this.tokenExpiry = Date.now() + (data.expires_in || 3600) * 1000
        
        this.credentials.saved = true
        console.log('✅ Token renovado exitosamente')
        
        return data
      } catch (error) {
        console.error('❌ Error en login:', error)
        this.token = null
        this.tokenExpiry = null
        this.credentials.saved = false
        throw error
      }
    },

    // Función helper para manejar errores 401 y renovar token
    async handleApiRequest(requestFn, maxRetries = 2) {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          // Verificar si necesitamos renovar el token antes de la request
          if (this.isTokenExpiring()) {
            await this.login(true)
          }

          const result = await requestFn()
          return result
        } catch (error) {
          console.log(`🔄 Intento ${attempt}/${maxRetries} falló:`, error.message)
          
          // Si es error 401 y no es el último intento, renovar token
          if (error.message.includes('401') && attempt < maxRetries) {
            console.log('🔑 Error 401 detectado, renovando token...')
            await this.login(true)
            continue
          }
          
          // Si llegamos aquí, falló definitivamente
          throw error
        }
      }
    },

    // Validar existencia con manejo robusto de token
    async validarExistencia(registroId, referenciatexto) {
      return this.handleApiRequest(async () => {
        if (!this.formParams.statusid || !this.formParams.flowid) {
          throw new Error('Los parámetros statusid y flowid son requeridos')
        }

        const payload = {
          statusid: parseInt(this.formParams.statusid),
          flowid: parseInt(this.formParams.flowid),
          pattern: "",
          offset: 0,
          max: 1000,
          sort: "referenciatexto",
          descending: false
        }

        const response = await fetch(`${this.formParams.apiUrl}/getRegistroCabList`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.token}`
          },
          body: JSON.stringify(payload)
        })

        if (!response.ok) {
          throw new Error(`${response.status}`)
        }

        const data = await response.json()
        const rows = data?.rows || []

        let existe = false
        let registroExistente = null
        
        if (referenciatexto) {
          const encontrado = rows.find(item => item.referenciatexto === referenciatexto)
          if (encontrado) {
            existe = true
            registroExistente = encontrado
            console.log(`✓ Coincidencia encontrada: ${referenciatexto}`)
          }
        }

        return { existe, registroExistente }
      }).catch(error => {
        console.error('Error validando existencia:', error)
        return { existe: false, registroExistente: null }
      })
    },

    // Guardar registro con manejo robusto de token
    async saveRegistroCab(cabeceraData) {
      return this.handleApiRequest(async () => {
        const response = await fetch(`${this.formParams.apiUrl}/saveRegistroCab`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.token}`
          },
          body: JSON.stringify(cabeceraData)
        })

        if (!response.ok) {
          throw new Error(`${response.status}`)
        }

        return await response.json()
      })
    },

    // Función para procesar un lote de registros
    async processBatch(rows, startIndex, batchSize) {
      const endIndex = Math.min(startIndex + batchSize, rows.length)
      const batchRows = rows.slice(startIndex, endIndex)
      
      const results = {
        processed: 0,
        errors: 0,
        duplicates: 0,
        errorDetails: [],
        duplicateDetails: []
      }

      console.log(`📦 Procesando lote ${Math.floor(startIndex/batchSize) + 1}: registros ${startIndex + 1}-${endIndex}`)

      for (let i = 0; i < batchRows.length; i++) {
        const row = batchRows[i]
        const globalIndex = startIndex + i

        try {
          // Mapear campos del CSV
          const fechaCarga = this.formatearFecha(row['Fecha Carga'])
          const fechaCompromiso = this.formatearFecha(row['Fecha'])
          const referenciaTexto = row['Comprobante'] || `csv-${Date.now()}-${globalIndex + 1}`
          const registroId = row['ID'] || row['id'] || null

          // Validar existencia
          const validacion = await this.validarExistencia(registroId, referenciaTexto)
          
          if (validacion.existe) {
            console.log(`⚠️ Registro duplicado en fila ${globalIndex + 1}: ${referenciaTexto}`)
            results.duplicates++
            results.duplicateDetails.push({
              fila: globalIndex + 1,
              comprobante: referenciaTexto,
              datosCSV: row,
              registroExistente: validacion.registroExistente
            })
            continue
          }

          const cabeceraData = {
            flowid: parseInt(this.formParams.flowid),
            statusid: parseInt(this.formParams.statusid),
            statusflowid: parseInt(this.formParams.statusflowid),
            currentuser: 1,
            
            // Mapeo de campos CSV -> API
            fecha: fechaCarga,
            fechacompromiso: fechaCompromiso,
            obsadm: row['Nombre'] || '',
            obsinicio: row['Concepto'] || '',
            obsventas: row['Motivo Det'] || '',
            referenciatexto: referenciaTexto,
            
            // Campos numéricos
            totalimpuestos: parseFloat(row['Imp IVA1']?.toString().replace(',', '.')) || 0,
            totalprecioimp: parseFloat(row['Imp Total']?.toString().replace(',', '.')) || 0,
            varcn0: parseFloat(row['Imp Exento']?.toString().replace(',', '.')) || 0,
            varcn1: parseFloat(row['Imp Gravado']?.toString().replace(',', '.')) || 0,
            
            // Campos adicionales
            clientname: row['Nombre'] || "Sin nombre",
            descrip: row['Concepto'] || `Importación CSV fila ${globalIndex + 1}`
          }

          await this.saveRegistroCab(cabeceraData)
          results.processed++
          console.log(`✅ Procesado registro ${globalIndex + 1}`)

        } catch (error) {
          console.error(`❌ Error procesando fila ${globalIndex + 1}:`, error)
          results.errors++
          results.errorDetails.push({
            fila: globalIndex + 1,
            datos: row,
            error: error.message
          })
        }
      }

      return results
    },

    // Función principal mejorada con procesamiento por lotes
    async processCSV(file) {
      this.isLoading = true
      this.processingResults = null

      try {
        // Login inicial
        await this.login()

        // Leer y parsear CSV
        const csvText = await file.text()
        const rows = this.parseCSV(csvText)

        console.log(`📊 Iniciando procesamiento de ${rows.length} registros`)
        console.log(`⚙️ Configuración: ${this.batchConfig.batchSize} registros por lote, ${this.batchConfig.delayBetweenBatches}ms de delay`)

        const totalResults = {
          totalFilas: rows.length,
          procesadasExitosamente: 0,
          duplicados: 0,
          errores: 0,
          detalleDuplicados: [],
          detalleErrores: []
        }

        // Procesar en lotes
        for (let i = 0; i < rows.length; i += this.batchConfig.batchSize) {
          const batchResults = await this.processBatch(rows, i, this.batchConfig.batchSize)
          
          // Acumular resultados
          totalResults.procesadasExitosamente += batchResults.processed
          totalResults.duplicados += batchResults.duplicates
          totalResults.errores += batchResults.errors
          totalResults.detalleDuplicados.push(...batchResults.duplicateDetails)
          totalResults.detalleErrores.push(...batchResults.errorDetails)

          // Actualizar resultados parciales para mostrar progreso
          this.processingResults = { ...totalResults }

          // Delay entre lotes para evitar sobrecarga del servidor
          if (i + this.batchConfig.batchSize < rows.length) {
            console.log(`⏳ Esperando ${this.batchConfig.delayBetweenBatches}ms antes del siguiente lote...`)
            await new Promise(resolve => setTimeout(resolve, this.batchConfig.delayBetweenBatches))
          }
        }

        console.log('🎉 Procesamiento completado:', totalResults)
        this.processingResults = totalResults

      } catch (error) {
        console.error('💥 Error general procesando CSV:', error)
        throw error
      } finally {
        this.isLoading = false
      }
    },

    // Parser CSV (sin cambios)
    parseCSV(csvText) {
      const lines = csvText.trim().split('\n')
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
      const rows = []

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''))
        const row = {}
        headers.forEach((header, index) => {
          row[header] = values[index] || ''
        })
        rows.push(row)
      }

      return rows
    },

    // Probar conexión
    async testConnection() {
      try {
        const loginData = await this.login(true) // Forzar renovación para test
        this.connectionStatus = {
          success: true,
          message: "Conexión exitosa - Token válido",
          hasToken: !!loginData.access_token,
          tokenExpiry: new Date(this.tokenExpiry).toLocaleString()
        }
        return this.connectionStatus
      } catch (error) {
        this.connectionStatus = {
          success: false,
          message: "Error de conexión",
          error: error.message
        }
        throw error
      }
    },

    // Actualizar parámetros del formulario
    updateFormParams(params) {
      this.formParams = { ...this.formParams, ...params }
    },

    // Configurar credenciales
    setCredentials(username, password) {
      this.formParams.username = username
      this.formParams.password = password
    }
  }
})