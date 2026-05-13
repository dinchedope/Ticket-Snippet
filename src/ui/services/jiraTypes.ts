/**
 * One option in `allowedValues`. Different schemas use different label keys:
 *   - `option` → `value`
 *   - `priority` / `project` / `issuetype` / `component` → `name`
 * The id always lives in `id`.
 */
export interface JiraAllowedValue {
    id: string
    value?: string
    name?: string
    self?: string
    key?: string
    iconUrl?: string
    disabled?: boolean
    [extra: string]: any
}

export interface JiraFieldSchema {
    type: string
    /** for `array`-typed fields: type of each element */
    items?: string
    /** built-in system field name, e.g. 'summary' / 'description' / 'assignee' */
    system?: string
    /** plugin id for custom fields, e.g. 'com.atlassian.jira.plugin.system.customfieldtypes:select' */
    custom?: string
    customId?: number
}

/**
 * A Jira create-meta field, **normalized**.
 * After `normalizeCreateMeta` runs, `key` is always populated (falls back to `fieldId`).
 */
export interface JiraField {
    /** stable identifier used everywhere in the app; normalized from `key` or `fieldId` */
    key: string
    /** original `fieldId` (in some Jira responses it is the only identifier) */
    fieldId?: string
    name: string
    required: boolean
    schema: JiraFieldSchema
    allowedValues?: JiraAllowedValue[]
    /** Jira's default value — shape varies by field type (often `{id, name/value}` for selects) */
    defaultValue?: any
    hasDefaultValue?: boolean
    autoCompleteUrl?: string
    operations?: string[]
    [extra: string]: any
}

export interface JiraCreateMeta {
    fields: JiraField[]
}
