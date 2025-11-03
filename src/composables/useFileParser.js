// src/composables/useFileParser.js
import * as XLSX from 'xlsx'
import Papa from 'papaparse'

export function useFileParser() {
    const detectFileType = (file) => {
        const ext = file.name.split('.').pop().toLowerCase()
        if (['xls', 'xlsx'].includes(ext)) return 'excel'
        if (ext === 'csv') return 'csv'
        if (ext === 'json') return 'json'
        return 'unknown'
    }

    const parseFile = async (file, options = {}) => {
        const type = detectFileType(file)

        switch (type) {
            case 'excel':
                return await parseExcel(file)
            case 'csv':
                return await parseCSV(file, options)
            case 'json':
                return await parseJSON(file)
            default:
                throw new Error(`Tipo de archivo no soportado: ${file.name}`)
        }
    }

    const parseExcel = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result)
                    const workbook = XLSX.read(data, { type: 'array' })
                    const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
                    const json = XLSX.utils.sheet_to_json(firstSheet, {
                        header: 1, // ← Devuelve arrays, no objetos
                        defval: ''
                    })
                    resolve(json)
                } catch (err) {
                    reject(err)
                }
            }
            reader.readAsArrayBuffer(file)
        })
    }

    const parseCSV = (file, options = {}) => {
        return new Promise((resolve, reject) => {
            Papa.parse(file, {
                header: options.header ?? false, // ← Por defecto sin headers
                skipEmptyLines: true,
                encoding: 'UTF-8',
                dynamicTyping: false,
                complete: (results) => {
                    console.log('📊 CSV parseado:', {
                        filas: results.data.length,
                        errores: results.errors
                    })
                    resolve(results.data)
                },
                error: (err) => reject(err)
            })
        })
    }

    const parseJSON = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = (e) => {
                try {
                    const json = JSON.parse(e.target.result)
                    resolve(json)
                } catch (err) {
                    reject(err)
                }
            }
            reader.readAsText(file)
        })
    }

    return {
        detectFileType,
        parseFile
    }
}