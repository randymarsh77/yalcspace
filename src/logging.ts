interface LoggingConfiguration {
	debug: boolean;
	trace: boolean;
}

function getLoggingConfiguration(): LoggingConfiguration {
	// By default, logging is disabled.
	// To enable debug logging, set the DEBUG environment variable to 'true'.
	// To enable trace and debug logging, set the TRACE environment variable to 'true'.
	const trace = process.env.TRACE === 'true';
	const debug = trace || process.env.DEBUG === 'true';
	return {
		debug,
		trace,
	};
}

let activateTraceRefCount = 0;

function processLoggingArgs(...args: any[]) {
	return args.map((arg) => (typeof arg === 'function' ? arg() : arg));
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
};
