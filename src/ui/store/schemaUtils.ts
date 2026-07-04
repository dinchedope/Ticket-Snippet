/**
 * Чистые (без реактивности) утилиты для работы со схемой Jira createmeta.
 * Каждое поле схемы — это объект вида { key, name, required, schema, allowedValues, defaultValue }.
 */

/**
 * Вычисляет начальное значение поля формы на основе его описания в схеме.
 *
 * Приоритет:
 *   1. defaultValue из схемы (объект → берём id/value, иначе как есть);
 *   2. единственный вариант из allowedValues — подставляем его id/value;
 *   3. пустое значение по типу: [] для массивов, {} для timetracking, '' иначе.
 */
export function getInitialValue(field: any): any {
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
