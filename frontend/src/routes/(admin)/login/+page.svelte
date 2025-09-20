<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { auth, isLoading, error } from '$lib/stores/auth';
  import { authService } from '$lib/services/auth';

  let username = '';
  let password = '';
  let rememberMe = false;
  let isSubmitting = false;

  // Get redirect URL from query params
  $: redirectUrl = $page.url.searchParams.get('redirect') || '/admin';
  
  // Reactive statement to handle auth state changes
  $: if (!$isLoading && $auth.isAuthenticated) {
    goto(redirectUrl);
  }

  onMount(() => {
    // Wait for auth to initialize before checking
    if ($isLoading) {
      return;
    }
    
    // If already authenticated, redirect
    if ($auth.isAuthenticated) {
      goto(redirectUrl);
    }
  });

  async function handleSubmit(event: Event) {
    event.preventDefault();
    
    if (isSubmitting) return;

    isSubmitting = true;
    auth.clearError();

    try {
      await authService.login({
        username,
        password,
        rememberMe
      });

      // Redirect to intended page or admin
      goto(redirectUrl);
    } catch (error) {
      console.error('Login failed:', error);
      // Error is already set in the auth store
    } finally {
      isSubmitting = false;
    }
  }

</script>

<svelte:head>
  <title>Login - dane.gg Admin</title>
</svelte:head>

<div class="login-container">
  <div class="login-card">
    <div class="login-header">
      <h1>Welcome Back</h1>
      <p>Sign in to your admin account</p>
    </div>

    <form on:submit={handleSubmit}>
      {#if $error}
        <div class="error-message" role="alert">
          <svg class="error-icon" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
          </svg>
          {$error}
        </div>
      {/if}

      <div class="form-group">
        <label for="username">Username</label>
        <input
          id="username"
          type="text"
          bind:value={username}
          required
          autocomplete="username"
          disabled={isSubmitting}
          class="form-input"
          placeholder="Enter your username"
        />
      </div>

      <div class="form-group">
        <label for="password">Password</label>
        <input
          id="password"
          type="password"
          bind:value={password}
          required
          autocomplete="current-password"
          disabled={isSubmitting}
          class="form-input"
          placeholder="Enter your password"
        />
      </div>

      <div class="form-group checkbox-group">
        <label class="checkbox-label">
          <input
            type="checkbox"
            bind:checked={rememberMe}
            disabled={isSubmitting}
            class="checkbox-input"
          />
          <span class="checkbox-text">Remember me for 30 days</span>
        </label>
      </div>

      <button
        type="submit"
        disabled={isSubmitting || $isLoading}
        class="submit-button"
      >
        {#if isSubmitting}
          <svg class="spinner" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" opacity="0.25"/>
            <path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" fill="currentColor"/>
          </svg>
          Signing in...
        {:else}
          Sign In
        {/if}
      </button>
    </form>

    <div class="login-footer">
      <p>dane.gg Admin Panel</p>
    </div>
  </div>
</div>

<style>
  .login-container {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    padding: 1rem;
  }

  .login-card {
    background: white;
    border-radius: 12px;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
    padding: 2rem;
    width: 100%;
    max-width: 400px;
  }

  .login-header {
    text-align: center;
    margin-bottom: 2rem;
  }

  .login-header h1 {
    font-size: 1.875rem;
    font-weight: 700;
    color: #1f2937;
    margin: 0 0 0.5rem 0;
  }

  .login-header p {
    color: #6b7280;
    margin: 0;
  }

  .form-group {
    margin-bottom: 1.5rem;
  }

  .form-group label {
    display: block;
    font-size: 0.875rem;
    font-weight: 500;
    color: #374151;
    margin-bottom: 0.5rem;
  }

  .form-input {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 1rem;
    transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
  }

  .form-input:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  }

  .form-input:disabled {
    background-color: #f9fafb;
    cursor: not-allowed;
  }

  .checkbox-group {
    margin-bottom: 1.5rem;
  }

  .checkbox-label {
    display: flex;
    align-items: center;
    cursor: pointer;
    font-size: 0.875rem;
    color: #374151;
  }

  .checkbox-input {
    margin-right: 0.5rem;
    width: 1rem;
    height: 1rem;
  }

  .checkbox-text {
    user-select: none;
  }

  .submit-button {
    width: 100%;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    border-radius: 6px;
    padding: 0.75rem 1rem;
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
    transition: opacity 0.15s ease-in-out, transform 0.15s ease-in-out;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
  }

  .submit-button:hover:not(:disabled) {
    opacity: 0.9;
    transform: translateY(-1px);
  }

  .submit-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }

  .error-message {
    background-color: #fef2f2;
    border: 1px solid #fecaca;
    color: #dc2626;
    padding: 0.75rem;
    border-radius: 6px;
    margin-bottom: 1rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
  }

  .error-icon {
    width: 1rem;
    height: 1rem;
    flex-shrink: 0;
  }

  .spinner {
    width: 1rem;
    height: 1rem;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  .login-footer {
    text-align: center;
    margin-top: 2rem;
    padding-top: 1rem;
    border-top: 1px solid #e5e7eb;
  }

  .login-footer p {
    color: #6b7280;
    font-size: 0.875rem;
    margin: 0;
  }
</style>
