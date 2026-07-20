/**
 * ADF (Atlassian Document Format) — формат, в котором Jira API v3 принимает и
 * отдаёт форматированный текст (описание, комментарии). Здесь — минимальные
 * преобразования между простым текстом и ADF.
 */

/** Оборачивает простой текст в ADF-документ из одного параграфа. */
export function textToAdf(text: string) {
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

/** Рекурсивно достаёт простой текст из ADF-узла (параграфы разделяются переносом). */
export function adfToText(node: any): string {
  if (!node) return ''
  if (typeof node === 'string') return node
  if (node.type === 'text') return node.text ?? ''
  const inner = Array.isArray(node.content) ? node.content.map(adfToText).join('') : ''
  return node.type === 'paragraph' ? inner + '\n' : inner
}
