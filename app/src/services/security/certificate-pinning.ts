/**
 * CERTIFICATE PINNING CONFIGURATION
 * Production security requirement for API communications
 */

export const CERTIFICATE_PINS = {
  // Production API certificate pins (SHA-256)
  'api.being.app': [
    'sha256/PLACEHOLDER_PRIMARY_CERT_PIN_HERE',
    'sha256/PLACEHOLDER_BACKUP_CERT_PIN_HERE'
  ],
  
  // Analytics endpoint pins
  'analytics.being.app': [
    'sha256/PLACEHOLDER_ANALYTICS_CERT_PIN_HERE'
  ]
};

export function validateCertificatePinning(hostname: string, certPin: string): boolean {
  const validPins = CERTIFICATE_PINS[hostname];
  if (!validPins) {
    console.warn(`No certificate pins configured for ${hostname}`);
    return false;
  }
  
  return validPins.includes(certPin);
}

/**
 * IMPLEMENTATION NOTE:
 * Certificate pinning should be implemented at the network layer
 * using expo-secure-store or react-native-ssl-pinning in production.
 * This configuration provides the validation framework.
 */
