CREATE EXTENSION IF NOT EXISTS vector;--> statement-breakpoint
CREATE TABLE "issue_embeddings" (
	"issue_id" uuid PRIMARY KEY NOT NULL,
	"org_id" uuid NOT NULL,
	"content" text NOT NULL,
	"content_hash" varchar(64) NOT NULL,
	"embedding" vector(384) NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "issue_embeddings" ADD CONSTRAINT "issue_embeddings_issue_id_issues_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."issues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue_embeddings" ADD CONSTRAINT "issue_embeddings_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "issue_embeddings_org_id_idx" ON "issue_embeddings" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "issue_embeddings_vec_idx" ON "issue_embeddings" USING hnsw ("embedding" vector_cosine_ops);