import { type Component } from 'vue'
import TextField from '../Components/Text-field.vue'
import TextArea from '../Components/Text-area.vue'
import Select from '../Components/Select.vue'
import DatePicker from '../Components/Date-picker.vue'
import UserPicker from '../Components/User-picker.vue'
import Attachment from '../Components/Attachment.vue'
import Labels from '../Components/Labels.vue'
import IssueLink from '../Components/Issue-link.vue'
import TimeTracking from '../Components/Time-tracking.vue'

/** Какой UI-компонент и с какими пропсами рендерить для конкретного поля Jira. */
export interface FieldUi {
  component: Component
  props: Record<string, any>
}

/**
 * Сопоставляет описание поля из схемы Jira с UI-компонентом.
 * Возвращает null, если тип поля не поддерживается (такое поле не рендерится).
 */
export function getUiFieldType(field: any): FieldUi | null {
  const schema = field.schema
  if (!schema) return null

  const baseProps = { name: field.name, required: field.required }

  // строковые поля
  if (schema.type === 'string' && schema.system === 'summary')
    return { component: TextField, props: baseProps }
  if (schema.type === 'string' && schema.system === 'description')
    return { component: TextArea, props: baseProps }
  if (schema.type === 'string')
    return { component: TextField, props: baseProps }

  // дата
  if (schema.type === 'date')
    return { component: DatePicker, props: baseProps }

  // выпадающие списки (варианты, приоритет, проект, тип задачи)
  if (
    schema.type === 'option' ||
    schema.type === 'priority' ||
    schema.type === 'project' ||
    schema.type === 'issuetype'
  ) {
    return {
      component: Select,
      props: { ...baseProps, options: field.allowedValues ?? [] },
    }
  }

  // пользователь
  if (schema.type === 'user')
    return { component: UserPicker, props: baseProps }

  // связь с задачей
  if (schema.type === 'issuelink')
    return { component: IssueLink, props: baseProps }

  // массивы
  if (schema.type === 'array' && schema.items === 'attachment')
    return { component: Attachment, props: baseProps }
  if (schema.type === 'array' && schema.items === 'string')
    return { component: Labels, props: baseProps }
  if (schema.type === 'array' && schema.items === 'issuelinks')
    return { component: IssueLink, props: { ...baseProps, multiple: true } }

  // учёт времени
  if (schema.type === 'timetracking')
    return { component: TimeTracking, props: baseProps }

  return null
}
