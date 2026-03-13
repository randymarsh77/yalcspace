import { expect, test, beforeEach, afterEach } from 'bun:test';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { detectPackageManager } from '../src/build-utility';
import { parsePackageLock, getReverseDeps } from '../src/closure';

let tmpDir: string;

beforeEach(() => {
	tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'yalcspace-test-'));
});

afterEach(() => {
	fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('detectPackageManager returns yarn when yarn.lock exists', () => {
	fs.writeFileSync(path.join(tmpDir, 'yarn.lock'), '');
	expect(detectPackageManager(tmpDir)).toBe('yarn');
});

test('detectPackageManager returns npm when package-lock.json exists', () => {
	fs.writeFileSync(path.join(tmpDir, 'package-lock.json'), '{}');
	expect(detectPackageManager(tmpDir)).toBe('npm');
});

test('detectPackageManager returns yarn when no lock file exists', () => {
	expect(detectPackageManager(tmpDir)).toBe('yarn');
});

test('detectPackageManager prefers yarn.lock when both exist', () => {
	fs.writeFileSync(path.join(tmpDir, 'yarn.lock'), '');
	fs.writeFileSync(path.join(tmpDir, 'package-lock.json'), '{}');
	expect(detectPackageManager(tmpDir)).toBe('yarn');
});

test('parsePackageLock parses lockfileVersion 2/3 format', () => {
	const lockContent = {
		name: 'test-project',
		lockfileVersion: 3,
		packages: {
			'': { dependencies: { alpha: '^1.0.0' } },
			'node_modules/alpha': {
				version: '1.0.0',
				dependencies: { bravo: '^2.0.0' },
			},
			'node_modules/bravo': {
				version: '2.0.0',
			},
			'node_modules/alpha/node_modules/charlie': {
				version: '3.0.0',
			},
		},
	};
	fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({ name: 'test-project' }));
	fs.writeFileSync(path.join(tmpDir, 'package-lock.json'), JSON.stringify(lockContent));

	const project = {
		fullName: 'test-project',
		nonScopedName: 'test-project',
		path: tmpDir,
		links: [],
		allDependencies: ['alpha'],
	};

	const result = parsePackageLock(project);
	expect(result['alpha']).toBeDefined();
	expect([...result['alpha']]).toContain('bravo');
	expect(result['bravo']).toBeDefined();
	expect([...result['bravo']]).toEqual([]);
	// Nested node_modules entries should be skipped
	expect(result['charlie']).toBeUndefined();
});

test('parsePackageLock parses lockfileVersion 1 format', () => {
	const lockContent = {
		name: 'test-project',
		lockfileVersion: 1,
		dependencies: {
			alpha: {
				version: '1.0.0',
				requires: { bravo: '^2.0.0' },
			},
			bravo: {
				version: '2.0.0',
			},
		},
	};
	fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({ name: 'test-project' }));
	fs.writeFileSync(path.join(tmpDir, 'package-lock.json'), JSON.stringify(lockContent));

	const project = {
		fullName: 'test-project',
		nonScopedName: 'test-project',
		path: tmpDir,
		links: [],
		allDependencies: ['alpha'],
	};

	const result = parsePackageLock(project);
	expect(result['alpha']).toBeDefined();
	expect([...result['alpha']]).toContain('bravo');
	expect(result['bravo']).toBeDefined();
	expect([...result['bravo']]).toEqual([]);
});

test('parsePackageLock handles scoped packages', () => {
	const lockContent = {
		name: 'test-project',
		lockfileVersion: 3,
		packages: {
			'': { dependencies: { '@scope/alpha': '^1.0.0' } },
			'node_modules/@scope/alpha': {
				version: '1.0.0',
				dependencies: { bravo: '^2.0.0' },
			},
			'node_modules/bravo': {
				version: '2.0.0',
			},
		},
	};
	fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({ name: 'test-project' }));
	fs.writeFileSync(path.join(tmpDir, 'package-lock.json'), JSON.stringify(lockContent));

	const project = {
		fullName: 'test-project',
		nonScopedName: 'test-project',
		path: tmpDir,
		links: [],
		allDependencies: ['@scope/alpha'],
	};

	const result = parsePackageLock(project);
	expect(result['@scope/alpha']).toBeDefined();
	expect([...result['@scope/alpha']]).toContain('bravo');
});

test('getReverseDeps works with parsePackageLock output', () => {
	const lockContent = {
		name: 'test-project',
		lockfileVersion: 3,
		packages: {
			'': { dependencies: { alpha: '^1.0.0' } },
			'node_modules/alpha': {
				version: '1.0.0',
				dependencies: { bravo: '^2.0.0' },
			},
			'node_modules/bravo': {
				version: '2.0.0',
			},
		},
	};
	fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({ name: 'test-project' }));
	fs.writeFileSync(path.join(tmpDir, 'package-lock.json'), JSON.stringify(lockContent));

	const project = {
		fullName: 'test-project',
		nonScopedName: 'test-project',
		path: tmpDir,
		links: [],
		allDependencies: ['alpha'],
	};

	const depInfo = {
		'test-project': new Set(['alpha']),
		...parsePackageLock(project),
	};

	const reverseDeps = getReverseDeps('bravo', depInfo);
	expect(reverseDeps).toContain('alpha');
	expect(reverseDeps).not.toContain('test-project');
});
