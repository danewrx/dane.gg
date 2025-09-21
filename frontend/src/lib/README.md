# Frontend Library Structure

This directory contains all the reusable components, utilities, and shared code for the frontend application, organized by application area for better maintainability.

## 📁 Directory Structure

The library is organized following the same pattern as the route structure, with clear separation between admin and public site code:

```
lib/
├── admin/          # Admin panel specific code
├── site/           # Public site specific code  
├── shared/         # Code shared between admin and site
├── index.ts        # Main exports for convenience
└── README.md       # This file
```

### `admin/` - Admin Panel Code
All code specific to the admin dashboard and management interface.

#### `admin/components/`
- **`layout/`** - Layout components for admin interface
  - `AdminHeader.svelte` - Admin dashboard header with navigation
  - `AdminSidebar.svelte` - Admin dashboard sidebar navigation  
  - `AdminMobileAppBar.svelte` - Mobile app-style bottom navigation
  - `AdminMobileSidebar.svelte` - Mobile slide-out sidebar
- **`ui/`** - Admin-specific UI components
  - `AccentColorPicker.svelte` - Color picker for accent colors
  - `SlideInPanel.svelte` - Slide-in panel component
  - `Tabs.svelte` - Tab navigation component
- **`settings/`** - Settings-related components
  - `FontSelector.svelte` - Font selection component
  - `SettingsIcon.svelte` - Settings icon component
  - `SettingsPanel.svelte` - Main settings panel component
  - `WeatherControls.svelte` - Weather effects control panel

#### `admin/services/`
Business logic and API services for admin functionality:
- `accentColor.ts` - Accent color management service
- `auth.ts` - Authentication service
- `settings.ts` - Settings API service  
- `theme.ts` - Theme management service

#### `admin/stores/`
Svelte stores for admin state management:
- `auth.ts` - Authentication state store
- `theme.ts` - Theme state management

#### `admin/config/`
Configuration files for admin panel:
- `navigation.ts` - Navigation configuration for admin panel

### `site/` - Public Site Code
All code specific to the public-facing website.

#### `site/components/`
- **`layout/`** - Layout components for public site
  - `Header.svelte` - Main site header
- **`ui/`** - Public site UI components
  - `LoadingSpinner.svelte` - Loading spinner component
  - `TabSwitch.svelte` - Toggle switch for tabs
- **`effects/`** - Visual effects components
  - `WeatherEffects.svelte` - Weather effects overlay

#### `site/stores/`
Svelte stores for public site state:
- `font.ts` - Font selection state
- `siteConfig.ts` - Site configuration state
- `weather.ts` - Weather effects state

### `shared/` - Shared Code
Code that can be used by both admin and public site.

#### `shared/components/ui/`
- `Tabs.example.svelte` - Example usage of Tabs component

#### `shared/assets/`
- `favicon.svg` - Site favicon

## 🚀 Usage

### Import Patterns

**Admin components:**
```svelte
import AdminHeader from '$lib/admin/components/layout/AdminHeader.svelte';
import { authService } from '$lib/admin/services/auth';
import { user } from '$lib/admin/stores/auth';
```

**Site components:**
```svelte
import Header from '$lib/site/components/layout/Header.svelte';
import LoadingSpinner from '$lib/site/components/ui/LoadingSpinner.svelte';
```

**Shared components:**
```svelte
import favicon from '$lib/shared/assets/favicon.svg';
```

**Convenience exports (from main index.ts):**
```svelte
import { authService, user, themeService } from '$lib';
```

## 📋 Guidelines

### 🧩 Component Guidelines
1. **Keep components focused** - Single responsibility principle
2. **Use TypeScript** - All components should be typed
3. **Follow naming conventions** - PascalCase for components, camelCase for utilities
4. **Document props and events** - Use JSDoc comments for public APIs
5. **Make components reusable** - Use props instead of hardcoding values
6. **Place in correct directory** - Admin-specific in `admin/`, site-specific in `site/`, shared in `shared/`

### 🔧 Service Guidelines
1. **Use classes for stateful services** - Export instances, not classes
2. **Handle errors gracefully** - Always catch and handle potential errors
3. **Use TypeScript interfaces** - Define clear contracts for data structures
4. **Keep services focused** - Each service should handle one domain
5. **Place services correctly** - Admin services in `admin/services/`, site services in `site/services/`

### 📦 Store Guidelines
1. **Use Svelte 5 runes** - Prefer `$state` and `$derived` over legacy stores where possible
2. **Keep stores simple** - Complex logic should be in services
3. **Use TypeScript** - Type your store data
4. **Document state shape** - Use interfaces to define store structure
5. **Organize by area** - Admin stores in `admin/stores/`, site stores in `site/stores/`

## 🎯 Benefits of This Structure

✅ **Clear Separation** - Easy to understand what belongs where  
✅ **Scalable** - Easy to add new admin or site features without conflicts  
✅ **Maintainable** - Changes to admin code won't affect site code and vice versa  
✅ **Consistent** - Matches the route structure pattern  
✅ **Team Friendly** - Multiple developers can work on different areas without conflicts  
✅ **Import Clarity** - Import paths clearly indicate the source and purpose