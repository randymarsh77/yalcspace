import * as fs from 'fs';
import * as path from 'path';
import { spawnSync } from 'child_process';
import { dataDir } from './data';
import { resolveProject } from './project-utility';
import { generateWorkspace } from './workspace-utility';
import { ICommand } from '@simple-cli/base';

export const commands: ICommand<any>[] = [
	{
		name: 'gen',
		summary: 'Generate and open a VSCode workspace for the current project',
		definitions: [],
		usage: [],
		execute: generateAndOpenWorkspace,
	},
];

export async function generateAndOpenWorkspace() {
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
