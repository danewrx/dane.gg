import { db } from '../index';
import { contactPageSettings } from '../schema';

export async function seedContactPageSettings() {
  console.log('📝 Seeding contact page settings...');
  await db.insert(contactPageSettings).values([
    {
      key: 'tagline',
      value:
        "I'm always happy to connect! Whether you want to discuss a project, ask a question, or just say hi, feel free to reach out through any of the channels below."
    },
    {
      key: 'emails_header',
      value: 'Email'
    },
    {
      key: 'social_header',
      value: 'If you prefer social media, you can find me on the following platforms:'
    },
    {
      key: 'social_links',
      value: '[]'
    }
  ]);
}
