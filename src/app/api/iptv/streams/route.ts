import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const username = searchParams.get('username');
    const password = searchParams.get('password');
    const url = searchParams.get('url');
    const type = searchParams.get('type'); // live, vod, or series
    const categoryId = searchParams.get('category_id'); // Optional category filter

    if (!username || !password || !url || !type) {
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
            baseUrl = `https://${baseUrl}`;
        }

        // Determine the correct API endpoint based on the type
        let action = '';
        switch (type) {
            case 'live':
                action = categoryId ? `get_live_streams&category_id=${categoryId}` : 'get_live_streams';
                break;
            case 'vod':
                action = categoryId ? `get_vod_streams&category_id=${categoryId}` : 'get_vod_streams';
                break;
            case 'series':
                action = categoryId ? `get_series&category_id=${categoryId}` : 'get_series';
                break;
            default:
                return NextResponse.json(
                    { success: false, message: 'Invalid content type' },
                    { status: 400 }
                );
        }

        // Build the API URL
        const apiUrl = `${baseUrl}/player_api.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&action=${action}`;

        console.log(`Fetching streams from: ${apiUrl}`);

        // Fetch streams from the IPTV service
        const response = await fetch(apiUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 Zihtv Client',
            },
            // Add a cache control to avoid stale data
            cache: 'no-store',
        });

        if (!response.ok) {
            console.error(`API returned status: ${response.status}, statusText: ${response.statusText}`);
            throw new Error(`API returned ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log(`Received ${Array.isArray(data) ? data.length : 'unknown number of'} streams`);

        return NextResponse.json({
            success: true,
            data: data,
        });
    } catch (error) {
        console.error('Error fetching streams:', error);
        return NextResponse.json(
            {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to fetch streams',
            },
            { status: 500 }
        );
    }
} 