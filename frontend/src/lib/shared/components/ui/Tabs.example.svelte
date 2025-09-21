<script lang="ts">
	import Tabs from './Tabs.svelte';

	// Example tabs data
	const basicTabs = [
		{ id: 'tab1', label: 'First Tab', value: 'first' },
		{ id: 'tab2', label: 'Second Tab', value: 'second' },
		{ id: 'tab3', label: 'Third Tab', value: 'third' }
	];

	const statusTabs = [
		{ id: 'active', label: 'Active', value: 'active' },
		{ id: 'inactive', label: 'Inactive', value: 'inactive' },
		{ id: 'pending', label: 'Pending', value: 'pending' },
		{ id: 'disabled', label: 'Disabled', value: 'disabled', disabled: true }
	];

	let activeBasic = $state('tab1');
	let activeStatus = $state('active');
	let activePills = $state('tab1');
	let activeUnderline = $state('tab1');

	function handleBasicChange(tabId: string, value: any) {
		activeBasic = tabId;
		console.log('Basic tab changed:', { tabId, value });
	}

	function handleStatusChange(tabId: string, value: any) {
		activeStatus = tabId;
		console.log('Status tab changed:', { tabId, value });
	}

	function handlePillsChange(tabId: string, value: any) {
		activePills = tabId;
		console.log('Pills tab changed:', { tabId, value });
	}

	function handleUnderlineChange(tabId: string, value: any) {
		activeUnderline = tabId;
		console.log('Underline tab changed:', { tabId, value });
	}
</script>

<div class="examples">
	<h1>Tabs Component Examples</h1>

	<section class="example">
		<h2>Default Variant</h2>
		<Tabs
			tabs={basicTabs}
			activeTab={activeBasic}
			onTabChange={handleBasicChange}
			variant="default"
			size="md"
		/>
	</section>

	<section class="example">
		<h2>Pills Variant</h2>
		<Tabs
			tabs={basicTabs}
			activeTab={activePills}
			onTabChange={handlePillsChange}
			variant="pills"
			size="md"
		/>
	</section>

	<section class="example">
		<h2>Underline Variant</h2>
		<Tabs
			tabs={basicTabs}
			activeTab={activeUnderline}
			onTabChange={handleUnderlineChange}
			variant="underline"
			size="md"
		/>
	</section>

	<section class="example">
		<h2>With Disabled Items</h2>
		<Tabs
			tabs={statusTabs}
			activeTab={activeStatus}
			onTabChange={handleStatusChange}
			variant="default"
			size="md"
		/>
	</section>

	<section class="example">
		<h2>Small Size</h2>
		<Tabs
			tabs={basicTabs}
			activeTab={activeBasic}
			onTabChange={handleBasicChange}
			variant="default"
			size="sm"
		/>
	</section>

	<section class="example">
		<h2>Large Size</h2>
		<Tabs
			tabs={basicTabs}
			activeTab={activeBasic}
			onTabChange={handleBasicChange}
			variant="default"
			size="lg"
		/>
	</section>

	<section class="example">
		<h2>Full Width</h2>
		<Tabs
			tabs={basicTabs}
			activeTab={activeBasic}
			onTabChange={handleBasicChange}
			variant="default"
			size="md"
			fullWidth={true}
		/>
	</section>
</div>

<style>
	.examples {
		padding: 32px;
		max-width: 800px;
		margin: 0 auto;
		background: #1a1a1a;
		color: #ffffff;
		min-height: 100vh;
	}

	:global(.light) .examples,
	:global(:not(.dark)) .examples {
		background: #f8fafc;
		color: #1f2937;
	}

	h1 {
		margin-bottom: 32px;
		color: #ffffff;
	}

	:global(.light) h1,
	:global(:not(.dark)) h1 {
		color: #1f2937;
	}

	.example {
		margin-bottom: 32px;
		padding: 24px;
		background: rgba(255, 255, 255, 0.02);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 12px;
	}

	:global(.light) .example,
	:global(:not(.dark)) .example {
		background: rgba(0, 0, 0, 0.02);
		border-color: rgba(0, 0, 0, 0.1);
	}

	h2 {
		margin: 0 0 16px 0;
		font-size: 1.2rem;
		color: #ffffff;
	}

	:global(.light) h2,
	:global(:not(.dark)) h2 {
		color: #1f2937;
	}
</style>
