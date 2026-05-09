function isEmpty(v: any): boolean {
    if (v === undefined || v === null) return true
    if (typeof v === 'string') return v.trim() === ''
    if (Array.isArray(v)) return v.length === 0
    if (typeof v === 'object') return Object.keys(v).length === 0
    return false
}

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

export function serializeForm(
    form: Record<string, any>,
    fields: any[]
): Record<string, any> {
    const out: Record<string, any> = {}

    for (const field of fields) {
        const value = form[field.key]
        if (isEmpty(value)) continue

        const schema = field.schema
        const type = schema?.type
        const items = schema?.items

        if (field.key === 'description' || schema?.system === 'description') {
            out[field.key] = toAdf(value)
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
            // attachments — отдельным запросом, не в payload
            // issuelinks — требует linkType, MVP пропускаем
            continue
        }

        if (type === 'timetracking') {
            out[field.key] = value
            continue
        }
    }

    return out
}
