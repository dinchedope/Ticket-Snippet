import { ref, computed } from 'vue'
import { persisted } from './persisted'
import { getInitialValue } from './schemaUtils'
import { fetchCreateMeta, createIssue, type JiraConfig } from '../services/jiraApi'
import { serializeForm } from '../services/serializeForm'
import {
  parseTsvData,
  applyConfigToForm,
  type Config,
  type DataMap,
} from '../services/configMapping'

/**
 * Единый store приложения (паттерн «composable-синглтон»: состояние объявлено
 * на уровне модуля, поэтому все вызовы useAppStore() делят одни и те же ссылки).
 *
 * Здесь живёт ВСЁ общее состояние трёх страниц (форма, конфиг, настройки) и
 * действия над ним. Компоненты-страницы не хранят бизнес-состояние сами —
 * они только читают отсюда и вызывают действия.
 */

/** Схема Jira createmeta: нас интересует только массив полей. */
interface JiraScheme {
  fields: any[]
}

/** Один блок вставленных пользователем данных (TSV: заголовки + значения). */
export interface DataBlock {
  id: number
  raw: string
}

/** Статус последней операции — показывается пользователю в футере страниц. */
type Status = {
  kind: 'idle' | 'ok' | 'error'
  message: string
}

// ───────────────────────────────────────────────────────────
// Состояние
// ───────────────────────────────────────────────────────────

// --- Настройки подключения к Jira (сохраняются в chrome.storage) ---
const login = persisted('login', '') // email пользователя Jira
const token = persisted('token', '') // API-токен
const request_link = persisted('request_link', '') // URL эндпоинта createmeta (схема)
const baseUrl = persisted('baseUrl', '') // базовый URL инстанса Jira

// --- Настройки поведения формы (сохраняются в chrome.storage) ---
const visibleFields = persisted<Record<string, boolean>>('visibleFields', {}) // какие поля показывать
const clearAfterSubmit = persisted('clearAfterSubmit', false) // чистить форму после создания тикета

// --- Данные и конфиг (сохраняются в chrome.storage) ---
const dataBlocks = persisted<DataBlock[]>('dataBlocks', [{ id: 1, raw: '' }]) // вставленные TSV-блоки
const configJson = persisted('configJson', '') // JSON-конфиг маппинга данных на поля

// --- Схема и форма (только в памяти, между страницами не теряются) ---
const jiraScheme = ref<JiraScheme>({ fields: [] }) // загруженная схема Jira
const jiraSchemeString = ref('') // та же схема как форматированный JSON (для debug-превью)
const form = ref<Record<string, any>>({}) // значения полей формы: { [field.key]: value }

const status = ref<Status>({ kind: 'idle', message: '' })

// ───────────────────────────────────────────────────────────
// Производные значения
// ───────────────────────────────────────────────────────────

/** Распарсенные дата-блоки для предпросмотра на странице конфига. */
const parsedBlocks = computed(() =>
  dataBlocks.value.map((b) => ({ id: b.id, parsed: parseTsvData(b.raw) }))
)

// ───────────────────────────────────────────────────────────
// Вспомогательные функции
// ───────────────────────────────────────────────────────────

/** Отображаемое/ссылочное имя дата-блока, напр. internal1. */
function blockName(id: number): string {
  return `internal${id}`
}

/** Следующий свободный id для нового дата-блока. */
function nextBlockId(): number {
  return dataBlocks.value.reduce((max, b) => Math.max(max, b.id), 0) + 1
}

/** Приводит произвольное значение из storage к валидному списку дата-блоков. */
function normalizeBlocks(value: any): DataBlock[] {
  if (!Array.isArray(value) || !value.length) return [{ id: 1, raw: '' }]

  const blocks: DataBlock[] = []
  let fallbackId = 1
  for (const b of value) {
    if (b && typeof b === 'object' && typeof b.raw === 'string') {
      const id = typeof b.id === 'number' ? b.id : fallbackId
      blocks.push({ id, raw: b.raw })
      fallbackId = Math.max(fallbackId, id) + 1
    }
  }
  return blocks.length ? blocks : [{ id: 1, raw: '' }]
}

/** Собирает карту данных { internal1: {колонка: значение}, ... } из всех дата-блоков. */
function buildDataMap(): DataMap {
  const map: DataMap = {}
  for (const b of dataBlocks.value) {
    map[blockName(b.id)] = parseTsvData(b.raw)
  }
  return map
}

/** Текущие креды подключения в формате сервиса jiraApi. */
function jiraConfig(): JiraConfig {
  return { baseUrl: baseUrl.value, email: login.value, apiToken: token.value }
}

/** Проверяет, что все поля подключения заполнены. Возвращает текст ошибки или null. */
function validateConnection(): string | null {
  if (!login.value.trim()) return 'Не указан email'
  if (!token.value.trim()) return 'Не указан API token'
  if (!request_link.value.trim()) return 'Не указан URL для схемы'
  return null
}

// ───────────────────────────────────────────────────────────
// Действия
// ───────────────────────────────────────────────────────────

/** Добавляет пустой дата-блок. */
function addDataBlock(): void {
  dataBlocks.value = [...dataBlocks.value, { id: nextBlockId(), raw: '' }]
}

/** Удаляет дата-блок по id (последний блок удалить нельзя — остаётся пустой). */
function removeDataBlock(id: number): void {
  const next = dataBlocks.value.filter((b) => b.id !== id)
  dataBlocks.value = next.length ? next : [{ id: 1, raw: '' }]
}

/** Загружает схему Jira createmeta и инициализирует форму и видимость полей. */
async function loadSchema(): Promise<void> {
  const err = validateConnection()
  if (err) {
    status.value = { kind: 'error', message: err }
    return
  }

  try {
    status.value = { kind: 'idle', message: 'Загрузка схемы...' }
    const data = await fetchCreateMeta(request_link.value, jiraConfig())
    jiraScheme.value = data
    jiraSchemeString.value = JSON.stringify(data, null, 2)

    // Инициализируем значения формы и (для новых полей) их видимость.
    const nextForm: Record<string, any> = {}
    const nextVisibility: Record<string, boolean> = { ...(visibleFields.value ?? {}) }
    for (const field of data.fields ?? []) {
      nextForm[field.key] = getInitialValue(field)
      if (nextVisibility[field.key] === undefined) {
        nextVisibility[field.key] = true
      }
    }
    form.value = nextForm
    visibleFields.value = nextVisibility

    status.value = { kind: 'ok', message: 'Схема загружена' }
  } catch (e: any) {
    status.value = { kind: 'error', message: e.message ?? String(e) }
  }
}

/** Сбрасывает форму к начальным значениям и очищает дата-блоки. */
function resetForm(): void {
  const next: Record<string, any> = {}
  for (const field of jiraScheme.value.fields ?? []) {
    next[field.key] = getInitialValue(field)
  }
  form.value = next
  dataBlocks.value = [{ id: 1, raw: '' }]
}

/** Сериализует форму и создаёт тикет в Jira. */
async function submitTicket(): Promise<void> {
  if (!baseUrl.value.trim()) {
    status.value = { kind: 'error', message: 'Не указан baseUrl' }
    return
  }
  if (!jiraScheme.value.fields?.length) {
    status.value = { kind: 'error', message: 'Сначала загрузите схему' }
    return
  }

  try {
    status.value = { kind: 'idle', message: 'Создаём тикет...' }
    const payload = serializeForm(form.value, jiraScheme.value.fields)
    const created = await createIssue(jiraConfig(), payload)
    status.value = { kind: 'ok', message: `Создан: ${created.key}` }
    if (clearAfterSubmit.value) resetForm()
  } catch (e: any) {
    status.value = { kind: 'error', message: e.message ?? String(e) }
  }
}

/** Применяет JSON-конфиг: заполняет форму значениями из дата-блоков по правилам маппинга. */
function applyConfig(): void {
  try {
    const dataMap = buildDataMap()
    const config: Config = configJson.value.trim() ? JSON.parse(configJson.value) : {}
    form.value = applyConfigToForm(
      form.value,
      config,
      dataMap,
      jiraScheme.value.fields ?? []
    )
    status.value = { kind: 'ok', message: 'Конфиг применён' }
  } catch (e: any) {
    status.value = { kind: 'error', message: 'Ошибка конфига: ' + (e.message ?? String(e)) }
  }
}

/** Читает сохранённые значения из chrome.storage.local. Вызывается один раз при старте. */
async function hydrate(): Promise<void> {
  const data = await chrome.storage.local.get([
    'login', 'token', 'request_link', 'baseUrl',
    'dataBlocks', 'configJson', 'visibleFields', 'clearAfterSubmit',
  ])
  login.value = data.login || ''
  token.value = data.token || ''
  request_link.value = data.request_link || ''
  baseUrl.value = data.baseUrl || ''
  dataBlocks.value = normalizeBlocks(data.dataBlocks)
  configJson.value = data.configJson || ''
  visibleFields.value = data.visibleFields || {}
  clearAfterSubmit.value = !!data.clearAfterSubmit
}

/**
 * Точка доступа к store. Возвращает стабильный объект с реактивным состоянием
 * и действиями — общий для всех компонентов.
 */
export function useAppStore() {
  return {
    // состояние подключения / настроек
    login,
    token,
    request_link,
    baseUrl,
    visibleFields,
    clearAfterSubmit,
    // данные и конфиг
    dataBlocks,
    configJson,
    parsedBlocks,
    // схема и форма
    jiraScheme,
    jiraSchemeString,
    form,
    status,
    // хелперы
    blockName,
    jiraConfig,
    // действия
    addDataBlock,
    removeDataBlock,
    loadSchema,
    resetForm,
    submitTicket,
    applyConfig,
    hydrate,
  }
}
