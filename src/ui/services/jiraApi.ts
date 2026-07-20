import { textToAdf } from './adf'

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

/**
 * Загружает существующий тикет по ключу (напр. "PROJ-123").
 * expand=names добавляет карту { fieldId: человекочитаемое имя }.
 */
export async function fetchIssue(config: JiraConfig, key: string): Promise<any> {
    const url = `${trimSlash(config.baseUrl)}/rest/api/3/issue/${encodeURIComponent(key)}?expand=names`
    const res = await fetch(url, { method: 'GET', headers: jsonHeaders(config) })
    if (!res.ok) {
        throw new Error(`Не удалось загрузить тикет ${key}: ${res.status} ${res.statusText}`)
    }
    return res.json()
}

/**
 * Метаданные редактирования тикета: какие поля можно менять и их схема
 * (формат совпадает с createmeta — те же schema / allowedValues).
 * Возвращает объект { fieldId: описание поля }.
 */
export async function fetchEditMeta(config: JiraConfig, key: string): Promise<Record<string, any>> {
    const url = `${trimSlash(config.baseUrl)}/rest/api/3/issue/${encodeURIComponent(key)}/editmeta`
    const res = await fetch(url, { method: 'GET', headers: jsonHeaders(config) })
    if (!res.ok) {
        throw new Error(`Не удалось загрузить editmeta для ${key}: ${res.status} ${res.statusText}`)
    }
    const data = await res.json()
    return data.fields ?? {}
}

/** Сохраняет изменённые поля тикета. */
export async function updateIssue(
    config: JiraConfig,
    key: string,
    fields: Record<string, any>
): Promise<void> {
    const url = `${trimSlash(config.baseUrl)}/rest/api/3/issue/${encodeURIComponent(key)}`
    const res = await fetch(url, {
        method: 'PUT',
        headers: jsonHeaders(config),
        body: JSON.stringify({ fields }),
    })
    // Успешное обновление возвращает 204 No Content.
    if (!res.ok) {
        const body = await res.text()
        throw new Error(`Update issue failed (${res.status}): ${body}`)
    }
}

/** Доступные переходы воркфлоу из текущего статуса тикета. */
export async function fetchTransitions(config: JiraConfig, key: string): Promise<any[]> {
    const url = `${trimSlash(config.baseUrl)}/rest/api/3/issue/${encodeURIComponent(key)}/transitions`
    const res = await fetch(url, { method: 'GET', headers: jsonHeaders(config) })
    if (!res.ok) {
        throw new Error(`Не удалось загрузить переходы для ${key}: ${res.status} ${res.statusText}`)
    }
    const data = await res.json()
    return data.transitions ?? []
}

/** Загружает комментарии тикета (в хронологическом порядке). */
export async function fetchComments(config: JiraConfig, key: string): Promise<any[]> {
    const url = `${trimSlash(config.baseUrl)}/rest/api/3/issue/${encodeURIComponent(key)}/comment`
    const res = await fetch(url, { method: 'GET', headers: jsonHeaders(config) })
    if (!res.ok) {
        throw new Error(`Не удалось загрузить комментарии для ${key}: ${res.status} ${res.statusText}`)
    }
    const data = await res.json()
    return data.comments ?? []
}

/** Добавляет комментарий к тикету (простой текст оборачивается в ADF). */
export async function postComment(
    config: JiraConfig,
    key: string,
    text: string
): Promise<any> {
    const url = `${trimSlash(config.baseUrl)}/rest/api/3/issue/${encodeURIComponent(key)}/comment`
    const res = await fetch(url, {
        method: 'POST',
        headers: jsonHeaders(config),
        body: JSON.stringify({ body: textToAdf(text) }),
    })
    if (!res.ok) {
        const body = await res.text()
        throw new Error(`Add comment failed (${res.status}): ${body}`)
    }
    return res.json()
}

/** Выполняет переход воркфлоу (смена статуса тикета). */
export async function applyTransition(
    config: JiraConfig,
    key: string,
    transitionId: string
): Promise<void> {
    const url = `${trimSlash(config.baseUrl)}/rest/api/3/issue/${encodeURIComponent(key)}/transitions`
    const res = await fetch(url, {
        method: 'POST',
        headers: jsonHeaders(config),
        body: JSON.stringify({ transition: { id: transitionId } }),
    })
    // Успешный переход возвращает 204 No Content.
    if (!res.ok) {
        const body = await res.text()
        throw new Error(`Transition failed (${res.status}): ${body}`)
    }
}
