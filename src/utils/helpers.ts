import fs from 'fs';
import path, { posix } from 'path';

const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' });

export function chunk<T>(array: T[], size: number): T[][] {
	const out: T[][] = [];

	for (let i = 0; i < array.length; i += size) {
		out.push(array.slice(i, i + size));
	}

	return out;
}

export async function getFilePaths(
	dir: string,
	ext: string | string[],
	baseDir: string = process.cwd(),
	visited = new Set<string>(),
	_extsLower?: string[]
): Promise<string[]> {
	baseDir = path.resolve(baseDir);
	dir = path.resolve(baseDir, dir);

	let resolvedDir: string;
	try {
		resolvedDir = await fs.promises.realpath(dir);
	} catch {
		resolvedDir = dir;
	}

	let results: string[] = [];

	if (visited.has(resolvedDir)) return results;
	visited.add(resolvedDir);

	let files: fs.Dirent[];

	try {
		files = await fs.promises.readdir(dir, { withFileTypes: true });
	} catch {
		return results;
	}

	const exts = Array.isArray(ext) ? ext : [ext];
	const extsLower = _extsLower ?? exts.map((e) => (e.startsWith('.') ? e : `.${e}`).toLowerCase());

	const subdirPromises: Promise<string[]>[] = [];

	for (const dirent of files) {
		if (dirent.name.startsWith('.') || dirent.name === 'node_modules') continue;

		const filePath = path.join(dir, dirent.name);
		const lowerName = dirent.name.toLowerCase();

		if (dirent.isDirectory())
			subdirPromises.push(getFilePaths(filePath, ext, baseDir, visited, extsLower));
		else if (dirent.isFile() && extsLower.some((e) => lowerName.endsWith(e)))
			results.push(path.relative(baseDir, filePath));
	}

	const nested = await Promise.all(subdirPromises);
	for (const nestedResults of nested) results.push(...nestedResults);

	return results.map((p) => posix.normalize(p)).sort();
}

export function truncate(text: string, length: number, end = '...'): string {
	if (length <= 0) return '';

	const textGraphemes = Array.from(segmenter.segment(text));
	const endGraphemes = Array.from(segmenter.segment(end));

	if (textGraphemes.length <= length) return text;

	if (endGraphemes.length >= length) return textGraphemes.slice(0, length).join('');

	return `${textGraphemes.slice(0, length - endGraphemes.length).join('')}${end}`;
}
