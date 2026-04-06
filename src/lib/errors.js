export function getErrorMessage(e, fallback = 'Something went wrong') {
  return e?.message || fallback;
}
