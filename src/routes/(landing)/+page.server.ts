import { latestConcerns, publicStats } from '#lib/server/services/concerns.ts';
import { pinnedPost } from '#lib/server/services/posts.ts';
import { campaignProgress, latestArticles } from '#lib/server/services/campaigns.ts';
import { valueChip } from '#lib/campaigns.ts';
import { CAMPAIGNS } from '#lib/content/site.ts';
import { parseUniversityStatement } from '#lib/university.ts';
import type { PageServerLoad } from './$types';

// Published content only, and no identifiers: every query below selects display fields.
export const load: PageServerLoad = async () => {
	const [stats, pinned, posts, concerns, progress, featured] = await Promise.all([
		publicStats(),
		pinnedPost(),
		latestArticles(3),
		latestConcerns(3),
		campaignProgress(),
		latestArticles(1, { sort: 'liked' })
	]);
	const statement = pinned ? parseUniversityStatement(pinned.bodyMd) : null;
	const values = statement?.values ?? [];
	return {
		stats,
		statement,
		pinnedSlug: pinned?.slug ?? null,
		latest: { posts, concerns },
		// Campaigns lead the page: hero stickers, campaign cards, participate chips, progress.
		campaigns: CAMPAIGNS.map((c) => ({
			...c,
			progress: progress[c.slug],
			chip: valueChip(c.coreValue, values)
		})),
		featured: featured[0] ?? null
	};
};
