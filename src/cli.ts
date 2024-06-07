#!/usr/bin/env node

import { runCLI } from '@simple-cli/base';
import { commands } from './commands';

runCLI({
	name: 'yalcspace',
	version: '1.0.0',
	summary: 'Generate VSCode workspaces from yalc links',
	useDataDirectory: true,
	commands,
});
