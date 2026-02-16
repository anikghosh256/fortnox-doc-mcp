import { getOpenAPIParser } from './openapi-parser.js';

export interface FortnoxConfig {
  accessToken: string;
  baseUrl?: string;
  clientSecret?: string;
}

export interface FortnoxResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: number;
    details?: unknown;
  };
}

export class FortnoxAPIClient {
  private config: FortnoxConfig;
  private baseUrl: string;

  constructor(config: FortnoxConfig) {
    this.validateConfig(config);
    this.config = config;
    
    // Use baseUrl from config or from OpenAPI spec
    if (config.baseUrl) {
      this.baseUrl = config.baseUrl;
    } else {
      const parser = getOpenAPIParser();
      this.baseUrl = parser.getBaseUrl();
    }
  }

  private validateConfig(config: FortnoxConfig): void {
    if (!config.accessToken || config.accessToken.trim() === '') {
      throw new Error('FORTNOX_ACCESS_TOKEN is required but not provided');
    }
  }

  /**
   * Make an API request to Fortnox
   * Based on OpenAPI spec requirement: uses native fetch
   * Authentication header as per Fortnox documentation
   */
  async request<T = unknown>(
    path: string,
    method: string,
    options?: {
      queryParams?: Record<string, string | number | boolean | undefined>;
      body?: unknown;
      headers?: Record<string, string>;
    }
  ): Promise<FortnoxResponse<T>> {
    try {
      // Build URL with query parameters
      const url = this.buildUrl(path, options?.queryParams);

      // Build headers
      const headers = this.buildHeaders(options?.headers);

      // Build fetch options
      const fetchOptions: RequestInit = {
        method: method.toUpperCase(),
        headers,
      };

      // Add body for POST, PUT, PATCH requests
      if (options?.body && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
        fetchOptions.body = JSON.stringify(options.body);
      }

      // Make the request using native fetch
      const response = await fetch(url, fetchOptions);

      // Parse response
      return await this.parseResponse<T>(response);
    } catch (error) {
      return this.handleError(error) as FortnoxResponse<T>;
    }
  }

  private buildUrl(
    path: string,
    queryParams?: Record<string, string | number | boolean | undefined>
  ): string {
    // Ensure path starts with /
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    
    let url = `${this.baseUrl}${normalizedPath}`;

    // Add query parameters if provided
    if (queryParams) {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(queryParams)) {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      }
      const queryString = params.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }

    return url;
  }

  private buildHeaders(customHeaders?: Record<string, string>): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Access-Token': this.config.accessToken,
    };

    // Add Client-Secret if provided (required for some endpoints per Fortnox documentation)
    if (this.config.clientSecret) {
      headers['Client-Secret'] = this.config.clientSecret;
    }

    // Merge custom headers
    if (customHeaders) {
      Object.assign(headers, customHeaders);
    }

    return headers;
  }

  private async parseResponse<T>(response: Response): Promise<FortnoxResponse<T>> {
    const contentType = response.headers.get('content-type');
    const isJson = contentType?.includes('application/json');

    // Handle successful responses
    if (response.ok) {
      if (isJson) {
        const data = await response.json();
        return {
          success: true,
          data: data as T,
        };
      } else {
        // Non-JSON success response (e.g., PDF, file downloads)
        const text = await response.text();
        return {
          success: true,
          data: text as unknown as T,
        };
      }
    }

    // Handle error responses
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    let errorDetails: unknown = undefined;

    if (isJson) {
      try {
        const errorData = await response.json() as any;
        // Fortnox error format (based on OpenAPI spec)
        if (errorData?.ErrorInformation) {
          errorMessage = errorData.ErrorInformation.message || errorMessage;
          errorDetails = errorData.ErrorInformation;
        } else if (errorData?.message) {
          errorMessage = errorData.message;
          errorDetails = errorData;
        } else {
          errorDetails = errorData;
        }
      } catch {
        // Failed to parse error JSON, use default message
      }
    } else {
      const text = await response.text();
      if (text) {
        errorMessage += `: ${text}`;
      }
    }

    return {
      success: false,
      error: {
        message: errorMessage,
        code: response.status,
        details: errorDetails,
      },
    };
  }

  private handleError(error: unknown): FortnoxResponse {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return {
      success: false,
      error: {
        message: errorMessage,
        details: error,
      },
    };
  }

  /**
   * Get method for convenience
   */
  async get<T = unknown>(
    path: string,
    queryParams?: Record<string, string | number | boolean | undefined>
  ): Promise<FortnoxResponse<T>> {
    return this.request<T>(path, 'GET', { queryParams });
  }

  /**
   * Post method for convenience
   */
  async post<T = unknown>(
    path: string,
    body: unknown,
    queryParams?: Record<string, string | number | boolean | undefined>
  ): Promise<FortnoxResponse<T>> {
    return this.request<T>(path, 'POST', { body, queryParams });
  }

  /**
   * Put method for convenience
   */
  async put<T = unknown>(
    path: string,
    body: unknown,
    queryParams?: Record<string, string | number | boolean | undefined>
  ): Promise<FortnoxResponse<T>> {
    return this.request<T>(path, 'PUT', { body, queryParams });
  }

  /**
   * Delete method for convenience
   */
  async delete<T = unknown>(
    path: string,
    queryParams?: Record<string, string | number | boolean | undefined>
  ): Promise<FortnoxResponse<T>> {
    return this.request<T>(path, 'DELETE', { queryParams });
  }

  /**
   * Patch method for convenience
   */
  async patch<T = unknown>(
    path: string,
    body: unknown,
    queryParams?: Record<string, string | number | boolean | undefined>
  ): Promise<FortnoxResponse<T>> {
    return this.request<T>(path, 'PATCH', { body, queryParams });
  }
}

/**
 * Create a Fortnox API client from environment variables
 * Secrets MUST be read from environment variables only (per requirements)
 * Returns null if FORTNOX_ACCESS_TOKEN is not set (for development/testing)
 */
export function createFortnoxClient(): FortnoxAPIClient | null {
  const accessToken = process.env.FORTNOX_ACCESS_TOKEN;
  const clientSecret = process.env.FORTNOX_CLIENT_SECRET;
  const baseUrl = process.env.FORTNOX_BASE_URL;

  if (!accessToken) {
    return null;
  }

  return new FortnoxAPIClient({
    accessToken,
    clientSecret,
    baseUrl,
  });
}
