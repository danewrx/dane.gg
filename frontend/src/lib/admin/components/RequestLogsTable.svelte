<script lang="ts">
	import { Shield, ShieldOff, ChevronLeft, ChevronRight, RefreshCw, Filter } from 'lucide-svelte';

	interface RequestLog {
		id: string;
		visitorId: string;
		sessionId: string;
		method: string;
		path: string;
		query: string | null;
		statusCode: number;
		responseTime: number;
		contentLength: number | null;
		ipAddress: string | null;
		userAgent: string | null;
		country: string | null;
		browser: string | null;
		os: string | null;
		device: string | null;
		screenResolution: string | null;
		language: string | null;
		referrer: string | null;
		isVpn: boolean;
		timestamp: string;
	}

	interface Props {
		timeRange?: string;
	}

	let { timeRange = '24h' }: Props = $props();

	const PAGE_SIZE = 50;

	let rows = $state<RequestLog[]>([]);
	let total = $state(0);
	let page = $state(0);
	let loading = $state(false);
	let error = $state('');

	let filterMethod = $state('');
	let filterVpn = $state('');
	let filterStatus = $state('');
	let filterPath = $state('');

	let expandedId = $state<string | null>(null);

	const totalPages = $derived(Math.max(1, Math.ceil(total / PAGE_SIZE)));
	const offset = $derived(page * PAGE_SIZE);

	async function load() {
		loading = true;
		error = '';
		try {
			const params = new URLSearchParams({
				timeRange,
				limit: String(PAGE_SIZE),
				offset: String(offset)
			});
			const res = await fetch(`/api/stats/request-logs?${params}`, { credentials: 'include' });
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const json = await res.json();
			rows = json.data ?? [];
			total = json.total ?? 0;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to load';
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		void timeRange;
		void page;
		load();
	});

	$effect(() => {
		void timeRange;
		page = 0;
	});

	function prevPage() {
		if (page > 0) page--;
	}
	function nextPage() {
		if (page < totalPages - 1) page++;
	}

	function toggleRow(id: string) {
		expandedId = expandedId === id ? null : id;
	}

	// ── helpers ──────────────────────────────────────────────────────────────

	function fmtTime(iso: string): string {
		const d = new Date(iso);
		return d.toLocaleString(undefined, {
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit'
		});
	}

	function fmtMs(ms: number): string {
		return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`;
	}

	function statusClass(code: number): string {
		if (code < 300) return 'status-2xx';
		if (code < 400) return 'status-3xx';
		if (code < 500) return 'status-4xx';
		return 'status-5xx';
	}

	function methodClass(m: string): string {
		switch (m.toUpperCase()) {
			case 'GET':
				return 'method-get';
			case 'POST':
				return 'method-post';
			case 'PUT':
			case 'PATCH':
				return 'method-put';
			case 'DELETE':
				return 'method-delete';
			default:
				return 'method-other';
		}
	}

	function truncate(s: string | null | undefined, n: number): string {
		if (!s) return '—';
		return s.length > n ? s.slice(0, n) + '…' : s;
	}

	// ── filtered view ─────────────────────────────────────────────────────────

	const filtered = $derived(
		rows.filter((r) => {
			if (filterMethod && r.method.toUpperCase() !== filterMethod.toUpperCase()) return false;
			if (filterVpn === 'yes' && !r.isVpn) return false;
			if (filterVpn === 'no' && r.isVpn) return false;
			if (filterStatus) {
				const cat = filterStatus;
				if (cat === '2xx' && (r.statusCode < 200 || r.statusCode >= 300)) return false;
				if (cat === '3xx' && (r.statusCode < 300 || r.statusCode >= 400)) return false;
				if (cat === '4xx' && (r.statusCode < 400 || r.statusCode >= 500)) return false;
				if (cat === '5xx' && r.statusCode < 500) return false;
			}
			if (filterPath && !r.path.toLowerCase().includes(filterPath.toLowerCase())) return false;
			return true;
		})
	);

	const methodOptions = $derived([...new Set(rows.map((r) => r.method.toUpperCase()))].sort());
</script>

<div class="req-table-wrap">
	<div class="req-table-header">
		<div class="req-table-title-row">
			<h2 class="req-table-title">Raw Requests</h2>
			<span class="req-table-count">{total.toLocaleString()} total</span>
			<button class="req-refresh" onclick={() => load()} aria-label="Refresh" disabled={loading}>
				<RefreshCw size={14} class={loading ? 'spin' : ''} />
			</button>
		</div>

		<div class="req-filters">
			<Filter size={13} />

			<select class="req-filter-select" bind:value={filterMethod} aria-label="Filter by method">
				<option value="">All methods</option>
				{#each methodOptions as m}
					<option value={m}>{m}</option>
				{/each}
			</select>

			<select class="req-filter-select" bind:value={filterStatus} aria-label="Filter by status">
				<option value="">All statuses</option>
				<option value="2xx">2xx</option>
				<option value="3xx">3xx</option>
				<option value="4xx">4xx</option>
				<option value="5xx">5xx</option>
			</select>

			<select class="req-filter-select" bind:value={filterVpn} aria-label="Filter by VPN">
				<option value="">All visitors</option>
				<option value="yes">VPN only</option>
				<option value="no">Non-VPN only</option>
			</select>

			<input
				class="req-filter-input"
				placeholder="Filter path…"
				bind:value={filterPath}
				aria-label="Filter by path"
			/>
		</div>
	</div>

	{#if error}
		<div class="req-error">{error} <button onclick={() => load()}>Retry</button></div>
	{:else if loading && rows.length === 0}
		<div class="req-loading">
			<div class="loading-spinner"></div>
			<span>Loading request logs…</span>
		</div>
	{:else if filtered.length === 0}
		<div class="req-empty">No requests match the current filters.</div>
	{:else}
		<div class="req-table-container">
			<table class="req-table">
				<thead>
					<tr>
						<th>Time</th>
						<th>Method</th>
						<th>Path</th>
						<th>Status</th>
						<th>IP</th>
						<th>Country</th>
						<th>Browser</th>
						<th>OS</th>
						<th>VPN</th>
						<th>Resp.</th>
					</tr>
				</thead>
				<tbody>
					{#each filtered as row (row.id)}
						<tr
							class="req-row"
							class:req-row--expanded={expandedId === row.id}
							class:req-row--vpn={row.isVpn}
							onclick={() => toggleRow(row.id)}
							title="Click to expand"
						>
							<td class="cell-time">{fmtTime(row.timestamp)}</td>
							<td><span class="badge {methodClass(row.method)}">{row.method}</span></td>
							<td class="cell-path" title={row.path + (row.query ? '?' + row.query : '')}>
								{truncate(row.path, 42)}
							</td>
							<td>
								<span class="badge {statusClass(row.statusCode)}">{row.statusCode}</span>
							</td>
							<td class="cell-mono">{truncate(row.ipAddress, 15)}</td>
							<td>{row.country ?? '—'}</td>
							<td>{row.browser ?? '—'}</td>
							<td>{row.os ?? '—'}</td>
							<td>
								{#if row.isVpn}
									<span class="vpn-badge vpn-badge--yes" title="VPN / proxy detected">
										<Shield size={12} />
										VPN
									</span>
								{:else}
									<span class="vpn-badge vpn-badge--no" title="No VPN detected">
										<ShieldOff size={12} />
										No
									</span>
								{/if}
							</td>
							<td class="cell-mono cell-right">{fmtMs(row.responseTime)}</td>
						</tr>
						{#if expandedId === row.id}
							<tr class="req-row-detail">
								<td colspan="10">
									<div class="detail-grid">
										<div class="detail-item">
											<span class="detail-key">Full path</span>
											<span class="detail-val">{row.path}{row.query ? '?' + row.query : ''}</span>
										</div>
										<div class="detail-item">
											<span class="detail-key">IP address</span>
											<span class="detail-val">{row.ipAddress ?? '—'}</span>
										</div>
										<div class="detail-item">
											<span class="detail-key">Visitor ID</span>
											<span class="detail-val cell-mono">{row.visitorId}</span>
										</div>
										<div class="detail-item">
											<span class="detail-key">Session ID</span>
											<span class="detail-val cell-mono">{row.sessionId}</span>
										</div>
										<div class="detail-item">
											<span class="detail-key">Device</span>
											<span class="detail-val">{row.device ?? '—'}</span>
										</div>
										<div class="detail-item">
											<span class="detail-key">Language</span>
											<span class="detail-val">{row.language ?? '—'}</span>
										</div>
										<div class="detail-item">
											<span class="detail-key">Screen</span>
											<span class="detail-val">{row.screenResolution ?? '—'}</span>
										</div>
										<div class="detail-item">
											<span class="detail-key">Content length</span>
											<span class="detail-val"
												>{row.contentLength != null ? row.contentLength + ' B' : '—'}</span
											>
										</div>
										{#if row.referrer}
											<div class="detail-item detail-item--full">
												<span class="detail-key">Referrer</span>
												<span class="detail-val">{row.referrer}</span>
											</div>
										{/if}
										{#if row.userAgent}
											<div class="detail-item detail-item--full">
												<span class="detail-key">User agent</span>
												<span class="detail-val cell-mono">{row.userAgent}</span>
											</div>
										{/if}
									</div>
								</td>
							</tr>
						{/if}
					{/each}
				</tbody>
			</table>
		</div>

		<div class="req-pagination">
			<span class="page-info">
				Page {page + 1} of {totalPages} · showing {filtered.length} of {rows.length} loaded
			</span>
			<div class="page-buttons">
				<button class="page-btn" onclick={prevPage} disabled={page === 0}>
					<ChevronLeft size={14} /> Prev
				</button>
				<button class="page-btn" onclick={nextPage} disabled={page >= totalPages - 1}>
					Next <ChevronRight size={14} />
				</button>
			</div>
		</div>
	{/if}
</div>

<style>
	.req-table-wrap {
		background: var(--bg-secondary, #1e1e1e);
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 12px;
		overflow: hidden;
		margin-top: 32px;
	}

	.req-table-header {
		padding: 20px 24px 0;
	}

	.req-table-title-row {
		display: flex;
		align-items: center;
		gap: 10px;
		margin-bottom: 14px;
	}

	.req-table-title {
		color: var(--text-primary, #fff);
		font-size: 18px;
		font-weight: 600;
		margin: 0;
	}

	.req-table-count {
		color: var(--text-secondary, #a1a1aa);
		font-size: 13px;
	}

	.req-refresh {
		margin-left: auto;
		background: none;
		border: 1px solid var(--border-color, #3a3a3a);
		color: var(--text-secondary, #a1a1aa);
		border-radius: 6px;
		padding: 4px 8px;
		cursor: pointer;
		display: flex;
		align-items: center;
		gap: 4px;
		font-size: 12px;
		transition: all 0.2s;
	}

	.req-refresh:hover:not(:disabled) {
		border-color: var(--accent-color, #6366f1);
		color: var(--accent-on-surface, var(--accent-color, #6366f1));
	}

	:global(.req-refresh .spin) {
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.req-filters {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-wrap: wrap;
		padding-bottom: 16px;
		border-bottom: 1px solid var(--border-color, #3a3a3a);
		color: var(--text-secondary, #a1a1aa);
	}

	.req-filter-select,
	.req-filter-input {
		background: var(--bg-primary, #1a1a1a);
		border: 1px solid var(--border-color, #3a3a3a);
		color: var(--text-primary, #fff);
		border-radius: 6px;
		padding: 5px 10px;
		font-size: 12px;
		cursor: pointer;
		transition: border-color 0.2s;
	}

	.req-filter-select:focus,
	.req-filter-input:focus {
		outline: none;
		border-color: var(--accent-color, #6366f1);
	}

	.req-filter-input {
		width: 160px;
	}

	/* ── Table ─────────────────────────────────────────────────────────────── */

	.req-table-container {
		overflow-x: auto;
		-webkit-overflow-scrolling: touch;
	}

	.req-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 12.5px;
	}

	.req-table th {
		background: var(--bg-primary, #141414);
		color: var(--text-secondary, #a1a1aa);
		font-size: 11px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		padding: 10px 12px;
		text-align: left;
		white-space: nowrap;
		border-bottom: 1px solid var(--border-color, #3a3a3a);
		position: sticky;
		top: 0;
		z-index: 1;
	}

	.req-table td {
		padding: 8px 12px;
		color: var(--text-primary, #fff);
		border-bottom: 1px solid rgba(255, 255, 255, 0.04);
		vertical-align: middle;
		white-space: nowrap;
	}

	.req-row {
		cursor: pointer;
		transition: background 0.1s;
	}

	.req-row:hover {
		background: var(--bg-tertiary, #2a2a2a);
	}

	.req-row--expanded {
		background: var(--bg-tertiary, #2a2a2a);
	}

	.req-row--vpn td:first-child {
		border-left: 2px solid var(--accent-color, #6366f1);
	}

	/* ── Detail row ────────────────────────────────────────────────────────── */

	.req-row-detail td {
		background: var(--bg-primary, #141414);
		padding: 16px 20px;
		border-bottom: 1px solid var(--border-color, #3a3a3a);
	}

	.detail-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
		gap: 10px 24px;
	}

	.detail-item {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.detail-item--full {
		grid-column: 1 / -1;
	}

	.detail-key {
		font-size: 10px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		color: var(--text-secondary, #a1a1aa);
	}

	.detail-val {
		font-size: 12.5px;
		color: var(--text-primary, #fff);
		word-break: break-all;
	}

	/* ── Badges ────────────────────────────────────────────────────────────── */

	.badge {
		display: inline-block;
		padding: 2px 7px;
		border-radius: 4px;
		font-size: 11px;
		font-weight: 700;
		letter-spacing: 0.3px;
		line-height: 1.6;
	}

	.method-get {
		background: rgba(34, 197, 94, 0.15);
		color: #4ade80;
	}
	.method-post {
		background: rgba(59, 130, 246, 0.15);
		color: #60a5fa;
	}
	.method-put {
		background: rgba(245, 158, 11, 0.15);
		color: #fbbf24;
	}
	.method-delete {
		background: rgba(239, 68, 68, 0.15);
		color: #f87171;
	}
	.method-other {
		background: rgba(161, 161, 170, 0.15);
		color: #a1a1aa;
	}

	.status-2xx {
		background: rgba(34, 197, 94, 0.15);
		color: #4ade80;
	}
	.status-3xx {
		background: rgba(245, 158, 11, 0.15);
		color: #fbbf24;
	}
	.status-4xx {
		background: rgba(239, 68, 68, 0.15);
		color: #f87171;
	}
	.status-5xx {
		background: rgba(239, 68, 68, 0.25);
		color: #fca5a5;
	}

	.vpn-badge {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 2px 7px;
		border-radius: 4px;
		font-size: 11px;
		font-weight: 600;
		white-space: nowrap;
	}

	.vpn-badge--yes {
		background: rgba(99, 102, 241, 0.2);
		color: #818cf8;
		border: 1px solid rgba(99, 102, 241, 0.3);
	}

	.vpn-badge--no {
		background: rgba(161, 161, 170, 0.1);
		color: #71717a;
		border: 1px solid rgba(161, 161, 170, 0.15);
	}

	/* ── Cell helpers ───────────────────────────────────────────────────────── */

	.cell-time {
		font-size: 11.5px;
		color: var(--text-secondary, #a1a1aa);
		white-space: nowrap;
	}

	.cell-path {
		max-width: 280px;
		overflow: hidden;
		text-overflow: ellipsis;
		color: var(--text-primary, #fff);
	}

	.cell-mono {
		font-family: 'JetBrains Mono', 'Courier New', monospace;
		font-size: 11.5px;
	}

	.cell-right {
		text-align: right;
	}

	/* ── Pagination ─────────────────────────────────────────────────────────── */

	.req-pagination {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 12px 20px;
		border-top: 1px solid var(--border-color, #3a3a3a);
		flex-wrap: wrap;
		gap: 8px;
	}

	.page-info {
		font-size: 12px;
		color: var(--text-secondary, #a1a1aa);
	}

	.page-buttons {
		display: flex;
		gap: 8px;
	}

	.page-btn {
		display: flex;
		align-items: center;
		gap: 4px;
		background: var(--bg-primary, #1a1a1a);
		border: 1px solid var(--border-color, #3a3a3a);
		color: var(--text-primary, #fff);
		border-radius: 6px;
		padding: 6px 12px;
		font-size: 12px;
		cursor: pointer;
		transition: all 0.2s;
	}

	.page-btn:hover:not(:disabled) {
		border-color: var(--accent-color, #6366f1);
		color: var(--accent-on-surface, var(--accent-color, #6366f1));
	}

	.page-btn:disabled {
		opacity: 0.35;
		cursor: not-allowed;
	}

	/* ── States ─────────────────────────────────────────────────────────────── */

	.req-loading {
		display: flex;
		align-items: center;
		gap: 12px;
		justify-content: center;
		padding: 48px 24px;
		color: var(--text-secondary, #a1a1aa);
		font-size: 14px;
	}

	.loading-spinner {
		width: 24px;
		height: 24px;
		border: 2px solid var(--border-color, #3a3a3a);
		border-top-color: var(--accent-color, #6366f1);
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
		flex-shrink: 0;
	}

	.req-error {
		padding: 32px 24px;
		color: #f87171;
		font-size: 13px;
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.req-error button {
		background: none;
		border: 1px solid #f87171;
		color: #f87171;
		border-radius: 6px;
		padding: 4px 10px;
		font-size: 12px;
		cursor: pointer;
	}

	.req-empty {
		padding: 48px 24px;
		text-align: center;
		color: var(--text-secondary, #a1a1aa);
		font-size: 14px;
	}

	/* ── Light mode ────────────────────────────────────────────────────────── */

	:global(html:not(.dark)) .req-table-wrap {
		background: #ffffff;
		border-color: #e5e7eb;
	}

	:global(html:not(.dark)) .req-table th {
		background: #f9fafb;
		color: #6b7280;
	}

	:global(html:not(.dark)) .req-table td {
		color: #1f2937;
		border-bottom-color: #f3f4f6;
	}

	:global(html:not(.dark)) .req-row:hover,
	:global(html:not(.dark)) .req-row--expanded {
		background: #f9fafb;
	}

	:global(html:not(.dark)) .req-row-detail td {
		background: #f3f4f6;
	}

	:global(html:not(.dark)) .req-filter-select,
	:global(html:not(.dark)) .req-filter-input {
		background: #ffffff;
		border-color: #e5e7eb;
		color: #1f2937;
	}

	:global(html:not(.dark)) .req-refresh {
		border-color: #e5e7eb;
		color: #6b7280;
	}

	:global(html:not(.dark)) .vpn-badge--no {
		background: rgba(0, 0, 0, 0.04);
		color: #9ca3af;
		border-color: rgba(0, 0, 0, 0.08);
	}

	:global(html:not(.dark)) .cell-time,
	:global(html:not(.dark)) .detail-key {
		color: #6b7280;
	}

	:global(html:not(.dark)) .detail-val {
		color: #1f2937;
	}

	:global(html:not(.dark)) .page-btn {
		background: #ffffff;
		border-color: #e5e7eb;
		color: #1f2937;
	}

	:global(html:not(.dark)) .page-info {
		color: #6b7280;
	}

	:global(html:not(.dark)) .req-table-count {
		color: #6b7280;
	}
</style>
