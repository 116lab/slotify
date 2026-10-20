# Theme and palette
format: 1
subject: static/js/config/themes.js
subject: static/js/composables/useTheme.js
subject: layouts/_default/baseof.html
subject: data/theme-palette.json
subject: hugo.toml
subject: tests/theme.spec.js

## Judgment
- A stored light/dark choice always wins over the site's `defaultColorMode` and survives
  a reload.
  - `a chosen light/dark mode is stored and wins on the next visit`
- A stored personality that no longer exists in the palette falls back to the default
  personality but keeps its mode, so Vuetify never boots with an unknown theme and the
  switcher always has a matching option.
  - `a stored personality that no longer exists falls back but keeps its mode`
- A site recolors through `[params.palette]`, deep-merged onto `data/theme-palette.json`,
  so it can override a single role or add a personality without restating the rest.
  - `a site palette override deep-merges onto the theme palette`
- The personality order, and with it the default personality (its first id), is declared
  by `[params] personalityOrder` rather than read from the palette, because Hugo maps
  lose key order and `jsonify` emits keys alphabetically; palette ids left out of the
  list follow alphabetically, so a site-added personality still appears.
  - `the default personality follows personalityOrder, not alphabetical order`

## Rejected
- A site-level `data/theme-palette.json` override: Hugo merges data files only shallowly,
  so the whole personality is replaced and its untouched roles are dropped.
