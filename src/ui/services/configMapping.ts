export interface ConfigSource {
    /** имя дата-блока, напр. 'internal1' */
    type: string
    /** имя столбца в TSV */
    value: string
}

export interface ConfigEntry {
    /** 'jira' — литеральное / substitution значение; 'internal1' | 'internal2' | ... — данные из дата-блока */
    type: string
    /**
     * для 'jira': строка (литерал) ИЛИ объект substitution:
     *   { source: { type: 'internal1', value: 'Source Type' },
     *     '10000': ['Order Picking', 'Order Prepicking'],
     *     '10001': ['Order Packing'] }
     * для 'internalN': имя столбца в TSV
     */
    value: string | Record<string, any>
    /** value трактуется как id опции (true, по умолчанию) или как её label (false) */
    valueIsId?: boolean | string
    /** дефолтный id, если substitution не нашёл совпадения; false/отсутствует — нет дефолта */
    default?: string | false
}

export type Config = Record<string, ConfigEntry>

/** Карта распарсенных дата-блоков: { internal1: { "Entry No.": "...", ... }, internal2: {...} } */
export type DataMap = Record<string, Record<string, string>>

function splitRow(line: string): string[] {
    if (line.includes('\t')) return line.split('\t')
    return line.split(/\s{2,}/)
}

export function parseTsvData(text: string): Record<string, string> {
    const lines = text.replace(/\r/g, '').split('\n').filter(l => l.length > 0)
    if (lines.length < 2) return {}

    const headers = splitRow(lines[0]).map(h => h.trim())
    const values = splitRow(lines[1])

    const result: Record<string, string> = {}
    headers.forEach((header, i) => {
        if (!header) return
        result[header] = (values[i] ?? '').trim()
    })
    return result
}

function findOptionIdByLabel(field: any, label: string): string | null {
    const allowed = field?.allowedValues
    if (!Array.isArray(allowed) || allowed.length === 0) return null
    const found = allowed.find((opt: any) => opt.value === label || opt.name === label)
    return found ? String(found.id) : null
}

function readSource(src: any, dataMap: DataMap): string {
    if (!src || typeof src !== 'object') return ''
    return dataMap[src.type]?.[src.value] ?? ''
}

/** value трактуется как label (а не id), если явно указано valueIsId === false / "false" */
function valueIsLabel(entry: ConfigEntry): boolean {
    return entry.valueIsId === false || entry.valueIsId === 'false'
}

/** Резолвит значение для type === 'jira'. Возвращает null, если значения нет. */
function resolveJiraValue(entry: ConfigEntry, field: any, dataMap: DataMap): string | null {
    let resolved: string | null

    if (entry.value && typeof entry.value === 'object') {
        // substitution-режим: ищем ключ-id, в чьём массиве есть значение из источника
        const sourceVal = readSource(entry.value.source, dataMap)
        resolved = null
        for (const [key, candidates] of Object.entries(entry.value)) {
            if (key === 'source') continue
            if (Array.isArray(candidates) && candidates.includes(sourceVal)) {
                resolved = key
                break
            }
        }
        if (resolved === null) {
            resolved = typeof entry.default === 'string' && entry.default.length ? entry.default : null
        }
    } else {
        // литеральный режим
        resolved = entry.value != null ? String(entry.value) : null
    }

    if (resolved !== null && valueIsLabel(entry)) {
        const id = findOptionIdByLabel(field, resolved)
        if (id !== null) resolved = id
    }

    return resolved
}

export function applyConfigToForm(
    form: Record<string, any>,
    config: Config,
    dataMap: DataMap,
    fields: any[]
): Record<string, any> {
    const fieldsByKey: Record<string, any> = {}
    for (const f of fields) fieldsByKey[f.key] = f

    const next = { ...form }

    for (const [fieldKey, entry] of Object.entries(config)) {
        if (!entry || typeof entry !== 'object') continue

        if (entry.type === 'jira') {
            const v = resolveJiraValue(entry, fieldsByKey[fieldKey], dataMap)
            next[fieldKey] = v ?? ''
        } else if (typeof entry.type === 'string' && entry.type.startsWith('internal')) {
            const col = typeof entry.value === 'string' ? entry.value : ''
            next[fieldKey] = dataMap[entry.type]?.[col] ?? ''
        }
    }

    return next
}
