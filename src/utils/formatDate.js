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
        'YYYY-MM-DDTHH:mm:ss', 'DD/MM/YYYY HH:mm:ss', 'MM/DD/YYYY HH:mm:ss',
        // Agregar formatos con año de 2 dígitos
        'DD/MM/YY', 'D/M/YY', 'DD-MM-YY', 'D-M-YY',
        'MM/DD/YY', 'MM-DD-YY', 'DD.MM.YY'
    ]

    if (fechaString === null || fechaString === undefined) {
        return obtenerFechaServidor()
    }

    const limpio = String(fechaString).trim()

    if (limpio === '') {
        return obtenerFechaServidor()
    }

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

    // ÚLTIMO RECURSO: intentar parseo automático de dayjs
    const ultimoIntento = dayjs(limpio)
    if (ultimoIntento.isValid()) {
        return ultimoIntento.format('YYYY-MM-DD')
    }

    // Si todo falla, devolver fecha actual
    return obtenerFechaServidor()
}
export default formatearFecha