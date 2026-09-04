export interface Project {
	name: string;
	tagline: string;
	description: string;
	role: string;
	year: string;
	tags: string[];
	url: string;
	featured?: boolean;
}

export const projects: Project[] = [
	{
		name: 'blog',
		tagline: '个人发布站',
		description: '基于 Astro 7 构建的高性能个人发布站，配备原生 Canvas 2D 光场 Hero 与富媒体发布系统。',
		role: 'Design & Engineering',
		year: '2026',
		tags: ['Astro', 'TypeScript', 'Canvas 2D', 'MDX'],
		url: 'https://github.com/xxkingstuggle/blog',
		featured: true,
	},
];
