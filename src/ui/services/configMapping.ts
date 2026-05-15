import type { JiraField, JiraAllowedValue } from './jiraTypes'

export interface ConfigSource {
    /** data block name, e.g. 'internal1' */
    type: string
    /** column name in the TSV */
    value: string
}

/**
 * A single boolean check against a value read from a data block.
 * Exactly one operator key should be set per condition.
 */
export interface LeafCondition {
    source: ConfigSource
    equals?: string
    not_equals?: string
    empty?: boolean
    not_empty?: boolean
}

/** AND: every nested condition must be true. */
export interface AllCondition {
    all: Condition[]
}

/** OR: at least one nested condition must be true. */
export interface AnyCondition {
    any: Condition[]
}

export type Condition = LeafCondition | AllCondition | AnyCondition

/** Recursive if/then/else node. Branches can be strings, if-nodes, or cases-nodes. */
export interface ConditionNode {
    if: Condition
    then: ValueExpr
    else?: ValueExpr
}

/** One clause inside a `cases` block. `when` supports the same operators / combinators as `if`. */
export interface CaseClause {
    when: Condition
    then: ValueExpr
}

/** Flat first-match-wins block. `else` runs when no `when` matched. */
export interface CasesNode {
    cases: CaseClause[]
    else?: ValueExpr
}

/** Anything that can resolve to a string: a literal, an if-tree, or a cases-block. */
export type ValueExpr = string | ConditionNode | CasesNode

export interface ConfigEntry {
    /** 'jira' — literal / conditional value; 'internal1' | 'internal2' | ... — data from a data block */
    type: string
    /**
     * for 'jira': a string literal OR a ValueExpr tree (if/then/else, cases, or nested mix).
     * for 'internalN': the column name in the TSV.
     */
    value: ValueExpr
    /** whether `value` is treated as an option id (true, default) or as its label (false) */
    valueIsId?: boolean | string
    /** fallback id used when the value expression returns nothing; false/absent — no default */
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

function isConditionNode(v: any): v is ConditionNode {
    return v && typeof v === 'object' && 'if' in v && v.if && typeof v.if === 'object'
}

function isCasesNode(v: any): v is CasesNode {
    return v && typeof v === 'object' && Array.isArray((v as any).cases)
}

/** Evaluates a Condition (leaf, all, or any) against the data map. */
function evalCondition(cond: any, dataMap: DataMap): boolean {
    if (!cond || typeof cond !== 'object') return false
    if (Array.isArray(cond.all)) return cond.all.every((c: any) => evalCondition(c, dataMap))
    if (Array.isArray(cond.any)) return cond.any.some((c: any) => evalCondition(c, dataMap))

    const actual = readSource(cond.source, dataMap)
    if (typeof cond.equals === 'string') return actual === cond.equals
    if (typeof cond.not_equals === 'string') return actual !== cond.not_equals
    if (cond.empty === true) return actual === ''
    if (cond.not_empty === true) return actual !== ''
    return false
}

/** Walks a ValueExpr (string / if-tree / cases). Missing branches yield null. */
function evalValueExpr(node: ValueExpr | undefined, dataMap: DataMap): string | null {
    if (node == null) return null
    if (typeof node === 'string') return node
    if (isConditionNode(node)) {
        const branch = evalCondition(node.if, dataMap) ? node.then : node.else
        return evalValueExpr(branch, dataMap)
    }
    if (isCasesNode(node)) {
        for (const c of node.cases) {
            if (c && evalCondition(c.when, dataMap)) return evalValueExpr(c.then, dataMap)
        }
        return evalValueExpr(node.else, dataMap)
    }
    return null
}

/** Resolves the value for type === 'jira'. Returns null if there is no value. */
function resolveJiraValue(entry: ConfigEntry, field: JiraField | undefined, dataMap: DataMap): string | null {
    let resolved: string | null

    if (isConditionNode(entry.value) || isCasesNode(entry.value)) {
        resolved = evalValueExpr(entry.value, dataMap)
        if (resolved === null) {
            resolved = typeof entry.default === 'string' && entry.default.length ? entry.default : null
        }
    } else if (typeof entry.value === 'string') {
        resolved = entry.value.length ? entry.value : null
    } else {
        resolved = null
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
