import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const username = searchParams.get('username');
    const password = searchParams.get('password');
    const url = searchParams.get('url');
    const streamId = searchParams.get('stream_id');
    const streamType = searchParams.get('stream_type'); // live, movie, or series
    const container = searchParams.get('container'); // For series episodes

    if (!username || !password || !url || !streamId || !streamType) {
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

        console.log(`Processing stream request for ${streamType} ID: ${streamId} from ${baseUrl}`);

        let streamUrl = '';
        let streamInfo = null;

        // Build the appropriate stream URL based on type
        switch (streamType) {
            case 'live':
                // For live streams - format: http://domain:port/live/username/password/streamId.ext
                // Check for allowed output formats
                const live_allowed_output_formats = ['ts', 'm3u8'];
                const live_format = searchParams.get('ext') || 'ts';

                // Use the specified format if it's allowed, otherwise default to m3u8
                const live_ext = live_allowed_output_formats.includes(live_format) ? live_format : 'ts';

                streamUrl = `${baseUrl}/live/${username}/${password}/${streamId}.${live_ext}`;
                console.log(`Generated live stream URL: ${streamUrl}`);

                // Get channel info if needed
                try {
                    const infoApiUrl = `${baseUrl}/player_api.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&action=get_live_streams&stream_id=${streamId}`;
                    console.log(`Fetching live stream info from: ${infoApiUrl}`);

                    const infoResponse = await fetch(
                        infoApiUrl,
                        {
                            headers: { 'User-Agent': 'Mozilla/5.0 Zihtv Client' },
                            cache: 'no-store',
                        }
                    );

                    if (infoResponse.ok) {
                        const infoData = await infoResponse.json();
                        if (Array.isArray(infoData) && infoData.length > 0) {
                            streamInfo = {
                                title: infoData[0].name,
                                description: infoData[0].epg_title || '',
                                genre: infoData[0].category_name || '',
                            };
                        }
                    } else {
                        console.error(`Error fetching live stream info: ${infoResponse.status} ${infoResponse.statusText}`);
                    }
                } catch (infoError) {
                    console.error('Error fetching live stream info:', infoError);
                    // Continue even if info fetch fails
                }
                break;

            case 'movie':
                // For VOD movies - format: http://domain:port/movie/username/password/streamId.ext
                // Check for allowed output formats
                const movie_allowed_output_formats = ['mp4', 'mkv', 'avi', 'm3u8'];
                const movie_format = searchParams.get('ext') || 'mp4';

                // Use the specified format if it's allowed, otherwise default to mp4
                const movie_ext = movie_allowed_output_formats.includes(movie_format) ? movie_format : 'mp4';

                streamUrl = `${baseUrl}/movie/${username}/${password}/${streamId}.${movie_ext}`;
                console.log(`Generated movie stream URL: ${streamUrl}`);

                // Get movie info if needed
                try {
                    const infoApiUrl = `${baseUrl}/player_api.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&action=get_vod_info&vod_id=${streamId}`;
                    console.log(`Fetching movie info from: ${infoApiUrl}`);

                    const infoResponse = await fetch(
                        infoApiUrl,
                        {
                            headers: { 'User-Agent': 'Mozilla/5.0 Zihtv Client' },
                            cache: 'no-store',
                        }
                    );

                    if (infoResponse.ok) {
                        const infoData = await infoResponse.json();
                        streamInfo = {
                            title: infoData.info?.name || infoData.movie_data?.name || '',
                            description: infoData.info?.plot || infoData.movie_data?.plot || '',
                            genre: infoData.info?.genre || infoData.movie_data?.genre || '',
                            duration: infoData.info?.duration_secs || infoData.movie_data?.duration_secs || '',
                            year: infoData.info?.year || infoData.movie_data?.year || '',
                            director: infoData.info?.director || infoData.movie_data?.director || '',
                            cast: infoData.info?.cast || infoData.movie_data?.cast || '',
                        };
                    } else {
                        console.error(`Error fetching movie info: ${infoResponse.status} ${infoResponse.statusText}`);
                    }
                } catch (infoError) {
                    console.error('Error fetching movie info:', infoError);
                    // Continue even if info fetch fails
                }
                break;

            case 'series':
                // For series episodes - format: http://domain:port/series/username/password/streamId.ext
                // Check for allowed output formats
                const series_allowed_output_formats = ['mp4', 'mkv', 'avi', 'm3u8'];

                // Use container parameter if provided, otherwise check ext parameter, or default to mp4
                let series_ext = 'mp4';

                if (container && container.trim() !== '') {
                    series_ext = container;
                } else {
                    const ext = searchParams.get('ext');
                    if (ext && series_allowed_output_formats.includes(ext)) {
                        series_ext = ext;
                    }
                }

                streamUrl = `${baseUrl}/series/${username}/${password}/${streamId}.${series_ext}`;
                console.log(`Generated series stream URL: ${streamUrl}`);

                // Series episode info would require additional API calls that may not be standardized
                // For simplicity, we'll just use the ID as the title
                streamInfo = {
                    title: `Episode ${streamId}`,
                };
                break;

            default:
                return NextResponse.json(
                    { success: false, message: 'Invalid stream type' },
                    { status: 400 }
                );
        }

        return NextResponse.json({
            success: true,
            streamUrl,
            info: streamInfo,
        });
    } catch (error) {
        console.error('Error preparing stream URL:', error);
        return NextResponse.json(
            {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to prepare stream URL',
            },
            { status: 500 }
        );
    }
}