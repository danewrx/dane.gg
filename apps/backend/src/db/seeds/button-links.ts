import { logger } from '../../utils/logger';
import { db } from '../index';
import { buttonLinks } from '../schema';

// Keep in sync with drizzle/0016_seed_button_links.sql (used for fresh `db:reset` databases).
const DEFAULT_BUTTON_LINKS = [
	{
		title: 'Dimden',
		linkUrl: 'https://dimden.dev/',
		imageUrl: 'https://dimden.dev/services/images/88x31.gif'
	},
	{
		title: 'Melankorin',
		linkUrl: 'https://melankorin.net/',
		imageUrl: 'https://melankorin.net/assets/img/buttons/button-1.gif'
	},
	{
		title: 'Jesx',
		linkUrl: 'https://anemoia.moe',
		imageUrl: 'https://anemoia.moe/images/buttons/footer/jesx.gif'
	},
	{
		title: 'Docodemo',
		linkUrl: 'https://dokode.moe',
		imageUrl: 'https://dokode.moe/media/88x31sites/dokodemobutton3.gif'
	},
	{ title: 'Nichind', linkUrl: 'https://nichind.dev', imageUrl: 'https://nichind.dev/88x31.gif' },
	{
		title: 'NekoWeb',
		linkUrl: 'https://nekoweb.org/',
		imageUrl: 'https://nekoweb.org/assets/buttons/button6.gif'
	},
	{
		title: 'hrtowii',
		linkUrl: 'https://hrtowii.nekoweb.org/',
		imageUrl: 'https://hrtowii.nekoweb.org/88x31-madoka.png'
	},
	{ title: 'h4rl', linkUrl: 'https://h4rl.dev/', imageUrl: '/uploads/button-h4rl.png' },
	{ title: 'Luniiya', linkUrl: 'https://luniiya.me/', imageUrl: 'https://luniiya.me/button.gif' }
];

export async function seedButtonLinks() {
	logger.info('Seeding button links...');
	return db
		.insert(buttonLinks)
		.values(DEFAULT_BUTTON_LINKS.map((button, displayOrder) => ({ ...button, displayOrder })))
		.returning();
}
