export const MAX_PASSWORD_BYTES = 72;
export const MIN_PASSWORD_CHARACTERS = 8;
export const BCRYPT_SALT_ROUNDS = 12;

// Valid bcrypt hash used to keep login timing consistent for unknown emails.
export const DUMMY_PASSWORD_HASH =
  '$2b$12$PCxmhQtOtVsmGBx6H24JEefp9Q/gmheNsibDPw/eBvVfLkak6xfDm';
