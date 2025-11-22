// Dynamic Icon Library Service - fetches all available CoreUI brand icons
// Uses Iconify API to get the complete list of available icons

export interface IconOption {
  name: string;
  displayName: string;
  type: 'coreui-brand' | 'lucide' | 'svg-url' | 'custom-text';
  iconSet?: string;
  iconName?: string; 
  lucideComponent?: any; // For Lucide icons
  text?: string; // For text-based icons
  svgUrl?: string; // For custom SVG URLs
  category: string;
}

export interface IconCategory {
  name: string;
  displayName: string;
  icons: IconOption[];
}

// Cache for loaded icons
let cachedIcons: IconOption[] | null = null;
let isLoading = false;

// Function to format icon name for display
function formatIconName(iconName: string): string {
  return iconName
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Function to fetch all CoreUI brand icons from Iconify API
async function fetchCoreUIBrandIcons(): Promise<IconOption[]> {
  if (cachedIcons) {
    return cachedIcons;
  }

  if (isLoading) {
    return new Promise((resolve) => {
      const checkCache = () => {
        if (cachedIcons) {
          resolve(cachedIcons);
        } else {
          setTimeout(checkCache, 100);
        }
      };
      checkCache();
    });
  }

  isLoading = true;

  try {
    const response = await fetch('https://api.iconify.design/collection?prefix=cib');
    const data = await response.json();
    
    if (data && data.uncategorized) {
      const icons: IconOption[] = data.uncategorized.map((iconName: string) => ({
        name: `cib-${iconName}`,
        displayName: formatIconName(iconName),
        type: 'coreui-brand' as const,
        iconSet: 'cib',
        iconName: iconName,
        category: 'coreui-brands'
      }));

      cachedIcons = icons;
      return icons;
    } else {
      // Fallback
      const fallbackIcons: IconOption[] = [
        { name: 'cib-twitter', displayName: 'Twitter (CoreUI)', type: 'coreui-brand', iconSet: 'cib', iconName: 'twitter', category: 'coreui-brands' },
        { name: 'cib-facebook', displayName: 'Facebook (CoreUI)', type: 'coreui-brand', iconSet: 'cib', iconName: 'facebook', category: 'coreui-brands' },
        { name: 'cib-instagram', displayName: 'Instagram (CoreUI)', type: 'coreui-brand', iconSet: 'cib', iconName: 'instagram', category: 'coreui-brands' },
        { name: 'cib-github', displayName: 'GitHub (CoreUI)', type: 'coreui-brand', iconSet: 'cib', iconName: 'github', category: 'coreui-brands' },
        { name: 'cib-youtube', displayName: 'YouTube (CoreUI)', type: 'coreui-brand', iconSet: 'cib', iconName: 'youtube', category: 'coreui-brands' },
        { name: 'cib-discord', displayName: 'Discord (CoreUI)', type: 'coreui-brand', iconSet: 'cib', iconName: 'discord', category: 'coreui-brands' },
        { name: 'cib-twitch', displayName: 'Twitch (CoreUI)', type: 'coreui-brand', iconSet: 'cib', iconName: 'twitch', category: 'coreui-brands' },
        { name: 'cib-steam', displayName: 'Steam (CoreUI)', type: 'coreui-brand', iconSet: 'cib', iconName: 'steam', category: 'coreui-brands' },
        { name: 'cib-spotify', displayName: 'Spotify (CoreUI)', type: 'coreui-brand', iconSet: 'cib', iconName: 'spotify', category: 'coreui-brands' },
        { name: 'cib-linkedin', displayName: 'LinkedIn (CoreUI)', type: 'coreui-brand', iconSet: 'cib', iconName: 'linkedin', category: 'coreui-brands' }
      ];
      cachedIcons = fallbackIcons;
      return fallbackIcons;
    }
  } catch (error) {
    console.error('Failed to fetch CoreUI brand icons:', error);
    const fallbackIcons: IconOption[] = [
      { name: 'cib-twitter', displayName: 'Twitter (CoreUI)', type: 'coreui-brand', iconSet: 'cib', iconName: 'twitter', category: 'coreui-brands' },
      { name: 'cib-facebook', displayName: 'Facebook (CoreUI)', type: 'coreui-brand', iconSet: 'cib', iconName: 'facebook', category: 'coreui-brands' },
      { name: 'cib-instagram', displayName: 'Instagram (CoreUI)', type: 'coreui-brand', iconSet: 'cib', iconName: 'instagram', category: 'coreui-brands' },
      { name: 'cib-github', displayName: 'GitHub (CoreUI)', type: 'coreui-brand', iconSet: 'cib', iconName: 'github', category: 'coreui-brands' },
      { name: 'cib-youtube', displayName: 'YouTube (CoreUI)', type: 'coreui-brand', iconSet: 'cib', iconName: 'youtube', category: 'coreui-brands' },
      { name: 'cib-discord', displayName: 'Discord (CoreUI)', type: 'coreui-brand', iconSet: 'cib', iconName: 'discord', category: 'coreui-brands' },
      { name: 'cib-twitch', displayName: 'Twitch (CoreUI)', type: 'coreui-brand', iconSet: 'cib', iconName: 'twitch', category: 'coreui-brands' },
      { name: 'cib-steam', displayName: 'Steam (CoreUI)', type: 'coreui-brand', iconSet: 'cib', iconName: 'steam', category: 'coreui-brands' },
      { name: 'cib-spotify', displayName: 'Spotify (CoreUI)', type: 'coreui-brand', iconSet: 'cib', iconName: 'spotify', category: 'coreui-brands' },
      { name: 'cib-linkedin', displayName: 'LinkedIn (CoreUI)', type: 'coreui-brand', iconSet: 'cib', iconName: 'linkedin', category: 'coreui-brands' }
    ];
    cachedIcons = fallbackIcons;
    return fallbackIcons;
  } finally {
    isLoading = false;
  }
}

async function fetchLucideIcons(): Promise<IconOption[]> {
  try {
    const lucideModule = await import('lucide-svelte');
    const lucideIcons: IconOption[] = [];
    
    // Common Lucide icons
    const commonIcons = [
      'ExternalLink', 'Github', 'Globe', 'Link', 'ArrowRight', 'Play', 'Eye',
      'Download', 'FileText', 'Package', 'Code', 'Code2', 'Server', 'GitBranch',
      'Zap', 'Rocket', 'Star', 'Heart', 'Book', 'Video', 'Music', 'Image',
      'File', 'Folder', 'Box', 'Layers', 'Grid', 'Layout', 'Monitor'
    ];
    
    commonIcons.forEach(name => {
      const component = (lucideModule as any)[name];
      if (component) {
        lucideIcons.push({
          name: `lucide-${name}`,
          displayName: `${name.replace(/([A-Z])/g, ' $1').trim()} (Lucide)`,
          type: 'lucide',
          iconName: name,
          lucideComponent: component,
          category: 'lucide-common'
        });
      }
    });
    
    // Add other Lucide icons
    Object.keys(lucideModule).forEach(name => {
      if (name !== 'default' && 
          name !== 'createLucideIcon' && 
          !commonIcons.includes(name)) {
        const component = (lucideModule as any)[name];
        if (component && typeof component === 'function') {
          lucideIcons.push({
            name: `lucide-${name}`,
            displayName: `${name.replace(/([A-Z])/g, ' $1').trim()} (Lucide)`,
            type: 'lucide',
            iconName: name,
            lucideComponent: component,
            category: 'lucide'
          });
        }
      }
    });
    
    return lucideIcons.sort((a, b) => a.displayName.localeCompare(b.displayName));
  } catch (error) {
    console.error('Failed to load Lucide icons:', error);
    return [];
  }
}

// Get icon categories dynamically
export async function getIconCategories(): Promise<IconCategory[]> {
  const [coreuiIcons, lucideIcons] = await Promise.all([
    fetchCoreUIBrandIcons(),
    fetchLucideIcons()
  ]);
  
  const customOptions = getCustomOptions();
  
  return [
    {
      name: 'coreui-brands',
      displayName: 'CoreUI Brand Icons',
      icons: coreuiIcons
    },
    {
      name: 'lucide',
      displayName: 'Lucide Icons',
      icons: lucideIcons
    },
    {
      name: 'custom',
      displayName: 'Custom Options',
      icons: customOptions
    }
  ];
}

// Get custom options
export function getCustomOptions(): IconOption[] {
  return [
    { name: 'svg-url', displayName: 'Custom SVG URL', type: 'svg-url', category: 'custom' },
    { name: 'custom-text', displayName: 'Custom Text', type: 'custom-text', category: 'custom' }
  ];
}

// Get all icons flattened
export async function getAllIcons(): Promise<IconOption[]> {
  const categories = await getIconCategories();
  return categories.flatMap(category => category.icons);
}

// Get icons by category
export async function getIconsByCategory(categoryName: string): Promise<IconOption[]> {
  const categories = await getIconCategories();
  const category = categories.find(cat => cat.name === categoryName);
  return category ? category.icons : [];
}

// Search icons by name
export async function searchIcons(query: string): Promise<IconOption[]> {
  const allIcons = await getAllIcons();
  const lowercaseQuery = query.toLowerCase();
  
  return allIcons.filter(icon => 
    icon.name.toLowerCase().includes(lowercaseQuery) ||
    icon.displayName.toLowerCase().includes(lowercaseQuery) ||
    (icon.iconName && icon.iconName.toLowerCase().includes(lowercaseQuery))
  );
}

// Get icon by name
export async function getIconByName(name: string): Promise<IconOption | undefined> {
  const allIcons = await getAllIcons();
  return allIcons.find(icon => icon.name === name);
}

// Create custom icon options
export function createCustomIcon(type: 'svg-url' | 'custom-text', data: { svgUrl?: string; text?: string; displayName?: string }): IconOption {
  if (type === 'svg-url' && data.svgUrl) {
    return {
      name: 'custom-svg',
      displayName: data.displayName || 'Custom SVG',
      type: 'svg-url',
      svgUrl: data.svgUrl,
      category: 'custom'
    };
  } else if (type === 'custom-text' && data.text) {
    return {
      name: 'custom-text',
      displayName: data.displayName || 'Custom Text',
      type: 'custom-text',
      text: data.text,
      category: 'custom'
    };
  }
  
  throw new Error('Invalid custom icon data');
}