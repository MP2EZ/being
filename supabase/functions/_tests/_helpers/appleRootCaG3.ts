/**
 * Apple Root CA - G3, DER, base64 (the x5c encoding). PUBLIC certificate — it is the trust
 * anchor every App Store JWS chains to, published at
 * https://www.apple.com/certificateauthority/AppleRootCA-G3.cer and shipped in the OS trust
 * store, which is where this copy was read from (macOS SystemRootCertificates.keychain).
 *
 * Test fixture only (MAINT-738): the SEC-01-FOLLOWUP forgery test appends the REAL root to an
 * attacker chain and verifies against the DEFAULT (production) anchor. Its authenticity is
 * not taken on trust: verify-apple-jws.test.ts asserts its SPKI equals APPLE_ROOT_CA_G3_SPKI
 * and its SHA-256 equals the fingerprint pinned beside that constant.
 */
export const APPLE_ROOT_CA_G3_DER_B64 =
  'MIICQzCCAcmgAwIBAgIILcX8iNLFS5UwCgYIKoZIzj0EAwMwZzEbMBkGA1UEAwwSQXBwbGUgUm9v' +
  'dCBDQSAtIEczMSYwJAYDVQQLDB1BcHBsZSBDZXJ0aWZpY2F0aW9uIEF1dGhvcml0eTETMBEGA1UE' +
  'CgwKQXBwbGUgSW5jLjELMAkGA1UEBhMCVVMwHhcNMTQwNDMwMTgxOTA2WhcNMzkwNDMwMTgxOTA2' +
  'WjBnMRswGQYDVQQDDBJBcHBsZSBSb290IENBIC0gRzMxJjAkBgNVBAsMHUFwcGxlIENlcnRpZmlj' +
  'YXRpb24gQXV0aG9yaXR5MRMwEQYDVQQKDApBcHBsZSBJbmMuMQswCQYDVQQGEwJVUzB2MBAGByqG' +
  'SM49AgEGBSuBBAAiA2IABJjpLz1AcqTtkyJygRMc3RCV8cWjTnHcFBbZDuWmBSp3ZHtfTjjTuxxE' +
  'tX/1H7YyYl3J6YRbTzBPEVoA/VhYDKX1DyxNB0cTddqXl5dvMVztK517IDvYuVTZXpmkOlEKMaNC' +
  'MEAwHQYDVR0OBBYEFLuw3qFYM4iapIqZ3r6966/ayySrMA8GA1UdEwEB/wQFMAMBAf8wDgYDVR0P' +
  'AQH/BAQDAgEGMAoGCCqGSM49BAMDA2gAMGUCMQCD6cHEFl4aXTQY2e3v9GwOAEZLuN+yRhHFD/3m' +
  'eoyhpmvOwgPUnPWTxnS4at+qIxUCMG1mihDK1A3UT82NQz60imOlM27jbdoXt2QfyFMm+YhidDkL' +
  'F1vLUagM6BgD56KyKA==';
