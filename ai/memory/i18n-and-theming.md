---
name: i18n-and-theming
description: vue-i18n setup (en-US + de-AT fallback), Vuetify theme colors, dark/light mode, iconfont, and localStorage persistence.
---

# i18n and theming

## i18n

- `vue-i18n@8` (Vue 2 era).
- Default locale is `'en'` (main.ts). `App.vue.mounted()` reads
  `localStorage.languageKey` and overrides to that, falling back to `'de'`.
- Two JSON files: `src/locales/en-US.json` and `de-AT.json`.
- `src/locales/i18n.ts` merges `de-AT` on top of `en-US` via
  `Object.assign({}, enUs, deAt)` — so **missing German keys fall back to
  English automatically**. Don't mirror empty keys; just omit them in
  `de-AT.json`.
- Exposed as `{ en, de }` to `new VueI18n({ locale, messages })`.

### Template usage

- `{{ $t('pageTitle.' + $route.name) }}` — route names (camelCase) map to
  localization keys under `pageTitle.*`.
- `$t('tooltip.mnu.kiosk')` — tooltip strings are grouped under
  `tooltip.*`. Many templates use `v-html="$t(...)"` on tooltips because
  the strings contain HTML.
- `$t('message.${level}.${group}')` — the logger builds keys like
  `message.error.communication`. See `utils-modules.md` → loggingUtils.
- Plan panels and similar components use `$t('page.kiosk.linkLights')` etc.

### Adding a new route / view

When you add a view to the router, also add a `pageTitle.<name>` entry to
`en-US.json` (and optionally to `de-AT.json`) — otherwise the app bar shows
`pageTitle.yourname` literally.

## Theming (Vuetify)

Defined in `src/plugins/vuetify.ts`:

- **Iconfont**: `md` (Material Design icons) via
  `material-design-icons-iconfont` package.
- **Preset**: `vue-cli-plugin-vuetify-preset-basil/preset`.
- **Default theme**: dark.
- **Dark palette** (excerpt):
  - primary `#3A3A3A`, accent `#294543`, secondary `#696969`
  - success `#2b4d2c`, info `#244661`, warning `#a16f32`, error `#7d3939`
  - **Custom**: `on: '#707000'`, `off: '#000065'`, `disabled: '#757575'`
- **Light palette** mirrors the same keys with different values.

`on` and `off` are non-standard Vuetify theme colors used to color indicator
elements (toggle states). They are referenced via `class="on"` and `class="off"`
from templates.

### Dark mode persistence

`App.vue.mounted()` reads `localStorage.darkTheme` and sets
`this.$vuetify.theme.dark` to that. Note: **the stored value is a string
`'false'`/`'true'`, not a boolean** — the code explicitly checks
`theme === 'false'`. Don't refactor this to a bare boolean without migrating
existing clients.

## Registered Vuetify components

`src/plugins/vuetify.ts` uses **explicit component imports** from `vuetify/lib`
(not the bulk import). If you need a new Vuetify component (`v-data-table`,
`v-date-picker`, …), you **must** add it to the imports + registration object.
Otherwise it silently fails to render.

## Styles

- `src/styles/_colors.scss`, `_fonts.scss` — auto-prepended to every SCSS
  file via `vue.config.js > css.loaderOptions.sass.prependData`.
- `src/styles/_index.scss` — common layout variables like `$nav_menu_width`.
- Each views/ and components/ subfolder has its own `_index.scss` which
  Vue files import via `@import 'index.scss'`.
