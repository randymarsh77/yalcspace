#!/usr/bin/env node

// import { runCLI } from '@simple-cli/base';
import { generateAndOpenWorkspace } from './commands';

// For now, we just have one command:
generateAndOpenWorkspace();

// TODO: More capable cli
// runCLI({
// 	name: 'yalcspace',
// 	version: '1.0.0',
// 	summary: 'Generate VSCode workspaces from yalc links',
// 	commands,
// });
