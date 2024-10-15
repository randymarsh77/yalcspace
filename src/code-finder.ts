import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { registerProjectLocation, invalidateProjectLocation, getProjectLocation } from './data';
import { log } from './logging';
import { prompt } from './prompt-utility';

const ignoreDirectories = new Set([
	'bin',
	'obj',
	'node_modules',
	'bower_components',
	'.yalc',
	'.yalcspace',
	'.Trash',
]);

export async function findProjectRoot(packageName: string) {
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

async function doFindProjectRoot(project: string) {
	const searched = new Set<string>();
	const willSearch = new Set<string>();
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

	const promptBeforePaths = [os.homedir(), 'C:\\'].filter((x) => x && isDirectory(x));

	log.debug(`Searching for ${project} in ${queue.join(', ')}`);

	let queueDirty = true;
	let nextPathDepth = 7;
	while (queue.length > 0) {
		if (queueDirty) {
			// Resort before next iteration
			queue.sort((a, b) => {
				const deprioritizeA = a ? promptBeforePaths.includes(a) : false;
				const deprioritizeB = b ? promptBeforePaths.includes(b) : false;
				if (deprioritizeA !== deprioritizeB) {
					return deprioritizeA ? 1 : -1;
				}
				const lengthA = a?.split(path.sep).length ?? 0;
				const lengthB = b?.split(path.sep).length ?? 0;
				if (lengthA !== lengthB) {
					return lengthA > lengthB ? 1 : -1;
				}
				return 0;
			});
			queueDirty = false;
		}

		const root = queue.shift();
		if (!root) {
			throw new Error('queue was empty');
		}

		if (searched.has(root)) {
			continue;
		}

		if (root.split(path.sep).length > nextPathDepth) {
			const choice = await prompt(
				`Code for ${project} not found in paths with a length of ${nextPathDepth} or less, what should I do?`,
				[
					'Assume you just cloned the code after reading this and restart my search',
					'Keep searching in',
					'Give up',
				]
			);
			if (choice === 0) {
				return await doFindProjectRoot(project);
			} else if (choice === 1) {
				nextPathDepth += 1;
			} else if (choice === 2) {
				console.error(`Could not find code for ${project}`);
				process.exit(1);
			}
		}

		if (promptBeforePaths.find((p) => p.startsWith(root))) {
			const choice = await prompt(
				`Code for ${project} not found in common locations, what should I do?`,
				[
					'Assume you just cloned the code after reading this and restart my search',
					`Keep searching in ${root}`,
					'Give up',
				]
			);
			if (choice === 0) {
				return await doFindProjectRoot(project);
			} else if (choice === 2) {
				console.error(`Could not find code for ${project}`);
				process.exit(1);
			}
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
					if (f.endsWith('.xcassets')) {
						// Skip XCAssets
						continue;
					}
					if (f === '.git') {
						// TODO: actual optimization
						// Assume most source code is in one fs subtree
						// Switch to depth first for this node's parent, process down to each .git containing directory, re-process the full parent in case there was nesting skipped by breadth-first
						// Optimizes finding `source/very/deeply/nested/targetProject` by skipping `other/level/**/irrelevant` when `other` is ordered before `source` in breadth-first
						continue;
					}

					if (!willSearch.has(fullPath)) {
						willSearch.add(fullPath);
						queue.push(fullPath);
						queueDirty = true;
					}
				} else if (f === 'package.json') {
					const pkg = JSON.parse(fs.readFileSync(fullPath).toString());
					// Index all code that is found
					log.debug(`Found ${pkg.name} at ${root}`);
					registerProjectLocation(pkg.name, root, false);
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
