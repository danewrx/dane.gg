export function lucideIconNameToIconifySlug(name: string): string {
	const t = name.trim();
	if (!t) return '';
	if (!/[A-Z]/.test(t)) {
		return t.replace(/_/g, '-').toLowerCase();
	}
	return t.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}
