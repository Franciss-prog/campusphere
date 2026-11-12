import { campaignCards } from '#lib/server/services/campaigns.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => ({ campaigns: await campaignCards() });
