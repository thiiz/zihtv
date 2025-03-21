import { Actor } from '@/@types/Actor';
import { TMDB_IMAGE_BASE_URL, buildTMDBUrl, getTMDBRequestOptions, isTMDBConfigured } from '@/lib/tmdb';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const actorName = searchParams.get('name');
        const movieId = searchParams.get('movie_id'); // Optional: can be used to get cast from specific movie

        if (!actorName && !movieId) {
            return NextResponse.json({ success: false, message: 'Actor name or movie ID is required' }, { status: 400 });
        }

        if (!isTMDBConfigured()) {
            return NextResponse.json(
                { success: false, message: 'TMDB API is not configured' },
                { status: 500 }
            );
        }

        let data;

        // If we have a movie ID with TMDB ID, get the cast directly from the movie
        if (movieId) {
            const endpoint = `/movie/${movieId}/credits`;
            const url = buildTMDBUrl(endpoint);
            const options = getTMDBRequestOptions();
            const movieResponse = await fetch(url, options);

            if (!movieResponse.ok) {
                throw new Error(`TMDB API returned ${movieResponse.status}`);
            }

            data = await movieResponse.json();
        }
        // Otherwise search for the actor by name
        else if (actorName) {
            const endpoint = '/search/person';
            const params = {
                query: actorName,
                include_adult: 'false'
            };
            const url = buildTMDBUrl(endpoint, params);
            const options = getTMDBRequestOptions();
            const searchResponse = await fetch(url, options);

            if (!searchResponse.ok) {
                throw new Error(`TMDB API returned ${searchResponse.status}`);
            }

            const searchData = await searchResponse.json();

            // Return only the first result with profile path
            if (searchData.results && searchData.results.length > 0) {
                const actorWithImage = searchData.results.find((actor: Actor) => actor.profile_path);
                if (actorWithImage) {
                    data = {
                        id: actorWithImage.id,
                        name: actorWithImage.name,
                        profile_path: actorWithImage.profile_path,
                        image_url: `${TMDB_IMAGE_BASE_URL}${actorWithImage.profile_path}`,
                        popularity: actorWithImage.popularity
                    };
                } else {
                    data = { message: 'No image found for this actor' };
                }
            } else {
                data = { message: 'Actor not found' };
            }
        }

        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error('Error fetching from TMDB:', error);
        return NextResponse.json(
            { success: false, message: error instanceof Error ? error.message : 'Error fetching from TMDB' },
            { status: 500 }
        );
    }
}