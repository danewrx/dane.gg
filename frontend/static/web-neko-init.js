/**
 * Loads [Web Neko](https://webneko.net/) from the official host (required by their license).
 * Uses document.write so their script runs during initial parse (their code relies on that).
 * Keep behaviour in sync with `src/lib/site/oneko/variants.ts` (storage key + migration map).
 * Hot skin swap: `web-neko-restart.js` (loaded next in `app.html`).
 */
(function () {
	if (typeof window === 'undefined' || typeof document === 'undefined') return;
	if (typeof location !== 'undefined' && location.search.indexOf('themePreview') !== -1) return;
	if (typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches) return;

	var STORAGE = 'dane-neko-web-type';
	var DISABLED = 'none';
	var LEGACY = 'dane-oneko-variant';
	var MIGRATE = {
		classic: 'white',
		black: 'black',
		black2: 'black',
		colourful: 'colourful',
		dog: 'white',
		fire: 'fire',
		gray: 'gray',
		holiday: 'holiday',
		'neko-cool': 'neon',
		neon: 'neon',
		peach: 'peach',
		pink: 'pink',
		rainbow: 'rainbow',
		royal: 'royal',
		silversky: 'silversky',
		socks: 'socks',
		spirit: 'spirit',
		spooky: 'spooky',
		valentine: 'valentine',
		water: 'water',
		kuramecha: 'kuramecha'
	};

	try {
		var legacyId = localStorage.getItem(LEGACY);
		if (legacyId != null && Object.prototype.hasOwnProperty.call(MIGRATE, legacyId)) {
			localStorage.setItem(STORAGE, MIGRATE[legacyId]);
			localStorage.removeItem(LEGACY);
		}
	} catch (e) {}

	var stored = null;
	try {
		stored = localStorage.getItem(STORAGE);
	} catch (eRead) {}
	if (stored === DISABLED) return;

	var v = 'white';
	try {
		if (stored && /^[a-z][a-z0-9_-]*$/i.test(stored)) v = String(stored).toLowerCase();
	} catch (e2) {}

	window.NekoType = v;

	// Web Neko's startANeko(): if these are non-numeric strings, Neko() stores them as homeXfn/homeYfn,
	// eval()s them on load and on resize, and TargetHome() uses that spot when inactive (click to stop).
	// Anchor: last `.nav-item` inside #dane-neko-nav-home (the ul is full-width; its rect.right was the whole row).
	// Fallback x when no public nav (e.g. admin): small left margin — not viewport right.
	(function navHomeStrings() {
		var nekoHomeX =
			"(function(){var list=document.getElementById('dane-neko-nav-home');var el=list&&list.querySelector('.nav-item:last-child');var w=typeof innerWidth==='number'?innerWidth:document.documentElement.clientWidth;var sx=window.pageXOffset||document.documentElement.scrollLeft||0;var x,t=w-36;if(el&&typeof el.getBoundingClientRect==='function'){var r=el.getBoundingClientRect();x=Math.floor(r.right+sx)+2;}else{x=16;}if(x<0)x=0;if(x>t)x=t;return x;})()";
		var nekoHomeY =
			"(function(){var list=document.getElementById('dane-neko-nav-home');var el=list&&list.querySelector('.nav-item:last-child');var h=typeof innerHeight==='number'?innerHeight:document.documentElement.clientHeight;var sy=window.pageYOffset||document.documentElement.scrollTop||0;var y,lo=20,hi=Math.max(lo,h-12);if(el&&typeof el.getBoundingClientRect==='function'){var r=el.getBoundingClientRect();y=Math.floor(r.top+sy+r.height/2-16);}else{y=lo+8;}if(y<lo)y=lo;if(y>hi)y=hi;return y;})()";
		window.startNekoX = nekoHomeX;
		window.startNekoY = nekoHomeY;
	})();

	document.write('<script src="https://webneko.net/n20171213.js"><\/script>');
})();
