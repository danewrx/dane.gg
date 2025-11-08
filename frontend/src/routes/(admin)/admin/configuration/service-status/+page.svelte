<script lang="ts">
	import { onMount } from 'svelte';
	import { Save, RefreshCw, Server, CheckCircle2, XCircle, AlertCircle, Wrench, Edit2, Check, X } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';

	interface Monitor {
		id: number;
		name: string;
		customName?: string;
		url?: string;
		type: string;
		status: 'up' | 'down' | 'pending' | 'maintenance';
		uptime?: number;
		avgResponseTime?: number;
		lastCheck?: string;
		group?: string;
	}

	let config = $state({
		baseUrl: '',
		apiKey: '',
		isConfigured: false
	});

	let allMonitors = $state<Monitor[]>([]);
	let selectedMonitorIds = $state<number[]>([]);
	let customNames = $state<Record<number, string>>({});
	let editingMonitorId = $state<number | null>(null);
	let editingValue = $state<string>('');
	let editInputRef = $state<HTMLInputElement | null>(null);
	let loading = $state(true);
	let saving = $state(false);
	let loadingMonitors = $state(false);
	let error = $state('');

	$effect(() => {
		if (editingMonitorId !== null && editInputRef) {
			setTimeout(() => {
				editInputRef?.focus();
			}, 0);
		}
	});

	async function loadConfig() {
		try {
			loading = true;
			error = '';

			const response = await fetch('/api/uptime-kuma/config', {
				credentials: 'include'
			});

			if (!response.ok) {
				throw new Error('Failed to load configuration');
			}

			const result = await response.json();
			if (result.success) {
				config.baseUrl = result.data.baseUrl || '';
				config.apiKey = result.data.apiKey || '';
				config.isConfigured = result.data.isConfigured || false;
			}

			const selectedResponse = await fetch('/api/uptime-kuma/selected', {
				credentials: 'include'
			});

			if (selectedResponse.ok) {
				const selectedResult = await selectedResponse.json();
				if (selectedResult.success) {
					selectedMonitorIds = selectedResult.data || [];
					
					if (selectedMonitorIds.length > 0) {
						await loadCustomNames();
					}
				}
			}

			if (config.isConfigured) {
				await loadMonitors();
			}
		} catch (err) {
			console.error('Error loading config:', err);
			error = err instanceof Error ? err.message : 'Failed to load configuration';
		} finally {
			loading = false;
		}
	}

	async function loadMonitors() {
		if (!config.isConfigured) {
			toast.error('Uptime Kuma is not configured. Please set UPTIME_KUMA_URL environment variable.');
			return;
		}

		try {
			loadingMonitors = true;
			error = '';

			const response = await fetch('/api/uptime-kuma/monitors', {
				credentials: 'include'
			});

			if (!response.ok) {
				const result = await response.json();
				throw new Error(result.message || 'Failed to fetch monitors');
			}

			const result = await response.json();
			if (result.success) {
				allMonitors = result.data || [];
				toast.success(`Loaded ${allMonitors.length} monitors`);
			} else {
				throw new Error(result.error || 'Failed to fetch monitors');
			}
		} catch (err) {
			console.error('Error loading monitors:', err);
			error = err instanceof Error ? err.message : 'Failed to load monitors';
			toast.error(error);
		} finally {
			loadingMonitors = false;
		}
	}

	async function loadCustomNames() {
		try {
			// Load cached monitors
			const statusResponse = await fetch('/api/uptime-kuma/status', {
				credentials: 'include'
			});

			if (statusResponse.ok) {
				const statusResult = await statusResponse.json();
				if (statusResult.success && Array.isArray(statusResult.data)) {
					const names: Record<number, string> = {};
					for (const monitor of statusResult.data) {
						if (monitor.customName) {
							names[monitor.id] = monitor.customName;
						}
					}
					customNames = names;
				}
			}
		} catch (err) {
			console.error('Error loading custom names:', err);
		}
	}

	async function saveConfig() {
		try {
			saving = true;
			error = '';

			// Save selected monitors
			const selectedResponse = await fetch('/api/uptime-kuma/selected', {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json'
				},
				credentials: 'include',
				body: JSON.stringify({
					monitorIds: selectedMonitorIds,
					customNames: customNames
				})
			});

			if (!selectedResponse.ok) {
				const result = await selectedResponse.json();
				throw new Error(result.message || 'Failed to save selected monitors');
			}

			toast.success('Selected monitors saved successfully!');
		} catch (err) {
			console.error('Error saving config:', err);
			error = err instanceof Error ? err.message : 'Failed to save configuration';
			toast.error(error);
		} finally {
			saving = false;
		}
	}

	function startEditing(monitorId: number) {
		editingMonitorId = monitorId;
		const monitor = allMonitors.find(m => m.id === monitorId);
		editingValue = customNames[monitorId] || monitor?.name || '';
	}

	function cancelEditing() {
		editingMonitorId = null;
		editingValue = '';
	}

	function saveEditing() {
		if (editingMonitorId !== null) {
			if (editingValue.trim()) {
				customNames[editingMonitorId] = editingValue.trim();
			} else {
				delete customNames[editingMonitorId];
			}
			customNames = { ...customNames };
			editingMonitorId = null;
			editingValue = '';
		}
	}

	function toggleMonitor(monitorId: number) {
		if (selectedMonitorIds.includes(monitorId)) {
			selectedMonitorIds = selectedMonitorIds.filter(id => id !== monitorId);
		} else {
			selectedMonitorIds = [...selectedMonitorIds, monitorId];
		}
	}

	function getStatusIcon(status: string) {
		switch (status) {
			case 'up':
				return CheckCircle2;
			case 'down':
				return XCircle;
			case 'maintenance':
				return Wrench;
			default:
				return AlertCircle;
		}
	}

	function getStatusColor(status: string) {
		switch (status) {
			case 'up':
				return '#10b981';
			case 'down':
				return '#ef4444';
			case 'maintenance':
				return '#f59e0b';
			default:
				return '#6b7280';
		}
	}

	onMount(() => {
		loadConfig();
	});
</script>

<div class="service-status-config">
	{#if loading}
		<div class="loading-state">
			<div class="spinner"></div>
			<p>Loading configuration...</p>
		</div>
	{:else}
		<div class="config-form">
			<!-- Uptime Kuma Configuration -->
			<div class="form-section">
				<h2 class="section-title">Uptime Kuma Configuration</h2>
				
				{#if !config.isConfigured}
					<div class="config-warning">
						<AlertCircle size={20} />
						<div class="warning-content">
							<p class="warning-title">Uptime Kuma is not configured</p>
							<p class="warning-text">
								Please set the following environment variables:
							</p>
							<ul class="env-vars-list">
								<li><code>UPTIME_KUMA_URL</code> - The base URL of your Uptime Kuma instance (e.g., https://uptime.example.com)</li>
								<li><code>UPTIME_KUMA_API_KEY</code> - Optional API key for authenticated requests</li>
							</ul>
							<p class="warning-text">
								After setting these variables, restart your server for the changes to take effect.
							</p>
						</div>
					</div>
				{:else}
					<div class="config-info">
						<div class="info-item">
							<span class="info-label">Uptime Kuma URL:</span>
							<span class="info-value">{config.baseUrl || 'Not set'}</span>
						</div>
						<div class="info-item">
							<span class="info-label">API Key:</span>
							<span class="info-value">{config.apiKey ? '***' : 'Not set'}</span>
						</div>
						<p class="help-text">Configuration is read from environment variables. To change these values, update your environment configuration and restart the server.</p>
					</div>

				{/if}
			</div>

			<!-- Monitor Selection -->
			{#if config.isConfigured}
				<div class="form-section">
					<h2 class="section-title">
						Select Monitors to Display
						<span class="selected-count">({selectedMonitorIds.length} selected)</span>
						<button 
							type="button" 
							class="refresh-button" 
							onclick={loadMonitors} 
							disabled={loadingMonitors}
							title="Refresh monitors"
						>
							{#if loadingMonitors}
								<RefreshCw size={18} class="spinning" />
							{:else}
								<RefreshCw size={18} />
							{/if}
						</button>
					</h2>

					{#if selectedMonitorIds.length > 0}
						<div class="selected-monitors-section">
							<h3 class="subsection-title">Selected Monitors</h3>
							<div class="selected-monitors-list">
								{#each selectedMonitorIds as monitorId}
									{@const monitor = allMonitors.find(m => m.id === monitorId)}
									{#if monitor}
										<div class="selected-monitor-item">
											<div class="selected-monitor-info">
												{#if editingMonitorId === monitorId}
													<input
														type="text"
														value={editingValue}
														oninput={(e) => editingValue = e.currentTarget.value}
														onkeydown={(e) => {
															if (e.key === 'Enter') {
																saveEditing();
															} else if (e.key === 'Escape') {
																cancelEditing();
															}
														}}
														class="selected-monitor-edit-input"
														bind:this={editInputRef}
													/>
												{:else}
													<span class="selected-monitor-name">
														{customNames[monitorId] || monitor.name}
													</span>
													{#if customNames[monitorId]}
														<span class="selected-monitor-original">({monitor.name})</span>
													{/if}
												{/if}
											</div>
											<div class="selected-monitor-actions">
												{#if editingMonitorId === monitorId}
													<button
														type="button"
														class="icon-button"
														onclick={saveEditing}
														title="Save"
													>
														<Check size={16} />
													</button>
													<button
														type="button"
														class="icon-button"
														onclick={cancelEditing}
														title="Cancel"
													>
														<X size={16} />
													</button>
												{:else}
													<button
														type="button"
														class="icon-button"
														onclick={() => startEditing(monitorId)}
														title="Edit custom name"
													>
														<Edit2 size={16} />
													</button>
												{/if}
												<div class="selected-monitor-status" style="--status-color: {getStatusColor(monitor.status)}">
													{#if monitor.status === 'up'}
														<CheckCircle2 size={14} />
													{:else if monitor.status === 'down'}
														<XCircle size={14} />
													{:else if monitor.status === 'maintenance'}
														<Wrench size={14} />
													{:else}
														<AlertCircle size={14} />
													{/if}
													<span>{monitor.status}</span>
												</div>
											</div>
										</div>
									{/if}
								{/each}
							</div>
						</div>
					{/if}

					{#if allMonitors.length > 0}
					<div class="monitors-list">
						{#each (() => {
							const groups = new Map<string, Monitor[]>();
							const ungrouped: Monitor[] = [];
							
							for (const monitor of allMonitors) {
								if (monitor.group) {
									if (!groups.has(monitor.group)) {
										groups.set(monitor.group, []);
									}
									groups.get(monitor.group)!.push(monitor);
								} else {
									ungrouped.push(monitor);
								}
							}
							
							const result: Array<{groupName: string | null; monitors: Monitor[]}> = [];
							for (const [groupName, monitors] of groups) {
								result.push({ groupName, monitors });
							}
							if (ungrouped.length > 0) {
								result.push({ groupName: null, monitors: ungrouped });
							}
							return result;
						})() as { groupName, monitors } (groupName || 'ungrouped')}
							{#if groupName}
								<h3 class="monitor-group-heading">{groupName}</h3>
							{/if}
							<div class="monitor-group-items">
								{#each monitors as monitor (monitor.id)}
									<div class="monitor-item-wrapper">
										<label class="monitor-item" class:selected={selectedMonitorIds.includes(monitor.id)}>
											<input
												type="checkbox"
												checked={selectedMonitorIds.includes(monitor.id)}
												onchange={() => toggleMonitor(monitor.id)}
												class="monitor-checkbox"
											/>
											<div class="monitor-info">
												<div class="monitor-header">
													<span class="monitor-name">{monitor.name}</span>
													<div class="monitor-status" style="--status-color: {getStatusColor(monitor.status)}">
														{#if monitor.status === 'up'}
															<CheckCircle2 size={16} />
														{:else if monitor.status === 'down'}
															<XCircle size={16} />
														{:else if monitor.status === 'maintenance'}
															<Wrench size={16} />
														{:else}
															<AlertCircle size={16} />
														{/if}
														<span class="status-text">{monitor.status}</span>
													</div>
												</div>
												{#if monitor.url}
													<p class="monitor-url">{monitor.url}</p>
												{/if}
												<div class="monitor-meta">
													<span class="monitor-type">{monitor.type}</span>
													{#if monitor.uptime !== undefined}
														<span class="monitor-uptime">Uptime: {monitor.uptime.toFixed(2)}%</span>
													{/if}
												</div>
											</div>
										</label>
									</div>
								{/each}
							</div>
						{/each}
					</div>
					{/if}
				</div>
			{:else if !loadingMonitors && config.isConfigured}
				<div class="empty-state">
					<Server size={48} />
					<p>No monitors found. Click the refresh icon to fetch monitors from Uptime Kuma.</p>
				</div>
			{/if}

			<!-- Save Button -->
			<div class="form-actions">
				<button
					type="button"
					class="btn btn-primary"
					onclick={saveConfig}
					disabled={saving}
				>
					<Save size={18} />
					{saving ? 'Saving...' : 'Save Configuration'}
				</button>
			</div>

			{#if error}
				<div class="error-message">
					<p>{error}</p>
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.service-status-config {
		padding: 0;
	}

	.loading-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 60px 20px;
		gap: 16px;
	}

	.spinner {
		width: 40px;
		height: 40px;
		border: 3px solid var(--border-color, #3a3a3a);
		border-top-color: var(--accent-color, #6366f1);
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	.config-form {
		display: flex;
		flex-direction: column;
		gap: 32px;
	}

	.form-section {
		display: flex;
		flex-direction: column;
		gap: 20px;
	}

	.section-title {
		font-size: 20px;
		font-weight: 600;
		color: var(--text-primary, #ffffff);
		margin: 0;
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.refresh-button {
		margin-left: auto;
		background: transparent;
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 6px;
		padding: 6px;
		cursor: pointer;
		color: var(--text-secondary, #9ca3af);
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s;
	}

	.refresh-button:hover:not(:disabled) {
		background: var(--bg-secondary, #2d2d2d);
		border-color: var(--accent-color, #6366f1);
		color: var(--accent-color, #6366f1);
	}

	.refresh-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.refresh-button :global(.spinning) {
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}

	.selected-count {
		font-size: 14px;
		font-weight: 400;
		color: var(--text-secondary, #9ca3af);
	}

	.help-text {
		font-size: 12px;
		color: var(--text-secondary, #9ca3af);
		margin: 0;
	}

	.config-warning {
		padding: 20px;
		border: 2px solid #f59e0b;
		border-radius: 8px;
		background: rgba(245, 158, 11, 0.1);
		display: flex;
		gap: 16px;
		margin-bottom: 20px;
	}

	.config-warning :global(svg) {
		color: #f59e0b;
		flex-shrink: 0;
		margin-top: 2px;
	}

	.warning-content {
		flex: 1;
	}

	.warning-title {
		font-size: 16px;
		font-weight: 600;
		color: var(--text-primary, #ffffff);
		margin: 0 0 12px 0;
	}

	.warning-text {
		font-size: 14px;
		color: var(--text-secondary, #9ca3af);
		margin: 0 0 8px 0;
		line-height: 1.5;
	}

	.env-vars-list {
		margin: 12px 0;
		padding-left: 20px;
		color: var(--text-secondary, #9ca3af);
	}

	.env-vars-list li {
		margin: 8px 0;
		line-height: 1.5;
	}

	.env-vars-list code {
		background: rgba(245, 158, 11, 0.2);
		padding: 2px 6px;
		border-radius: 4px;
		font-family: 'Courier New', monospace;
		font-size: 13px;
		color: #fbbf24;
	}

	.config-info {
		padding: 16px;
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 8px;
		background: var(--bg-secondary, #2d2d2d);
		margin-bottom: 20px;
	}

	.info-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 12px 0;
		border-bottom: 1px solid var(--border-color, #3a3a3a);
	}

	.info-item:last-child {
		border-bottom: none;
	}

	.info-label {
		font-size: 14px;
		font-weight: 500;
		color: var(--text-primary, #ffffff);
	}

	.info-value {
		font-size: 14px;
		color: var(--text-secondary, #9ca3af);
		font-family: 'Courier New', monospace;
	}

	.btn {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 10px 20px;
		border: none;
		border-radius: 6px;
		font-size: 14px;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s;
	}

	.btn-primary {
		background: var(--accent-color, #6366f1);
		color: #ffffff;
	}

	.btn-primary:hover:not(:disabled) {
		background: var(--accent-color-hover, #4f46e5);
	}

	.btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}


	.monitors-list {
		display: flex;
		flex-direction: column;
		gap: 20px;
		max-height: 500px;
		overflow-y: auto;
		padding: 4px;
	}

	.monitor-group-heading {
		font-size: 16px;
		font-weight: 600;
		color: var(--text-primary, #ffffff);
		margin: 0 0 8px 0;
		padding-bottom: 8px;
		border-bottom: 2px solid var(--border-color, #3a3a3a);
	}

	.monitor-group-items {
		display: flex;
		flex-direction: column;
		gap: 12px;
		margin-left: 0;
	}

	.monitor-item-wrapper {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.monitor-item {
		display: flex;
		align-items: flex-start;
		gap: 12px;
		padding: 16px;
		border: 2px solid var(--border-color, #3a3a3a);
		border-radius: 8px;
		background: var(--bg-secondary, #2d2d2d);
		cursor: pointer;
		transition: all 0.2s;
	}

	.monitor-item:hover {
		border-color: var(--accent-color, #6366f1);
		background: var(--bg-tertiary, #3a3a3a);
	}

	.monitor-item.selected {
		border-color: var(--accent-color, #6366f1);
		background: rgba(99, 102, 241, 0.1);
	}

	.monitor-checkbox {
		margin-top: 2px;
		cursor: pointer;
	}

	.monitor-info {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.monitor-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 12px;
	}

	.monitor-name {
		font-size: 16px;
		font-weight: 600;
		color: var(--text-primary, #ffffff);
	}

	.monitor-status {
		display: flex;
		align-items: center;
		gap: 6px;
		color: var(--status-color);
		font-size: 14px;
		font-weight: 500;
	}

	.status-text {
		text-transform: capitalize;
	}

	.monitor-url {
		font-size: 13px;
		color: var(--text-secondary, #9ca3af);
		margin: 0;
		word-break: break-all;
	}

	.monitor-meta {
		display: flex;
		gap: 12px;
		font-size: 12px;
		color: var(--text-secondary, #9ca3af);
	}

	.monitor-type {
		text-transform: uppercase;
	}


	.selected-monitors-section {
		margin-bottom: 24px;
		padding: 16px;
		background: var(--bg-secondary, #2d2d2d);
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 8px;
	}

	.subsection-title {
		font-size: 14px;
		font-weight: 600;
		color: var(--text-primary, #ffffff);
		margin: 0 0 12px 0;
	}

	.selected-monitors-list {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.selected-monitor-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 10px 12px;
		background: var(--bg-primary, #1a1a1a);
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 6px;
	}

	.selected-monitor-info {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 4px;
		min-width: 0;
	}

	.selected-monitor-name {
		font-size: 14px;
		font-weight: 500;
		color: var(--text-primary, #ffffff);
	}

	.selected-monitor-original {
		font-size: 12px;
		color: var(--text-secondary, #9ca3af);
		font-style: italic;
	}

	.selected-monitor-edit-input {
		width: 100%;
		padding: 6px 10px;
		background: var(--bg-secondary, #2d2d2d);
		border: 1px solid var(--accent-color, #6366f1);
		border-radius: 4px;
		color: var(--text-primary, #ffffff);
		font-size: 14px;
		font-weight: 500;
	}

	.selected-monitor-edit-input:focus {
		outline: none;
		border-color: var(--accent-color, #6366f1);
		box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
	}

	.selected-monitor-actions {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.icon-button {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 4px;
		background: transparent;
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 4px;
		color: var(--text-secondary, #9ca3af);
		cursor: pointer;
		transition: all 0.2s;
	}

	.icon-button:hover {
		background: var(--bg-secondary, #2d2d2d);
		border-color: var(--accent-color, #6366f1);
		color: var(--accent-color, #6366f1);
	}

	.icon-button:active {
		transform: scale(0.95);
	}

	.selected-monitor-status {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 12px;
		color: var(--status-color, #9ca3af);
	}

	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 60px 20px;
		gap: 16px;
		color: var(--text-secondary, #9ca3af);
	}

	.empty-state p {
		text-align: center;
		margin: 0;
	}

	.form-actions {
		display: flex;
		justify-content: flex-end;
		padding-top: 16px;
		border-top: 1px solid var(--border-color, #3a3a3a);
	}

	.error-message {
		padding: 12px 16px;
		background: rgba(239, 68, 68, 0.1);
		border: 1px solid rgba(239, 68, 68, 0.3);
		border-radius: 6px;
		color: #ef4444;
	}

	.error-message p {
		margin: 0;
		font-size: 14px;
	}
</style>

