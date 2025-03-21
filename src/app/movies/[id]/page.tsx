'use client';

import { ProfileData } from '@/@types/ProfileData';
import ActorGallery from '@/components/ActorGallery';
import Image from '@/components/Image';
import { Spinner } from '@/components/Spinner';
import { db } from '@/lib/db';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface MovieInfo {
    kinopoisk_url?: string;
    tmdb_id?: number;
    name?: string;
    o_name?: string;
    cover_big?: string;
    movie_image?: string;
    release_date?: string;
    episode_run_time?: number;
    youtube_trailer?: string | null;
    director?: string;
    actors?: string;
    cast?: string;
    description?: string;
    plot?: string;
    age?: string;
    mpaa_rating?: string;
    rating_count_kinopoisk?: number;
    country?: string;
    genre?: string;
    backdrop_path?: string[];
    duration_secs?: number;
    duration?: string;
    bitrate?: number;
    rating?: number;
    releasedate?: string;
    subtitles?: unknown[];
    title?: string;
}

interface MovieData {
    stream_id: number;
    name: string;
    title?: string;
    year?: string;
    added?: string;
    category_id: string;
    category_ids?: number[];
    container_extension?: string;
    custom_sid?: string;
    direct_source?: string;
}

interface MovieResponse {
    info: MovieInfo;
    movie_data: MovieData;
}

export default function MovieDetailsPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [loading, setLoading] = useState(true);
    const [movie, setMovie] = useState<MovieResponse | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function loadProfile() {
            try {
                const selectedProfile = await db.getSelectedProfile();
                if (!selectedProfile) {
                    router.push('/profiles');
                    return;
                }
                setProfile(selectedProfile);
                loadMovieDetails(selectedProfile, params.id);
            } catch (err) {
                console.error('Error loading profile:', err);
                setError('Failed to load profile');
                setLoading(false);
            }
        }

        loadProfile();
    }, [router, params.id]);

    async function loadMovieDetails(profile: ProfileData, movieId: string) {
        try {
            // Primeiro, verificamos se temos o filme no cache
            const cachedMovies = await db.getMovieStreams(profile.id);
            const cachedMovie = cachedMovies.find(m => m.stream_id.toString() === movieId);

            // Buscar informações detalhadas do filme
            const response = await fetch(
                `/api/iptv/stream?username=${encodeURIComponent(profile.username)}&password=${encodeURIComponent(profile.password)}&url=${encodeURIComponent(profile.url)}&stream_id=${movieId}&stream_type=movie`
            );

            if (!response.ok) {
                throw new Error(`API returned ${response.status}`);
            }

            const data = await response.json();
            if (!data.success) {
                throw new Error(data.message || 'Failed to fetch movie details');
            }

            // Buscar informações adicionais do filme usando a API do player
            const infoApiUrl = `${profile.url}/player_api.php?username=${encodeURIComponent(profile.username)}&password=${encodeURIComponent(profile.password)}&action=get_vod_info&vod_id=${movieId}`;

            const infoResponse = await fetch(
                `/api/iptv/proxy?url=${encodeURIComponent(infoApiUrl)}`
            );

            if (infoResponse.ok) {
                const infoData = await infoResponse.json();
                setMovie(infoData);
            } else {
                // Se não conseguirmos obter informações detalhadas, usamos o que temos do cache
                if (cachedMovie) {
                    setMovie({
                        info: {
                            name: cachedMovie.name,
                            plot: cachedMovie.plot,
                            director: cachedMovie.director,
                            cast: cachedMovie.cast,
                            genre: cachedMovie.genre,
                            rating: parseFloat(cachedMovie.rating),
                            releasedate: cachedMovie.releaseDate,
                            cover_big: cachedMovie.stream_icon
                        },
                        movie_data: {
                            stream_id: cachedMovie.stream_id,
                            name: cachedMovie.name,
                            category_id: cachedMovie.category_id
                        }
                    });
                } else {
                    throw new Error('Failed to fetch movie details');
                }
            }
        } catch (err) {
            console.error('Error loading movie details:', err);
            setError(err instanceof Error ? err.message : 'Error loading movie details');
        } finally {
            setLoading(false);
        }
    }

    const handlePlayClick = () => {
        if (movie) {
            router.push(`/player/movie/${movie.movie_data.stream_id}`);
        }
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-900">
                <Spinner size={12} />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex h-screen flex-col items-center justify-center bg-gray-900 text-white p-4">
                <div className="text-red-500 text-xl mb-4">Error: {error}</div>
                <Link href="/movies" className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded">
                    Return to Movies
                </Link>
            </div>
        );
    }

    if (!movie) {
        return (
            <div className="flex h-screen flex-col items-center justify-center bg-gray-900 text-white p-4">
                <div className="text-xl mb-4">Movie not found</div>
                <Link href="/movies" className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded">
                    Return to Movies
                </Link>
            </div>
        );
    }

    const {
        info,
        movie_data
    } = movie;

    return (
        <div className="min-h-screen bg-gray-900 text-white">
            {/* Header */}
            <div className="bg-gray-800 p-4 flex justify-between items-center shadow-md">
                <div className="flex items-center space-x-4">
                    <Link href="/movies" className="text-blue-400 hover:text-blue-300">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                    </Link>
                    <h1 className="text-xl md:text-2xl font-bold">Movie Details</h1>
                </div>
                <div className="flex items-center">
                    <span className="mr-2">Welcome, {profile?.name}</span>
                    <Link href="/profiles" className="text-sm text-blue-400 hover:text-blue-300">
                        Change
                    </Link>
                </div>
            </div>

            {/* Movie Details */}
            <div className="container mx-auto p-4">
                <div className="bg-gray-800 rounded-lg overflow-hidden shadow-lg">
                    <div className="md:flex">
                        {/* Movie Poster */}
                        <div className="md:w-1/3 relative">
                            <div className="relative h-96 w-full md:h-full">
                                {info.cover_big || info.movie_image ? (
                                    <Image
                                        src={info.cover_big || info.movie_image || ''}
                                        alt={info.name || movie_data.name || 'Movie poster'}
                                        layout="fill"
                                        objectFit="cover"
                                        className="transition-opacity duration-300"
                                        onError={(e) => {
                                            const target = e.target as HTMLImageElement;
                                            target.src = '/placeholder-movie.png';
                                        }}
                                    />
                                ) : (
                                    <div className="flex h-full w-full items-center justify-center bg-gray-700">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                        </svg>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Movie Info */}
                        <div className="md:w-2/3 p-6">
                            <h1 className="text-2xl md:text-3xl font-bold mb-2">
                                {info.name || movie_data.name}
                            </h1>

                            {info.rating && (
                                <div className="flex items-center mb-4">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                    </svg>
                                    <span className="ml-1">{info.rating} / 10</span>
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                {info.genre && (
                                    <div>
                                        <h3 className="text-gray-400 text-sm">Genre</h3>
                                        <p>{info.genre}</p>
                                    </div>
                                )}

                                {info.releasedate && (
                                    <div>
                                        <h3 className="text-gray-400 text-sm">Release Date</h3>
                                        <p>{info.releasedate}</p>
                                    </div>
                                )}

                                {info.duration && (
                                    <div>
                                        <h3 className="text-gray-400 text-sm">Duration</h3>
                                        <p>{info.duration}</p>
                                    </div>
                                )}

                                {info.country && (
                                    <div>
                                        <h3 className="text-gray-400 text-sm">Country</h3>
                                        <p>{info.country}</p>
                                    </div>
                                )}
                            </div>

                            {(info.plot || info.description) && (
                                <div className="mb-6">
                                    <h3 className="text-gray-400 text-sm mb-2">Plot</h3>
                                    <p className="text-gray-200">{info.plot || info.description}</p>
                                </div>
                            )}

                            {info.director && (
                                <div className="mb-4">
                                    <h3 className="text-gray-400 text-sm mb-1">Director</h3>
                                    <p>{info.director}</p>
                                </div>
                            )}

                            {(info.cast || info.actors) && (
                                <div className="mb-6">
                                    <h3 className="text-gray-400 text-sm mb-1">Cast</h3>
                                    <p>{info.cast || info.actors}</p>
                                </div>
                            )}

                            {/* Actor Gallery */}
                            {(info.cast || info.actors) && (
                                <ActorGallery
                                    cast={info.cast || info.actors || ''}
                                    tmdbId={info.tmdb_id}
                                />
                            )}

                            <button
                                onClick={handlePlayClick}
                                className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg flex items-center transition-colors duration-300"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                                </svg>
                                Play Movie
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}