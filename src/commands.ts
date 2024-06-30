import * as fs from 'fs';
import * as path from 'path';
import { dataDir } from './data';
import { buildProject } from './build-utility';
import { closeAndCompleteSpace } from './closure';
import { runCommand } from './compatibility';
import { eject } from './eject';
import { resolveProject } from './project-utility';
import { generateWorkspace } from './workspace-utility';
import { ICommand } from '@simple-cli/base';

const name = 'null';
const summary = 'Generate and open a VSCode workspace for the current project';

interface IEjectOptions {
	pkg: string;
}

export const commands: ICommand<any>[] = [
	{
		name,
		summary,
		definitions: [],
		usage: [
			{
				header: `yalcspace`,
				content: summary,
			},
			{
				header: 'Synopsis',
				content: `$ yalcspace <options>`,
			},
		],
		execute: async () => await generateAndOpenWorkspace(),
	},
	{
		name: 'build',
		summary: 'Build one or more projects',
		definitions: [
			{
				name: 'mode',
				type: String,
				description: `
Build mode:
  - Single: Only build the specified project
  - IncludeDownstreamDependents: Build the specified project and any projects that depend on it
  - Everything: Build upstream and downstream dependents of the specified project along with the project itself
				`
					.trimStart()
					.trimEnd(),
			},
			{
				name: 'root',
				type: String,
				description: 'The yalcspace root. Project in current directory if not specified.',
			},
		],
		usage: [],
		execute: build,
	},
	{
		name: 'complete',
		summary: `
Closes and completes the yalcspace.
A yalcspace is "closed" when, for each project in the yalcspace, all dependencies of the project that have a dependency on a project in the yalcspace are also themselves part of the yalcspace.
A yalcspace is "complete" when every project in the yalcspace that has a dependency on another project in the yalcspace, the dependency is yalc'd.
`.trim(),
		definitions: [],
		usage: [],
		execute: async () => {
			await closeAndCompleteSpace(resolveProject(process.cwd()));
			await generateAndOpenWorkspace();
			return {
				code: 0,
			};
		},
	},
	{
		name: 'eject',
		summary: 'Remove a package from the yalcspace',
		definitions: [
			{
				name: 'pkg',
				type: String,
				description: 'The package to remove.',
			},
		],
		usage: [],
		execute: async ({ options }) => {
			const { pkg } = options as IEjectOptions;
			await eject(pkg, resolveProject(process.cwd()));
			await generateAndOpenWorkspace();
			return {
				code: 0,
			};
		},
	},
];

async function generateAndOpenWorkspace(root: string = process.cwd()) {
	const project = resolveProject(root);
	const workspace = generateWorkspace(project);

	const workspacePath = path.join(
		dataDir,
		project.nonScopedName,
		'yalcspace',
		`${project.nonScopedName}.code-workspace`
	);
	if (!fs.existsSync(workspacePath)) {
		fs.mkdirSync(path.dirname(workspacePath), { recursive: true });
	}
	fs.writeFileSync(workspacePath, workspace);

	runCommand('code', [workspacePath]);

	return {
		code: 0,
	};
}

interface IBuildOptions {
	mode: string;
	root: string;
}

async function build({ options }) {
	const { mode, root } = options as IBuildOptions;
	const pivotProject = resolveProject(process.cwd());
	const rootProject = resolveProject(root ?? process.cwd());
	await buildProject({
		includeDownstream: mode === 'Everything' || mode === 'IncludeDownstreamDependents',
		includeUpstream: mode === 'Everything',
		pivot: pivotProject,
		root: rootProject,
		pushAndPublishRoot: false,
	});
	return {
		code: 0,
	};
}
