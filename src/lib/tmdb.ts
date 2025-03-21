// TMDB API utility functions and configuration

// Configuration constants
export const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
export const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w185';

// Authentication method
const TMDB_ACCESS_TOKEN = process.env.TMDB_ACCESS_TOKEN;

/**
 * Creates the appropriate request options for TMDB API calls
 * Supports both API key and Bearer token authentication methods
 */
export function getTMDBRequestOptions(): RequestInit {
    // If access token is available, use Bearer token authentication
    if (TMDB_ACCESS_TOKEN) {
        return {
            method: 'GET',
            headers: {
                accept: 'application/json',
                Authorization: `Bearer ${TMDB_ACCESS_TOKEN}`
            }
        };
    }

    // Otherwise, no special options needed as API key will be used in URL
    return {
        method: 'GET',
        headers: {
            accept: 'application/json'
        }
    };
}

/**
 * Builds a TMDB API URL with authentication
 * @param endpoint - The API endpoint (without base URL)
 * @param params - Query parameters
 * @returns Full URL with authentication
 */
export function buildTMDBUrl(endpoint: string, params: Record<string, string> = {}): string {
    const searchParams = new URLSearchParams(params);
    const queryString = searchParams.toString();
    return `${TMDB_BASE_URL}${endpoint}${queryString ? `?${queryString}` : ''}`;
}

/**
 * Checks if TMDB authentication is configured
 * @returns Boolean indicating if authentication is available
 */
export function isTMDBConfigured(): boolean {
    return Boolean(TMDB_ACCESS_TOKEN);
}