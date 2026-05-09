export interface ConfigEntry {
    type: 'internal' | 'jira'
    value: string
    isValueId?: boolean
}

export type Config = Record<string, ConfigEntry>

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

export function applyConfigToForm(
    form: Record<string, any>,
    config: Config,
    parsedData: Record<string, string>,
    fields: any[]
): Record<string, any> {
    const fieldsByKey: Record<string, any> = {}
    for (const f of fields) fieldsByKey[f.key] = f

    const next = { ...form }

    for (const [fieldKey, entry] of Object.entries(config)) {
        let value: any

        if (entry.type === 'internal') {
            value = parsedData[entry.value] ?? ''
        } else if (entry.type === 'jira') {
            value = entry.value
            if (entry.isValueId === false) {
                const id = findOptionIdByLabel(fieldsByKey[fieldKey], String(value))
                if (id !== null) value = id
            }
        } else {
            continue
        }

        next[fieldKey] = value
    }

    return next
}
