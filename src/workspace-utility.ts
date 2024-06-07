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
		settings: {
			'cSpell.words': ['yalcspace'],
		},
		tasks: {
			version: '2.0.0',
			inputs: [
				{
					type: 'pickString',
					id: 'mode',
					description: 'Build mode',
					options: ['Single', 'IncludeDownstreamDependents', 'Everything'],
					default: 'Single',
				},
			],
			tasks: projectList.map((p) => {
				const { name, path } = projects[p];
				return {
					label: `Build ${name}`,
					command: 'npx',
					args: ['yalcspace', 'build', '--mode', '${input:mode}', '--root', root.path],
					options: {
						cwd: path,
					},
					...taskDefaults,
				};
			}),
		},
	};
	return JSON.stringify(workspace, null, 2);
}
