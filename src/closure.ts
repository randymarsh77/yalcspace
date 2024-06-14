import * as fs from 'fs';
import * as path from 'path';
import { spawnSync } from 'child_process';
import * as yarnLock from '@yarnpkg/lockfile';
import { buildProject } from './build-utility';
import { findProjectRoot } from './code-finder';
import { resolveProject, getDependencyInformationUsingDirectory } from './project-utility';
import { log } from './logging';
import { Project } from './types';
import { traverseSpace } from './utility';

export async function closeAndCompleteSpace(root: Project) {
	// A yalcspace is "closed" when:
	// Any dependency of a project in the yalcspace that has a dependency on another in the yalcspace is also part of the yalcspace.
	// In order to compute the closed space, we need to get the set of every dependency path for each project in the yalcspace.
	// If X is a dependency of Y where Y is in the yalcspace, then add X to the yalcspace.
	// Repeat until no new dependencies are added.
	// Transitives are accounted for by this method.
	// Consider a partial space: { Root -> A, Root -> C } where A -> B and B -> C.
	// Closing the space requires we add B to the space and end up with at least { Root, A, B, C }.
	// In order to compute a dependency path, we can use node_modules and package.json files because it is a common denominator across various package managers and runtimes.
	// A lockfile implementation would likely be more efficient.

	const memo = {
		depInfo: parseDependencyInfo(root),
		builtAndPublished: new Set<string>(),
	};

	let spaceIsClosed = false;
	let iterations = 0;
	let result = root;
	while (!spaceIsClosed) {
		iterations++;
		console.log(`Attempting to close yalcspace; Iteration: ${iterations}`);
		spaceIsClosed = await tryCloseSpace(result, memo);
		result = resolveProject(root.path);
	}
	return completeSpace(result);
}

async function tryCloseSpace(
	root: Project,
	{ depInfo, builtAndPublished }: { depInfo: DependencyInformation; builtAndPublished: Set<string> }
) {
	const yalcspaceProjects = traverseSpace(root);
	const deps = new Set(yalcspaceProjects.map((p) => p.fullName));
	const additionalDeps = new Set<string>();
	log.debug(`Closing Yalcspace: ${[...deps].join(', ')}`);
	for (const dep of deps) {
		log.debug(`Checking ${dep}`);
		const paths = computeDependencyPaths(dep, root, depInfo);
		for (const path of paths) {
			log.debug(`  Path: ${path.join(' -> ')}`);
			let lastUpstream = dep;
			for (const pkg of path) {
				// Step 1: Find code
				const directory = findProjectRoot(pkg);
				if (!directory) {
					console.error(`Could not find code for ${pkg}`);
					console.error(`Cannot close yalcspace`);
					throw new Error('Missing code');
				}

				// Step 2: Locally link dep to pkg
				// Don't link a package to itself
				if (lastUpstream !== pkg) {
					spawnSync('yalc', ['add', lastUpstream], { stdio: 'inherit', cwd: directory });
				}

				if (!deps.has(pkg) && !additionalDeps.has(pkg)) {
					additionalDeps.add(pkg);
					// We're iterating in order of upstream to root, and adding as we go.
					// So, the current package has a dependency on 'dep', and we need to:
					// Find the code, "yalc add dep" and add it to the current package.
					// Build the project and "yalc publish"
					// We also need to do "yalc add" for all other deps in the yalc space where this is a dependency.
					// Probably safest to do a post-iteration step that checks all direct deps of all space deps and ensures that they are yalc'd

					// Step 3: Build and publish
					if (!builtAndPublished.has(pkg)) {
						const project = resolveProject(directory);
						await buildProject({
							includeDownstream: false,
							includeUpstream: false,
							pivot: project,
							root,
							pushAndPublishRoot: true,
						});
						builtAndPublished.add(pkg);
					}
				}
				lastUpstream = pkg;
			}
		}
	}
	log.debug(`Found additional dependencies: ${[...additionalDeps].join(', ')}`);
	return additionalDeps.size === 0;
}

// Computed from a lockfile or populated node_modules+package.json
interface DependencyInformation {
	// key is package, value is list of dependencies
	[key: string]: Set<string>;
}

function computeDependencyPaths(
	from: string,
	root: Project,
	memo: DependencyInformation,
	visited: Set<string> = new Set<string>()
): string[][] {
	if (visited.has(from)) {
		return [];
	}
	if (from === root.fullName) {
		return [[from]];
	}

	const allPackagesDependingOnFrom = getReverseDeps(from, memo);
	const extrapolated = allPackagesDependingOnFrom
		.filter((x) => !visited.has(x))
		.map((x) => computeDependencyPaths(x, root, memo, new Set([...visited, from])))
		.flat();
	return [...new Set(extrapolated.map((x) => x.join('|')))].map((x) => [from, ...x.split('|')]);
}

function getDirectDependencies(root: Project): string[] {
	return getDependencyInformationUsingDirectory(root.path).allDependencies;
}

function completeSpace(root: Project) {
	// A yalcspace is "complete" if every there is no non-linked dependency of any member of the yalcspace which is also in the yalcspace.
	// In order to compute the complete space, we need to:
	// 1. Get all elements of the yalcspace
	// 2. Ensure that none of the dependencies are in the yalcspace
	// 3. If they are, run 'yalc add'

	// Assume: root is a closed space.
	const yalcspaceProjects = traverseSpace(root);
	const yalcspaceDeps = new Set(yalcspaceProjects.map((p) => p.fullName));
	for (const project of traverseSpace(root)) {
		const deps = getDirectDependencies(project);
		for (const dep of deps) {
			if (yalcspaceDeps.has(dep) && !project.links.find((p) => p.fullName === dep)) {
				console.log(`Linking ${dep} to ${project.fullName}`);
				spawnSync('yalc', ['add', dep], { stdio: 'inherit', cwd: project.path });
			}
		}
	}

	return resolveProject(root.path);
}

function parseDependencyInfo(project: Project): DependencyInformation {
	if (fs.existsSync(path.join(project.path, 'yarn.lock'))) {
		return {
			[project.fullName]: new Set(project.allDependencies),
			...parseYarnLock(project),
		};
	}

	throw new Error('Unsupported package manager');
}

export function getReverseDeps(packageName: string, memo: DependencyInformation): string[] {
	const deps = new Set<string>();
	for (const key of Object.keys(memo)) {
		if (memo[key].has(packageName)) {
			deps.add(key);
		}
	}
	return [...deps];
}

export function parseYarnLock(project: Project): DependencyInformation {
	const lockfile = fs.readFileSync(path.join(project.path, 'yarn.lock')).toString();
	const json = yarnLock.parse(lockfile);
	const memo = {};
	for (const packageAndVersion of Object.keys(json.object)) {
		const [scope, rest] = packageAndVersion.split('/');
		const nonScoped = rest ?? scope;
		const [name] = nonScoped.split('@');
		const fullName = rest ? `${scope}/${name}` : name;
		memo[fullName] = memo[fullName] ?? new Set();
		Object.keys(json.object[packageAndVersion].dependencies ?? {}).forEach((dep) =>
			memo[fullName].add(dep)
		);
	}
	return memo;
}
