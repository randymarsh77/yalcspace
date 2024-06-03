import * as fs from 'fs';
import * as path from 'path';
import { getLinkDirectory } from './code-finder';
import { PackageJson, Project } from './types';

export function resolveProject(directory: string, resolutions = new Set<string>()): Project {
	resolutions.add(directory);
	const pkg: PackageJson = JSON.parse(
		fs.readFileSync(path.join(directory, 'package.json')).toString()
	);
	const links = getLocalLinks(pkg);
	const deps: Project[] = [];
	for (const link of links) {
		const linkPath = getLinkDirectory(link);
		if (linkPath && !resolutions.has(linkPath)) {
			deps.push(resolveProject(linkPath, resolutions));
		}
	}
	const name = pkg.name.split('/').pop() || pkg.name;
	return { name, path: directory, links: deps };
}

const yalcPrefix = 'file:.yalc/';

function getLocalLinks(pkg: PackageJson) {
	const links: string[] = [];
	const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
	for (const dep of Object.keys(allDeps)) {
		const version = allDeps[dep];
		if (version.startsWith(yalcPrefix)) {
			links.push(dep);
		}
	}
	return links;
}

export function getProjectMap(project: Project) {
	const lookup = {
		[project.name]: project,
	};
	for (const p of project.links) {
		Object.assign(lookup, getProjectMap(p));
	}
	return lookup;
}
