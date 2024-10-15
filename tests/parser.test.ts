import { expect, test } from 'bun:test';
import { parseYarnLock, getReverseDeps } from '../src/closure';
import { resolveProject } from '../src/project-utility';

const testProjectPath = '';
const testProjectName = '';

test('parse', async () => {
	const p = await resolveProject(testProjectPath);
	const memo = parseYarnLock(p);
	const r = getReverseDeps(testProjectName, memo);
	expect(r).toEqual(['1']);
});
