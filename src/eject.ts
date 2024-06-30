import { runCommand } from './compatibility';
import { log } from './logging';
import { Project } from './types';
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
