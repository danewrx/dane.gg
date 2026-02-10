<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';

	const STORAGE_KEY = 'chatNotificationsEnabled';
	
	let enabled = $state(true);

	onMount(() => {
		if (browser) {
			const stored = localStorage.getItem(STORAGE_KEY);
			enabled = stored === null ? true : stored === 'true';
		}
	});

	function handleToggle() {
		enabled = !enabled;
		if (browser) {
			localStorage.setItem(STORAGE_KEY, String(enabled));
			window.dispatchEvent(new CustomEvent('chatNotificationSettingChanged', { detail: { enabled } }));
		}
	}
</script>

<div class="notification-control">
	<label class="checkbox-label">
		<input
			type="checkbox"
			checked={enabled}
			onchange={handleToggle}
		/>
		<span class="checkbox-text">Enable chat notification sounds</span>
	</label>
</div>

<style>
	.notification-control {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.checkbox-label {
		display: flex;
		align-items: center;
		gap: 8px;
		cursor: pointer;
		font-size: 12px;
		color: var(--theme-text-primary, #ffffff);
	}

	.checkbox-label input[type="checkbox"] {
		width: 16px;
		height: 16px;
		margin: 0;
		cursor: pointer;
		accent-color: var(--theme-accent, #6366f1);
	}

	.checkbox-text {
		user-select: none;
	}
</style>

