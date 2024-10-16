import { runCommand } from './compatibility';
import { log } from './logging';
import { type Project } from './types';
import { traverseSpace } from './utility';

export function eject(packageName: string, root: Project) {
	log.info(`Ejecting ${packageName} from ${root.fullName}…`);
	for (const project of traverseSpace(root)) {
		log.info(`Processing ${project.fullName}…`);
		if (project.fullName === packageName) {
			continue;
		}
		log.info(project.links.map((x) => x.fullName).join(', '));
		if (project.links.find((x) => x.fullName === packageName)) {
			log.info(`Ejecting ${packageName} from ${project.fullName}…`);
			runCommand('yalc', ['remove', packageName], { cwd: project.path });
		}
	}
}

export function ejectAll(root: Project) {
	log.info(`Ejecting all packages from ${root.fullName}…`);
	for (const project of traverseSpace(root)) {
		if (project.fullName !== root.fullName) {
			eject(project.fullName, root);
		}
	}
}
