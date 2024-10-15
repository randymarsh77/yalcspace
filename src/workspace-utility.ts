import * as os from 'os';
import * as path from 'path';
import { type Project, type KnownEnvVars } from './types';
import { getProjectMap } from './project-utility';
import { getLoggingConfiguration } from './logging';

const taskDefaults = {
	type: 'shell',
	group: 'build',
	problemMatcher: ['$tsc'],
	presentation: {
		clear: true,
	},
};

// For local debugging: Change command to `node` and arg1 to an absolute path to `./dist/cli.js`
const command = 'npx';
const arg1 = 'yalcspace';

export function generateWorkspace(root: Project): string {
	const { debug, trace } = getLoggingConfiguration();
	const additionalOptions = { env: {} as KnownEnvVars };
	if (debug) {
		additionalOptions.env.DEBUG = 'true';
	}
	if (trace) {
		additionalOptions.env.TRACE = 'true';
	}
	const projects = getProjectMap(root);
	const projectList = Object.keys(projects).sort();
	const workspaceDir = path.join(os.homedir(), '.yalcspace', root.nonScopedName, 'yalcspace');
	const workspace = {
		folders: [{ path: workspaceDir }, ...projectList.map((p) => ({ path: projects[p].path }))],
		settings: {
			'cSpell.words': ['yalcspace', 'yalc'],
		},
		tasks: {
			version: '2.0.0',
			inputs: [
				{
					type: 'pickString',
					id: 'mode',
					description: 'Build mode',
					options: ['IncludeDownstreamDependents', 'Single', 'Everything'],
					default: 'IncludeDownstreamDependents',
				},
				{
					type: 'pickString',
					id: 'modeRoot',
					description: 'Build mode',
					options: ['Single', 'Everything'],
					default: 'Single',
				},
				{
					type: 'pickString',
					id: 'package',
					description: 'Package name',
					options: projectList.map((p) => projects[p].fullName),
				},
			],
			tasks: [
				{
					label: `Complete Yalcspace`,
					command,
					args: [arg1, 'complete', '--debug'],
					options: {
						cwd: root.path,
						...additionalOptions,
					},
					...taskDefaults,
				},
				{
					label: `Regenerate Yalcspace`,
					command,
					args: [arg1],
					options: {
						cwd: root.path,
						...additionalOptions,
					},
					...taskDefaults,
				},
				{
					label: `Eject Package`,
					command,
					args: [arg1, 'eject', '--pkg', '${input:package}'],
					options: {
						cwd: root.path,
						...additionalOptions,
					},
					...taskDefaults,
				},
				{
					label: `Eject All`,
					command,
					args: [arg1, 'eject', '--all'],
					options: {
						cwd: root.path,
						...additionalOptions,
					},
					...taskDefaults,
				},
				{
					label: 'Build Everything',
					command,
					args: [arg1, 'build', '--mode', 'Everything', '--root', root.path],
					options: {
						cwd: root.path,
						...additionalOptions,
					},
					...taskDefaults,
				},
				...projectList.map((p) => {
					const { nonScopedName, path } = projects[p];
					const isRoot = path === root.path;
					return {
						label: `Build ${nonScopedName}`,
						command,
						args: [
							arg1,
							'build',
							'--mode',
							isRoot ? '${input:modeRoot}' : '${input:mode}',
							'--root',
							root.path,
						],
						options: {
							cwd: path,
							...additionalOptions,
						},
						...taskDefaults,
					};
				}),
			],
		},
	};
	return JSON.stringify(workspace, null, 2);
}
