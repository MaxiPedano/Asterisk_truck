export function parseNumberSafe(value) {
    if (value === null || value === undefined || value === '') return 0

    const str = String(value).trim().replace(/\s+/g, '')

    // Si no hay separadores, retornar directamente
    if (!/[,.]/.test(str)) {
        const n = parseFloat(str)
        return Number.isFinite(n) ? n : 0
    }

    const lastComma = str.lastIndexOf(',')
    const lastDot = str.lastIndexOf('.')

    let cleanStr

    // Caso 1: Solo tiene comas o solo tiene puntos
    if (lastComma === -1) {
        // Solo puntos - puede ser separador de miles o decimal
        const dotCount = (str.match(/\./g) || []).length
        if (dotCount > 1) {
            // Múltiples puntos = separador de miles europeo: 8.224.514
            cleanStr = str.replace(/\./g, '')
        } else {
            // Un solo punto - verificar si es decimal o separador de miles
            const afterDot = str.substring(lastDot + 1)
            if (afterDot.length === 3 && /^\d{3}$/.test(afterDot)) {
                // Probablemente separador de miles: 8.514 -> 8514
                cleanStr = str.replace(/\./g, '')
            } else {
                // Probablemente decimal: 8.75 -> 8.75
                cleanStr = str
            }
        }
    } else if (lastDot === -1) {
        // Solo comas - puede ser separador de miles o decimal
        const commaCount = (str.match(/,/g) || []).length
        if (commaCount > 1) {
            // Múltiples comas = separador de miles americano: 8,224,514
            cleanStr = str.replace(/,/g, '')
        } else {
            // Una sola coma - verificar si es decimal o separador de miles
            const afterComma = str.substring(lastComma + 1)
            if (afterComma.length === 3 && /^\d{3}$/.test(afterComma)) {
                // Probablemente separador de miles: 8,514 -> 8514
                cleanStr = str.replace(/,/g, '')
            } else {
                // Probablemente decimal europeo: 8,75 -> 8.75
                cleanStr = str.replace(',', '.')
            }
        }
    } else {
        // Tiene ambos separadores - determinar cuál es el decimal
        if (lastComma > lastDot) {
            // Formato europeo: 8.224.514,75 o 8.224,75
            cleanStr = str.replace(/\./g, '').replace(',', '.')
        } else {
            // Formato americano: 8,224,514.75 o 8,224.75
            cleanStr = str.replace(/,/g, '')
        }
    }

    const n = parseFloat(cleanStr)
    return Number.isFinite(n) ? n : 0
}
