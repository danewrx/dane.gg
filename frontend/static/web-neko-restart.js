/**
 * Hot-swap Web Neko skin without a full page reload (see `n20171213.js` globals).
 * Old Think() timers still call `aNekos[i].Think()` by index — we leave noop stubs in those slots
 * so they never hit the new instance. Storage key must match `web-neko-init.js`.
 */
(function () {
	if (typeof window === 'undefined') return;

	function noopThink() {}

	function isAdminPath() {
		if (typeof location === 'undefined') return false;
		var p = location.pathname || '';
		return p.indexOf('/admin') === 0 || p.indexOf('/login') === 0 || p.indexOf('/logout') === 0;
	}

	var DISABLED = 'none';

	function validSkin(s) {
		return s && /^[a-z][a-z0-9_-]*$/i.test(s);
	}

	window.daneTeardownWebNeko = function () {
		try {
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
			try {
				delete window.NekoType;
			} catch (eDel) {}
		} catch (e0) {}
	};

	window.daneRestartWebNeko = function () {
		try {
			if (isAdminPath()) {
				window.daneTeardownWebNeko();
				return;
			}

			var STORAGE = 'dane-neko-web-type';
			var enforce = window.__DANE_ENFORCE_WEB_NEKO__ === true;
			var raw = '';
			try {
				raw = localStorage.getItem(STORAGE) || '';
				if (raw) raw = String(raw).toLowerCase();
			} catch (e0) {}

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

			var chosen;
			var turnOff;
			if (enforce) {
				var eff = validSkin(serverEnforced) ? serverEnforced : serverDefault;
				turnOff = eff === DISABLED;
				chosen = turnOff ? null : validSkin(eff) ? eff : 'white';
			} else {
				turnOff = raw === DISABLED;
				if (turnOff) chosen = null;
				else if (validSkin(raw)) chosen = raw;
				else if (serverDefault === DISABLED) turnOff = true;
				else chosen = validSkin(serverDefault) ? serverDefault : 'white';
			}

			if (turnOff || chosen === null) {
				try {
					delete window.NekoType;
				} catch (eDel) {}
				return;
			}

			if (typeof Neko === 'undefined') {
				window.location.reload();
				return;
			}

			window.NekoType = chosen;

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
