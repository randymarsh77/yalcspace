import { spawnSync, type SpawnSyncOptions } from 'child_process';
import { parse } from 'shell-quote';

export function toPlatformPath(path: string) {
	return path.replace(/\\/g, '\\\\');
}

export function runCommand(command: string, args: string[], options?: SpawnSyncOptions) {
	var isWindows = process.platform === 'win32';
	const { status, error } = spawnSync(command, args, {
		stdio: ['ignore', 'ignore', 'inherit'],
		shell: isWindows, // Only include true for Windows because it can include runtime breaking behavior on macOS.
		...options,
	});
	if (status !== 0) {
		if (error) {
			console.error(error);
		}
		throw new Error(
			`Command failed: ${command + (args.length > 0 ? ' ' + args.join(' ') : '')} | From: ${
				options?.cwd ?? process.cwd()
			}`
		);
	}
}

export function runRawCommand(command: string, options?: SpawnSyncOptions) {
	const commandAndArgs = parse(command) as string[];
	const processName = commandAndArgs.shift();
	if (!processName) {
		throw new Error(`Invalid command: ${command}`);
	}
	runCommand(processName, commandAndArgs, options);
}
