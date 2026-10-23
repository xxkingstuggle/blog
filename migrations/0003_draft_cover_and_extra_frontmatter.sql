-- Preserve cover path and extra frontmatter fields when editing existing repository articles.

ALTER TABLE drafts ADD COLUMN cover TEXT;
ALTER TABLE drafts ADD COLUMN extra_frontmatter_json TEXT NOT NULL DEFAULT '{}';
