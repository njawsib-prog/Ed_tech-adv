/**
 * Debug Logger Utility
 *
 * Provides conditional logging based on environment and debug settings.
 * Set NEXT_PUBLIC_DEBUG=true in .env.local to enable debug logs.
 */

const DEBUG_ENABLED = process.env.NEXT_PUBLIC_DEBUG === 'true' || process.env.NODE_ENV === 'development';

export const logger = {
  log: (tag: string, ...args: any[]) => {
    if (DEBUG_ENABLED) {
      console.log(`[${tag}]`, ...args);
    }
  },

  error: (tag: string, ...args: any[]) => {
    if (DEBUG_ENABLED) {
      console.error(`[${tag}]`, ...args);
    } else {
      // Always log errors in production
      console.error(`[${tag}]`, ...args);
    }
  },

  warn: (tag: string, ...args: any[]) => {
    if (DEBUG_ENABLED) {
      console.warn(`[${tag}]`, ...args);
    }
  },

  info: (tag: string, ...args: any[]) => {
    if (DEBUG_ENABLED) {
      console.info(`[${tag}]`, ...args);
    }
  },

  request: (tag: string, config: any) => {
    if (DEBUG_ENABLED) {
      console.log(`[${tag} Request]`, {
        url: `${config.baseURL}${config.url}`,
        method: config.method?.toUpperCase(),
        headers: {
          ...config.headers,
          Authorization: config.headers.Authorization ? '***REDACTED***' : undefined,
        },
        data: config.data,
        withCredentials: config.withCredentials,
      });
    }
  },

  response: (tag: string, response: any) => {
    if (DEBUG_ENABLED) {
      console.log(`[${tag} Response Success]`, {
        url: `${response.config.baseURL}${response.config.url}`,
        status: response.status,
        statusText: response.statusText,
        data: response.data,
      });
    }
  },

  responseError: (tag: string, error: any) => {
    if (DEBUG_ENABLED || error.response?.status >= 500) {
      console.error(`[${tag} Response Error]`, {
        message: error.message,
        code: error.code,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        config: error.config ? {
          url: `${error.config.baseURL}${error.config.url}`,
          method: error.config.method?.toUpperCase(),
          data: error.config.data,
        } : null,
      });
    }
  },
};

export default logger;
