# Frontend library

`$lib` resolves to this directory. Organize reusable code by the area that uses it:

| Directory | Purpose |
| --- | --- |
| `admin/` | Dashboard components, authentication services, navigation, and admin state |
| `site/` | Public-site components, theme and weather stores, and visitor settings |
| `shared/` | Components and utilities used by both public and admin pages |
| `server/` | Helpers restricted to server-side code |

## Imports

Use explicit imports so dependencies are easy to locate:

```ts
import { authService } from '$lib/admin/services/auth';
import { siteTheme } from '$lib/site/stores/theme';
```

Place code in `shared/` when both application areas need it. Keep server-only imports out
of browser components and modules. Use TypeScript types for component props, API responses,
and store values, and follow the conventions in the surrounding files.

Public-site themes and visitor preferences are separate from dashboard appearance settings.
See the [theme guide](../../../docs/theme-system.md) for details, and the
[frontend README](../../README.md) for development commands.
