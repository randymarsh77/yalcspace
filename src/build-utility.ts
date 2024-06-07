import { spawnSync } from 'child_process';
import { Project } from './types';

interface BuildOptions {
	includeUpstream: boolean;
	includeDownstream: boolean;
	pivot: string;
	root: Project;
}

export function buildProject(options: BuildOptions) {
	const { root, pivot, includeUpstream, includeDownstream } = options;
	const queue = getBuildOrder(root);
	let hasSeenPivot = false;
	for (const p of queue) {
		const isPivot = p.name === pivot;
		const buildThisProject = includeUpstream || isPivot || (hasSeenPivot && includeDownstream);
		if (isPivot) {
			hasSeenPivot = true;
		}

		if (buildThisProject) {
			const cwd = p.path;
			console.log(`Building ${p.name}…`);
			runCommand(getBuildCommand(p), cwd);

			if (p.name !== root.name) {
				console.log(`Pushing ${p.name}…`);
				runCommand(getPushCommand(p), cwd);
			}
		}
	}
}

function getBuildOrder(project: Project, visited = new Set<string>()) {
	const queue: Project[] = [];
	if (project.links.filter((p) => !visited.has(p.name)).length === 0) {
		queue.push(project);
		visited.add(project.name);
		return queue;
	}

	for (const p of project.links.filter((p) => !visited.has(p.name))) {
		queue.push(...getBuildOrder(p, visited));
	}

	queue.push(project);
	return queue;
}

function getBuildCommand(project: Project) {
	return 'yarn build';
}

function getPushCommand(project: Project) {
	return 'yalc push';
}

function runCommand(command: string, cwd: string) {
	const commandAndArgs = command.split(' ');
	const processName = commandAndArgs.shift();
	if (!processName) {
		throw new Error(`Invalid command: ${command}`);
	}
	spawnSync(processName, commandAndArgs, { stdio: 'inherit', cwd });
}
