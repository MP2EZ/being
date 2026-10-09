/**
 * Helpers for putting a failure in a log line without putting its data there (MAINT-765).
 *
 * A function log may carry a CLOSED description of a failure: a reason code from a fixed set,
 * an integer HTTP status, a validated Postgres SQLSTATE. It may never carry an error's message,
 * stack, details or hint (a constraint-violation message quotes the offending row's values; a
 * fetch error quotes its URL), and no identifier of any kind - no hashed, truncated or
 * prefixed form either, because any such marker can be re-linked through the clear identifier
 * logged for another user.
 */

/** A Postgres SQLSTATE: five characters, digits and upper-case letters. */
const SQLSTATE = /^[0-9A-Z]{5}$/;

/** The value of a string `code` property on any object (an Error or a PostgrestError), else null. */
export function stringCodeOf(err: unknown): string | null {
  if (typeof err !== 'object' || err === null) return null;
  const code = (err as { code?: unknown }).code;
  return typeof code === 'string' ? code : null;
}

/** The object's `code` when it is a well-formed SQLSTATE, else null. */
export function sqlStateOf(err: unknown): string | null {
  const code = stringCodeOf(err);
  return code !== null && SQLSTATE.test(code) ? code : null;
}

/**
 * A fixed-message Error that carries only a validated SQLSTATE `code`. Used where the old code
 * interpolated the database's own message into the thrown text.
 */
export function databaseError(message: string, cause: unknown): Error & { code?: string } {
  const err: Error & { code?: string } = new Error(message);
  const code = sqlStateOf(cause);
  if (code !== null) err.code = code;
  return err;
}

const STORE_CODE = /^[A-Z0-9_]{1,64}$/;

/**
 * A store's notificationType / subtype, for a log line: a string matching /^[A-Z0-9_]{1,64}$/,
 * or an integer (Google's numeric type), else 'invalid'; an absent value is ''. The store signs
 * these, but the value crosses a JSON boundary and is typed `any`.
 */
export function safeStoreCode(value: unknown): string {
  if (value === undefined || value === null) return '';
  if (typeof value === 'string' && STORE_CODE.test(value)) return value;
  if (typeof value === 'number' && Number.isInteger(value)) return String(value);
  return 'invalid';
}
