import { buildTMDBUrl, getTMDBRequestOptions, isTMDBConfigured } from '@/lib/tmdb';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const query = searchParams.get('query');
        const type = searchParams.get('type') || 'person'; // Default to person search

        if (!query) {
            return NextResponse.json({ success: false, message: 'Query parameter is required' }, { status: 400 });
        }

        if (!isTMDBConfigured()) {
            return NextResponse.json(
                { success: false, message: 'TMDB API is not configured' },
                { status: 500 }
            );
        }

        let endpoint = '';
        const params: Record<string, string> = {
            query: query,
            include_adult: 'false'
        };

        // Different endpoints based on search type
        if (type === 'person') {
            endpoint = '/search/person';
        } else if (type === 'movie') {
            endpoint = '/search/movie';
        } else {
            return NextResponse.json({ success: false, message: 'Invalid search type' }, { status: 400 });
        }

        const url = buildTMDBUrl(endpoint, params);
        const options = getTMDBRequestOptions();
        const response = await fetch(url, options);

        if (!response.ok) {
            throw new Error(`TMDB API returned ${response.status}`);
        }

        const data = await response.json();

        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error('Error fetching from TMDB:', error);
        return NextResponse.json(
            { success: false, message: error instanceof Error ? error.message : 'Error fetching from TMDB' },
            { status: 500 }
        );
    }
}