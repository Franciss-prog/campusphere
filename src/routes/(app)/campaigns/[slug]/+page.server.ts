import { error } from '@sveltejs/kit';
import { findCampaign, valueChip } from '#lib/campaigns.ts';
import { campaignContent, campaignProgress, coreValues } from '#lib/server/services/campaigns.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const campaign = findCampaign(params.slug);
	if (!campaign || campaign.slug !== params.slug) error(404, 'This campaign does not exist.');
	const [progress, content, values] = await Promise.all([
		campaignProgress([campaign.slug]),
		campaignContent(campaign.slug),
		coreValues()
	]);
	return {
		campaign,
		progress: progress[campaign.slug],
		content,
		chip: valueChip(campaign.coreValue, values)
	};
};
