<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { authService } from '$lib/services/auth';

  onMount(async () => {
    // Perform logout
    await authService.logout();
    
    // Redirect to login page
    goto('/login');
  });
</script>

<svelte:head>
  <title>Logging out - dane.gg Admin</title>
</svelte:head>

<div class="logout-container">
  <div class="logout-card">
    <div class="spinner"></div>
    <h2>Logging out...</h2>
    <p>Please wait while we sign you out.</p>
  </div>
</div>

<style>
  .logout-container {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    padding: 1rem;
  }

  .logout-card {
    background: white;
    border-radius: 12px;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
    padding: 2rem;
    text-align: center;
    max-width: 400px;
  }

  .spinner {
    width: 2rem;
    height: 2rem;
    border: 3px solid #e5e7eb;
    border-top: 3px solid #667eea;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto 1rem;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  h2 {
    color: #1f2937;
    margin: 0 0 0.5rem 0;
  }

  p {
    color: #6b7280;
    margin: 0;
  }
</style>
