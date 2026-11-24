import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import { db } from '../db';
import { projectCategories, projects } from '../db/schema';

const MAX_LISTED = 3;
const MAX_LENGTH = 160;

export function buildCategoryDescription(name: string, titles: string[]): string {
	if (titles.length === 0) return `A collection of ${name} projects from my portfolio.`;

	const listed = titles.slice(0, MAX_LISTED);
	const more = titles.length - listed.length;
	const names = more > 0 ? [...listed, `${more} more`] : listed;
	const list =
		names.length === 1
			? names[0]
			: `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
	const text = `${titles.length} ${name} project${titles.length === 1 ? '' : 's'}: ${list}.`;
	return text.length <= MAX_LENGTH ? text : `${text.slice(0, MAX_LENGTH - 1).trim()}…`;
}

export async function getCategorySeo(
	categoryId: string
): Promise<{ name: string; description: string } | null> {
	const [category] = await db
		.select()
		.from(projectCategories)
		.where(eq(projectCategories.id, categoryId))
		.limit(1);
	if (!category) return null;

	const subcategories = category.parentId
		? []
		: await db
				.select({ id: projectCategories.id })
				.from(projectCategories)
				.where(eq(projectCategories.parentId, category.id));
	const titles = await db
		.select({ title: projects.title })
		.from(projects)
		.where(
			and(
				eq(projects.published, true),
				inArray(projects.categoryId, [category.id, ...subcategories.map((c) => c.id)])
			)
		)
		.orderBy(asc(projects.displayOrder), desc(projects.updatedAt));

	return {
		name: category.name,
		description: buildCategoryDescription(
			category.name,
			titles.map((row) => row.title)
		)
	};
}
