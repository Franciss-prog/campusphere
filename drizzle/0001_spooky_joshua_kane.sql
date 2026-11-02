CREATE TYPE "public"."audit_target" AS ENUM('post', 'concern', 'proposal', 'comment', 'staff', 'category', 'tag', 'setting');--> statement-breakpoint
CREATE TYPE "public"."report_reason" AS ENUM('private_person', 'harassment', 'spam', 'off_topic', 'safety', 'other');--> statement-breakpoint
CREATE TABLE "media" (
	"key" text PRIMARY KEY NOT NULL,
	"concern_id" integer,
	"post_id" integer,
	"bytes" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "media_one_owner" CHECK ("media"."concern_id" is null or "media"."post_id" is null)
);
--> statement-breakpoint
ALTER TABLE "audit_log" ALTER COLUMN "target_type" SET DATA TYPE "public"."audit_target" USING "target_type"::"public"."audit_target";--> statement-breakpoint
-- Map the v1 free-text labels onto the enum codes.
ALTER TABLE "report" ALTER COLUMN "reason" SET DATA TYPE "public"."report_reason" USING (case "reason"
	when 'Names or targets a private person' then 'private_person'
	when 'Harassment or abusive language' then 'harassment'
	when 'Spam or advertising' then 'spam'
	when 'Off topic' then 'off_topic'
	when 'Safety concern' then 'safety'
	else 'other' end)::"public"."report_reason";--> statement-breakpoint
ALTER TABLE "comment" ADD COLUMN "post_id" integer GENERATED ALWAYS AS (case when "parent_type" = 'post' then "parent_id" end) STORED;--> statement-breakpoint
ALTER TABLE "comment" ADD COLUMN "concern_id" integer GENERATED ALWAYS AS (case when "parent_type" = 'concern' then "parent_id" end) STORED;--> statement-breakpoint
ALTER TABLE "comment" ADD COLUMN "proposal_id" integer GENERATED ALWAYS AS (case when "parent_type" = 'proposal' then "parent_id" end) STORED;--> statement-breakpoint
ALTER TABLE "proposal" ADD COLUMN "adopted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "proposal" ADD COLUMN "adopted_by_id" integer;--> statement-breakpoint
ALTER TABLE "proposal" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "reaction" ADD COLUMN "post_id" integer GENERATED ALWAYS AS (case when "target_type" = 'post' then "target_id" end) STORED;--> statement-breakpoint
ALTER TABLE "reaction" ADD COLUMN "concern_id" integer GENERATED ALWAYS AS (case when "target_type" = 'concern' then "target_id" end) STORED;--> statement-breakpoint
ALTER TABLE "reaction" ADD COLUMN "proposal_id" integer GENERATED ALWAYS AS (case when "target_type" = 'proposal' then "target_id" end) STORED;--> statement-breakpoint
ALTER TABLE "reaction" ADD COLUMN "comment_id" integer GENERATED ALWAYS AS (case when "target_type" = 'comment' then "target_id" end) STORED;--> statement-breakpoint
ALTER TABLE "report" ADD COLUMN "post_id" integer GENERATED ALWAYS AS (case when "target_type" = 'post' then "target_id" end) STORED;--> statement-breakpoint
ALTER TABLE "report" ADD COLUMN "concern_id" integer GENERATED ALWAYS AS (case when "target_type" = 'concern' then "target_id" end) STORED;--> statement-breakpoint
ALTER TABLE "report" ADD COLUMN "proposal_id" integer GENERATED ALWAYS AS (case when "target_type" = 'proposal' then "target_id" end) STORED;--> statement-breakpoint
ALTER TABLE "report" ADD COLUMN "comment_id" integer GENERATED ALWAYS AS (case when "target_type" = 'comment' then "target_id" end) STORED;--> statement-breakpoint
ALTER TABLE "staff_user" ADD COLUMN "display_name" text;--> statement-breakpoint
ALTER TABLE "staff_user" ADD COLUMN "must_change_password" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "staff_user" ADD COLUMN "temp_password_expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_concern_id_concern_id_fk" FOREIGN KEY ("concern_id") REFERENCES "public"."concern"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_post_id_post_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."post"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "media_concern_id_index" ON "media" USING btree ("concern_id");--> statement-breakpoint
CREATE INDEX "media_post_id_index" ON "media" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX "media_orphan_idx" ON "media" USING btree ("created_at") WHERE "media"."concern_id" is null and "media"."post_id" is null;--> statement-breakpoint
-- v1 had no foreign keys here: remove rows whose parent is already gone so the constraints apply.
DELETE FROM "comment" c WHERE ("post_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "post" p WHERE p.id = c.post_id))
	OR ("concern_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "concern" x WHERE x.id = c.concern_id))
	OR ("proposal_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "proposal" x WHERE x.id = c.proposal_id));--> statement-breakpoint
UPDATE "comment" c SET "parent_comment_id" = NULL WHERE "parent_comment_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "comment" r WHERE r.id = c.parent_comment_id);--> statement-breakpoint
DELETE FROM "reaction" r WHERE ("post_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "post" x WHERE x.id = r.post_id))
	OR ("concern_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "concern" x WHERE x.id = r.concern_id))
	OR ("proposal_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "proposal" x WHERE x.id = r.proposal_id))
	OR ("comment_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "comment" x WHERE x.id = r.comment_id));--> statement-breakpoint
DELETE FROM "report" r WHERE ("post_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "post" x WHERE x.id = r.post_id))
	OR ("concern_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "concern" x WHERE x.id = r.concern_id))
	OR ("proposal_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "proposal" x WHERE x.id = r.proposal_id))
	OR ("comment_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "comment" x WHERE x.id = r.comment_id));--> statement-breakpoint
-- Record images uploaded under v1 (size unknown).
INSERT INTO "media" ("key", "concern_id", "bytes", "created_at")
	SELECT k, c.id, 0, c.created_at FROM "concern" c, jsonb_array_elements_text(c.images) k ON CONFLICT DO NOTHING;--> statement-breakpoint
INSERT INTO "media" ("key", "post_id", "bytes", "created_at")
	SELECT p.cover_image, p.id, 0, p.created_at FROM "post" p WHERE p.cover_image IS NOT NULL ON CONFLICT DO NOTHING;--> statement-breakpoint
ALTER TABLE "comment" ADD CONSTRAINT "comment_post_id_post_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."post"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comment" ADD CONSTRAINT "comment_concern_id_concern_id_fk" FOREIGN KEY ("concern_id") REFERENCES "public"."concern"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comment" ADD CONSTRAINT "comment_proposal_id_proposal_id_fk" FOREIGN KEY ("proposal_id") REFERENCES "public"."proposal"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comment" ADD CONSTRAINT "comment_parent_comment_id_comment_id_fk" FOREIGN KEY ("parent_comment_id") REFERENCES "public"."comment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposal" ADD CONSTRAINT "proposal_adopted_by_id_staff_user_id_fk" FOREIGN KEY ("adopted_by_id") REFERENCES "public"."staff_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reaction" ADD CONSTRAINT "reaction_post_id_post_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."post"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reaction" ADD CONSTRAINT "reaction_concern_id_concern_id_fk" FOREIGN KEY ("concern_id") REFERENCES "public"."concern"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reaction" ADD CONSTRAINT "reaction_proposal_id_proposal_id_fk" FOREIGN KEY ("proposal_id") REFERENCES "public"."proposal"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reaction" ADD CONSTRAINT "reaction_comment_id_comment_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."comment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report" ADD CONSTRAINT "report_post_id_post_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."post"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report" ADD CONSTRAINT "report_concern_id_concern_id_fk" FOREIGN KEY ("concern_id") REFERENCES "public"."concern"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report" ADD CONSTRAINT "report_proposal_id_proposal_id_fk" FOREIGN KEY ("proposal_id") REFERENCES "public"."proposal"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report" ADD CONSTRAINT "report_comment_id_comment_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."comment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_log_target_type_target_id_index" ON "audit_log" USING btree ("target_type","target_id");