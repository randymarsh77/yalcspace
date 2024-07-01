import * as fs from 'fs';
import * as path from 'path';
import { findProjectRoot } from './code-finder';
import { PackageJson, Project } from './types';

export function resolveProject(directory: string): Project {
	// Assume: You don't have circular references
	const pkg: PackageJson = JSON.parse(
		fs.readFileSync(path.join(directory, 'package.json')).toString()
	);
	const { links, allDependencies } = getDependencyInformationUsingPackageContents(pkg);
	const deps: Project[] = [];
	for (const link of links) {
		const linkPath = findProjectRoot(link);
		if (linkPath) {
			deps.push(resolveProject(linkPath));
		}
	}
	const nonScopedName = pkg.name.split('/').pop() || pkg.name;
	return { fullName: pkg.name, nonScopedName, path: directory, links: deps, allDependencies };
}

const yalcPrefix = `file:.yalc`;

export function getDependencyInformationUsingDirectory(directory: string) {
	const pkg: PackageJson = JSON.parse(
		fs.readFileSync(path.join(directory, 'package.json')).toString()
	);
	return getDependencyInformationUsingPackageContents(pkg);
}

function getDependencyInformationUsingPackageContents(pkg: PackageJson) {
	const links: string[] = [];
	const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
	for (const dep of Object.keys(allDeps)) {
		const version = allDeps[dep];
		if (version.startsWith(yalcPrefix)) {
			links.push(dep);
		}
	}
	return { links, allDependencies: Object.keys(allDeps) };
}

export function getProjectMap(project: Project) {
	const lookup = {
		[project.fullName]: project,
	};
	for (const p of project.links) {
		Object.assign(lookup, getProjectMap(p));
	}
	return lookup;
}
