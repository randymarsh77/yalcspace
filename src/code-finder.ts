import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { registerProjectLocation, invalidateProjectLocation, getProjectLocation } from './data';
import { log } from './logging';

const ignoreDirectories = new Set(['bin', 'obj', 'node_modules', '.yalc', '.yalcspace', '.Trash']);

export function findProjectRoot(packageName: string) {
	const cached = getProjectLocation(packageName);
	if (cached) {
		if (fs.existsSync(cached)) {
			return cached;
		}
		invalidateProjectLocation(packageName);
	}

	log.debug(`Resolving ${packageName}...`);
	return doFindProjectRoot(packageName);
}

function isDirectory(p: string) {
	try {
		return fs.statSync(p).isDirectory();
	} catch (e) {}
	return false;
}

function doFindProjectRoot(project: string) {
	// TODO: Check more parts of the filesystem
	// TODO: Avoid duplicates for case-sensitive filesystems
	const queue = [
		path.join(os.homedir(), 'Code'),
		path.join(os.homedir(), 'code'),
		path.join(os.homedir(), 'src'),
		path.join(os.homedir(), 'Source'),
		path.join(os.homedir(), 'source'),
		'C:\\Code',
		'C:\\code',
		'C:\\src',
		'C:\\Source',
		'C:\\source',
		os.homedir(),
		'C:\\',
	].filter(isDirectory);

	log.debug(`Searching for ${project} in ${queue.join(', ')}`);

	while (queue.length > 0) {
		const root = queue.shift();
		if (!root) {
			throw new Error('queue was empty');
		}

		log.trace(`Checking ${root}...`);
		try {
			// Ignore permissions errors
			const files = fs.readdirSync(root);
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
					// Index all code that is found
					registerProjectLocation(project, root);
					if (pkg.name === project) {
						return root;
					}
				}
			}
		} catch (e) {
			continue;
		}
	}
}
