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
	const searched = new Set<string>();
	const currentLocations = process
		.cwd()
		.split(path.sep)
		.reduce<string[]>((acc, v) => {
			const last = acc[acc.length - 1];
			const newPath = last ? path.join(last, v) : v;
			return [...acc, newPath];
		}, []);
	const caseSensitive = fsIsCaseSensitive();
	const queue = [
		...currentLocations,
		caseSensitive ? path.join(os.homedir(), 'Code') : null,
		path.join(os.homedir(), 'code'),
		caseSensitive ? path.join(os.homedir(), 'Src') : null,
		path.join(os.homedir(), 'src'),
		caseSensitive ? path.join(os.homedir(), 'Source') : null,
		path.join(os.homedir(), 'source'),
		caseSensitive ? 'C:\\Code' : null,
		'C:\\code',
		'C:\\src',
		caseSensitive ? 'C:\\Source' : null,
		'C:\\source',
		os.homedir(),
		'C:\\',
	].filter((x) => x && isDirectory(x));

	log.debug(`Searching for ${project} in ${queue.join(', ')}`);

	while (queue.length > 0) {
		const root = queue.shift();
		if (!root) {
			throw new Error('queue was empty');
		}

		if (searched.has(root)) {
			continue;
		}

		log.trace(`Checking ${root}...`);
		searched.add(root);

		let files: string[] = [];
		try {
			files = fs.readdirSync(root);
		} catch (e) {
			// Ignore permissions errors
			continue;
		}

		for (const f of files) {
			const fullPath = path.join(root, f);
			log.trace(`  ${fullPath}`);
			try {
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
			} catch (e) {
				// Ignore permissions errors
				continue;
			}
		}
	}
}

function fsIsCaseSensitive() {
	const testName = 'tEsTcaseSensitive';
	const tmpdir = os.tmpdir();
	const testPath = path.join(tmpdir, testName.toLowerCase());
	try {
		fs.mkdirSync(testPath);
		try {
			fs.statSync(path.join(tmpdir, testName));
		} catch (e) {
			return true;
		}
	} finally {
		fs.rmdirSync(testPath);
	}
	return false;
}
