/**
 * DEEP LINK VALIDATION SECURITY TESTING SUITE
 * MAINT-120: Deep Link Validation
 *
 * SECURITY REQUIREMENTS TESTED:
 * - All deep link parameters validated against allowlist
 * - Malformed URLs rejected gracefully (no crashes)
 * - No arbitrary navigation via deep link parameters
 * - SQL injection / XSS patterns blocked
 * - Deep link handler logs suspicious attempts
 * - Rate limiting prevents abuse
 *
 * ATTACK PATTERNS COVERED:
 * - SQL injection attempts
 * - XSS (Cross-Site Scripting) attempts
 * - Path traversal attacks
 * - Command injection attempts
 * - Protocol injection attacks
 * - URL encoding bypass attempts
 * - Parameter pollution
 */

import {
  DeepLinkValidationService,
  DEEP_LINK_CONFIG,
} from '../../src/core/services/security/DeepLinkValidationService';

// Mock logging to capture security events
const mockLogSecurity = jest.fn();
const mockLogError = jest.fn();

jest.mock('../../src/core/services/logging', () => ({
  logSecurity: (...args: unknown[]) => mockLogSecurity(...args),
  logError: (...args: unknown[]) => mockLogError(...args),
  LogCategory: {
    SECURITY: 'security',
    ERROR: 'error',
  },
}));

describe('DeepLinkValidationService', () => {
  let service: DeepLinkValidationService;

  beforeEach(() => {
    // Get fresh instance and clear state
    service = DeepLinkValidationService.getInstance();
    service.clearSecurityEvents();
    mockLogSecurity.mockClear();
    mockLogError.mockClear();
  });

  describe('Valid URL Handling', () => {
    it('should accept valid being:// scheme URLs', () => {
      const result = service.validateDeepLink('being://main');

      expect(result.isValid).toBe(true);
      expect(result.sanitizedUrl).toBe('being://main');
      expect(result.errors).toHaveLength(0);
    });

    it('should accept valid https being.fyi URLs', () => {
      const result = service.validateDeepLink('https://being.fyi/morning');

      expect(result.isValid).toBe(true);
      expect(result.metadata.scheme).toBe('https');
      expect(result.metadata.host).toBe('being.fyi');
      expect(result.metadata.path).toBe('/morning');
    });

    it('should accept valid URLs with allowed query parameters', () => {
      const result = service.validateDeepLink('being://module?moduleId=stoic-basics');

      expect(result.isValid).toBe(true);
      expect(result.metadata.params).toHaveProperty('moduleId', 'stoic-basics');
    });

    it('should accept all allowed paths', () => {
      const allowedPaths = [
        'being://main',
        'being://morning',
        'being://midday',
        'being://evening',
        'being://crisis',
        'being://assessment',
        'being://learn',
        'being://module',
        'being://practice',
        'being://profile',
        'being://settings',
        'being://subscription',
      ];

      for (const url of allowedPaths) {
        const result = service.validateDeepLink(url);
        expect(result.isValid).toBe(true);
      }
    });
  });

  describe('Invalid URL Rejection', () => {
    it('should reject URLs with disallowed schemes', () => {
      const result = service.validateDeepLink('javascript://alert(1)');

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'DISALLOWED_SCHEME')).toBe(true);
    });

    it('should reject URLs with disallowed hosts', () => {
      const result = service.validateDeepLink('https://evil.com/being/crisis');

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'DISALLOWED_HOST')).toBe(true);
    });

    it('should reject URLs exceeding maximum length', () => {
      const longPath = 'a'.repeat(DEEP_LINK_CONFIG.MAX_URL_LENGTH + 100);
      const result = service.validateDeepLink(`being://${longPath}`);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'URL_TOO_LONG')).toBe(true);
    });

    it('should reject malformed URLs gracefully without crashing', () => {
      const malformedUrls = [
        '',
        'not-a-url',
        '://missing-scheme',
        'being://',
        'http://[invalid-ipv6',
      ];

      for (const url of malformedUrls) {
        expect(() => service.validateDeepLink(url)).not.toThrow();
        const result = service.validateDeepLink(url);
        // Should either be invalid or handle gracefully
        expect(result).toBeDefined();
      }
    });
  });

  describe('SQL Injection Attack Prevention', () => {
    const sqlInjectionPatterns = [
      "being://module?moduleId=1' OR '1'='1",
      "being://module?moduleId=1; DROP TABLE users--",
      "being://module?moduleId=' UNION SELECT * FROM users--",
      'being://module?moduleId=1%27%20OR%20%271%27%3D%271',
      "being://module?moduleId=admin'--",
      "being://module?moduleId=1'; EXEC xp_cmdshell('dir')--",
      'being://module?moduleId=SELECT%20*%20FROM%20users',
      "being://module?moduleId=INSERT INTO users VALUES('hack')",
      "being://module?moduleId=DELETE FROM sessions WHERE 1=1",
    ];

    it.each(sqlInjectionPatterns)(
      'should block SQL injection: %s',
      (maliciousUrl) => {
        const result = service.validateDeepLink(maliciousUrl);

        expect(result.isValid).toBe(false);
        expect(
          result.errors.some(
            (e) =>
              e.code === 'SQL_INJECTION_DETECTED' ||
              e.code === 'COMMAND_INJECTION_DETECTED'
          )
        ).toBe(true);
        expect(result.errors.some((e) => e.severity === 'critical')).toBe(true);
      }
    );
  });

  describe('XSS Attack Prevention', () => {
    const xssPatterns = [
      'being://module?moduleId=<script>alert(1)</script>',
      "being://module?moduleId=<img src=x onerror=alert('XSS')>",
      'being://module?moduleId=javascript:alert(1)',
      'being://module?moduleId=<svg onload=alert(1)>',
      'being://module?moduleId=<iframe src="evil.com">',
      "being://module?moduleId=<body onload=alert('XSS')>",
      'being://module?moduleId=%3Cscript%3Ealert(1)%3C/script%3E',
      "being://module?moduleId=data:text/html,<script>alert('XSS')</script>",
      "being://module?moduleId=<object data='javascript:alert(1)'>",
    ];

    it.each(xssPatterns)('should block XSS attack: %s', (maliciousUrl) => {
      const result = service.validateDeepLink(maliciousUrl);

      expect(result.isValid).toBe(false);
      expect(
        result.errors.some(
          (e) =>
            e.code === 'XSS_DETECTED' || e.code === 'PROTOCOL_INJECTION_DETECTED'
        )
      ).toBe(true);
    });
  });

  describe('Path Traversal Attack Prevention', () => {
    const pathTraversalPatterns = [
      'being://../../etc/passwd',
      'being://module/../../../secret',
      'being://module?moduleId=../../../etc/passwd',
      'being://module%2f..%2f..%2f..%2fetc%2fpasswd',
      'being://module?moduleId=..%5c..%5c..%5cwindows%5csystem32',
      'being://module?moduleId=%252e%252e%252f',
    ];

    it.each(pathTraversalPatterns)(
      'should block path traversal: %s',
      (maliciousUrl) => {
        const result = service.validateDeepLink(maliciousUrl);

        expect(result.isValid).toBe(false);
        expect(
          result.errors.some((e) => e.code === 'PATH_TRAVERSAL_DETECTED')
        ).toBe(true);
      }
    );
  });

  describe('Command Injection Prevention', () => {
    const commandInjectionPatterns = [
      'being://module?moduleId=test;cat%20/etc/passwd',
      'being://module?moduleId=test|ls%20-la',
      'being://module?moduleId=$(cat%20/etc/passwd)',
      'being://module?moduleId=`whoami`',
      'being://module?moduleId=test%26%26rm%20-rf%20/', // URL-encoded &&
      'being://module?moduleId=test%7C%7Ccat%20/etc/shadow', // URL-encoded ||
    ];

    it.each(commandInjectionPatterns)(
      'should block command injection: %s',
      (maliciousUrl) => {
        const result = service.validateDeepLink(maliciousUrl);

        expect(result.isValid).toBe(false);
        expect(
          result.errors.some((e) => e.code === 'COMMAND_INJECTION_DETECTED')
        ).toBe(true);
      }
    );
  });

  describe('Protocol Injection Prevention', () => {
    const protocolInjectionPatterns = [
      'file:///etc/passwd',
      'ftp://evil.com/malware.exe',
      'gopher://evil.com:70/_test',
      'ldap://evil.com/o=test',
      'telnet://evil.com:23',
    ];

    it.each(protocolInjectionPatterns)(
      'should block protocol injection: %s',
      (maliciousUrl) => {
        const result = service.validateDeepLink(maliciousUrl);

        expect(result.isValid).toBe(false);
        expect(
          result.errors.some(
            (e) =>
              e.code === 'PROTOCOL_INJECTION_DETECTED' ||
              e.code === 'DISALLOWED_SCHEME'
          )
        ).toBe(true);
      }
    );
  });

  describe('Parameter Validation', () => {
    it('should strip disallowed parameters with warning', () => {
      const result = service.validateDeepLink(
        'being://module?moduleId=test&maliciousParam=evil'
      );

      expect(result.isValid).toBe(true);
      expect(result.metadata.params).not.toHaveProperty('maliciousParam');
      expect(
        result.warnings.some((w) => w.includes('maliciousParam'))
      ).toBe(true);
    });

    it('should reject parameters exceeding maximum length', () => {
      const longValue = 'a'.repeat(DEEP_LINK_CONFIG.MAX_PARAM_LENGTH + 100);
      const result = service.validateDeepLink(
        `being://module?moduleId=${longValue}`
      );

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.code === 'PARAM_TOO_LONG')).toBe(true);
    });

    it('should sanitize parameter values', () => {
      const result = service.validateDeepLink(
        'being://module?moduleId=test&source=email'
      );

      expect(result.isValid).toBe(true);
      expect(result.metadata.params.moduleId).toBe('test');
      expect(result.metadata.params.source).toBe('email');
    });

    it('should accept all allowed parameters', () => {
      const params = DEEP_LINK_CONFIG.ALLOWED_PARAMS.map(
        (p) => `${p}=test`
      ).join('&');
      const result = service.validateDeepLink(`being://module?${params}`);

      expect(result.isValid).toBe(true);
      for (const param of DEEP_LINK_CONFIG.ALLOWED_PARAMS) {
        expect(result.metadata.params).toHaveProperty(param);
      }
    });
  });

  describe('Rate Limiting', () => {
    it('should block requests after rate limit exceeded', () => {
      // Make many requests quickly
      for (let i = 0; i < DEEP_LINK_CONFIG.RATE_LIMIT.MAX_REQUESTS_PER_MINUTE; i++) {
        service.validateDeepLink('being://main');
      }

      // Next request should be rate limited
      const result = service.validateDeepLink('being://main');

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.code === 'RATE_LIMIT_EXCEEDED')).toBe(
        true
      );
    });

    it('should reset rate limit after clear', () => {
      // Exhaust rate limit
      for (let i = 0; i < DEEP_LINK_CONFIG.RATE_LIMIT.MAX_REQUESTS_PER_MINUTE + 5; i++) {
        service.validateDeepLink('being://main');
      }

      // Clear and try again
      service.clearSecurityEvents();
      const result = service.validateDeepLink('being://main');

      expect(result.isValid).toBe(true);
    });
  });

  describe('Security Event Logging', () => {
    it('should log attack detection events', () => {
      service.validateDeepLink("being://module?moduleId=<script>alert(1)</script>");

      const metrics = service.getSecurityMetrics();
      expect(metrics.attacksDetected).toBeGreaterThan(0);
    });

    it('should track security metrics', () => {
      // Generate some events
      service.validateDeepLink('being://main'); // valid
      service.validateDeepLink("being://module?moduleId=' OR 1=1--"); // attack

      const metrics = service.getSecurityMetrics();
      expect(metrics.totalEvents).toBeGreaterThan(0);
      expect(metrics.recentEvents).toBeDefined();
    });

    it('should call security logging for attacks', () => {
      service.validateDeepLink("being://module?moduleId=<script>alert('xss')</script>");

      expect(mockLogSecurity).toHaveBeenCalledWith(
        'DeepLinkValidation: Attack detected',
        'critical',
        expect.objectContaining({
          url: expect.any(String),
          errors: expect.any(Array),
        })
      );
    });
  });

  describe('Navigation Parameter Extraction', () => {
    it('should extract valid screen and params for valid URLs', () => {
      const validation = service.validateDeepLink('being://module?moduleId=stoic-basics');
      const navigation = service.extractNavigationParams(validation);

      expect(navigation.screen).toBe('ModuleDetail');
      expect(navigation.params).toHaveProperty('moduleId', 'stoic-basics');
    });

    it('should return null screen for invalid URLs', () => {
      const validation = service.validateDeepLink("being://module?moduleId=<script>alert(1)</script>");
      const navigation = service.extractNavigationParams(validation);

      expect(navigation.screen).toBeNull();
      expect(navigation.params).toEqual({});
    });

    it('should map paths to correct screens', () => {
      const pathMappings = [
        { path: 'being://main', expectedScreen: 'Main' },
        { path: 'being://morning', expectedScreen: 'MorningFlow' },
        { path: 'being://midday', expectedScreen: 'MiddayFlow' },
        { path: 'being://evening', expectedScreen: 'EveningFlow' },
        { path: 'being://crisis', expectedScreen: 'CrisisResources' },
        { path: 'being://subscription', expectedScreen: 'Subscription' },
      ];

      for (const { path, expectedScreen } of pathMappings) {
        const validation = service.validateDeepLink(path);
        const navigation = service.extractNavigationParams(validation);
        expect(navigation.screen).toBe(expectedScreen);
      }
    });
  });

  describe('URL Encoding Bypass Prevention', () => {
    it('should detect attacks through multiple encoding layers', () => {
      // Double-encoded SQL injection
      const doubleEncoded = 'being://module?moduleId=%2527%2520OR%2520%25271%2527%253D%25271';
      const result = service.validateDeepLink(doubleEncoded);

      // Should either block the attack or sanitize it
      if (result.isValid) {
        // If it passed, the parameter should be sanitized
        expect(result.metadata.params.moduleId).not.toContain("'");
        expect(result.metadata.params.moduleId).not.toContain('OR');
      } else {
        expect(result.errors.length).toBeGreaterThan(0);
      }
    });

    it('should handle null byte injection', () => {
      const result = service.validateDeepLink(
        'being://module?moduleId=test%00.txt'
      );

      // Null bytes should be stripped
      if (result.isValid) {
        expect(result.metadata.params.moduleId).not.toContain('\0');
      }
    });
  });

  describe('Performance', () => {
    it('should validate URLs within performance threshold', () => {
      const start = performance.now();
      service.validateDeepLink('being://module?moduleId=test&source=email');
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(DEEP_LINK_CONFIG.VALIDATION_TIMEOUT_MS);
    });

    it('should handle many validations efficiently', () => {
      const iterations = 100;
      const start = performance.now();

      for (let i = 0; i < iterations; i++) {
        service.validateDeepLink(`being://module?moduleId=test${i}`);
      }

      const avgDuration = (performance.now() - start) / iterations;
      expect(avgDuration).toBeLessThan(10); // <10ms average
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string gracefully', () => {
      const result = service.validateDeepLink('');
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle unicode in URLs', () => {
      const result = service.validateDeepLink('being://module?moduleId=test-\u{1F600}');

      // Should either accept (with sanitization) or reject gracefully
      expect(() => service.validateDeepLink('being://module?moduleId=test-\u{1F600}')).not.toThrow();
    });

    it('should handle very long but valid URLs', () => {
      const longModuleId = 'a'.repeat(100);
      const result = service.validateDeepLink(
        `being://module?moduleId=${longModuleId}`
      );

      expect(result.isValid).toBe(true);
      expect(result.metadata.params.moduleId).toHaveLength(100);
    });

    it('should handle URLs with hash fragments', () => {
      const result = service.validateDeepLink('being://module?moduleId=test#section1');

      // Should handle hash fragments appropriately
      expect(result).toBeDefined();
    });
  });
});

describe('Deep Link Configuration', () => {
  it('should have sensible rate limiting defaults', () => {
    expect(DEEP_LINK_CONFIG.RATE_LIMIT.MAX_REQUESTS_PER_MINUTE).toBeGreaterThan(10);
    expect(DEEP_LINK_CONFIG.RATE_LIMIT.MAX_REQUESTS_PER_MINUTE).toBeLessThan(100);
    expect(DEEP_LINK_CONFIG.RATE_LIMIT.BLOCK_DURATION_MS).toBeGreaterThanOrEqual(30000);
  });

  it('should have reasonable max lengths', () => {
    expect(DEEP_LINK_CONFIG.MAX_URL_LENGTH).toBeGreaterThanOrEqual(1024);
    expect(DEEP_LINK_CONFIG.MAX_URL_LENGTH).toBeLessThanOrEqual(8192);
    expect(DEEP_LINK_CONFIG.MAX_PARAM_LENGTH).toBeGreaterThanOrEqual(64);
    expect(DEEP_LINK_CONFIG.MAX_PARAM_LENGTH).toBeLessThanOrEqual(256);
  });

  it('should include crisis path for emergency access', () => {
    expect(DEEP_LINK_CONFIG.ALLOWED_PATHS).toContain('/crisis');
  });

  it('should only allow secure schemes', () => {
    expect(DEEP_LINK_CONFIG.ALLOWED_SCHEMES).not.toContain('javascript');
    expect(DEEP_LINK_CONFIG.ALLOWED_SCHEMES).not.toContain('file');
    expect(DEEP_LINK_CONFIG.ALLOWED_SCHEMES).not.toContain('data');
  });
});
