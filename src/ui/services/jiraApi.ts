export interface JiraConfig {
    baseUrl: string
    email: string
    apiToken: string
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

export async function fetchCreateMeta(url: string, config: JiraConfig): Promise<any> {
    const res = await fetch(url, {
        method: 'GET',
        headers: jsonHeaders(config),
    })
    if (!res.ok) {
        throw new Error(`Failed to fetch schema: ${res.status} ${res.statusText}`)
    }
    return res.json()
}

export async function createIssue(
    config: JiraConfig,
    fields: Record<string, any>
): Promise<{ id: string; key: string; self: string }> {
    const url = `${trimSlash(config.baseUrl)}/rest/api/3/issue`
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
