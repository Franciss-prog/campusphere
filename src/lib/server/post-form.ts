import { z } from 'zod';
import { parseForm, text } from './forms.ts';
import { cleanText } from './sanitize.ts';
import { blogCategories } from './services/posts.ts';

const schema = z.object({
	title: text('Title', 6, 120),
	body: text('Your post', 40, 20000),
	category: z.coerce.number({ error: 'Choose a category.' }).int().positive('Choose a category.')
});

/** Shared validation for writing and editing a post. */
export async function parsePostForm(form: FormData) {
	const parsed = parseForm(schema, form);
	if (!parsed.ok) return parsed;
	const cats = await blogCategories();
	if (!cats.some((c) => c.id === parsed.data.category)) {
		return {
			ok: false as const,
			errors: { category: 'Choose a category.' },
			values: { title: parsed.data.title, body: parsed.data.body, category: '' }
		};
	}
	return {
		ok: true as const,
		data: {
			title: cleanText(parsed.data.title),
			body: parsed.data.body.trim(),
			category: parsed.data.category
		}
	};
}
