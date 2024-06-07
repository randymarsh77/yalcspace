import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import { spawnSync } from 'child_process';
import { parse } from 'shell-quote';
import { Project } from './types';

interface BuildOptions {
	includeUpstream: boolean;
	includeDownstream: boolean;
	pivot: Project;
	root: Project;
}

export function buildProject(options: BuildOptions) {
	const { root, pivot, includeUpstream, includeDownstream } = options;
	const queue = getBuildOrder(root);
	const upstreamDeps = getBuildOrder(pivot);
	for (const p of queue) {
		const isPivot = p.name === pivot.name;
		const buildThisProject =
			(includeUpstream && upstreamDeps.find((x) => x.name === p.name)) ||
			isPivot ||
			(includeDownstream && getBuildOrder(p).find((x) => x.name === pivot.name));

		if (buildThisProject) {
			const cwd = p.path;
			const { build, push } = getProjectSettings(root, p);
			console.log(`Building ${p.name}…`);
			runCommand(build, cwd);

			if (p.name !== root.name) {
				console.log(`Pushing ${p.name}…`);
				runCommand(push, cwd);
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

function getProjectSettings(root: Project, project: Project) {
	const settingsFile = path.join(
		os.homedir(),
		'.yalcspace',
		root.name,
		'yalcspace',
		'settings.json'
	);
	const settings = {
		build: 'yarn build',
		push: 'yalc push',
	};
	if (fs.existsSync(settingsFile)) {
		const overrides = JSON.parse(fs.readFileSync(settingsFile).toString())[project.name] ?? {};
		return { ...settings, ...overrides };
	}
	return settings;
}

function runCommand(command: string, cwd: string) {
	const commandAndArgs = parse(command);
	const processName = commandAndArgs.shift();
	if (!processName) {
		throw new Error(`Invalid command: ${command}`);
	}
	spawnSync(processName, commandAndArgs, { stdio: 'inherit', cwd });
}
