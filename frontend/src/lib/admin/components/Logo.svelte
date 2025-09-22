<script lang="ts">
  import { onMount } from 'svelte';
  
  let logoElement: HTMLDivElement;
  let visibleLines = $state(0);
  
  // Split the ASCII art into individual lines
  const skullLines = [
    '⠀⠀⠀⠀⢀⡠⠤⠔⢲⢶⡖⠒⠤⢄⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀',
    '⠀⠀⣠⡚⠁⢀⠀⠀⢄⢻⣿⠀⠀⠀⡙⣷⢤⡀⠀⠀⠀⠀⠀⠀',
    '⠀⡜⢱⣇⠀⣧⢣⡀⠀⡀⢻⡇⠀⡄⢰⣿⣷⡌⣢⡀⠀⠀⠀⠀',
    '⠀⸇⡎⡿⣆⠹⣷⡹⣄⠙⣽⣿⢸⣧⣼⣿⣿⣿⣶⣼⣆⠀⠀⠀',
    '⣷⡇⣷⡇⢹⢳⡽⣿⡽⣷⡜⣿⣾⢸⣿⣿⣿⣿⣿⣿⣿⣷⣄⠀',
    '⣿⡇⡿⣿⠀⠣⠹⣾⣿⣮⠿⣞⣿⢸⣿⣛⢿⣿⡟⠯⠉⠙⠛⠓',
    '⣿⣇⣷⠙⡇⠀⠁⠀⠉⣽⣷⣾⢿⢸⣿⠀⢸⣿⢿⠀⠀⠀⠀⠀',
    '⡟⢿⣿⣷⣾⣆⠀⠀⠘⠘⠿⠛⢸⣼⣿⢖⣼⣿⠘⡆⠀⠀⠀⠀',
    '⠃⢸⣿⣿⡘⠋⠀⠀⠀⠀⠀⠀⣸⣿⣿⣿⣿⣿⡆⠇⠀⠀⠀⠀',
    '⠀⢸⡿⣿⣇⠀⠈⠀⠤⠀⠀⢀⣿⣿⣿⣿⣿⣿⣧⢸⠀⠀⠀⠀',
    '⠀⠈⡇⣿⣿⣷⣤⣀⠀⣀⠔⠋⣿⣿⣿⣿⣿⡟⣿⡞⡄⠀⠀⠀',
    '⠀⠀⢿⢸⣿⣿⣿⣿⣿⡇⠀⢠⣿⡏⢿⣿⣿⡇⢸⣇⠇⠀⠀⠀',
    '⠀⠀⢸⡏⣿⣿⣿⠟⠋⣀⠠⣾⣿⠡⠀⢉⢟⠷⢼⣿⣿⠀⠀⠀',
    '⠀⠀⠈⣷⡏⡱⠁⠀⠊⠀⠀⣿⣏⣀⡠⢣⠃⠀⠀⢹⣿⡄⠀⠀',
    '⠀⠀⠘⢼⣿⠀⢠⣤⣀⠉⣹⡿⠀⠁⠀⡸⠀⠀⠀⠈⣿⡇⠀⠀'
  ];
  
  const textLines = [
    '', // Empty line to match skull art top
    '', // Empty line to match skull art top
    '', // Empty line to match skull art top
    '', // Empty line to match skull art top
    '', // Empty line to match skull art top
    '', // Empty line to match skull art top
    '', // Empty line to match skull art top
    '', // Empty line to match skull art top
    '', // Empty line to match skull art top
    '     _                  ', // Start of actual text
    '    | |                 ',
    '  __| | __ _ _ __   ___ ',
    ' / _` |/ _` | \'_ \\ / _ \\',
    '| (_| | (_| | | | |  __/',
    ' \\__,_|\\__,_|_| |_|\\___|'
  ];
  
  onMount(() => {
    // Animate each line appearing one by one, alternating between skull and text
    const maxLines = Math.max(skullLines.length, textLines.length);
    let currentLine = 0;
    
    const animateLine = () => {
      if (currentLine < maxLines) {
        visibleLines = currentLine + 1;
        currentLine++;
        setTimeout(animateLine, 150); // 150ms delay between each line
      }
    };
    
    // Start animation after a short delay
    setTimeout(animateLine, 200);
  });
</script>

<div class="brand-logo" bind:this={logoElement}>
  <div class="logo-container">
    <div class="skull-ascii">
      {#each skullLines as line, index}
        <div 
          class="ascii-line" 
          class:visible={index < visibleLines}
          style="animation-delay: {index * 0.15}s"
        >
          {line}
        </div>
      {/each}
    </div>
    <div class="text-logo">
      {#each textLines as line, index}
        <div 
          class="ascii-line" 
          class:visible={index < visibleLines}
          style="animation-delay: {index * 0.15}s"
        >
          {line}
        </div>
      {/each}
    </div>
  </div>
</div>

<style>
  .brand-logo {
    margin-bottom: 1rem;
  }

  .logo-container {
    display: grid;
    grid-template-columns: 45% 55%;
    justify-content: center;
    align-items: center;
    gap: 1.5rem;
    width: fit-content;
    margin: 0 auto;
  }

  .skull-ascii {
    text-align: right;
  }

  .text-logo {
    text-align: left;
  }

  .ascii-line {
    color: #6b7280;
    font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', 'Courier New', monospace;
    font-size: 8px;
    line-height: 1;
    margin: 0;
    padding: 0;
    opacity: 0;
    transform: translateY(-10px);
    transition: all 0.4s ease-out;
    animation: softColorCycle 10s ease-in-out infinite;
    min-height: 1em;
  }

  .ascii-line.visible {
    opacity: 1;
    transform: translateY(0);
  }

  .ascii-line:empty {
    height: 0;
    min-height: 0;
  }

  .text-logo .ascii-line {
    font-size: 12px;
  }

  @keyframes softColorCycle {
    0% { color: #ffd5d5; }
    20% { color: #c9ffd7; }
    40% { color: #c6e4ff; }
    60% { color: #d7c8ff; }
    80% { color: #ffcbcb; }
    100% { color: #ffd5d5; }
  }

  @media (max-width: 480px) {
    .logo-container {
      grid-template-columns: 1fr;
      gap: 1.5rem;
      text-align: center;
    }
    
    .skull-ascii {
      text-align: center;
    }
    
    .text-logo {
      text-align: center;
    }
    
    .ascii-line {
      font-size: 6px;
    }
    
    .text-logo .ascii-line {
      font-size: 9px;
    }
  }

  /* Light theme for devices with light preference - must be at the end to override */
  @media (prefers-color-scheme: light) {
    .ascii-line {
      color: #64748b !important;
      animation: softColorCycleLight 10s ease-in-out infinite !important;
    }
  }

  @keyframes softColorCycleLight {
    0% { color: #d97706; }
    20% { color: #059669; }
    40% { color: #0284c7; }
    60% { color: #7c3aed; }
    80% { color: #dc2626; }
    100% { color: #d97706; }
  }
</style>
