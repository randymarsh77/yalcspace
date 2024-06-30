import { runCommand } from './compatibility';
import { Project } from './types';
import { traverseSpace } from './utility';

export function eject(packageName: string, root: Project) {
	console.log(`Ejecting ${packageName} from ${root.fullName}…`);
	for (const project of traverseSpace(root)) {
		console.log(`Processing ${project.fullName}…`);
		if (project.fullName === packageName) {
			continue;
		}
		console.log(project.links.map((x) => x.fullName).join(', '));
		if (project.links.find((x) => x.fullName === packageName)) {
			console.log(`Ejecting ${packageName} from ${project.fullName}…`);
			runCommand('yalc', ['remove', packageName], { cwd: project.path });
		}
	}
}
