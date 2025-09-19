<script lang="ts">
	// Admin logout layout - completely independent from public site
</script>

<slot />

<style>
	/* Admin logout section styling - completely independent */
	:global(html) {
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	}
	
	:global(body) {
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		margin: 0;
		padding: 0;
	}
</style>
