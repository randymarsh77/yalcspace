import { type Project } from './types';

export function traverseSpace(root: Project): Project[] {
	const elements: Project[] = [];
	const queue = [root];
	const visited = new Set<string>();
	while (queue.length > 0) {
		const current = queue.shift();
		if (!current) {
			throw new Error('queue was empty');
		}
		if (visited.has(current.fullName)) {
			continue;
		}
		visited.add(current.fullName);
		elements.push(current);
		queue.push(...current.links);
	}
	return elements;
}
