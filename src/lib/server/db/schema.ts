import { sql, type SQL } from 'drizzle-orm';
import {
	boolean,
	check,
	customType,
	index,
	integer,
	jsonb,
	pgEnum,
	pgTable,
	primaryKey,
	text,
	timestamp,
	uniqueIndex
} from 'drizzle-orm/pg-core';

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------
export const categoryType = pgEnum('category_type', ['blog', 'concern']);
export const visibility = pgEnum('visibility', ['published', 'pending', 'hidden']);
export const concernKind = pgEnum('concern_kind', ['concern', 'recommendation']);
export const concernStatus = pgEnum('concern_status', [
	'submitted',
	'under_review',
	'in_discussion',
	'action_planned',
	'in_progress',
	'resolved',
	'closed'
]);
export const parentType = pgEnum('parent_type', ['post', 'concern', 'proposal']);
export const targetType = pgEnum('target_type', ['post', 'concern', 'proposal', 'comment']);
export const reportStatus = pgEnum('report_status', ['open', 'actioned', 'dismissed']);
export const staffRole = pgEnum('staff_role', ['ADMIN', 'MODERATOR']);

const tsvector = customType<{ data: string }>({ dataType: () => 'tsvector' });

const id = () => integer().primaryKey().generatedAlwaysAsIdentity();
const createdAt = () => timestamp({ withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
	timestamp({ withTimezone: true })
		.notNull()
		.defaultNow()
		.$onUpdate(() => new Date());

/** Where content came from. Extensibility hook for verified office accounts later. */
const source = () => text().notNull().default('anonymous');

// ---------------------------------------------------------------------------
// Staff (declared first: referenced by content and logs)
// ---------------------------------------------------------------------------
export const staffUser = pgTable('staff_user', {
	id: id(),
	email: text().notNull().unique(),
	passwordHash: text().notNull(),
	role: staffRole().notNull().default('MODERATOR'),
	createdAt: createdAt(),
	lastLoginAt: timestamp({ withTimezone: true }),
	disabledAt: timestamp({ withTimezone: true })
});

export const staffSession = pgTable(
	'staff_session',
	{
		/** sha256 of the session token; the raw token lives only in the cookie. */
		id: text().primaryKey(),
		staffId: integer()
			.notNull()
			.references(() => staffUser.id, { onDelete: 'cascade' }),
		expiresAt: timestamp({ withTimezone: true }).notNull(),
		createdAt: createdAt()
	},
	(t) => [index().on(t.staffId)]
);

// ---------------------------------------------------------------------------
// Taxonomy
// ---------------------------------------------------------------------------
export const category = pgTable(
	'category',
	{
		id: id(),
		name: text().notNull(),
		slug: text().notNull(),
		type: categoryType().notNull(),
		description: text(),
		sort: integer().notNull().default(0),
		/** The fallback category ("Other") cannot be deleted; deleted categories move items here. */
		isFallback: boolean().notNull().default(false)
	},
	(t) => [uniqueIndex().on(t.type, t.slug)]
);

export const tag = pgTable('tag', {
	id: id(),
	name: text().notNull(),
	slug: text().notNull().unique()
});

// ---------------------------------------------------------------------------
// Blog
// ---------------------------------------------------------------------------
export const post = pgTable(
	'post',
	{
		id: id(),
		slug: text().notNull().unique(),
		title: text().notNull(),
		excerpt: text().notNull().default(''),
		bodyMd: text().notNull(),
		/** Sanitized HTML rendered from bodyMd on write. The only HTML ever passed to {@html}. */
		bodyHtml: text().notNull(),
		coverImage: text(),
		categoryId: integer().references(() => category.id, { onDelete: 'set null' }),
		isOfficial: boolean().notNull().default(false),
		isPinned: boolean().notNull().default(false),
		status: visibility().notNull().default('published'),
		authorTokenHash: text(),
		staffAuthorId: integer().references(() => staffUser.id, { onDelete: 'set null' }),
		likeCount: integer().notNull().default(0),
		commentCount: integer().notNull().default(0),
		source: source(),
		search: tsvector().generatedAlwaysAs(
			(): SQL =>
				sql`setweight(to_tsvector('english', coalesce(${post.title}, '')), 'A') || setweight(to_tsvector('english', coalesce(${post.excerpt}, '')), 'B') || setweight(to_tsvector('english', coalesce(${post.bodyMd}, '')), 'C')`
		),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(t) => [
		index().on(t.status, t.createdAt),
		index().on(t.categoryId),
		index('post_search_idx').using('gin', t.search)
	]
);

export const postTag = pgTable(
	'post_tag',
	{
		postId: integer()
			.notNull()
			.references(() => post.id, { onDelete: 'cascade' }),
		tagId: integer()
			.notNull()
			.references(() => tag.id, { onDelete: 'cascade' })
	},
	(t) => [primaryKey({ columns: [t.postId, t.tagId] }), index().on(t.tagId)]
);

// ---------------------------------------------------------------------------
// Concerns and recommendations (one model, `kind` distinguishes them)
// ---------------------------------------------------------------------------
export const concern = pgTable(
	'concern',
	{
		id: id(),
		kind: concernKind().notNull().default('concern'),
		title: text().notNull(),
		description: text().notNull(),
		categoryId: integer().references(() => category.id, { onDelete: 'set null' }),
		location: text(),
		/** Object-storage keys of EXIF-stripped images. */
		images: jsonb().$type<string[]>().notNull().default([]),
		currentStatus: concernStatus().notNull().default('submitted'),
		isSensitive: boolean().notNull().default(false),
		visibility: visibility().notNull().default('published'),
		supportCount: integer().notNull().default(0),
		commentCount: integer().notNull().default(0),
		proposalCount: integer().notNull().default(0),
		authorTokenHash: text(),
		source: source(),
		search: tsvector().generatedAlwaysAs(
			(): SQL =>
				sql`setweight(to_tsvector('english', coalesce(${concern.title}, '')), 'A') || setweight(to_tsvector('english', coalesce(${concern.location}, '')), 'B') || setweight(to_tsvector('english', coalesce(${concern.description}, '')), 'C')`
		),
		statusChangedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(t) => [
		index().on(t.visibility, t.kind, t.currentStatus),
		index().on(t.categoryId),
		index().on(t.createdAt),
		index().on(t.supportCount),
		index('concern_search_idx').using('gin', t.search)
	]
);

export const concernTag = pgTable(
	'concern_tag',
	{
		concernId: integer()
			.notNull()
			.references(() => concern.id, { onDelete: 'cascade' }),
		tagId: integer()
			.notNull()
			.references(() => tag.id, { onDelete: 'cascade' })
	},
	(t) => [primaryKey({ columns: [t.concernId, t.tagId] }), index().on(t.tagId)]
);

export const concernSupport = pgTable(
	'concern_support',
	{
		concernId: integer()
			.notNull()
			.references(() => concern.id, { onDelete: 'cascade' }),
		tokenHash: text().notNull(),
		createdAt: createdAt()
	},
	(t) => [primaryKey({ columns: [t.concernId, t.tokenHash] })]
);

export const statusHistory = pgTable(
	'status_history',
	{
		id: id(),
		concernId: integer()
			.notNull()
			.references(() => concern.id, { onDelete: 'cascade' }),
		status: concernStatus().notNull(),
		publicNote: text(),
		changedById: integer().references(() => staffUser.id, { onDelete: 'set null' }),
		createdAt: createdAt()
	},
	(t) => [index().on(t.concernId, t.createdAt)]
);

// ---------------------------------------------------------------------------
// Solution proposals
// ---------------------------------------------------------------------------
export const proposal = pgTable(
	'proposal',
	{
		id: id(),
		concernId: integer()
			.notNull()
			.references(() => concern.id, { onDelete: 'cascade' }),
		title: text().notNull(),
		description: text().notNull(),
		feasibilityNotes: text(),
		supportCount: integer().notNull().default(0),
		commentCount: integer().notNull().default(0),
		visibility: visibility().notNull().default('published'),
		authorTokenHash: text(),
		source: source(),
		search: tsvector().generatedAlwaysAs(
			(): SQL =>
				sql`setweight(to_tsvector('english', coalesce(${proposal.title}, '')), 'A') || setweight(to_tsvector('english', coalesce(${proposal.description}, '')), 'C')`
		),
		createdAt: createdAt()
	},
	(t) => [
		index().on(t.concernId),
		index().on(t.visibility, t.supportCount),
		index('proposal_search_idx').using('gin', t.search)
	]
);

export const proposalSupport = pgTable(
	'proposal_support',
	{
		proposalId: integer()
			.notNull()
			.references(() => proposal.id, { onDelete: 'cascade' }),
		tokenHash: text().notNull(),
		createdAt: createdAt()
	},
	(t) => [primaryKey({ columns: [t.proposalId, t.tokenHash] })]
);

// ---------------------------------------------------------------------------
// Comments, reactions, reports
// ---------------------------------------------------------------------------
export const comment = pgTable(
	'comment',
	{
		id: id(),
		parentType: parentType().notNull(),
		parentId: integer().notNull(),
		parentCommentId: integer(),
		body: text().notNull(),
		/** Per-thread seed for the "Anonymous Pelican" label: HMAC(token, thread). Not linkable across threads. */
		anonLabelSeed: text().notNull(),
		visibility: visibility().notNull().default('published'),
		authorTokenHash: text(),
		staffAuthorId: integer().references(() => staffUser.id, { onDelete: 'set null' }),
		createdAt: createdAt()
	},
	(t) => [index().on(t.parentType, t.parentId, t.createdAt), index().on(t.parentCommentId)]
);

export const reaction = pgTable(
	'reaction',
	{
		id: id(),
		targetType: targetType().notNull(),
		targetId: integer().notNull(),
		type: text().notNull().default('like'),
		tokenHash: text().notNull(),
		createdAt: createdAt()
	},
	(t) => [uniqueIndex().on(t.targetType, t.targetId, t.type, t.tokenHash)]
);

export const report = pgTable(
	'report',
	{
		id: id(),
		targetType: targetType().notNull(),
		targetId: integer().notNull(),
		reason: text().notNull(),
		details: text(),
		status: reportStatus().notNull().default('open'),
		reporterTokenHash: text().notNull(),
		createdAt: createdAt(),
		resolvedById: integer().references(() => staffUser.id, { onDelete: 'set null' }),
		resolvedAt: timestamp({ withTimezone: true })
	},
	(t) => [
		index().on(t.status, t.targetType, t.targetId),
		// One open report per reporter per item, so "unique reports" is a simple count.
		uniqueIndex('report_one_open_per_reporter')
			.on(t.targetType, t.targetId, t.reporterTokenHash)
			.where(sql`${t.status} = 'open'`)
	]
);

// ---------------------------------------------------------------------------
// Operations
// ---------------------------------------------------------------------------
export const auditLog = pgTable(
	'audit_log',
	{
		id: id(),
		staffId: integer().references(() => staffUser.id, { onDelete: 'set null' }),
		action: text().notNull(),
		targetType: text(),
		targetId: integer(),
		meta: jsonb().$type<Record<string, unknown>>().notNull().default({}),
		createdAt: createdAt()
	},
	(t) => [index().on(t.createdAt)]
);

export const rateLimit = pgTable(
	'rate_limit',
	{
		/** `${bucket}:${hashedSubject}`, never a raw address. */
		key: text().notNull(),
		windowStart: timestamp({ withTimezone: true }).notNull(),
		count: integer().notNull().default(0)
	},
	(t) => [primaryKey({ columns: [t.key, t.windowStart] }), index().on(t.windowStart)]
);

export const setting = pgTable(
	'setting',
	{
		key: text().primaryKey(),
		value: jsonb().$type<unknown>().notNull()
	},
	(t) => [check('setting_key_nonempty', sql`length(${t.key}) > 0`)]
);
