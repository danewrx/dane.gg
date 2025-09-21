<script lang="ts">
	// Contact page
</script>

<svelte:head>
	<title>Contact - dane.gg</title>
	<meta name="description" content="Get in touch with Dane for collaboration or inquiries." />
</svelte:head>

<div class="page-content">
	<h1>Contact Me</h1>
	<p class="subtitle">Let's work together</p>
	
	<div class="contact-info">
		<div class="contact-method">
			<h3>Email</h3>
			<p>hello@dane.gg</p>
		</div>
		
		<div class="contact-method">
			<h3>GitHub</h3>
			<p>github.com/dane</p>
		</div>
		
		<div class="contact-method">
			<h3>LinkedIn</h3>
			<p>linkedin.com/in/dane</p>
		</div>
		
		<div class="contact-method">
			<h3>Location</h3>
			<p>Manchester, UK</p>
		</div>
	</div>
	
	<div class="contact-form">
		<h2>Send a Message</h2>
		<form>
			<div class="form-group">
				<label for="name">Name</label>
				<input type="text" id="name" name="name" required />
			</div>
			
			<div class="form-group">
				<label for="email">Email</label>
				<input type="email" id="email" name="email" required />
			</div>
			
			<div class="form-group">
				<label for="message">Message</label>
				<textarea id="message" name="message" rows="5" required></textarea>
			</div>
			
			<button type="submit" class="submit-btn">Send Message</button>
		</form>
	</div>
</div>

<style>
	.page-content {
		max-width: 800px;
		margin: 0 auto;
	}

	h1 {
		font-size: 2.5rem;
		font-weight: 700;
		color: var(--text-primary);
		margin-bottom: 1rem;
		text-align: center;
	}

	.subtitle {
		font-size: 1.2rem;
		color: var(--text-secondary);
		margin-bottom: 2rem;
		text-align: center;
	}

	.contact-info {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 1.5rem;
		margin-bottom: 3rem;
	}

	.contact-method {
		background: var(--bg-secondary);
		border: 1px solid var(--border-color);
		border-radius: 8px;
		padding: 1.5rem;
		text-align: center;
		transition: all 0.3s ease;
	}

	.contact-method:hover {
		background: var(--bg-hover);
		border-color: var(--accent-color);
		transform: translateY(-2px);
	}

	.contact-method h3 {
		color: var(--accent-color);
		margin-bottom: 0.5rem;
		font-size: 1.2rem;
	}

	.contact-method p {
		color: var(--text-secondary);
		margin: 0;
	}

	.contact-form {
		background: var(--bg-secondary);
		border: 1px solid var(--border-color);
		border-radius: 8px;
		padding: 2rem;
	}

	.contact-form h2 {
		color: var(--accent-color);
		margin-bottom: 1.5rem;
		font-size: 1.5rem;
	}

	.form-group {
		margin-bottom: 1.5rem;
	}

	.form-group label {
		display: block;
		color: var(--text-primary);
		margin-bottom: 0.5rem;
		font-weight: 500;
	}

	.form-group input,
	.form-group textarea {
		width: 100%;
		padding: 0.75rem;
		background: var(--bg-primary);
		border: 1px solid var(--border-color);
		border-radius: 4px;
		color: var(--text-primary);
		font-family: inherit;
		transition: border-color 0.2s ease;
	}

	.form-group input:focus,
	.form-group textarea:focus {
		outline: none;
		border-color: var(--accent-color);
	}

	.submit-btn {
		background: var(--accent-color);
		color: var(--bg-primary);
		border: none;
		padding: 0.75rem 2rem;
		border-radius: 4px;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.submit-btn:hover {
		background: var(--accent-hover);
		transform: translateY(-1px);
	}
</style>
