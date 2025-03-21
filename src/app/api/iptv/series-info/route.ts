import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const username = searchParams.get('username');
    const password = searchParams.get('password');
    const url = searchParams.get('url');
    const seriesId = searchParams.get('series_id');

    if (!username || !password || !url || !seriesId) {
        return NextResponse.json(
            { success: false, message: 'Missing required parameters' },
            { status: 400 }
        );
    }

    try {
        // Clean the URL - remove trailing slash
        let baseUrl = url.trim();
        if (baseUrl.endsWith('/')) {
            baseUrl = baseUrl.slice(0, -1);
        }

        // Ensure URL has http/https
        if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
            baseUrl = `http://${baseUrl}`;
        }

        // Build the API URL to get series info
        const apiUrl = `${baseUrl}/player_api.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&action=get_series_info&series_id=${seriesId}`;

        // Fetch series info from the IPTV service
        const response = await fetch(apiUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 Zihtv Client',
            },
            // Add a cache control to avoid stale data
            cache: 'no-store',
        });

        if (!response.ok) {
            throw new Error(`API returned ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        return NextResponse.json({
            success: true,
            data: data,
        });
    } catch (error) {
        console.error('Error fetching series info:', error);
        return NextResponse.json(
            {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to fetch series info',
            },
            { status: 500 }
        );
    }
} 