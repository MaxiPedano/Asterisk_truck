import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'

dayjs.extend(customParseFormat)

export const obtenerFechaServidor = () => {
    return dayjs().format('YYYY-MM-DD')
}

export const formatearFecha = (fechaString) => {
    const formatos = [
        'YYYY-MM-DD', 'YYYY/MM/DD', 'YYYY.MM.DD',
        'DD/MM/YYYY', 'D/M/YYYY', 'DD-MM-YYYY', 'D-M-YYYY',
        'MM-DD-YYYY', 'MM/DD/YYYY', 'DD.MM.YYYY',
        'YYYY-MM-DDTHH:mm:ss', 'DD/MM/YYYY HH:mm:ss', 'MM/DD/YYYY HH:mm:ss'
    ]

    if (!fechaString && fechaString !== 0) {
        return obtenerFechaServidor()
    }

    const limpio = String(fechaString).trim()

    // Optimización: si ya está en formato YYYY-MM-DD o YYYY-M-D
    if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(limpio)) {
        const [y, m, d] = limpio.split('-')
        return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    }

    // Probar todos los formatos
    for (const fmt of formatos) {
        const parsed = dayjs(limpio, fmt, true)
        if (parsed.isValid()) {
            return parsed.format('YYYY-MM-DD')
        }
    }

    // Si no coincide con ningún formato, devolver fecha actual
    return obtenerFechaServidor()
}

export default formatearFecha