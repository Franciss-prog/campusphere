import { db, t, type Database } from './db/index.ts';

export type AuditAction =
	| 'status.change'
	| 'content.hide'
	| 'content.restore'
	| 'content.redact'
	| 'content.approve'
	| 'content.auto_hide'
	| 'report.dismiss'
	| 'category.create'
	| 'category.rename'
	| 'category.delete'
	| 'tag.create'
	| 'tag.rename'
	| 'tag.merge'
	| 'tag.delete'
	| 'staff.invite'
	| 'staff.role'
	| 'staff.remove'
	| 'staff.login'
	| 'setting.change'
	| 'post.official';

type Tx = Parameters<Parameters<Database['transaction']>[0]>[0];

/** Every moderation, status and admin action is written here (staffId null = system action). */
export async function audit(
	entry: {
		staffId: number | null;
		action: AuditAction;
		targetType?: string;
		targetId?: number;
		meta?: Record<string, unknown>;
	},
	tx?: Tx
): Promise<void> {
	await (tx ?? db()).insert(t.auditLog).values({
		staffId: entry.staffId,
		action: entry.action,
		targetType: entry.targetType ?? null,
		targetId: entry.targetId ?? null,
		meta: entry.meta ?? {}
	});
}
