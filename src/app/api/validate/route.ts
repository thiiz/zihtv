import { IPTVUserData } from '@/@types/UserData';
import { NextResponse } from 'next/server';

// Define interface for the IPTV API response

/**
 * Validates an IPTV URL by attempting to fetch it
 */
async function validateUrl(url: string): Promise<boolean> {
    try {
        // Add http:// prefix if not present
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            url = `http://${url}`;
        }

        // Set up AbortController with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(url, {
            method: 'HEAD', // Only fetch headers, not the entire content
            signal: controller.signal,
        });

        clearTimeout(timeoutId);
        return response.ok;
    } catch (error) {
        console.error('URL validation error:', error);
        return false;
    }
}

/**
 * Validates user credentials against the IPTV service using the correct API format
 */
async function validateCredentials(url: string, username: string, password: string): Promise<{ isValid: boolean, userData?: IPTVUserData }> {
    try {
        // Normalize URL - remove trailing slash if present
        let baseUrl = url.trim();
        if (baseUrl.endsWith('/')) {
            baseUrl = baseUrl.slice(0, -1);
        }

        // If URL doesn't start with http:// or https://, add https://
        if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
            baseUrl = `https://${baseUrl}`;
        }

        // Create API URL in the correct format
        const apiUrl = `${baseUrl}/player_api.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;

        // Set up AbortController with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        // Try to access the service with credentials
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 Zihtv Client',
            },
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Check for a valid response
        if (!response.ok) {
            return { isValid: false };
        }

        // Parse the JSON response
        const data = await response.json() as IPTVUserData;

        // Verify the expected structure is present and auth is 1
        if (data &&
            data.user_info &&
            data.user_info.auth === 1 &&
            data.user_info.status === "Active") {
            return {
                isValid: true,
                userData: data
            };
        }

        return { isValid: false };
    } catch (error) {
        console.error('Credential validation error:', error);
        return { isValid: false };
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { url, username, password } = body;

        if (!url) {
            return NextResponse.json(
                { success: false, message: 'URL is required' },
                { status: 400 }
            );
        }

        // First check if the URL is valid and accessible
        const isUrlValid = await validateUrl(url);

        if (!isUrlValid) {
            return NextResponse.json(
                { success: false, message: 'The URL is not accessible or invalid' },
                { status: 400 }
            );
        }

        // Now check if credentials are valid
        const { isValid, userData } = await validateCredentials(url, username, password);

        if (!isValid) {
            return NextResponse.json(
                { success: false, message: 'Invalid username or password' },
                { status: 401 }
            );
        }

        // If we got here, both URL and credentials are valid
        return NextResponse.json({
            success: true,
            message: 'Login successful',
            data: {
                url,
                username,
                isValid: true,
                userData: userData
            }
        });

    } catch (error) {
        console.error('Login validation error:', error);
        return NextResponse.json(
            { success: false, message: 'An error occurred while validating your login' },
            { status: 500 }
        );
    }
} 