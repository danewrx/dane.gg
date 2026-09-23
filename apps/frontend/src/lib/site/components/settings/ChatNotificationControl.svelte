<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import { Play, Square } from 'lucide-svelte';
	import {
		DEFAULT_CHAT_NOTIFICATION_SOUND_ID,
		DEFAULT_CHAT_NOTIFICATION_SOUND_NAME,
		DEFAULT_CHAT_NOTIFICATION_SOUND_URL,
		CHAT_NOTIFICATION_SOUND_ID_KEY,
		CHAT_NOTIFICATION_SOUNDS_UPDATED_EVENT,
		fetchChatNotificationSoundOptions,
		labelForNotificationSoundOption,
		readStoredChatNotificationSoundId,
		type ChatNotificationSoundOption
	} from '$lib/shared/utils/chatNotificationSounds';

	const ENABLED_STORAGE_KEY = 'chatNotificationsEnabled';

	let enabled = $state(true);
	let options = $state<ChatNotificationSoundOption[]>([]);
	let selectedSoundId = $state(DEFAULT_CHAT_NOTIFICATION_SOUND_ID);
	let loadingSounds = $state(true);
	let previewPlaying = $state(false);

	let previewAudio: HTMLAudioElement | null = null;

	async function loadSoundOptions(isInitial: boolean) {
		if (!browser) return;
		if (isInitial) loadingSounds = true;
		try {
			const list = await fetchChatNotificationSoundOptions();
			options = list;
			let sid = readStoredChatNotificationSoundId();
			if (!list.some((o) => o.id === sid)) {
				sid = DEFAULT_CHAT_NOTIFICATION_SOUND_ID;
				try {
					localStorage.setItem(CHAT_NOTIFICATION_SOUND_ID_KEY, sid);
				} catch {}
				const opt = list.find((o) => o.id === sid);
				window.dispatchEvent(
					new CustomEvent('chatNotificationSoundChanged', {
						detail: {
							id: sid,
							url: opt?.soundUrl ?? DEFAULT_CHAT_NOTIFICATION_SOUND_URL
						}
					})
				);
			}
			selectedSoundId = sid;
		} catch {
			if (isInitial) {
				options = [
					{
						id: DEFAULT_CHAT_NOTIFICATION_SOUND_ID,
						name: DEFAULT_CHAT_NOTIFICATION_SOUND_NAME,
						displayName: 'Default',
						soundUrl: DEFAULT_CHAT_NOTIFICATION_SOUND_URL
					}
				];
				selectedSoundId = DEFAULT_CHAT_NOTIFICATION_SOUND_ID;
			}
		} finally {
			if (isInitial) loadingSounds = false;
		}
	}

	function onSoundsListUpdated() {
		stopPreview();
		void loadSoundOptions(false);
	}

	onMount(() => {
		if (!browser) return;

		const storedEnabled = localStorage.getItem(ENABLED_STORAGE_KEY);
		enabled = storedEnabled === null ? true : storedEnabled === 'true';

		void loadSoundOptions(true);
		window.addEventListener(CHAT_NOTIFICATION_SOUNDS_UPDATED_EVENT, onSoundsListUpdated);
	});

	onDestroy(() => {
		if (browser) {
			window.removeEventListener(CHAT_NOTIFICATION_SOUNDS_UPDATED_EVENT, onSoundsListUpdated);
			stopPreview();
		}
	});

	function stopPreview() {
		if (previewAudio) {
			previewAudio.pause();
			previewAudio.currentTime = 0;
			previewAudio = null;
		}
		previewPlaying = false;
	}

	function handleToggle() {
		enabled = !enabled;
		if (browser) {
			localStorage.setItem(ENABLED_STORAGE_KEY, String(enabled));
			window.dispatchEvent(
				new CustomEvent('chatNotificationSettingChanged', { detail: { enabled } })
			);
		}
	}

	function handleSoundChange() {
		if (!browser) return;
		stopPreview();
		const opt = options.find((o) => o.id === selectedSoundId);
		if (!opt) return;
		try {
			localStorage.setItem(CHAT_NOTIFICATION_SOUND_ID_KEY, selectedSoundId);
		} catch {
			/* ignore */
		}
		window.dispatchEvent(
			new CustomEvent('chatNotificationSoundChanged', {
				detail: { id: selectedSoundId, url: opt.soundUrl }
			})
		);
	}

	function togglePreview() {
		if (!browser) return;
		if (previewAudio && !previewAudio.paused) {
			stopPreview();
			return;
		}

		stopPreview();

		const opt = options.find((o) => o.id === selectedSoundId);
		if (!opt) return;

		const a = new Audio(opt.soundUrl);
		previewAudio = a;
		a.volume = 0.5;

		const onFinish = () => {
			if (previewAudio === a) stopPreview();
		};
		a.addEventListener('ended', onFinish);
		a.addEventListener('error', onFinish);

		void a
			.play()
			.then(() => {
				if (previewAudio === a) previewPlaying = true;
			})
			.catch(() => {
				if (previewAudio === a) stopPreview();
			});
	}
</script>

<div class="chat-notification-controls">
	<div class="control-group">
		<label class="checkbox-label">
			<input type="checkbox" checked={enabled} onchange={handleToggle} />
			<span class="checkbox-text">Enable chat notification sounds</span>
		</label>
	</div>

	<div class="control-group">
		<label class="control-label" for="chat-notification-sound-select">Notification sound</label>
		<div class="sound-actions">
			<select
				id="chat-notification-sound-select"
				class="panel-select"
				class:disabled={loadingSounds || !enabled}
				bind:value={selectedSoundId}
				onchange={handleSoundChange}
				disabled={loadingSounds || !enabled}
			>
				{#if loadingSounds}
					<option value={DEFAULT_CHAT_NOTIFICATION_SOUND_ID}>Loading…</option>
				{:else}
					{#each options as opt (opt.id)}
						<option value={opt.id}>{labelForNotificationSoundOption(opt)}</option>
					{/each}
				{/if}
			</select>
			<button
				type="button"
				class="preview-btn"
				onclick={togglePreview}
				disabled={loadingSounds || !enabled}
				aria-label={previewPlaying ? 'Stop preview' : 'Play notification sample'}
				title={previewPlaying ? 'Stop' : 'Play a sample'}
			>
				{#if previewPlaying}
					<Square size={12} strokeWidth={2} aria-hidden="true" />
				{:else}
					<Play size={14} strokeWidth={2} aria-hidden="true" />
				{/if}
			</button>
		</div>
	</div>
</div>

<style>
	.chat-notification-controls {
		display: flex;
		flex-direction: column;
		gap: 15px;
		width: 100%;
		min-width: 0;
		box-sizing: border-box;
	}

	.control-group {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.control-label {
		font-size: 11px;
		font-weight: bold;
		color: var(--theme-text-primary, #ffffff);
		text-transform: uppercase;
		letter-spacing: 0.5px;
		margin: 0;
	}

	.checkbox-label {
		display: flex;
		align-items: flex-start;
		gap: 8px;
		cursor: pointer;
		font-size: 12px;
		color: var(--theme-text-primary, #ffffff);
		margin: 0;
	}

	.checkbox-label input[type='checkbox'] {
		width: 16px;
		height: 16px;
		margin: 0;
		margin-top: 2px;
		cursor: pointer;
		accent-color: var(--theme-accent, #6366f1);
		flex-shrink: 0;
	}

	.checkbox-text {
		user-select: none;
		line-height: 1.35;
		min-width: 0;
		overflow-wrap: anywhere;
	}

	.sound-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		align-items: stretch;
		width: 100%;
		min-width: 0;
	}

	.panel-select {
		flex: 1;
		min-width: 0;
		background: var(--theme-background, #0a0a0a);
		border: 2px solid var(--theme-border, #ffffff);
		color: var(--theme-text-primary, #ffffff);
		padding: 4px 6px;
		padding-right: 24px;
		font-size: 12px;
		height: 28px;
		box-sizing: border-box;
		-webkit-appearance: none;
		-moz-appearance: none;
		appearance: none;
		cursor: pointer;
		outline: none;
		border-radius: 0;
		font-family: inherit;
		background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath fill='%23ffffff' d='M4 6l4 4 4-4z'/%3E%3C/svg%3E");
		background-repeat: no-repeat;
		background-position: right 6px center;
		background-size: 12px;
	}

	.panel-select:focus {
		border-color: var(--theme-accent, #90ee90);
		box-shadow: 0 0 0 1px var(--theme-accent, #90ee90);
	}

	.panel-select:hover:not(:disabled) {
		background-color: color-mix(
			in srgb,
			var(--theme-background, #0a0a0a) 90%,
			var(--theme-accent, #90ee90) 10%
		);
	}

	.panel-select:active:not(:disabled) {
		border-color: var(--theme-accent, #90ee90);
	}

	.panel-select.disabled,
	.panel-select:disabled {
		background: var(--theme-surface, #1a1a1a);
		color: var(--theme-text-muted, #71717a);
		cursor: not-allowed;
		opacity: 0.6;
	}

	.panel-select.disabled:hover,
	.panel-select:disabled:hover {
		background: var(--theme-surface, #1a1a1a);
	}

	.panel-select.disabled:focus,
	.panel-select:disabled:focus {
		border-color: var(--theme-border, #ffffff);
		box-shadow: none;
	}

	.panel-select option {
		background: var(--theme-background, #0a0a0a);
		color: var(--theme-text-primary, #ffffff);
	}

	.preview-btn {
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		min-width: 28px;
		height: 28px;
		padding: 0;
		box-sizing: border-box;
		border: 2px solid var(--theme-border, #ffffff);
		border-radius: 0;
		background: var(--theme-background, #0a0a0a);
		color: var(--theme-text-primary, #ffffff);
		cursor: pointer;
		font-family: inherit;
		line-height: 0;
	}

	.preview-btn :global(svg) {
		display: block;
		flex-shrink: 0;
	}

	.preview-btn:hover:not(:disabled) {
		background: color-mix(
			in srgb,
			var(--theme-background, #0a0a0a) 90%,
			var(--theme-accent, #90ee90) 10%
		);
		border-color: var(--theme-accent, #90ee90);
	}

	.preview-btn:focus-visible {
		outline: 2px solid var(--theme-accent, #90ee90);
		outline-offset: 1px;
	}

	.preview-btn:disabled {
		background: var(--theme-surface, #1a1a1a);
		color: var(--theme-text-muted, #71717a);
		cursor: not-allowed;
		opacity: 0.6;
		border-color: var(--theme-border, #ffffff);
	}

	@media (max-width: 480px) {
		.control-label {
			font-size: 10px;
		}

		.checkbox-label {
			font-size: 11px;
		}

		.panel-select {
			font-size: 11px;
			height: 26px;
			flex: 1 1 140px;
		}

		.preview-btn {
			width: 26px;
			min-width: 26px;
			height: 26px;
		}
	}

	@media (max-width: 360px) {
		.chat-notification-controls {
			gap: 12px;
		}

		.sound-actions {
			gap: 6px;
		}

		.panel-select {
			flex: 1 1 100%;
			min-height: 30px;
		}

		.preview-btn {
			width: 100%;
			min-width: 0;
			height: 32px;
		}
	}
</style>
