import test from 'node:test';
import assert from 'node:assert/strict';
import { afterSigningIn, authHref, authReturnAt, courseContext, localDestination } from '../src/lib/auth-navigation';

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
  for (const value of [undefined, '', '//elsewhere.test', 'https://elsewhere.test', '/\\elsewhere.test', '/login?next=%2Fstudent', '/register', '/recover']) {
    assert.equal(localDestination(value), null);
    assert.equal(authHref('login', value), '/login');
  }
});

test('the account menu switches auth screens without losing the current lesson', () => {
  const next = '/courses/maths4u-9709-p1/topics/roots?view=legacy&mode=SHORT#practice';
  const arena = 'https://arena.test';
  assert.equal(authReturnAt(new URL(next, arena)), next);
  assert.equal(authReturnAt(new URL(authHref('login', next), arena)), next);
  assert.equal(authReturnAt(new URL('/register', arena)), null);
  assert.equal(authReturnAt(new URL('/', arena)), null);
});

test('return to a specific activity after either sign-in or registration', () => {
  const activity = '/courses/maths4u-9709-p1/topics/roots?view=legacy&mode=SHORT#practice';
  const chapter = '/courses/maths4u-9709-p1?chapter=quadratics';
  for (const register of [false, true]) {
    for (const target of [activity, chapter, '/courses/maths4u-9709-p1/chapters/quadratics', '/join-class/an-invitation']) {
      assert.equal(afterSigningIn('/student', target, register), target);
    }
  }
  assert.equal(afterSigningIn('/student', '/courses/maths4u-9709-p1', true), '/student');
  assert.equal(afterSigningIn('/student', '/learn/a-level', true), '/student');
  assert.equal(afterSigningIn('/teacher', '/learn/a-level', false), '/learn/a-level');
});
