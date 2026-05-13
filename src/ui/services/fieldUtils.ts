import type { Component } from 'vue'
import type { JiraField } from './jiraTypes'
import TextField from '../Components/Text-field.vue'
import TextArea from '../Components/Text-area.vue'
import Select from '../Components/Select.vue'
import DatePicker from '../Components/Date-picker.vue'
import UserPicker from '../Components/User-picker.vue'
import Attachment from '../Components/Attachment.vue'
import Labels from '../Components/Labels.vue'
import IssueLink from '../Components/Issue-link.vue'
import TimeTracking from '../Components/Time-tracking.vue'
import MultiSelect from '../Components/Multi-select.vue'

export interface FieldUi {
    component: Component
    props: Record<string, any>
}

/** Maps a Jira create-meta field to the UI component that should render it. */
export function getUiFieldType(field: JiraField): FieldUi | null {
    const schema = field.schema
    if (!schema) return null

    const baseProps = { name: field.name, required: field.required }

    if (schema.type === 'string' && schema.system === 'summary')
        return { component: TextField, props: baseProps }
    if (schema.type === 'string' && schema.system === 'description')
        return { component: TextArea, props: baseProps }
    if (schema.type === 'string')
        return { component: TextField, props: baseProps }

    if (schema.type === 'date')
        return { component: DatePicker, props: baseProps }

    if (
        schema.type === 'option' ||
        schema.type === 'priority' ||
        schema.type === 'project' ||
        schema.type === 'issuetype'
    ) {
        return {
            component: Select,
            props: { ...baseProps, options: field.allowedValues ?? [] }
        }
    }

    if (schema.type === 'user')
        return { component: UserPicker, props: baseProps }

    if (schema.type === 'issuelink')
        return { component: IssueLink, props: baseProps }

    if (schema.type === 'array' && schema.items === 'attachment')
        return { component: Attachment, props: baseProps }

    if (schema.type === 'array' && schema.items === 'string')
        return { component: Labels, props: baseProps }

    if (schema.type === 'array' && schema.items === 'issuelinks')
        return { component: IssueLink, props: { ...baseProps, multiple: true } }

    if (schema.type === 'array' && (schema.items === 'component' || schema.items === 'option')) {
        return {
            component: MultiSelect,
            props: { ...baseProps, options: field.allowedValues ?? [] },
        }
    }

    if (schema.type === 'timetracking')
        return { component: TimeTracking, props: baseProps }

    return null
}

/** Initial form value for a field: default value, the only allowed value, or an empty placeholder. */
export function getInitialValue(field: JiraField): any {
    if (field.defaultValue !== undefined && field.defaultValue !== null) {
        if (typeof field.defaultValue === 'object') {
            return String(field.defaultValue.id ?? field.defaultValue.value ?? '')
        }
        return field.defaultValue
    }
    if (Array.isArray(field.allowedValues) && field.allowedValues.length === 1) {
        const only = field.allowedValues[0]
        return String(only.id ?? only.value ?? '')
    }
    const schema = field.schema
    if (schema?.type === 'array') return []
    if (schema?.type === 'timetracking') return {}
    return ''
}
