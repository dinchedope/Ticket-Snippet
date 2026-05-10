# Shipping Tickets Snippet

Шаблон Chrome-расширения (Manifest V3) на Vue 3 + Vite + TypeScript + [@crxjs/vite-plugin](https://crxjs.dev/vite-plugin).

По клику на иконку расширения открывается страница настроек (`index.html`) с полями **API token / Email / Summary**, значения сохраняются в `chrome.storage.local`.

## Структура

```
.
├── public/
│   └── icons/                # PNG-иконки 16/48/128 (копируются в dist/ как есть)
├── src/
│   ├── background.ts         # service worker
│   ├── shims-vue.d.ts        # типы для .vue-импортов
│   └── ui/
│       ├── main.ts           # bootstrap Vue
│       ├── App.vue           # форма (Composition API + <script setup>)
│       └── style.css         # глобальные стили
├── index.html                # страница расширения (Vite-entry)
├── manifest.config.ts        # типизированный манифест (генерируется плагином)
├── vite.config.ts
├── tsconfig.json
└── package.json
```

## Установка

```bash
npm install
```

## Разработка с HMR

```bash
npm run dev
```

Vite поднимает dev-сервер и одновременно собирает `dist/`. Один раз грузим расширение в Chrome:

1. `chrome://extensions/` → включить **Режим разработчика**
2. **Загрузить распакованное расширение** → выбрать папку `dist/`

После этого:
- правка [src/ui/main.ts](src/ui/main.ts) или [index.html](index.html) → HMR на странице расширения, без перезагрузки
- правка [src/background.ts](src/background.ts) или [manifest.config.ts](manifest.config.ts) → плагин просит Chrome автоматически перезагрузить расширение

## Продакшн-сборка

```bash
npm run build
```

Готовый бандл — в `dist/`. Эту папку можно загрузить как распакованное расширение или упаковать через `chrome://extensions/` → **Упаковать расширение**.

## Иконки

Положите в [public/icons/](public/icons/) три файла: `icon16.png`, `icon48.png`, `icon128.png`. Без них расширение тоже загрузится, просто Chrome покажет иконку-заглушку.

## Поменять URL/поведение

- Поля формы и логика сохранения — [src/ui/App.vue](src/ui/App.vue).
- Действие по клику на иконку — [src/background.ts](src/background.ts).
- Имя, описание, permissions — [manifest.config.ts](manifest.config.ts).



## Пример конфига 

```
{
  "summary":     { "type": "internal3", "value": "Box No." },
  "description": { "type": "internal1", "value": "Box No." },
  "priority":    { "type": "jira", "valueIsId": false, "value": "Medium" },
  "customfield_10004": {
    "type": "jira", "valueIsId": true, "default": "10002",
    "value": {
      "source": { "type": "internal1", "value": "Source Type" },
      "10000": ["Order Picking", "Order Prepicking"],
      "10001": ["Order Packing"]
    }
  }
}
```