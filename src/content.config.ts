import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';

const blog = defineCollection({
	loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/blog' }),
	schema: ({ image }) =>
		z.object({
			title: z.string(),
			pubDate: z.coerce.date(),
			updatedDate: z.coerce.date().optional(),
			description: z.string(),
			tags: z.array(z.string()).default([]),
			draft: z.boolean().default(false),
			kicker: z.string().optional(),
			featured: z.boolean().default(false),
			kind: z.enum(['thought', 'project', 'update']).default('thought'),
			presentation: z.enum(['article', 'feature']).default('article'),
			cover: image().optional(),
		}),
});

export const collections = { blog };
