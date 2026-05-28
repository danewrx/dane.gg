<script lang="ts">
	import { page } from '$app/stores';
</script>

<main class="admin-error-shell" role="alert" aria-live="polite">
	<h1>Error {$page.status}</h1>
	<p>{typeof $page.error?.message === 'string' ? $page.error.message : 'Something went wrong.'}</p>
	<a href="/admin">Back to admin</a>
</main>

<style>
	.admin-error-shell {
		min-height: 100vh;
		display: grid;
		place-content: center;
		gap: 0.6rem;
		padding: 24px;
		background: #0f1115;
		color: #e5e7eb;
	}

	.admin-error-shell h1,
	.admin-error-shell p {
		margin: 0;
	}

	.admin-error-shell a {
		margin-top: 0.6rem;
		color: #93c5fd;
		text-decoration: none;
	}
</style>
