# Site editing guide

This site is built with [Kopkop](https://github.com/abdusco/kopkop), a Go static site generator with Zola-compatible templates. Check the Kopkop README when a feature or function is unclear; avoid assuming every Zola feature is supported.

## Content

- Pages and sections live under `content/`. Project and post pages generally use a directory with an `index.md` file so they can keep colocated assets.
- Content uses YAML front matter (`---`) with fields such as `title`, `description`, `date`, and `taxonomies`.
- Link to another content page with Kopkop's `@/path/to/page.md` syntax.
- Keep links root-relative where possible. The site config sets `link_strategy = "relative"` so it can work behind a proxy.

## Templates and shortcodes

- Templates use MiniJinja with Jinja/Tera-style syntax. Site templates are in `templates/`; shared fragments are in `templates/partials/`.
- Put shortcodes in `templates/shortcodes/`. Use `.html` for inline shortcodes rendered after Markdown, and `.md` when Markdown inside the shortcode should be processed. Body shortcodes receive their content as `body`.
- Use documented Kopkop functions. In particular, use `get_url(path=..., cachebust=true, absolute=false)` to build asset URLs rather than hardcoding paths.
- `load_url(url=..., format="json", headers=[...])` fetches and parses remote data while rendering. It caches responses only for the current build; an unavailable URL or non-success response can fail rendering. Keep API-backed shortcode targets public and available to the build environment.
- Reuse the existing `github_repo` and `gitea_repo` shortcodes for repository cards.
- When adding a shortcode or template that uses a Kopkop function, check its signature and behavior in the Kopkop README's Template Functions and Shortcodes sections.

## Assets and styling

- Files in `static/` are copied to the site output as-is. Use `get_url` when referencing them from templates.
- Page-specific assets can live next to that page's `index.md` and be referenced with the existing `embed_file` shortcode or as colocated assets.
- Site-wide styles are in `static/assets/css/style.css`.

## Local workflow

- `kopkop serve` starts the local development server with live reload.
- `kopkop build` renders the site to `dist/`.
- `kopkop check` builds the site and checks external links. External link failures are configured as warnings; internal link failures should be fixed.

Kopkop documentation: <https://github.com/abdusco/kopkop#readme>
