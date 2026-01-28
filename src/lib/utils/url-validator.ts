/**
 * Validates a URL and optionally checks if it's reachable
 */

export interface ValidationResult {
  valid: boolean
  error?: string
  normalizedUrl?: string
}

export function validateUrl(url: string): ValidationResult {
  if (!url || typeof url !== 'string') {
    return {
      valid: false,
      error: 'URL is required',
    }
  }

  // Trim whitespace
  const trimmed = url.trim()

  if (!trimmed) {
    return {
      valid: false,
      error: 'URL cannot be empty',
    }
  }

  // Add protocol if missing
  let normalizedUrl = trimmed
  if (!trimmed.match(/^https?:\/\//i)) {
    normalizedUrl = `https://${trimmed}`
  }

  try {
    const urlObj = new URL(normalizedUrl)

    // Validate protocol
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return {
        valid: false,
        error: 'URL must use HTTP or HTTPS protocol',
      }
    }

    // Validate hostname
    if (!urlObj.hostname || urlObj.hostname.length === 0) {
      return {
        valid: false,
        error: 'Invalid hostname',
      }
    }

    // Basic hostname validation (no localhost or private IPs in production)
    if (process.env.NODE_ENV === 'production') {
      if (
        urlObj.hostname === 'localhost' ||
        urlObj.hostname === '127.0.0.1' ||
        urlObj.hostname.startsWith('192.168.') ||
        urlObj.hostname.startsWith('10.') ||
        urlObj.hostname.startsWith('172.16.')
      ) {
        return {
          valid: false,
          error: 'Local or private IP addresses are not allowed',
        }
      }
    }

    // Validate hostname format (basic check)
    const hostnameRegex = /^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i
    if (!hostnameRegex.test(urlObj.hostname) && urlObj.hostname !== 'localhost') {
      // Allow localhost in development
      if (process.env.NODE_ENV === 'development' && urlObj.hostname === 'localhost') {
        // OK
      } else {
        return {
          valid: false,
          error: 'Invalid hostname format',
        }
      }
    }

    return {
      valid: true,
      normalizedUrl: normalizedUrl,
    }
  } catch (error) {
    return {
      valid: false,
      error: 'Invalid URL format. Please enter a valid URL (e.g., https://example.com)',
    }
  }
}

/**
 * Checks if a URL is reachable (optional async validation)
 */
export async function checkUrlReachable(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      mode: 'no-cors', // Use no-cors to avoid CORS issues, but we can't read the response
      cache: 'no-cache',
    })
    // With no-cors, we can't check the status, but if it doesn't throw, it's likely reachable
    return true
  } catch (error) {
    // Try with a simple fetch to see if we get any response
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout

      await fetch(url, {
        method: 'GET',
        mode: 'no-cors',
        signal: controller.signal,
        cache: 'no-cache',
      })

      clearTimeout(timeoutId)
      return true
    } catch {
      return false
    }
  }
}
