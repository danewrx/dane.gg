# Shared utilities

`@repo/shared` contains TypeScript utilities used by the frontend and backend. The package
exports source files directly and has no separate build or test command.

## Contents

| File | Purpose |
| --- | --- |
| `utils/sanitizeSvgInline.ts` | Sanitizes inline SVG markup |
| `utils/validateSvgIconUrl.ts` | Validates URLs used for SVG icons |
| `package.json` | Package name and source exports |

Application import configuration resolves `@repo/shared/*` to this directory. Keep shared
utilities independent of Svelte components, Express handlers, and application state.
Validate changes through the type checks and tests of the applications that use them.

See the [application guides](../../apps/README.md) for those commands.
