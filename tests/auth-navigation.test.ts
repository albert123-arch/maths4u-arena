import test from 'node:test';
import assert from 'node:assert/strict';
import { authHref, courseContext, localDestination } from '../src/lib/auth-navigation';

test('sign-up keeps the public course or level when switching from sign-in', () => {
  const lesson = '/ru/courses/maths4u-9231-fp1/topics/roots?tab=practice';
  const signUp = new URL(authHref('register', lesson), 'https://arena.test');
  assert.equal(signUp.searchParams.get('next'), lesson);
  assert.deepEqual(courseContext(lesson), { direction: 'further', courseSlug: 'maths4u-9231-fp1' });
  assert.deepEqual(courseContext('/learn/school'), { direction: 'school' });
  assert.equal(courseContext('/join-class/an-invitation'), null);
  assert.equal(localDestination('/join-class/an-invitation'), '/join-class/an-invitation');
});

test('account switches only keep local return paths', () => {
  for (const value of [undefined, '', '//elsewhere.test', 'https://elsewhere.test', '/\\elsewhere.test']) {
    assert.equal(localDestination(value), null);
    assert.equal(authHref('login', value), '/login');
  }
});
