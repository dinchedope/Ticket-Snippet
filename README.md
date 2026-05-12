# Shipping Tickets Snippet

A Chrome extension (Manifest V3, Vue 3 + Vite + TypeScript) that creates Jira issues:
it fetches the field schema from the Jira REST API, renders a form from it, lets you fill
the form manually or auto-populate it from pasted tabular data via a JSON mapping config,
and submits `POST /issue`.

---

## Quick start

```bash
npm install
npm run build          # type-check (vue-tsc) + production build into dist/
npm run dev            # dev server + rebuilds dist/ with HMR
```

Load into Chrome once:

1. `chrome://extensions/` → enable **Developer mode**
2. **Load unpacked** → pick the `dist/` folder

After that, editing `src/ui/**` hot-reloads the popup; editing `src/background.ts` or
`manifest.config.ts` makes the plugin ask Chrome to reload the extension.

---

## What it does, end to end

1. **Settings → connection** — you enter your Jira email, API token, the schema URL
   (a `createmeta` endpoint) and the base URL.
2. **Load schema** — the app GETs the schema URL and builds a form: one input per Jira
   field, with the right widget for each field type. Fields with a default value (or a
   single allowed value) are pre-filled.
3. **Paste data** — paste TSV rows (header line + value line) into one or more *data
   blocks*. Each block is parsed live into `{ "Column Name": "value", ... }` and shown
   below the textarea.
4. **Write a config** — a JSON object that maps Jira field keys to either a literal value
   or a value pulled from a data block (optionally via a lookup table). Press **Apply
   config** and the form fills in.
5. **Create issue** — the form is serialized into a Jira payload (each field type is
   converted to the shape Jira expects) and POSTed. The result (issue key or the server
   error) shows in the status line.

Almost everything is persisted to `chrome.storage.local`, so it survives popup close.

---

## Project structure

```
src/
├── background.ts                 # service worker (extension icon click, etc.)
├── shims-vue.d.ts                # types for .vue imports
└── ui/
    ├── main.ts                   # Vue bootstrap + global errorHandler
    ├── style.css                 # global styles: form controls, .btn*, layout resets
    ├── App.vue                   # orchestrator — see below
    ├── Components/
    │   ├── Settings.vue          # settings screen: connection, field visibility, flags, debug schema
    │   ├── DataPanel.vue         # left column: data blocks + config JSON + "Apply config"
    │   ├── IssueForm.vue         # right column: dynamic fields + "Create issue" + status
    │   ├── Text-field.vue        # field widgets — all controlled via defineModel()
    │   ├── Text-area.vue
    │   ├── Select.vue            # shows "Label (id)" for each option
    │   ├── Date-picker.vue
    │   ├── User-picker.vue       # MVP: plain accountId input
    │   ├── Attachment.vue        # <input type=file multiple>
    │   ├── Labels.vue            # comma-separated string ↔ string[]
    │   ├── Issue-link.vue        # issue key input (single / multiple)
    │   └── Time-tracking.vue     # originalEstimate / remainingEstimate
    └── services/
        ├── jiraApi.ts            # HTTP: fetchCreateMeta / createIssue, API version detection + response normalization
        ├── serializeForm.ts      # form object → Jira payload (per field type, ADF for v3)
        ├── configMapping.ts      # TSV parsing, applyConfigToForm, types: Config / ConfigEntry / DataBlock / DataMap
        └── fieldUtils.ts         # getUiFieldType (field → component) + getInitialValue
```

### Component tree

```
App.vue                          owns all state; renders header + one of:
├── Settings.vue                  (when the gear is open)
└── DataPanel.vue + IssueForm.vue (the main screen)
        └── <component :is="...">  one of the Text-field / Select / ... widgets per field
```

---

## State and data flow

`App.vue` is a thin orchestrator. It does **not** render fields itself — it holds the
state and hands it to three child components.

### State (all in App.vue)

Persisted via the `persisted<T>(key, initial)` helper (`ref` + `watch` → `chrome.storage.local`):

| ref | what |
|---|---|
| `login`, `token`, `request_link`, `baseUrl` | connection settings |
| `dataBlocks` | `[{ id, raw }, ...]` — pasted TSV blocks; `id` is stable |
| `configJson` | the JSON mapping config (as text) |
| `visibleFields` | `{ fieldKey: boolean }` — which fields show in the form |
| `clearAfterSubmit` | reset the form & data blocks after a successful create |

Not persisted (rebuilt each popup open): `jiraScheme` (the field schema), `form` (the
form values), `status` (the bottom message), `settingsOpen`.

### `form` — the single source of truth

`form` is one `ref<Record<string, any>>({})` in App.vue. It is passed to **both**
`DataPanel` and `IssueForm` via `v-model:form="form"`. Because object props are passed by
reference, all three see the *same* object — a per-field edit in `IssueForm`
(`form[key] = ...`) is instantly visible everywhere, no event needed. Replacing the whole
object (Apply config, reset) goes through `v-model:form` / `update:form` so App can swap
its ref and re-hand the new object to everyone.

The field widgets are "dumb": each uses `defineModel()` and holds no state of its own, so
collecting all form values just means reading `App.form`.

### 1. Load schema

`App.loadSchema()`:

1. `validateConnection()` — email / token / schema URL must be set.
2. `fetchCreateMeta(request_link, jiraConfig())` — GET with Basic auth.
   `normalizeCreateMeta` converts whatever shape Jira returns
   (`{ fields: [...] }`, the legacy `{ projects: [{ issuetypes: [{ fields: {...} }] }] }`,
   or `{ values: [...] }`) into a single `{ fields: any[] }`.
3. For each field: `form[key] = getInitialValue(field)` (default value, the only allowed
   value, or `'' / [] / {}`); add it to `visibleFields` with `true` if new.
4. Stash the raw schema as a string for the debug preview in Settings.

### 2. Render the form

`IssueForm.vue` (`fields`, `visibleFields`, `v-model:form`, `status`):

```ts
const renderedFields = computed(() =>
  fields
    .filter(f => visibleFields[f.key] !== false)    // hidden fields out
    .map(f => ({ field: f, ui: getUiFieldType(f) })) // pick a widget
    .filter(item => item.ui !== null)                // type:"any" etc. skipped
)
```

`getUiFieldType` (`fieldUtils.ts`) maps `field.schema.type` to a component:
`string+summary → TextField`, `string+description → TextArea`, `date → DatePicker`,
`option/priority/project/issuetype → Select`, `user → UserPicker`, `issuelink → IssueLink`,
`array+attachment → Attachment`, `array+string → Labels`, `array+issuelinks → IssueLink (multiple)`,
`timetracking → TimeTracking`. Anything else → not rendered.

The template is just `<component :is="ui.component" v-bind="ui.props" v-model="form[field.key]" />`.

### 3. Apply config (auto-populate)

`DataPanel.vue` (`v-model:dataBlocks`, `v-model:configJson`, `v-model:form`, `fields`, `@status`):

- **Data blocks** — array of `{ id, raw }`. `id` is monotonic (`max(ids) + 1`) and stays
  stable when other blocks are removed; the block's name is `internal{id}`. A live
  preview under each block shows `parseTsvData(raw)`. `parseTsvData` splits each row on
  tabs (or 2+ spaces as a fallback) and zips headers with values.
- **Apply config** → `applyConfig()`:
  1. `buildDataMap()` → `{ internal1: {...}, internal3: {...}, ... }`
  2. `JSON.parse(configJson)` (wrapped in try/catch — bad JSON → error status)
  3. `applyConfigToForm(form, config, dataMap, fields)` → a new `form`
  4. success / error bubbles up via `emit('status', ...)`

### 4. Create the issue

**Create issue** in `IssueForm` → `emit('submit')` → `App.submitTicket()`:

1. Guards: `baseUrl` set? Schema loaded?
2. `serializeForm(form, fields, apiVersion)` — flat `form` → Jira payload:
   - `string` / `date` → as-is
   - `option` / `priority` / `project` / `issuetype` → `{ id: value }`
   - `user` → `{ accountId: value }`, `issuelink` → `{ key: value }`
   - `array+string` (labels) → `string[]`
   - `description` / `environment` → ADF object on v3, plain string on v2
   - `timetracking` → object as-is
   - attachments / `array+issuelinks` → skipped (separate request / needs `linkType`)
   - empty values are not included in the payload at all
3. `createIssue(cfg, payload)` → `POST ${baseUrl}/rest/api/${apiVersion}/issue` with
   `{ fields: payload }`. The response key (or the Jira error text) goes to the status line.
4. If `clearAfterSubmit` → `resetForm()`: rebuild `form` with defaults and clear data blocks.

---

## Config format

The config is a JSON object: **key = Jira field key**, value = a `ConfigEntry`.

```jsonc
{
  // 1) pull a value straight from a data block (by column name)
  "summary":     { "type": "internal1", "value": "Entry No." },
  "description": { "type": "internal1", "value": "Box No." },

  // 2) a literal value; valueIsId:false means "this is the option's label, look up its id"
  "priority":    { "type": "jira", "valueIsId": false, "value": "Medium" },

  // 3) substitution: choose an id based on a value read from a data block
  "issuetype": {
    "type": "jira",
    "valueIsId": true,
    "default": "10002",
    "value": {
      "source": { "type": "internal1", "value": "Source Type" },
      "10000": ["Order Picking", "Order Prepicking"],
      "10001": ["Order Packing"]
    }
  }
}
```

`ConfigEntry` fields:

| field | meaning |
|---|---|
| `type` | `"internal{N}"` — take the value from data block `internal{N}`; `"jira"` — a literal / substitution value |
| `value` | for `internal{N}`: the TSV column name. For `jira`: a string (literal) **or** a substitution object (see below) |
| `valueIsId` | `true` (default) — `value` is already the option id. `false` — `value` is the option's label; the id is looked up in the field's `allowedValues`. (Strings `"true"`/`"false"` are tolerated too.) |
| `default` | substitution only: the id to use when nothing matches. `false`/absent → no value (`""`). |

**Substitution mode** (`value` is an object): read `value.source` → `dataMap[source.type][source.value]`,
then find the id key whose array contains that value. The `source` key is reserved and is
not treated as an id. No match → `default`. Then, if `valueIsId: false`, the chosen key is
additionally resolved label → id.

So in the example: if `internal1["Source Type"] == "Order Picking"`, then
`form.issuetype = "10000"` and the Select shows `Task (10000)`.

---

## Jira API v2 vs v3

The API version is detected **once** from the schema URL: a URL containing `/api/2/`
(or `/rest/api/2/`) → v2, otherwise v3. It is stored in `JiraConfig.apiVersion` and used in
exactly two places:

- **on the way in** — `normalizeCreateMeta` (v2 often returns the legacy `{ projects: [...] }` shape)
- **on the way out** — `serializeForm` (ADF object for `description`/`environment` on v3, plain
  string on v2) and `createIssue` (endpoint `/rest/api/{2|3}/issue`)

Everything else (the form, the widgets, `getUiFieldType`, `applyConfigToForm`) is
version-agnostic — there are no `if (version === 2)` checks outside `jiraApi.ts` /
`serializeForm.ts`.

To switch versions, just paste a v2 or v3 URL into Settings → "schema URL"; nothing else
needs changing.

### Useful Jira endpoints

```
# list projects / issue types
GET /rest/api/3/issue/createmeta/

# fields of a specific project + issue type (this is what you paste as the schema URL)
GET /rest/api/3/issue/createmeta/TEST/issuetypes/10009
```

---

## Settings screen

Opened with the ⚙ button; it replaces the main screen. All inputs are bound (via
`v-model`) to the persisted refs in `App.vue`:

- connection fields + **Load schema**
- **Visible fields** — a checkbox per schema field (required fields marked with `*`)
- **Clear the form and pasted data** after a successful create
- **Schema (debug)** — a `<details>` with the raw createmeta response

---

## Known limitations / MVP shortcuts

- `User-picker` is a plain `accountId` text input — no autocomplete against `autoCompleteUrl`.
- `Attachment` only collects `File[]` into the form; uploading attachments is a separate
  Jira request (`POST /issue/{key}/attachments` with `multipart/form-data` and the
  `X-Atlassian-Token: no-check` header) and is not implemented.
- `Issue-link` is just an issue-key input; real links also need a `linkType`.
- A field present in `createmeta` can still be rejected on create (`"...cannot be set. It is
  not on the appropriate screen..."`) — `createmeta` lists what *exists* for the project,
  not what the create screen actually accepts.

---

## Where to change things

- Form fields & app logic — [src/ui/App.vue](src/ui/App.vue)
- Field-type → widget mapping — [src/ui/services/fieldUtils.ts](src/ui/services/fieldUtils.ts)
- Config / TSV logic — [src/ui/services/configMapping.ts](src/ui/services/configMapping.ts)
- Payload serialization — [src/ui/services/serializeForm.ts](src/ui/services/serializeForm.ts)
- HTTP / API version — [src/ui/services/jiraApi.ts](src/ui/services/jiraApi.ts)
- Extension icon click action — [src/background.ts](src/background.ts)
- Name, description, permissions — [manifest.config.ts](manifest.config.ts)

> Note: this is a browser extension making cross-origin requests to `*.atlassian.net`. If
> Chrome blocks them with a CORS error, add the Jira host to `host_permissions` in
> `manifest.config.ts` (e.g. `"https://*.atlassian.net/*"`).

---

## Icons

Put `icon16.png`, `icon48.png`, `icon128.png` into [public/icons/](public/icons/). The
extension loads without them — Chrome just shows a placeholder.
