import * as fs from 'fs';
import * as path from 'path';
import { spawnSync } from 'child_process';
import { dataDir } from './data';
import { buildProject } from './build-utility';
import { resolveProject } from './project-utility';
import { generateWorkspace } from './workspace-utility';
import { ICommand } from '@simple-cli/base';

const name = 'null';
const summary = 'Generate and open a VSCode workspace for the current project';

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
		execute: generateAndOpenWorkspace,
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
];

async function generateAndOpenWorkspace() {
	const root = process.cwd();
	const project = resolveProject(root);
	const workspace = generateWorkspace(project);

	const workspacePath = path.join(
		dataDir,
		project.name,
		'yalcspace',
		`${project.name}.code-workspace`
	);
	if (!fs.existsSync(workspacePath)) {
		fs.mkdirSync(path.dirname(workspacePath), { recursive: true });
	}
	fs.writeFileSync(workspacePath, workspace);

	spawnSync('code', [workspacePath], { stdio: 'inherit' });

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
		pivot: pivotProject.name,
		root: rootProject,
	});
	return {
		code: 0,
	};
}
