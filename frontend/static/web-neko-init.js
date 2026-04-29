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
	// Touch-first / typical phone layouts — cursor pet is awkward and steals taps
	try {
		if (matchMedia('(pointer: coarse)').matches) return;
	} catch (eCoarse) {}
	try {
		if (matchMedia('(max-width: 768px) and (hover: none)').matches) return;
	} catch (eSmall) {}
	// Public site only — keep admin /login /logout free of the cursor pet (matches `hooks.client.ts` isAdminRoute)
	if (typeof location !== 'undefined') {
		var path = location.pathname || '';
		if (
			path.indexOf('/admin') === 0 ||
			path.indexOf('/login') === 0 ||
			path.indexOf('/logout') === 0
		) {
			return;
		}
	}

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

	var enforce = window.__DANE_ENFORCE_WEB_NEKO__ === true;

	var stored = null;
	try {
		stored = localStorage.getItem(STORAGE);
	} catch (eRead) {}

	var serverDefault = null;
	try {
		if (typeof window.__DANE_DEFAULT_WEB_NEKO_TYPE__ === 'string') {
			serverDefault = String(window.__DANE_DEFAULT_WEB_NEKO_TYPE__).toLowerCase();
		}
	} catch (eSrv) {}

	var serverEnforced = null;
	try {
		if (typeof window.__DANE_ENFORCED_WEB_NEKO_TYPE__ === 'string') {
			serverEnforced = String(window.__DANE_ENFORCED_WEB_NEKO_TYPE__).toLowerCase();
		}
	} catch (eEnf) {}

	function validSkin(s) {
		return s && /^[a-z][a-z0-9_-]*$/i.test(s);
	}

	var v = 'white';
	try {
		if (enforce) {
			var eff = validSkin(serverEnforced) ? serverEnforced : serverDefault;
			if (eff === DISABLED) return;
			v = validSkin(eff) ? eff : 'white';
		} else {
			if (stored === DISABLED) return;
			if (validSkin(stored)) v = String(stored).toLowerCase();
			else {
				if (serverDefault === DISABLED) return;
				v = validSkin(serverDefault) ? serverDefault : 'white';
			}
		}
	} catch (e2) {}

	window.NekoType = v;

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
