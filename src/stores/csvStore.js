import { defineStore } from 'pinia'

const USERNAME = import.meta.env.VITE_USER_NAME;
const PASSWORD = import.meta.env.VITE_PASSWORD;

export const useCsvStore = defineStore('csv', {
  state: () => ({
    isLoading: false,
    processingResults: null,
    connectionStatus: null,
    token: null,
    formParams: {
      flowid: '',
      statusid: '',
      statusflowid: ''
    }
  }),

  actions: {
    // Función para formatear fecha (convertida del backend)
    formatearFecha(fechaString) {
      if (!fechaString || typeof fechaString !== 'string') return null

      const limpio = fechaString.trim()

      // Caso: ya está en formato YYYY-MM-DD
      if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(limpio)) {
        return limpio
      }

      // Caso: formato M/D/YYYY HH:mm:ss (o sin ceros iniciales)
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

    // Login para obtener token - CORREGIDO: removido 'function'
    async login() {
      try {
        const response = await fetch("https://api.flowsma.com/donandres/api/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: USERNAME,
            password: PASSWORD,
            rememberMe: false
          })
        });

        if (!response.ok) {
          throw new Error(`Error de login: ${response.status}`);
        }

        const data = await response.json();
        
        // CORREGIDO: Guardar el token en el state
        this.token = data.access_token;
        
        return data;
      } catch (error) {
        console.error('Error en login:', error);
        throw error;
      }
    },

    // Validar existencia de registro
    async validarExistencia(registroId, referenciatexto) {
      try {
        console.log(`Validando existencia - ID: ${registroId}, Referencia: ${referenciatexto}`)

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

        const response = await fetch('https://api.flowsma.com/donandres/workspace/getRegistroCabList', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.token}`
          },
          body: JSON.stringify(payload)
        })

        if (!response.ok) {
          console.warn(`Error al obtener listado: ${response.status}`)
          return { existe: false, registroExistente: null }
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
            console.log(`✓ Coincidencia encontrada por referenciatexto: ${referenciatexto}`)
          }
        }

        return { existe, registroExistente }
      } catch (error) {
        console.error('Error validando existencia:', error)
        return { existe: false, registroExistente: null }
      }
    },

    // Guardar registro cabecera - CORREGIDO: URL completa
    async saveRegistroCab(cabeceraData) {
      try {
        const response = await fetch('https://api.flowsma.com/donandres/workspace/saveRegistroCab', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.token}`
          },
          body: JSON.stringify(cabeceraData)
        })

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Error guardando registro: ${response.status} - ${errorText}`)
        }

        return await response.json()
      } catch (error) {
        console.error('Error guardando registro:', error)
        throw error
      }
    },

    // Procesar archivo CSV
    async processCSV(file) {
      this.isLoading = true
      this.processingResults = null

      try {
        // Obtener token si no existe
        if (!this.token) {
          await this.login()
        }

        // Leer y parsear CSV
        const csvText = await file.text()
        const rows = this.parseCSV(csvText)

        let processedCount = 0
        let errorCount = 0
        let duplicateCount = 0
        const errors = []
        const duplicates = []

        // Procesar cada fila
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i]
          try {
            console.log(`Procesando fila ${i + 1}:`, row)

            // Mapear campos del CSV
            const fechaCarga = this.formatearFecha(row['Fecha Carga'])
            const fechaCompromiso = this.formatearFecha(row['Fecha'])
            const referenciaTexto = row['Comprobante'] || `csv-${Date.now()}-${i + 1}`
            const registroId = row['ID'] || row['id'] || null

            // Validar existencia
            const validacion = await this.validarExistencia(registroId, referenciaTexto)
            
            if (validacion.existe) {
              console.log(`Registro duplicado en fila ${i + 1}: Comprobante=${referenciaTexto}`)
              duplicateCount++
              duplicates.push({
                fila: i + 1,
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
              
              // Campos numéricos - CORREGIDO: manejo de valores null/undefined
              totalimpuestos: this.parseNumericValue(row['Imp IVA1']),
              totalprecioimp: this.parseNumericValue(row['Imp Total']),
              varcn0: this.parseNumericValue(row['Imp Exento']),
              varcn1: this.parseNumericValue(row['Imp Gravado']),
              
              // Campos adicionales
              clientname: row['Nombre'] || "Sin nombre",
              descrip: row['Concepto'] || `Importación CSV fila ${i + 1}`
            }

            await this.saveRegistroCab(cabeceraData)
            processedCount++

          } catch (error) {
            console.error(`Error procesando fila ${i + 1}:`, error)
            errorCount++
            errors.push({
              fila: i + 1,
              datos: row,
              error: error.message
            })
          }
        }

        // Establecer resultados
        this.processingResults = {
          totalFilas: rows.length,
          procesadasExitosamente: processedCount,
          duplicados: duplicateCount,
          errores: errorCount,
          detalleDuplicados: duplicates,
          detalleErrores: errors
        }

      } catch (error) {
        console.error('Error general procesando CSV:', error)
        throw error
      } finally {
        this.isLoading = false
      }
    },

    // NUEVO: Función auxiliar para parsear valores numéricos
    parseNumericValue(value) {
      if (value === null || value === undefined || value === '') {
        return 0;
      }
      
      const numericValue = parseFloat(value.toString().replace(',', '.'));
      return isNaN(numericValue) ? 0 : numericValue;
    },

    // Parser CSV mejorado - CORREGIDO: manejo de comillas y caracteres especiales
    parseCSV(csvText) {
      const lines = csvText.trim().split('\n');
      
      // Procesar headers
      const headerLine = lines[0];
      const headers = this.parseCSVLine(headerLine);
      
      const rows = [];

      // Procesar cada línea de datos
      for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim() === '') continue; // Saltar líneas vacías
        
        const values = this.parseCSVLine(lines[i]);
        const row = {};
        
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });
        
        rows.push(row);
      }

      return rows;
    },

    // NUEVO: Parser mejorado para líneas CSV con manejo de comillas
    parseCSVLine(line) {
      const result = [];
      let current = '';
      let inQuotes = false;
      let i = 0;

      while (i < line.length) {
        const char = line[i];
        const nextChar = line[i + 1];

        if (char === '"' && inQuotes && nextChar === '"') {
          // Comilla escapada
          current += '"';
          i += 2;
        } else if (char === '"') {
          // Inicio o fin de comillas
          inQuotes = !inQuotes;
          i++;
        } else if (char === ',' && !inQuotes) {
          // Separador fuera de comillas
          result.push(current.trim());
          current = '';
          i++;
        } else {
          // Carácter normal
          current += char;
          i++;
        }
      }

      // Agregar el último campo
      result.push(current.trim());
      
      return result;
    },

    // Probar conexión
    async testConnection() {
      try {
        const loginData = await this.login()
        this.connectionStatus = {
          success: true,
          message: "Conexión exitosa",
          hasToken: !!loginData.access_token
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
    }
  }
})