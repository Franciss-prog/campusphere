CREATE TYPE "public"."category_type" AS ENUM('blog', 'concern');--> statement-breakpoint
CREATE TYPE "public"."concern_kind" AS ENUM('concern', 'recommendation');--> statement-breakpoint
CREATE TYPE "public"."concern_status" AS ENUM('submitted', 'under_review', 'in_discussion', 'action_planned', 'in_progress', 'resolved', 'closed');--> statement-breakpoint
CREATE TYPE "public"."parent_type" AS ENUM('post', 'concern', 'proposal');--> statement-breakpoint
CREATE TYPE "public"."report_status" AS ENUM('open', 'actioned', 'dismissed');--> statement-breakpoint
CREATE TYPE "public"."staff_role" AS ENUM('ADMIN', 'MODERATOR');--> statement-breakpoint
CREATE TYPE "public"."target_type" AS ENUM('post', 'concern', 'proposal', 'comment');--> statement-breakpoint
CREATE TYPE "public"."visibility" AS ENUM('published', 'pending', 'hidden');--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "audit_log_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"staff_id" integer,
	"action" text NOT NULL,
	"target_type" text,
	"target_id" integer,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "category" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "category_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"type" "category_type" NOT NULL,
	"description" text,
	"sort" integer DEFAULT 0 NOT NULL,
	"is_fallback" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "comment" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "comment_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"parent_type" "parent_type" NOT NULL,
	"parent_id" integer NOT NULL,
	"parent_comment_id" integer,
	"body" text NOT NULL,
	"anon_label_seed" text NOT NULL,
	"visibility" "visibility" DEFAULT 'published' NOT NULL,
	"author_token_hash" text,
	"staff_author_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "concern" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "concern_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"kind" "concern_kind" DEFAULT 'concern' NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"category_id" integer,
	"location" text,
	"images" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"current_status" "concern_status" DEFAULT 'submitted' NOT NULL,
	"is_sensitive" boolean DEFAULT false NOT NULL,
	"visibility" "visibility" DEFAULT 'published' NOT NULL,
	"support_count" integer DEFAULT 0 NOT NULL,
	"comment_count" integer DEFAULT 0 NOT NULL,
	"proposal_count" integer DEFAULT 0 NOT NULL,
	"author_token_hash" text,
	"source" text DEFAULT 'anonymous' NOT NULL,
	"search" "tsvector" GENERATED ALWAYS AS (setweight(to_tsvector('english', coalesce("concern"."title", '')), 'A') || setweight(to_tsvector('english', coalesce("concern"."location", '')), 'B') || setweight(to_tsvector('english', coalesce("concern"."description", '')), 'C')) STORED,
	"status_changed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "concern_support" (
	"concern_id" integer NOT NULL,
	"token_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "concern_support_concern_id_token_hash_pk" PRIMARY KEY("concern_id","token_hash")
);
--> statement-breakpoint
CREATE TABLE "concern_tag" (
	"concern_id" integer NOT NULL,
	"tag_id" integer NOT NULL,
	CONSTRAINT "concern_tag_concern_id_tag_id_pk" PRIMARY KEY("concern_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "post" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "post_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"excerpt" text DEFAULT '' NOT NULL,
	"body_md" text NOT NULL,
	"body_html" text NOT NULL,
	"cover_image" text,
	"category_id" integer,
	"is_official" boolean DEFAULT false NOT NULL,
	"is_pinned" boolean DEFAULT false NOT NULL,
	"status" "visibility" DEFAULT 'published' NOT NULL,
	"author_token_hash" text,
	"staff_author_id" integer,
	"like_count" integer DEFAULT 0 NOT NULL,
	"comment_count" integer DEFAULT 0 NOT NULL,
	"source" text DEFAULT 'anonymous' NOT NULL,
	"search" "tsvector" GENERATED ALWAYS AS (setweight(to_tsvector('english', coalesce("post"."title", '')), 'A') || setweight(to_tsvector('english', coalesce("post"."excerpt", '')), 'B') || setweight(to_tsvector('english', coalesce("post"."body_md", '')), 'C')) STORED,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "post_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "post_tag" (
	"post_id" integer NOT NULL,
	"tag_id" integer NOT NULL,
	CONSTRAINT "post_tag_post_id_tag_id_pk" PRIMARY KEY("post_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "proposal" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "proposal_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"concern_id" integer NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"feasibility_notes" text,
	"support_count" integer DEFAULT 0 NOT NULL,
	"comment_count" integer DEFAULT 0 NOT NULL,
	"visibility" "visibility" DEFAULT 'published' NOT NULL,
	"author_token_hash" text,
	"source" text DEFAULT 'anonymous' NOT NULL,
	"search" "tsvector" GENERATED ALWAYS AS (setweight(to_tsvector('english', coalesce("proposal"."title", '')), 'A') || setweight(to_tsvector('english', coalesce("proposal"."description", '')), 'C')) STORED,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "proposal_support" (
	"proposal_id" integer NOT NULL,
	"token_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "proposal_support_proposal_id_token_hash_pk" PRIMARY KEY("proposal_id","token_hash")
);
--> statement-breakpoint
CREATE TABLE "rate_limit" (
	"key" text NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "rate_limit_key_window_start_pk" PRIMARY KEY("key","window_start")
);
--> statement-breakpoint
CREATE TABLE "reaction" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "reaction_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"target_type" "target_type" NOT NULL,
	"target_id" integer NOT NULL,
	"type" text DEFAULT 'like' NOT NULL,
	"token_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "report" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "report_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"target_type" "target_type" NOT NULL,
	"target_id" integer NOT NULL,
	"reason" text NOT NULL,
	"details" text,
	"status" "report_status" DEFAULT 'open' NOT NULL,
	"reporter_token_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_by_id" integer,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "setting" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	CONSTRAINT "setting_key_nonempty" CHECK (length("setting"."key") > 0)
);
--> statement-breakpoint
CREATE TABLE "staff_session" (
	"id" text PRIMARY KEY NOT NULL,
	"staff_id" integer NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "staff_user" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "staff_user_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" "staff_role" DEFAULT 'MODERATOR' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_login_at" timestamp with time zone,
	"disabled_at" timestamp with time zone,
	CONSTRAINT "staff_user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "status_history" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "status_history_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"concern_id" integer NOT NULL,
	"status" "concern_status" NOT NULL,
	"public_note" text,
	"changed_by_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tag" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "tag_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"slug" text NOT NULL,
	CONSTRAINT "tag_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_staff_id_staff_user_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comment" ADD CONSTRAINT "comment_staff_author_id_staff_user_id_fk" FOREIGN KEY ("staff_author_id") REFERENCES "public"."staff_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "concern" ADD CONSTRAINT "concern_category_id_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."category"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "concern_support" ADD CONSTRAINT "concern_support_concern_id_concern_id_fk" FOREIGN KEY ("concern_id") REFERENCES "public"."concern"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "concern_tag" ADD CONSTRAINT "concern_tag_concern_id_concern_id_fk" FOREIGN KEY ("concern_id") REFERENCES "public"."concern"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "concern_tag" ADD CONSTRAINT "concern_tag_tag_id_tag_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tag"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post" ADD CONSTRAINT "post_category_id_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."category"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post" ADD CONSTRAINT "post_staff_author_id_staff_user_id_fk" FOREIGN KEY ("staff_author_id") REFERENCES "public"."staff_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_tag" ADD CONSTRAINT "post_tag_post_id_post_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."post"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_tag" ADD CONSTRAINT "post_tag_tag_id_tag_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tag"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposal" ADD CONSTRAINT "proposal_concern_id_concern_id_fk" FOREIGN KEY ("concern_id") REFERENCES "public"."concern"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposal_support" ADD CONSTRAINT "proposal_support_proposal_id_proposal_id_fk" FOREIGN KEY ("proposal_id") REFERENCES "public"."proposal"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report" ADD CONSTRAINT "report_resolved_by_id_staff_user_id_fk" FOREIGN KEY ("resolved_by_id") REFERENCES "public"."staff_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_session" ADD CONSTRAINT "staff_session_staff_id_staff_user_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "status_history" ADD CONSTRAINT "status_history_concern_id_concern_id_fk" FOREIGN KEY ("concern_id") REFERENCES "public"."concern"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "status_history" ADD CONSTRAINT "status_history_changed_by_id_staff_user_id_fk" FOREIGN KEY ("changed_by_id") REFERENCES "public"."staff_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_log_created_at_index" ON "audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "category_type_slug_index" ON "category" USING btree ("type","slug");--> statement-breakpoint
CREATE INDEX "comment_parent_type_parent_id_created_at_index" ON "comment" USING btree ("parent_type","parent_id","created_at");--> statement-breakpoint
CREATE INDEX "comment_parent_comment_id_index" ON "comment" USING btree ("parent_comment_id");--> statement-breakpoint
CREATE INDEX "concern_visibility_kind_current_status_index" ON "concern" USING btree ("visibility","kind","current_status");--> statement-breakpoint
CREATE INDEX "concern_category_id_index" ON "concern" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "concern_created_at_index" ON "concern" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "concern_support_count_index" ON "concern" USING btree ("support_count");--> statement-breakpoint
CREATE INDEX "concern_search_idx" ON "concern" USING gin ("search");--> statement-breakpoint
CREATE INDEX "concern_tag_tag_id_index" ON "concern_tag" USING btree ("tag_id");--> statement-breakpoint
CREATE INDEX "post_status_created_at_index" ON "post" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "post_category_id_index" ON "post" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "post_search_idx" ON "post" USING gin ("search");--> statement-breakpoint
CREATE INDEX "post_tag_tag_id_index" ON "post_tag" USING btree ("tag_id");--> statement-breakpoint
CREATE INDEX "proposal_concern_id_index" ON "proposal" USING btree ("concern_id");--> statement-breakpoint
CREATE INDEX "proposal_visibility_support_count_index" ON "proposal" USING btree ("visibility","support_count");--> statement-breakpoint
CREATE INDEX "proposal_search_idx" ON "proposal" USING gin ("search");--> statement-breakpoint
CREATE INDEX "rate_limit_window_start_index" ON "rate_limit" USING btree ("window_start");--> statement-breakpoint
CREATE UNIQUE INDEX "reaction_target_type_target_id_type_token_hash_index" ON "reaction" USING btree ("target_type","target_id","type","token_hash");--> statement-breakpoint
CREATE INDEX "report_status_target_type_target_id_index" ON "report" USING btree ("status","target_type","target_id");--> statement-breakpoint
CREATE UNIQUE INDEX "report_one_open_per_reporter" ON "report" USING btree ("target_type","target_id","reporter_token_hash") WHERE "report"."status" = 'open';--> statement-breakpoint
CREATE INDEX "staff_session_staff_id_index" ON "staff_session" USING btree ("staff_id");--> statement-breakpoint
CREATE INDEX "status_history_concern_id_created_at_index" ON "status_history" USING btree ("concern_id","created_at");