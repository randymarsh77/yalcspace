import { type KnownEnvVars } from './types';

interface LoggingConfiguration {
	info: boolean;
	debug: boolean;
	trace: boolean;
}

export function getLoggingConfiguration(): LoggingConfiguration {
	// By default, logging is disabled.
	// To enable debug logging, set the DEBUG environment variable to 'true'.
	// To enable trace and debug logging, set the TRACE environment variable to 'true'.
	const env = process.env as KnownEnvVars;
	const trace = env.TRACE === 'true';
	const debug = trace || env.DEBUG === 'true';
	return {
		info: true,
		debug,
		trace,
	};
}

let activateTraceRefCount = 0;

function processLoggingArgs(...args: any[]) {
	return args.map((arg) => (typeof arg === 'function' ? arg() : arg));
}

function info(...args: any[]) {
	const config = getLoggingConfiguration();
	if (config.info) {
		console.info(...processLoggingArgs(...args));
	}
}

function debug(...args: any[]) {
	const config = getLoggingConfiguration();
	if (config.debug) {
		activateTraceRefCount++;
		console.debug(...processLoggingArgs(...args));
		activateTraceRefCount--;
	}
}

function trace(...args: any[]) {
	const config = getLoggingConfiguration();
	if (config.trace || activateTraceRefCount > 0) {
		console.debug(...processLoggingArgs(...args));
	}
}

export const log = {
	trace,
	debug,
	info,
};
