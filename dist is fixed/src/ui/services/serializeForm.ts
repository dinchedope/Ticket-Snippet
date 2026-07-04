import type { JiraApiVersion } from './jiraApi'

function isEmpty(v: any): boolean {
    if (v === undefined || v === null) return true
    if (typeof v === 'string') return v.trim() === ''
    if (Array.isArray(v)) return v.length === 0
    if (typeof v === 'object') return Object.keys(v).length === 0
    return false
}

/** API v3 expects rich-text fields as Atlassian Document Format; v2 takes a plain string. */
function toAdf(text: string) {
    return {
        type: 'doc',
        version: 1,
        content: [
            {
                type: 'paragraph',
                content: [{ type: 'text', text }],
            },
        ],
    }
}

/** Rich-text system fields that need ADF on API v3. */
const RICH_TEXT_SYSTEM_FIELDS = new Set(['description', 'environment'])

function isRichTextField(field: any): boolean {
    return RICH_TEXT_SYSTEM_FIELDS.has(field.key) || RICH_TEXT_SYSTEM_FIELDS.has(field.schema?.system)
}

export function serializeForm(
    form: Record<string, any>,
    fields: any[],
    apiVersion: JiraApiVersion = 3
): Record<string, any> {
    const out: Record<string, any> = {}

    for (const field of fields) {
        const value = form[field.key]
        if (isEmpty(value)) continue

        const schema = field.schema
        const type = schema?.type
        const items = schema?.items

        if (isRichTextField(field)) {
            out[field.key] = apiVersion === 2 ? String(value) : toAdf(String(value))
            continue
        }

        if (type === 'string' || type === 'date') {
            out[field.key] = value
            continue
        }

        if (
            type === 'option' ||
            type === 'priority' ||
            type === 'project' ||
            type === 'issuetype'
        ) {
            out[field.key] = { id: value }
            continue
        }

        if (type === 'user') {
            out[field.key] = { accountId: value }
            continue
        }

        if (type === 'issuelink') {
            out[field.key] = { key: value }
            continue
        }

        if (type === 'array') {
            if (items === 'string') {
                out[field.key] = value
                continue
            }
            // attachments are uploaded in a separate request, not in the payload
            // issuelinks need a linkType; skipped for the MVP
            continue
        }

        if (type === 'timetracking') {
            out[field.key] = value
            continue
        }
    }

    return out
}
