import { Project } from './types';

export function buildProject(project: Project) {
	const queue = getBuildOrder(project);
	for (const p of queue) {
		// TODO: Support building without using a workspace
		console.log(`Pretend build ${p}`);
	}
}

function getBuildOrder(project: Project, visited = new Set<string>()) {
	const queue: string[] = [];
	if (project.links.filter((p) => !visited.has(p.name)).length === 0) {
		queue.push(project.name);
		visited.add(project.name);
		return queue;
	}

	for (const p of project.links.filter((p) => !visited.has(p.name))) {
		queue.push(...getBuildOrder(p, visited));
	}

	queue.push(project.name);
	return queue;
}
