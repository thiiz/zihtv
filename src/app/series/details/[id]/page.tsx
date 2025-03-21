"use client"

import { ProfileData } from '@/@types/ProfileData';
import { Spinner } from '@/components/Spinner';
import { db } from '@/lib/db'; // Importamos a instância do IndexedDB
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Usable, use, useEffect, useState } from 'react';

interface SeriesInfo {
    info: {
        name: string;
        cover: string;
        plot: string;
        cast: string;
        director: string;
        genre: string;
        releaseDate: string;
        rating: string;
        backdrop_path: string;
    };
    seasons: {
        [key: string]: {
            air_date: string;
            episode_count: number;
            name: string;
            overview: string;
            season_number: string;
            cover: string;
            episodes: {
                id: string;
                episode_num: string;
                title: string;
                container_extension: string;
                info: {
                    duration_secs: number;
                    movie_image: string;
                    plot: string;
                };
            }[];
        };
    };
}

export default function SeriesDetailsPage({ params }: { params: Usable<{ id: string }> }) {
    const router = useRouter();
    const unwrappedParams = use(params);
    const seriesId = unwrappedParams?.id;

    const [loading, setLoading] = useState(true);
    const [profileLoading, setProfileLoading] = useState(true);
    const [profile, setProfile] = useState<ProfileData | undefined>(undefined);
    const [seriesInfo, setSeriesInfo] = useState<SeriesInfo | null>(null);
    const [selectedSeason, setSelectedSeason] = useState<string>('');
    const [error, setError] = useState<string | null>(null);

    // Carregar o perfil selecionado do IndexedDB
    useEffect(() => {
        async function loadProfile() {
            try {
                const selectedProfile = await db.getSelectedProfile();
                if (!selectedProfile) {
                    router.push('/profiles');
                    return;
                }
                setProfile(selectedProfile);
            } catch (err) {
                console.error('Error loading profile from DB:', err);
                setError('Failed to load user profile');
            } finally {
                setProfileLoading(false);
            }
        }

        loadProfile();
    }, [router]);

    // Carregar informações da série quando o perfil estiver disponível
    useEffect(() => {
        if (profileLoading || !profile || !seriesId) return;

        async function fetchSeriesInfo() {
            try {
                if (!profile) return
                const { username, password, url } = profile;

                if (!username || !password || !url) {
                    setError('Missing profile information');
                    setLoading(false);
                    return;
                }

                // Construir URL diretamente no formato solicitado
                const apiUrl = `http://${url}/player_api.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&action=get_series_info&series_id=${seriesId}`;

                const response = await fetch(apiUrl);
                if (!response.ok) {
                    throw new Error(`API returned ${response.status}`);
                }

                const data = await response.json();
                if (!data || data.error) {
                    throw new Error(data.error || 'Failed to fetch series info');
                }

                setSeriesInfo(data);

                // Set the first season as the default selected season
                if (data && data.seasons && Object.keys(data.seasons).length > 0) {
                    setSelectedSeason(Object.keys(data.seasons)[0]);
                }

            } catch (err) {
                console.error('Error fetching series info:', err);
                setError(err instanceof Error ? err.message : 'Failed to fetch series info');
            } finally {
                setLoading(false);
            }
        }

        fetchSeriesInfo();
    }, [seriesId, profile, profileLoading]);

    const handleSeasonClick = (seasonNumber: string) => {
        setSelectedSeason(seasonNumber);
    };

    const handleEpisodeClick = (episodeId: string, containerExtension: string) => {
        // Usamos o container como formato principal, mas também podemos especificar um formato alternativo
        // Formato padrão é o container do episódio, mas poderia ser configurável pelo usuário
        router.push(`/player/episode/${episodeId}?username=${encodeURIComponent(profile?.username || '')}&password=${encodeURIComponent(profile?.password || '')}&url=${encodeURIComponent(profile?.url || '')}&container=${containerExtension}`);
    };

    // Mostrar spinner enquanto o perfil ou as informações da série estão carregando
    if (profileLoading || loading) {
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
                <Link href="/series" className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded">
                    Return to Series
                </Link>
            </div>
        );
    }

    if (!seriesInfo) {
        return (
            <div className="flex h-screen flex-col items-center justify-center bg-gray-900 text-white">
                <div className="text-xl mb-4">No information available for this series</div>
                <Link href="/series" className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded">
                    Return to Series
                </Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-900 text-white">
            {/* Header with Back Button */}
            <div className="bg-gray-800 p-4 flex items-center shadow-md">
                <Link href="/series" className="text-blue-400 hover:text-blue-300 mr-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>s
                </Link>
                <h1 className="text-xl md:text-2xl font-bold">{seriesInfo.info.name}</h1>
            </div>

            {/* Series Information */}
            <div className="p-4">
                <div className="bg-gray-800 rounded-lg overflow-hidden shadow-lg mb-6">
                    <div className="md:flex">
                        {/* Cover Image */}
                        <div className="md:w-1/3 relative h-64 md:h-auto">
                            {seriesInfo.info.cover ? (
                                <Image
                                    src={seriesInfo.info.cover}
                                    alt={seriesInfo.info.name}
                                    layout="fill"
                                    objectFit="cover"
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        target.src = '/placeholder-series.png';
                                    }}
                                />
                            ) : (
                                <div className="flex h-full w-full items-center justify-center bg-gray-700">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                                    </svg>
                                </div>
                            )}
                        </div>

                        {/* Series Details */}
                        <div className="md:w-2/3 p-6">
                            <h2 className="text-2xl font-bold mb-4">{seriesInfo.info.name}</h2>

                            {seriesInfo.info.rating && (
                                <div className="mb-3 flex items-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                    </svg>
                                    <span className="ml-1">{seriesInfo.info.rating}</span>
                                </div>
                            )}

                            {seriesInfo.info.plot && (
                                <div className="mb-4">
                                    <h3 className="text-lg font-semibold mb-1">Plot</h3>
                                    <p className="text-gray-300">{seriesInfo.info.plot}</p>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4 mb-4">
                                {seriesInfo.info.genre && (
                                    <div>
                                        <h3 className="text-sm font-semibold text-gray-400">Genre</h3>
                                        <p>{seriesInfo.info.genre}</p>
                                    </div>
                                )}

                                {seriesInfo.info.releaseDate && (
                                    <div>
                                        <h3 className="text-sm font-semibold text-gray-400">Release Date</h3>
                                        <p>{seriesInfo.info.releaseDate}</p>
                                    </div>
                                )}

                                {seriesInfo.info.director && (
                                    <div>
                                        <h3 className="text-sm font-semibold text-gray-400">Director</h3>
                                        <p>{seriesInfo.info.director}</p>
                                    </div>
                                )}

                                {seriesInfo.info.cast && (
                                    <div>
                                        <h3 className="text-sm font-semibold text-gray-400">Cast</h3>
                                        <p className="truncate">{seriesInfo.info.cast}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Seasons and Episodes */}
                {Object.keys(seriesInfo.seasons).length > 0 && (
                    <div className="bg-gray-800 rounded-lg shadow-lg p-4">
                        <h3 className="text-xl font-bold mb-4">Seasons & Episodes</h3>

                        {/* Season Tabs */}
                        <div className="mb-6 overflow-x-auto">
                            <div className="flex space-x-2 pb-2">
                                {Object.keys(seriesInfo.seasons).map((seasonNum) => (
                                    <button
                                        key={seasonNum}
                                        onClick={() => handleSeasonClick(seasonNum)}
                                        className={`px-4 py-2 rounded-full whitespace-nowrap ${selectedSeason === seasonNum
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                            }`}
                                    >
                                        Season {seasonNum}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Episodes List */}
                        {selectedSeason && seriesInfo.seasons[selectedSeason] && (
                            <div>
                                <div className="mb-4">
                                    <h4 className="text-lg font-semibold">
                                        {seriesInfo.seasons[selectedSeason].name}
                                    </h4>
                                    {seriesInfo.seasons[selectedSeason].overview && (
                                        <p className="text-gray-400 mt-1">
                                            {seriesInfo.seasons[selectedSeason].overview}
                                        </p>
                                    )}
                                    {seriesInfo.seasons[selectedSeason].air_date && (
                                        <p className="text-sm text-gray-500 mt-1">
                                            Air Date: {seriesInfo.seasons[selectedSeason].air_date}
                                        </p>
                                    )}
                                </div>

                                <div className="grid gap-3">
                                    {seriesInfo.seasons[selectedSeason].episodes.map((episode) => (
                                        <div
                                            key={episode.id}
                                            className="bg-gray-700 rounded-lg p-4 hover:bg-gray-600 cursor-pointer transition-colors"
                                            onClick={() => handleEpisodeClick(episode.id, episode.container_extension)}
                                        >
                                            <div className="flex items-center">
                                                <div className="flex-shrink-0 w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center mr-4">
                                                    <span className="font-bold">{episode.episode_num}</span>
                                                </div>
                                                <div className="flex-1">
                                                    <h5 className="font-semibold">{episode.title}</h5>
                                                    {episode.info && episode.info.plot && (
                                                        <p className="text-gray-400 text-sm mt-1 line-clamp-2">{episode.info.plot}</p>
                                                    )}
                                                    {episode.info && episode.info.duration_secs && (
                                                        <p className="text-xs text-gray-500 mt-1">
                                                            Duration: {Math.floor(episode.info.duration_secs / 60)} min
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="ml-4">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}