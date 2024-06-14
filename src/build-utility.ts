import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import { spawnSync } from 'child_process';
import { parse } from 'shell-quote';
import { log } from './logging';
import { PackageJson, Project } from './types';
import { traverseSpace } from './utility';

interface BuildOptions {
	includeUpstream: boolean;
	includeDownstream: boolean;
	pivot: Project;
	root: Project;
	pushAndPublishRoot: boolean;
}

export function buildProject(options: BuildOptions) {
	const { root, pivot, includeUpstream, includeDownstream, pushAndPublishRoot } = options;
	const upstreamDeps = getBuildOrder(pivot);
	let queue = getBuildOrder(root);
	if (!queue.find((p) => p.fullName === pivot.fullName)) {
		queue = [...upstreamDeps, ...queue];
	}
	queue = queue.reduce((acc, p) => {
		if (!acc.find((x) => x.fullName === p.fullName)) {
			acc.push(p);
		}
		return acc;
	}, [] as Project[]);
	log.debug('Build Queue: ', queue.map((p) => p.fullName).join(' -> '));
	for (const p of queue) {
		const isPivot = p.fullName === pivot.fullName;
		const buildThisProject =
			(includeUpstream && upstreamDeps.find((x) => x.fullName === p.fullName)) ||
			isPivot ||
			(includeDownstream && getBuildOrder(p).find((x) => x.fullName === pivot.fullName));

		if (buildThisProject) {
			fixInvalidYalcLinks(p);

			const cwd = p.path;
			const { build, publish, push, install } = getProjectSettings(root, p);
			log.debug(`Installing ${p.fullName}…`);
			runCommand(install, cwd);

			log.debug(`Building ${p.fullName} with '${build}'…`);
			runCommand(build, cwd);

			if (p.fullName !== root.fullName || pushAndPublishRoot) {
				log.debug(`Publishing ${p.fullName}…`);
				runCommand(publish, cwd);

				log.debug(`Pushing ${p.fullName}…`);
				runCommand(push, cwd);
			}
		}
	}
}

function getBuildOrder(project: Project, visited = new Set<string>()) {
	const queue: Project[] = [];
	if (project.links.filter((p) => !visited.has(p.fullName)).length === 0) {
		queue.push(project);
		visited.add(project.fullName);
		return queue;
	}

	for (const p of project.links.filter((p) => !visited.has(p.fullName))) {
		queue.push(...getBuildOrder(p, visited));
	}

	queue.push(project);
	return queue;
}

interface ProjectSettings {
	build: string;
	publish: string;
	push: string;
	install: string;
}

function getProjectSettings(root: Project, project: Project): ProjectSettings {
	const settingsFile = path.join(
		os.homedir(),
		'.yalcspace',
		root.nonScopedName,
		'yalcspace',
		'settings.json'
	);
	const settings = {
		build: 'yarn build',
		push: 'yalc push --sig',
		publish: 'yalc publish --sig',
		install: 'yarn --force',
	};
	if (fs.existsSync(settingsFile)) {
		const overrides = JSON.parse(fs.readFileSync(settingsFile).toString())[project.fullName] ?? {};
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
	const { status } = spawnSync(processName, commandAndArgs, { stdio: 'inherit', cwd });
	if (status !== 0) {
		throw new Error(`Command failed: ${command} | From: ${cwd}`);
	}
}

function fixInvalidYalcLinks(project: Project) {
	const yalcInstallationsPath = path.join(project.path, '.yalc');
	const installations = findAllPackageFiles(yalcInstallationsPath);
	for (const [_, { path: packagePath, content: pkg }] of Object.entries(installations)) {
		const linkedDeps = Object.entries({
			...(pkg.dependencies ?? {}),
			...(pkg.devDependencies ?? {}),
		})
			.filter(([_, version]) => version.startsWith('file:.yalc'))
			.map(([name, version]) => ({ name, version }));
		for (const { name, version } of linkedDeps) {
			log.debug(`Processing ${name} in ${pkg.name}`);
			// Validate the link
			const linkedPath = path.join(path.dirname(packagePath), version.replace('file:', ''));
			if (fs.existsSync(linkedPath)) {
				log.debug(`  ${linkedPath} is valid`);
				continue;
			}

			log.debug(`  Existing link does not exist: ${linkedPath}`);

			// Check for valid yalc install in this project first (that is the most valid / correct)
			const localInstallationPackagePath = path.join(
				yalcInstallationsPath,
				...name.split('/'),
				'package.json'
			);
			if (fs.existsSync(localInstallationPackagePath)) {
				log.debug(`  ${localInstallationPackagePath} exists. Replacing link.`);
				const newVersion = `file:${path.dirname(localInstallationPackagePath)}`;
				replacePackageVersion(packagePath, version, newVersion);
				continue;
			}

			log.debug(`  Local installation does not exist: ${localInstallationPackagePath}`);

			// If the installation is not found, check for the installation in the project that has it linked (it should be there)
			// TODO: This is a problem. If the current/local project has a link that this original project also has, then the original will link to the wrong one.
			//       We could recursively "fix" all .yalc links to prefer the current project's .yalc links at build time.
			//       e.g. linkedProject.path / .yalc /**/ package.json where file:.yalc remaps to yalcInstallationsPath if possible
			//       Then, when we yarn --force in the current project, we don't get any nested deps
			const linkedProject = traverseSpace(project).find((p) => p.fullName === pkg.name);
			if (!linkedProject) {
				console.error(
					'Traversal of the space failed to find the linked project.',
					pkg.name,
					JSON.stringify(project, null, 2)
				);
				throw new Error(`Project should be in the yalcspace: ${pkg.name}`);
			}
			const originalLinkPath = path.join(
				linkedProject.path,
				'.yalc',
				...name.split('/'),
				'package.json'
			);
			if (fs.existsSync(originalLinkPath)) {
				log.debug(`  ${originalLinkPath} exists. Replacing link.`);
				const newVersion = `file:${path.dirname(originalLinkPath)}`;
				replacePackageVersion(packagePath, version, newVersion);
				continue;
			}

			log.debug(`  Original installation does not exist: ${originalLinkPath}`);

			console.warn(`  Could not fix link for ${name} in ${pkg.name}`);
		}
	}
}

interface PackageMap {
	[packageName: string]: { path: string; content: PackageJson };
}

function findAllPackageFiles(root: string): PackageMap {
	const map: PackageMap = {};
	const queue = [root];
	while (queue.length > 0) {
		const root = queue.shift();
		if (!root) {
			throw new Error('queue was empty');
		}

		log.debug(`Checking ${root}...`);
		let files: string[] = [];
		try {
			// Ignore permissions errors
			files = fs.readdirSync(root);
		} catch (e) {
			continue;
		}

		for (const f of files) {
			const fullPath = path.join(root, f);
			log.trace(`  ${fullPath}`);
			const stat = fs.lstatSync(fullPath);
			if (stat.isDirectory()) {
				queue.push(fullPath);
			} else if (f === 'package.json') {
				const pkg = JSON.parse(fs.readFileSync(fullPath).toString());
				map[pkg.name] = { path: fullPath, content: pkg };
			}
		}
	}
	return map;
}

function replacePackageVersion(packagePath: string, oldVersion: string, newVersion: string) {
	const data = fs.readFileSync(packagePath, 'utf8');
	var replaced = data.replaceAll(oldVersion, newVersion);
	fs.writeFileSync(packagePath, replaced, 'utf8');
}
