import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { registerProjectLocation, getProjectLocation } from './data';
import { log } from './logging';

const ignoreDirectories = new Set(['bin', 'obj', 'node_modules', '.yalc', '.yalcspace', '.Trash']);

export function getLinkDirectory(packageName: string) {
	const cached = getProjectLocation(packageName);

	log.debug(`Resolving ${packageName}...`);
	return findProjectRoot(packageName);
}

export function findProjectRoot(project: string) {
	// TODO: Check more parts of the filesystem
	const sourceRoot = os.homedir();

	const queue = [sourceRoot];
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
				if (ignoreDirectories.has(f)) {
					continue;
				}
				if (f.endsWith('.app')) {
					// Skip macOS app bundles
					continue;
				}
				if (f === '.git') {
					// TODO: actual optimization
					// Assume most source code is in one fs subtree
					// Switch to depth first for this node's parent, process down to each .git containing directory, re-process the full parent in case there was nesting skipped by breadth-first
					// Optimizes finding `source/very/deeply/nested/targetProject` by skipping `other/level/**/irrelevant` when `other` is ordered before `source` in breadth-first
					continue;
				}

				queue.push(fullPath);
			} else if (f === 'package.json') {
				const pkg = JSON.parse(fs.readFileSync(fullPath).toString());
				if (pkg.name === project) {
					registerProjectLocation(project, root);
					return root;
				}
			}
		}
	}
}
