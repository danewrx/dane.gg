<script lang="ts">
  export let size: 'small' | 'medium' | 'large' = 'medium';
  export let text: string = 'Loading...';
  
  $: sizeClass = `spinner-${size}`;
</script>

<div class="loading-container">
  <div class="spinner {sizeClass}"></div>
  {#if text}
    <p class="loading-text">{text}</p>
  {/if}
</div>

<style>
  .loading-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    padding: 2rem;
  }

  .spinner {
    border: 3px solid #e5e7eb;
    border-top: 3px solid #667eea;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  .spinner-small {
    width: 1rem;
    height: 1rem;
    border-width: 2px;
  }

  .spinner-medium {
    width: 2rem;
    height: 2rem;
    border-width: 3px;
  }

  .spinner-large {
    width: 3rem;
    height: 3rem;
    border-width: 4px;
  }

  .loading-text {
    color: #6b7280;
    font-size: 0.875rem;
    margin: 0;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
</style>
