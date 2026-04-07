const MAP = {
  'auth/user-not-found':          'No account with that email. Sign up instead?',
  'auth/wrong-password':          'Incorrect password.',
  'auth/invalid-credential':      'Incorrect email or password.',
  'auth/email-already-in-use':    'An account with this email already exists. Sign in instead?',
  'auth/weak-password':           'Password must be at least 6 characters.',
  'auth/invalid-email':           'Please enter a valid email address.',
  'auth/too-many-requests':       'Too many attempts — please wait a moment and try again.',
  'auth/network-request-failed':  'Network error. Check your connection and try again.',
  'auth/user-disabled':           'This account has been disabled.',
};

export function friendlyAuthError(err) {
  return MAP[err.code] ?? 'Something went wrong. Please try again.';
}
