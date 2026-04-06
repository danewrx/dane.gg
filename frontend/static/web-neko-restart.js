/**
 * Hot-swap Web Neko skin without a full page reload (see `n20171213.js` globals).
 * Old Think() timers still call `aNekos[i].Think()` by index — we leave noop stubs in those slots
 * so they never hit the new instance. Storage key must match `web-neko-init.js`.
 */
(function () {
	if (typeof window === 'undefined') return;

	function noopThink() {}

	var DISABLED = 'none';

	window.daneRestartWebNeko = function () {
		try {
			var STORAGE = 'dane-neko-web-type';
			var raw = '';
			try {
				raw = localStorage.getItem(STORAGE) || '';
				if (raw) raw = String(raw).toLowerCase();
			} catch (e0) {}
			var disabled = raw === DISABLED;

			var i, j, n;
			if (typeof window.aNekos !== 'undefined' && window.aNekos.length) {
				for (i = 0; i < aNekos.length; i++) {
					n = aNekos[i];
					if (n && typeof n.Think === 'function') n.Think = noopThink;
					if (n && n.layer && n.layer.parentNode) n.layer.parentNode.removeChild(n.layer);
					aNekos[i] = { Think: noopThink };
				}
			}

			if (typeof checkerboard !== 'undefined' && checkerboard && checkerboard.length) {
				for (i = 0; i < checkerboard.length; i++) {
					if (!checkerboard[i]) continue;
					for (j = 0; j < checkerboard[i].length; j++) checkerboard[i][j] = 0;
				}
			}

			if (disabled) {
				try {
					delete window.NekoType;
				} catch (eDel) {}
				return;
			}

			if (typeof Neko === 'undefined') {
				window.location.reload();
				return;
			}

			window.NekoType = raw && /^[a-z][a-z0-9_-]*$/i.test(raw) ? raw : 'white';

			var e = 0,
				t = 0;
			if (window.startNekoX !== undefined && window.startNekoX !== null) e = window.startNekoX;
			if (window.startNekoY !== undefined && window.startNekoY !== null) t = window.startNekoY;

			new Neko(e, t, false);
			if (window.aNekos && window.aNekos[aNekos.length - 1]) {
				window.aNekos[aNekos.length - 1].active = true;
			}
		} catch (e2) {
			window.location.reload();
		}
	};
})();
