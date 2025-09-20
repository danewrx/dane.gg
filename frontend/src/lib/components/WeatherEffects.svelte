<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { weatherSettings } from '$lib/stores/weather';
	import { browser } from '$app/environment';

	let canvas: HTMLCanvasElement;
	let ctx: CanvasRenderingContext2D | null = null;

	// Rain system
	class RainDrop {
		canvas: HTMLCanvasElement;
		x: number;
		y: number;
		baseSpeed: number;
		speedMultiplier: number;
		speed: number;
		length: number;
		width: number;
		bounced: boolean;
		isDead: boolean;

		constructor(canvas: HTMLCanvasElement, x: number, y: number, speedMultiplier: number = 1) {
			this.canvas = canvas;
			this.x = x;
			this.y = y;
			this.baseSpeed = 4 + Math.random() * 2;
			this.speedMultiplier = speedMultiplier;
			this.speed = this.baseSpeed * this.speedMultiplier;
			this.length = 15 + Math.random() * 5;
			this.width = 1 + Math.random();
			this.bounced = false;
			this.isDead = false;
		}

		setSpeedMultiplier(multiplier: number) {
			this.speedMultiplier = multiplier;
			this.speed = this.baseSpeed * this.speedMultiplier;
		}

		update(containerTop: number) {
			this.y += this.speed;
			
			const container = document.querySelector('.content-window');
			const containerRect = container?.getBoundingClientRect();
			const isOverContainer = containerRect && this.x >= containerRect.left && 
								  this.x <= containerRect.right;

			if (isOverContainer && !this.bounced && this.y > containerTop) {
				this.bounced = true;
				this.speed = -this.speed * 0.3;
				return true;
			}

			if (!isOverContainer && this.y > this.canvas.height) {
				this.isDead = true;
				return false;
			}

			if (this.bounced) {
				this.speed += 0.8;
				if (Math.abs(this.speed) < 0.5) {
					this.isDead = true;
					return false;
				}
			}

			return false;
		}

		draw(ctx: CanvasRenderingContext2D) {
			ctx.beginPath();
			ctx.strokeStyle = 'rgba(174, 194, 224, 0.5)';
			ctx.lineWidth = this.width;
			ctx.moveTo(this.x, this.y);
			ctx.lineTo(this.x, this.y + this.length);
			ctx.stroke();
		}
	}

	// Snow system
	class SnowFlake {
		canvas: HTMLCanvasElement;
		x: number;
		y: number;
		baseSpeed: number;
		speedMultiplier: number;
		speed: number;
		size: number;
		wind: number;
		swayAngle: number;
		swaySpeed: number;
		settled: boolean;
		settledX: number;
		settledY: number;
		opacity: number;
		fadeStartTime: number | null;
		lifetime: number;

		constructor(canvas: HTMLCanvasElement, x: number, y: number, speedMultiplier: number = 1) {
			this.canvas = canvas;
			this.x = x;
			this.y = y;
			this.baseSpeed = 1.5 + Math.random() * 1;
			this.speedMultiplier = speedMultiplier;
			this.speed = this.baseSpeed * this.speedMultiplier;
			this.size = 2 + Math.random() * 3;
			this.wind = 0;
			this.swayAngle = Math.random() * Math.PI * 2;
			this.swaySpeed = 0.02 + Math.random() * 0.02;
			this.settled = false;
			this.settledX = 0;
			this.settledY = 0;
			this.opacity = 0.8;
			this.fadeStartTime = null;
			this.lifetime = 5000 + Math.random() * 5000;
		}

		setSpeedMultiplier(multiplier: number) {
			this.speedMultiplier = multiplier;
			this.speed = this.baseSpeed * this.speedMultiplier;
		}

		update(containerTop: number, containerBottom: number, accumulation: number[]) {
			if (this.settled) {
				if (!this.fadeStartTime) {
					this.fadeStartTime = Date.now();
				}
				
				const elapsed = Date.now() - this.fadeStartTime;
				if (elapsed > this.lifetime) {
					this.opacity = Math.max(0, 0.8 * (1 - (elapsed - this.lifetime) / 1000));
					if (this.opacity <= 0) {
						return true;
					}
				}
				return false;
			}

			this.swayAngle += this.swaySpeed;
			this.wind = Math.sin(this.swayAngle) * 0.5;
			this.x += this.wind;
			this.y += this.speed;

			const container = document.querySelector('.content-window');
			const containerRect = container?.getBoundingClientRect();
			const isOverContainer = containerRect && this.x >= containerRect.left && 
								  this.x <= containerRect.right;

			if (isOverContainer && containerRect) {
				const relativeX = Math.floor(this.x - containerRect.left);
				if (relativeX >= 0 && relativeX < accumulation.length) {
					const settlementY = containerTop + accumulation[relativeX];
					
					if (this.y >= settlementY) {
						this.settled = true;
						this.settledX = this.x;
						this.settledY = settlementY;
						return true;
					}
				}
			} else if (this.y > this.canvas.height) {
				this.settled = true;
				return false;
			}

			return false;
		}

		draw(ctx: CanvasRenderingContext2D) {
			ctx.beginPath();
			ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity})`;
			ctx.arc(
				this.settled ? this.settledX : this.x,
				this.settled ? this.settledY : this.y,
				this.size,
				0,
				Math.PI * 2
			);
			ctx.fill();
		}
	}

	// Weather systems
	let rainSystem: any = null;
	let snowSystem: any = null;

	onMount(() => {
		if (!browser) return;

		// Initialize canvas context
		ctx = canvas.getContext('2d');
		if (!ctx) return;

		// Initialize rain system
		rainSystem = {
			isAnimating: false,
			canvas,
			ctx: ctx!,
			drops: [],
			splashes: [],
			speedMultiplier: 1,
			container: document.querySelector('.content-window'),
			containerTop: document.querySelector('.content-window')?.getBoundingClientRect().top || 0,
			resizeCanvas: () => {
				canvas.width = window.innerWidth;
				canvas.height = window.innerHeight;
			},
			updateContainerPosition: () => {
				const oldTop = rainSystem.containerTop;
				rainSystem.containerTop = rainSystem.container?.getBoundingClientRect().top || 0;
				
				const diff = rainSystem.containerTop - oldTop;
				rainSystem.splashes.forEach((particles: any) => {
					particles.forEach((p: any) => {
						p.y += diff;
					});
				});
			},
			createDrop: () => {
				const x = Math.random() * canvas.width;
				const y = -20;
				rainSystem.drops.push(new RainDrop(canvas, x, y, rainSystem.speedMultiplier));
			},
			createSplash: (x: number, y: number) => {
				const particleCount = 3 + Math.floor(Math.random() * 3);
				const particles = [];

				for (let i = 0; i < particleCount; i++) {
					const angle = (Math.PI / 4) + (Math.random() * Math.PI / 2);
					const speed = 1 + Math.random() * 2;
					particles.push({
						x: x,
						y: y,
						vx: Math.cos(angle) * speed,
						vy: -Math.sin(angle) * speed,
						alpha: 1
					});
				}

				rainSystem.splashes.push(particles);
			},
			update: () => {
				if (Math.random() < 0.5) {
					rainSystem.createDrop();
				}

				rainSystem.drops = rainSystem.drops.filter((drop: RainDrop) => {
					const shouldCreateSplash = drop.update(rainSystem.containerTop);
					if (shouldCreateSplash) {
						rainSystem.createSplash(drop.x, drop.y);
					}
					return !drop.isDead;
				});

				rainSystem.splashes = rainSystem.splashes.filter((particles: any) => {
					particles.forEach((p: any) => {
						p.x += p.vx;
						p.y += p.vy;
						p.vy += 0.1;
						p.alpha -= 0.03;
					});
					return particles.some((p: any) => p.alpha > 0);
				});
			},
			draw: () => {
				rainSystem.ctx.clearRect(0, 0, canvas.width, canvas.height);
				
				rainSystem.drops.forEach((drop: RainDrop) => drop.draw(rainSystem.ctx));

				rainSystem.splashes.forEach((particles: any) => {
					particles.forEach((p: any) => {
						rainSystem.ctx.beginPath();
						rainSystem.ctx.strokeStyle = `rgba(174, 194, 224, ${p.alpha})`;
						rainSystem.ctx.lineWidth = 1;
						rainSystem.ctx.moveTo(p.x, p.y);
						rainSystem.ctx.lineTo(p.x + p.vx, p.y + p.vy);
						rainSystem.ctx.stroke();
					});
				});
			},
			animate: () => {
				if (!rainSystem.isAnimating) return;
				
				rainSystem.update();
				rainSystem.draw();
				requestAnimationFrame(() => rainSystem.animate());
			},
			start: () => {
				rainSystem.isAnimating = true;
				rainSystem.animate();
			},
			stop: () => {
				rainSystem.isAnimating = false;
				rainSystem.drops = [];
				rainSystem.splashes = [];
				rainSystem.ctx.clearRect(0, 0, canvas.width, canvas.height);
			},
			setSpeedMultiplier: (multiplier: number) => {
				rainSystem.speedMultiplier = multiplier;
				rainSystem.drops.forEach((drop: RainDrop) => drop.setSpeedMultiplier(multiplier));
			}
		};

		// Initialize snow system
		snowSystem = {
			canvas,
			ctx: ctx!,
			flakes: [],
			settledFlakes: [],
			container: document.querySelector('.content-window'),
			containerRect: document.querySelector('.content-window')?.getBoundingClientRect() || null,
			accumulation: new Array(Math.ceil((document.querySelector('.content-window')?.getBoundingClientRect().width || 800))).fill(0),
			maxSnowHeight: 50,
			isAnimating: false,
			speedMultiplier: 1,
			lastScrollY: window.scrollY,
			resizeCanvas: () => {
				canvas.width = window.innerWidth;
				canvas.height = window.innerHeight;
				snowSystem.containerRect = snowSystem.container?.getBoundingClientRect() || null;
			},
			updateContainerPosition: () => {
				snowSystem.containerRect = snowSystem.container?.getBoundingClientRect() || null;
				snowSystem.settledFlakes.forEach((flake: SnowFlake) => {
					if (flake.settled) {
						flake.settledY += (window.scrollY - snowSystem.lastScrollY);
					}
				});
				snowSystem.lastScrollY = window.scrollY;
			},
			createFlake: () => {
				const x = Math.random() * canvas.width;
				const y = -20;
				snowSystem.flakes.push(new SnowFlake(canvas, x, y, snowSystem.speedMultiplier));
			},
			update: () => {
				if (!snowSystem.isAnimating) return;

				if (Math.random() < 0.3) { // Exact match to old site
					snowSystem.createFlake();
				}

				snowSystem.containerRect = snowSystem.container?.getBoundingClientRect() || null;

				snowSystem.settledFlakes = snowSystem.settledFlakes.filter((flake: SnowFlake) => {
					const remove = flake.update(
						snowSystem.containerRect?.top || 0, 
						snowSystem.containerRect?.bottom || 0, 
						snowSystem.accumulation
					);
					return !remove;
				});
				
				for (let i = snowSystem.flakes.length - 1; i >= 0; i--) {
					const flake = snowSystem.flakes[i];
					if (flake.update(
						snowSystem.containerRect?.top || 0, 
						snowSystem.containerRect?.bottom || 0, 
						snowSystem.accumulation
					)) {
						if (flake.settled) {
							snowSystem.settledFlakes.push(flake);
						}
						snowSystem.flakes.splice(i, 1);
					}
				}
			},
			draw: () => {
				snowSystem.ctx.clearRect(0, 0, canvas.width, canvas.height);
				
				[...snowSystem.settledFlakes, ...snowSystem.flakes].forEach((flake: SnowFlake) => {
					flake.draw(snowSystem.ctx);
				});
			},
			start: () => {
				snowSystem.isAnimating = true;
				snowSystem.animate();
			},
			animate: () => {
				if (!snowSystem.isAnimating) return;
				
				snowSystem.update();
				snowSystem.draw();
				requestAnimationFrame(() => snowSystem.animate());
			},
			stop: () => {
				snowSystem.isAnimating = false;
				snowSystem.flakes = [];
				snowSystem.settledFlakes = [];
				snowSystem.ctx.clearRect(0, 0, canvas.width, canvas.height);
			},
			setSpeedMultiplier: (multiplier: number) => {
				snowSystem.speedMultiplier = multiplier;
				snowSystem.flakes.forEach((flake: SnowFlake) => flake.setSpeedMultiplier(multiplier));
			}
		};

		// Initialize canvas
		rainSystem.resizeCanvas();
		snowSystem.resizeCanvas();

		// Handle window resize
		const handleResize = () => {
			rainSystem?.resizeCanvas();
			snowSystem?.resizeCanvas();
		};
		window.addEventListener('resize', handleResize);

		// Handle scroll
		const handleScroll = () => {
			rainSystem?.updateContainerPosition();
			snowSystem?.updateContainerPosition();
		};
		window.addEventListener('scroll', handleScroll);

		// Weather settings subscription
		const unsubscribe = weatherSettings.subscribe((settings) => {
			if (!settings) return; // Skip if settings not initialized

			// Update speed for existing particles
			rainSystem?.setSpeedMultiplier(settings.speed);
			snowSystem?.setSpeedMultiplier(settings.speed);

			// Only restart if weather type changed
			const currentRainActive = rainSystem?.isAnimating;
			const currentSnowActive = snowSystem?.isAnimating;

			if (settings.type === 'rain' && !currentRainActive) {
				snowSystem?.stop();
				rainSystem?.start();
			} else if (settings.type === 'snow' && !currentSnowActive) {
				rainSystem?.stop();
				snowSystem?.start();
			} else if (settings.type === 'none') {
				rainSystem?.stop();
				snowSystem?.stop();
			}
		});

		return () => {
			window.removeEventListener('resize', handleResize);
			window.removeEventListener('scroll', handleScroll);
			unsubscribe();
			rainSystem?.stop();
			snowSystem?.stop();
		};
	});

	onDestroy(() => {
		rainSystem?.stop();
		snowSystem?.stop();
	});
</script>

<canvas
	bind:this={canvas}
	class="weather-canvas"
	style="position: fixed; top: 0; left: 0; pointer-events: none; z-index: 0;"
></canvas>

<style>
	.weather-canvas {
		position: fixed;
		top: 0;
		left: 0;
		width: 100vw;
		height: 100vh;
		pointer-events: none;
		z-index: 0;
	}
</style>
