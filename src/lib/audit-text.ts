import { STATUS_LABEL, isStatus } from './status.ts';

/** Plain-language line for an audit entry ("changed X to In Progress"). */
export function describeAudit(a: {
	action: string;
	targetType: string | null;
	targetId: number | null;
	meta: Record<string, unknown>;
}): string {
	const target = a.targetType ? `${a.targetType} #${a.targetId}` : '';
	const m = a.meta ?? {};
	switch (a.action) {
		case 'status.change':
			return `changed ${target} to ${isStatus(m.to) ? STATUS_LABEL[m.to] : String(m.to)}`;
		case 'content.hide':
			return `hid ${target}`;
		case 'content.restore':
			return `restored ${target}`;
		case 'content.approve':
			return `approved ${target}`;
		case 'content.redact':
			return `removed a name from ${target}`;
		case 'content.auto_hide':
			return `auto-hid ${target} after ${m.reports} reports`;
		case 'report.dismiss':
			return `dismissed reports on ${target}`;
		case 'category.create':
			return `added the category ${m.name}`;
		case 'category.rename':
			return `renamed the category ${m.from} to ${m.to}`;
		case 'category.delete':
			return `deleted the category ${m.name}`;
		case 'tag.create':
			return `added the tag ${m.name}`;
		case 'tag.rename':
			return `renamed a tag to ${m.to}`;
		case 'tag.merge':
			return `merged two tags`;
		case 'tag.delete':
			return `deleted the tag ${m.name}`;
		case 'staff.invite':
			return `added a ${String(m.role).toLowerCase()} account`;
		case 'staff.role':
			return `changed a staff role to ${String(m.role).toLowerCase()}`;
		case 'staff.remove':
			return `removed a staff account`;
		case 'staff.login':
			return `signed in`;
		case 'setting.change':
			return `changed the setting ${m.key}`;
		case 'proposal.adopt':
			return `adopted ${target} as the plan for concern #${m.concernId}`;
		case 'proposal.unadopt':
			return `withdrew adoption of ${target}`;
		case 'post.official':
			return `published an official post`;
		default:
			return a.action;
	}
}
