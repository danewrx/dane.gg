import { db } from '../index';
import { fonts } from '../schema';

const GOOGLE_FONTS_LIST = [
	'Inter',
	'Roboto',
	'Open Sans',
	'Lato',
	'Montserrat',
	'Poppins',
	'Source Sans Pro',
	'Nunito',
	'Raleway',
	'Ubuntu',
	'Playfair Display',
	'Merriweather',
	'PT Sans',
	'Oswald',
	'Quicksand',
	'Work Sans',
	'Fira Sans',
	'Rubik',
	'Karla',
	'Manrope',
	'Space Grotesk',
	'DM Sans',
	'JetBrains Mono',
	'Fira Code',
	'Rajdhani',
	'Orbitron'
];

export async function seedFonts() {
	console.log('🔤 Seeding fonts...');
	await db.insert(fonts).values(
		GOOGLE_FONTS_LIST.map((name, i) => ({
			name,
			type: 'google' as const,
			googleFontFamily: name,
			filePath: null,
			displayOrder: i
		}))
	);
}
