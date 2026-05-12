export type JiraApiVersion = 2 | 3

export interface JiraConfig {
    baseUrl: string
    email: string
    apiToken: string
    /** REST API version, derived from the schema URL (see detectApiVersion) */
    apiVersion: JiraApiVersion
}

/** Detects the Jira REST API version from a URL. Defaults to 3. */
export function detectApiVersion(url: string): JiraApiVersion {
    return /\/(?:rest\/)?api\/2(?:\/|$)/.test(url) ? 2 : 3
}

function authHeader(config: JiraConfig): string {
    return 'Basic ' + btoa(`${config.email}:${config.apiToken}`)
}

function jsonHeaders(config: JiraConfig) {
    return {
        Authorization: authHeader(config),
        'Content-Type': 'application/json',
        Accept: 'application/json',
    }
}

function trimSlash(url: string): string {
    return url.endsWith('/') ? url.slice(0, -1) : url
}

/**
 * createmeta comes in a few response shapes depending on endpoint / API version.
 * Normalize everything to `{ fields: any[] }` so the rest of the app is version-agnostic.
 */
function normalizeCreateMeta(raw: any): { fields: any[] } {
    if (!raw || typeof raw !== 'object') return { fields: [] }

    // /rest/api/{2,3}/issue/createmeta/{projectKey}/issuetypes/{issueTypeId}  ->  { fields: [...] }
    if (Array.isArray(raw.fields)) return { fields: raw.fields }

    // legacy ?expand=projects.issuetypes.fields  ->  { projects: [{ issuetypes: [{ fields: { fieldId: {...} } }] }] }
    const legacyFields = raw?.projects?.[0]?.issuetypes?.[0]?.fields
    if (legacyFields && typeof legacyFields === 'object') {
        return { fields: Object.values(legacyFields) }
    }

    // paginated variant  ->  { values: [...] }
    if (Array.isArray(raw.values)) return { fields: raw.values }

    return { fields: [] }
}

export async function fetchCreateMeta(url: string, config: JiraConfig): Promise<{ fields: any[] }> {
    const res = await fetch(url, { method: 'GET', headers: jsonHeaders(config) })
    if (!res.ok) {
        throw new Error(`Failed to fetch schema: ${res.status} ${res.statusText}`)
    }
    return normalizeCreateMeta(await res.json())
}

export async function createIssue(
    config: JiraConfig,
    fields: Record<string, any>
): Promise<{ id: string; key: string; self: string }> {
    const url = `${trimSlash(config.baseUrl)}/rest/api/${config.apiVersion}/issue`
    const res = await fetch(url, {
        method: 'POST',
        headers: jsonHeaders(config),
        body: JSON.stringify({ fields }),
    })
    if (!res.ok) {
        const body = await res.text()
        throw new Error(`Create issue failed (${res.status}): ${body}`)
    }
    return res.json()
}
