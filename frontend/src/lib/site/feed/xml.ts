export function escapeXml(text: string): string {
	return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&apos;');
}

export function wrapCdata(content: string): string {
	const safe = content.replace(/]]>/g, ']]]]><![CDATA[>');
	return `<![CDATA[${safe}]]>`;
}
