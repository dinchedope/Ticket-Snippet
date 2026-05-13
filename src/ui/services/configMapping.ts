import type { JiraField, JiraAllowedValue } from './jiraTypes'

export interface ConfigSource {
    /** data block name, e.g. 'internal1' */
    type: string
    /** column name in the TSV */
    value: string
}

export interface ConfigEntry {
    /** 'jira' — literal / substitution value; 'internal1' | 'internal2' | ... — data from a data block */
    type: string
    /**
     * for 'jira': a string (literal) OR a substitution object:
     *   { source: { type: 'internal1', value: 'Source Type' },
     *     '10000': ['Order Picking', 'Order Prepicking'],
     *     '10001': ['Order Packing'] }
     * for 'internalN': the column name in the TSV
     */
    value: string | Record<string, any>
    /** whether `value` is treated as an option id (true, default) or as its label (false) */
    valueIsId?: boolean | string
    /** default id used when substitution finds no match; false/absent — no default */
    default?: string | false
}

export type Config = Record<string, ConfigEntry>

/** One pasted data block: stable `id` (used to build the `internal{id}` name) + raw TSV text. */
export interface DataBlock {
    id: number
    raw: string
}

/** Map of parsed data blocks: { internal1: { "Entry No.": "...", ... }, internal2: {...} } */
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

function findOptionIdByLabel(field: JiraField | undefined, label: string): string | null {
    const allowed = field?.allowedValues
    if (!Array.isArray(allowed) || allowed.length === 0) return null
    const found = allowed.find((opt: JiraAllowedValue) => opt.value === label || opt.name === label)
    return found ? String(found.id) : null
}

function readSource(src: any, dataMap: DataMap): string {
    if (!src || typeof src !== 'object') return ''
    return dataMap[src.type]?.[src.value] ?? ''
}

/** value is treated as a label (not an id) only when valueIsId is explicitly false / "false" */
function valueIsLabel(entry: ConfigEntry): boolean {
    return entry.valueIsId === false || entry.valueIsId === 'false'
}

/** Resolves the value for type === 'jira'. Returns null if there is no value. */
function resolveJiraValue(entry: ConfigEntry, field: JiraField | undefined, dataMap: DataMap): string | null {
    let resolved: string | null

    if (entry.value && typeof entry.value === 'object') {
        // substitution mode: find the id key whose array contains the source value
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
        // literal mode
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
    fields: JiraField[]
): Record<string, any> {
    const fieldsByKey: Record<string, JiraField> = {}
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
