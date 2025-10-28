<script lang="ts">
  import { onMount } from 'svelte';
  let IconComponent: any = $state(null);
  onMount(async () => {
    try {
      const mod = await import('@iconify/svelte');
      IconComponent = mod.default;
    } catch (_) {
      IconComponent = null;
    }
  });

  interface BrowserItem {
    browser: string | null;
    visitors: number;
  }

  interface Props {
    title?: string;
    data: BrowserItem[];
  }

  let { title = 'Top Browsers', data }: Props = $props();

  function normalize(name: string | null): string {
    const n = (name || 'Unknown').toLowerCase();
    if (n.includes('chrome') && !n.includes('edge') && !n.includes('brave') && !n.includes('vivaldi') && !n.includes('opera')) return 'chrome';
    if (n.includes('chromium')) return 'chromium';
    if (n.includes('firefox')) return 'firefox';
    if (n.includes('safari') && !n.includes('mobile')) return 'safari';
    if (n.includes('edge')) return 'edge';
    if (n.includes('opera')) return 'opera';
    if (n.includes('brave')) return 'brave';
    if (n.includes('samsung')) return 'samsung-internet';
    if (n.includes('vivaldi')) return 'vivaldi';
    if (n.includes('uc')) return 'uc';
    if (n.includes('ie') || n.includes('internet explorer')) return 'ie';
    return 'other';
  }

  function iconFor(name: string) {
    switch (name) {
      case 'chrome': return { icon: 'logos:chrome', color: '#4285F4' };
      case 'chromium': return { icon: 'logos:chromium', color: '#4285F4' };
      case 'firefox': return { icon: 'logos:firefox', color: '#FF7139' };
      case 'safari': return { icon: 'logos:safari', color: '#0FB5EE' };
      case 'edge': return { icon: 'logos:microsoft-edge', color: '#0A7CF2' };
      case 'opera': return { icon: 'logos:opera', color: '#FF1B2D' };
      case 'brave': return { icon: 'logos:brave', color: '#FB542B' };
      case 'samsung-internet': return { icon: 'logos:samsung-internet', color: '#1428A0' };
      case 'vivaldi': return { icon: 'logos:vivaldi-icon', color: '#EF3939' };
      case 'uc': return { icon: 'logos:uc-browser', color: '#E36F00' };
      case 'ie': return { icon: 'logos:ie', color: '#1EBBEE' };
      default: return { icon: 'lucide:globe', color: 'var(--accent-color, #6366f1)' };
    }
  }

  const total = $derived(data.reduce((s, d) => s + (typeof d.visitors === 'number' ? d.visitors : parseInt(d.visitors as any) || 0), 0));

  const items = $derived(data.map((d) => {
    const name = d.browser ?? 'Unknown';
    const key = normalize(name);
    const { icon, color } = iconFor(key);
    const visitors = typeof d.visitors === 'number' ? d.visitors : parseInt(d.visitors as any) || 0;
    const percentage = total > 0 ? visitors / total : 0;
    return { name, key, icon, color, visitors, percentage };
  }));

  function circumference(r: number) { return 2 * Math.PI * r; }
</script>

<div class="browsers-card">
  <h3 class="card-title">{title}</h3>
  <div class="list">
    {#each items as item}
      <div class="row">
        <div class="left">
          {#if IconComponent}
            <IconComponent icon={item.icon} width="22" height="22" />
          {:else}
            <span class="icon-fallback" style={`background:${item.color}`}></span>
          {/if}
          <span class="name">{item.name}</span>
        </div>
        <div class="right" aria-label={`${(item.percentage*100).toFixed(1)}%`}>
          {#if true}
            {@const r = 10}
            {@const c = circumference(r)}
          <svg class="progress" width="24" height="24" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r={r} stroke="var(--border-color, #3a3a3a)" stroke-width="3" fill="none" />
            <circle
              cx="12"
              cy="12"
              r={r}
              stroke={item.color}
              stroke-width="3"
              fill="none"
              stroke-dasharray={`${c}`}
              stroke-dashoffset={`${c - c * item.percentage}`}
              stroke-linecap="round"
            />
          </svg>
          {/if}
          <span class="pct">{(item.percentage * 100).toFixed(1)}%</span>
        </div>
      </div>
    {/each}
  </div>
  {#if total === 0}
    <div class="empty">No data</div>
  {/if}
</div>

<style>
  .browsers-card {
    background: var(--bg-secondary, #282828);
    border-radius: 12px;
    border: 1px solid var(--border-color, #3a3a3a);
    padding: 20px;
    width: 100%;
    max-width: 100%;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
  }

  .card-title {
    color: var(--text-primary, #f9fafb);
    font-size: 18px;
    font-weight: 600;
    margin: 0 0 12px 0;
    text-align: left;
  }

  .list {
    display: flex;
    flex-direction: column;
    gap: 10px;
    overflow-y: auto;
    flex: 1;
    min-height: 0;
  }

  .list::-webkit-scrollbar {
    width: 6px;
  }

  .list::-webkit-scrollbar-track {
    background: var(--bg-primary, #1a1a1a);
    border-radius: 3px;
  }

  .list::-webkit-scrollbar-thumb {
    background: #6b7280;
    border-radius: 3px;
  }

  .list::-webkit-scrollbar-thumb:hover {
    background: #9ca3af;
  }

  .row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: var(--bg-tertiary, #2f2f2f);
    border: 1px solid var(--border-color, #3a3a3a);
    border-radius: 8px;
    padding: 10px 12px;
  }

  .left {
    display: flex;
    align-items: center;
    gap: 10px;
    color: var(--text-primary, #e5e7eb);
  }

  .icon-fallback {
    width: 18px; height: 18px; border-radius: 50%; display: inline-block;
  }

  .name { font-size: 14px; font-weight: 600; }

  .right {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--text-secondary, #9ca3af);
    min-width: 90px;
    justify-content: flex-end;
  }

  .progress { display: block; }

  .pct { font-size: 13px; font-weight: 600; }

  .empty { color: var(--text-secondary, #9ca3af); text-align: center; padding: 8px 0; }

  @media (max-width: 1024px) {
    .browsers-card {
      height: auto;
      min-height: auto;
    }

    .list {
      overflow-y: visible;
      max-height: none;
    }
  }

  @media (max-width: 768px) {
    .browsers-card {
      padding: 16px;
    }

    .card-title {
      font-size: 16px;
      margin-bottom: 10px;
    }

    .list {
      gap: 8px;
    }

    .row {
      padding: 10px 12px;
    }

    .left {
      gap: 10px;
    }
  }

  @media (max-width: 480px) {
    .browsers-card {
      padding: 12px;
    }

    .card-title {
      font-size: 15px;
    }

    .list {
      gap: 6px;
    }

    .row {
      padding: 8px 10px;
    }

    .icon-fallback {
      width: 18px;
      height: 18px;
    }

    .name {
      font-size: 13px;
    }

    .right {
      min-width: 80px;
    }

    .pct {
      font-size: 12px;
    }
  }
</style>


