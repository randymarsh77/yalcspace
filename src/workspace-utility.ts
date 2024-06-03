import * as os from 'os';
import * as path from 'path';
import { Project } from './types';
import { getProjectMap } from './project-utility';

const taskDefaults = {
	type: 'shell',
	group: 'build',
	problemMatcher: ['$tsc'],
	presentation: {
		clear: true,
	},
};

export function generateWorkspace(root: Project): string {
	const projects = getProjectMap(root);
	const projectList = Object.keys(projects).sort();
	const workspaceDir = path.join(os.homedir(), '.yalcspace', root.name, 'yalcspace');
	const workspace = {
		folders: [{ path: workspaceDir }, ...projectList.map((p) => ({ path: projects[p].path }))],
		settings: {},
		tasks: {
			version: '2.0.0',
			tasks: projectList.map((p) => {
				const { name, links } = projects[p];
				return {
					label: `Build ${name}`,
					dependsOn: links.map((l) => `Build ${l.name}`),
					command: 'yarn build && yalc push',
					options: {
						cwd: p,
					},
					...taskDefaults,
				};
			}),
		},
	};
	return JSON.stringify(workspace, null, 2);
}
