export function escapeXml(text: string): string {
	return text
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&apos;');
}

export function wrapCdata(content: string): string {
	const safe = content.replaceAll(']]>', ']]]]><![CDATA[>');
	return `<![CDATA[${safe}]]>`;
}
