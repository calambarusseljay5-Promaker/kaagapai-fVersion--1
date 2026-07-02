# Project Structure

This project keeps runtime app code separate from support files so the root directory stays easy to scan.

```text
.
|-- src/                 React app code
|-- public/              Static browser assets
|-- supabase/            SQL setup, module, and fix scripts
|-- scripts/             Node helper scripts
|-- data/                CSV data samples and import templates
|-- docs/                Documentation and workflow guides
|-- dist/                Generated build output
|-- package.json         NPM scripts and dependencies
|-- vite.config.js       Vite configuration
|-- tailwind.config.js   Tailwind CSS configuration
|-- postcss.config.js    PostCSS configuration
`-- eslint.config.js     ESLint configuration
```

## Runtime Boundaries

- `src/components` contains shared UI pieces.
- `src/pages` contains route-level screens.
- `src/services` contains Supabase and AI business logic.
- `src/lib` contains shared clients such as `supabaseClient`.
- `public` contains files referenced by browser paths like `/logo.png`.

## Support Files

- Run database setup from `supabase/setup-supabase.sql`.
- Run new module table setup from `supabase/supabase-new-modules.sql`.
- Keep one-off SQL patches in `supabase/fixes`.
- Keep local helper scripts in `scripts`.
- Keep CSV samples and templates in `data`.
