import test from 'node:test';
import assert from 'node:assert/strict';
import { roleFromUrl, entryUrl } from '../dist/entry-points.js';
const url = path => new URL(path, 'https://mc-draft.example.com');

test('the root opens Admin and dedicated family paths select their role', () => {
  for (const [path, role] of [['/', 'admin'], ['/parent', 'parent'], ['/parent/', 'parent'], ['/parent/index.html', 'parent'], ['/student', 'student'], ['/student/', 'student'], ['/student/index.html', 'student'], ['/parent/?role=student', 'parent'], ['/?role=invalid', 'admin']]) assert.equal(roleFromUrl(url(path)), role, path);
});

test('existing shared role links remain usable', () => {
  for (const role of ['admin', 'teacher', 'parent', 'student']) assert.equal(roleFromUrl(url('/?role=' + role)), role);
});

test('role changes produce refreshable URLs without losing unrelated query parameters', () => {
  assert.equal(entryUrl('parent', url('/?role=parent&pass=demo#today')), '/parent/?pass=demo#today');
  assert.equal(entryUrl('student', url('/parent/?role=parent')), '/student/');
  assert.equal(entryUrl('admin', url('/student/')), '/');
  assert.equal(entryUrl('teacher', url('/parent/')), '/?role=teacher');
  for (const role of ['admin', 'teacher', 'parent', 'student']) assert.equal(roleFromUrl(url(entryUrl(role, url('/')))), role);
});
