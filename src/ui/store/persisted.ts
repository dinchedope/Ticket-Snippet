import { ref, watch, toRaw, type Ref } from 'vue'

/**
 * Создаёт реактивную ссылку, которая автоматически сохраняется в
 * `chrome.storage.local` при каждом изменении.
 *
 * Важно: значение только ПИШЕТСЯ в storage. Чтение (гидрация) при старте
 * приложения делается отдельно — см. `useAppStore().hydrate()`.
 *
 * @param key     ключ в chrome.storage.local
 * @param initial начальное значение до гидрации
 */
export function persisted<T>(key: string, initial: T): Ref<T> {
  const state = ref(initial) as Ref<T>

  // Для объектов/массивов нужен глубокий watch, иначе изменения
  // внутренних полей не будут перехвачены.
  const isObject = typeof initial === 'object' && initial !== null

  watch(
    state,
    async (value) => {
      // toRaw снимает реактивную обёртку — в storage кладём «сырое» значение.
      await chrome.storage.local.set({ [key]: toRaw(value) })
    },
    { deep: isObject }
  )

  return state
}
