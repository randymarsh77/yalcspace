import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { log } from './logging';

export const dataDir = path.join(os.homedir(), '.yalcspace');
const lookup = getProjectLookup();

export function getProjectLocation(packageName: string) {
	return lookup[packageName];
}

export function invalidateProjectLocation(project: string) {
	delete lookup[project];
	const lookupPath = path.join(dataDir, 'lookup.json');
	fs.writeFileSync(lookupPath, JSON.stringify(lookup, null, 2));
}

export function registerProjectLocation(project: string, directory: string, overwrite: boolean) {
	if (!overwrite && lookup[project]) {
		log.debug(`Project ${project} already registered at ${lookup[project]}`);
	}

	log.debug(`Indexing location of ${project} at ${directory}`);
	lookup[project] = directory;
	const lookupPath = path.join(dataDir, 'lookup.json');
	fs.writeFileSync(lookupPath, JSON.stringify(lookup, null, 2));
}

function getProjectLookup() {
	const lookup = path.join(dataDir, 'lookup.json');
	if (!fs.existsSync(lookup)) {
		fs.mkdirSync(path.dirname(lookup), { recursive: true });
		fs.writeFileSync(lookup, JSON.stringify({}));
	}
	return JSON.parse(fs.readFileSync(lookup).toString());
}
