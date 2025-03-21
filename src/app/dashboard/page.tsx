"use client";

import { ProfileData } from "@/@types/ProfileData";
import { Spinner } from '@/components/Spinner';
import { db } from "@/lib/db";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { MdLiveTv } from "react-icons/md";

export default function Dashboard() {
    const router = useRouter();
    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadingLiveTV, setLoadingLiveTV] = useState(false);
    const [loadingMovies, setLoadingMovies] = useState(false);
    const [loadingSeries, setLoadingSeries] = useState(false);

    // Estados para controlar se os dados já foram baixados
    const [liveTVLoaded, setLiveTVLoaded] = useState(false);
    const [moviesLoaded, setMoviesLoaded] = useState(false);
    const [seriesLoaded, setSeriesLoaded] = useState(false);

    // Funções para navegar para as páginas
    const navigateToLiveTV = () => router.push('/livetv');
    const navigateToMovies = () => router.push('/movies');
    const navigateToSeries = () => router.push('/series');

    // Funções para baixar e armazenar os dados no localStorage
    const downloadLiveTVData = async () => {
        if (!profile) return;
        setLoadingLiveTV(true);
        try {
            // Buscar categorias
            const categoriesResponse = await fetch(
                `/api/iptv/categories?username=${encodeURIComponent(profile.username)}&password=${encodeURIComponent(profile.password)}&url=${encodeURIComponent(profile.url)}&type=live`
            );

            if (!categoriesResponse.ok) {
                throw new Error('Failed to fetch categories');
            }

            const categoriesData = await categoriesResponse.json();
            if (!categoriesData.success) {
                throw new Error(categoriesData.message || 'Failed to fetch categories');
            }

            // Buscar canais
            const channelsResponse = await fetch(
                `/api/iptv/streams?username=${encodeURIComponent(profile.username)}&password=${encodeURIComponent(profile.password)}&url=${encodeURIComponent(profile.url)}&type=live`
            );

            if (!channelsResponse.ok) {
                throw new Error('Failed to fetch channels');
            }

            const channelsData = await channelsResponse.json();
            if (!channelsData.success) {
                throw new Error(channelsData.message || 'Failed to fetch channels');
            }

            // Armazenar dados no IndexedDB
            await db.saveLiveCategories(profile.id, categoriesData.data || []);
            await db.saveLiveStreams(profile.id, channelsData.data || []);

            // Atualizar estado
            setLiveTVLoaded(true);
        } catch (err) {
            console.error('Error downloading Live TV data:', err);
            alert('Erro ao baixar dados de Live TV. Tente novamente.');
        } finally {
            setLoadingLiveTV(false);
        }
    };

    const downloadMoviesData = async () => {
        if (!profile) return;
        setLoadingMovies(true);
        try {
            // Buscar categorias
            const categoriesResponse = await fetch(
                `/api/iptv/categories?username=${encodeURIComponent(profile.username)}&password=${encodeURIComponent(profile.password)}&url=${encodeURIComponent(profile.url)}&type=vod`
            );

            if (!categoriesResponse.ok) {
                throw new Error('Failed to fetch categories');
            }

            const categoriesData = await categoriesResponse.json();
            if (!categoriesData.success) {
                throw new Error(categoriesData.message || 'Failed to fetch categories');
            }

            // Buscar filmes
            const moviesResponse = await fetch(
                `/api/iptv/streams?username=${encodeURIComponent(profile.username)}&password=${encodeURIComponent(profile.password)}&url=${encodeURIComponent(profile.url)}&type=vod`
            );

            if (!moviesResponse.ok) {
                throw new Error('Failed to fetch movies');
            }

            const moviesData = await moviesResponse.json();
            if (!moviesData.success) {
                throw new Error(moviesData.message || 'Failed to fetch movies');
            }

            // Armazenar dados no IndexedDB
            await db.saveMovieCategories(profile.id, categoriesData.data || []);
            await db.saveMovieStreams(profile.id, moviesData.data || []);

            // Atualizar estado
            setMoviesLoaded(true);
        } catch (err) {
            console.error('Error downloading Movies data:', err);
            alert('Erro ao baixar dados de Filmes. Tente novamente.');
        } finally {
            setLoadingMovies(false);
        }
    };

    const downloadSeriesData = async () => {
        if (!profile) return;
        setLoadingSeries(true);
        try {
            // Buscar categorias
            const categoriesResponse = await fetch(
                `/api/iptv/categories?username=${encodeURIComponent(profile.username)}&password=${encodeURIComponent(profile.password)}&url=${encodeURIComponent(profile.url)}&type=series`
            );

            if (!categoriesResponse.ok) {
                throw new Error('Failed to fetch categories');
            }

            const categoriesData = await categoriesResponse.json();
            if (!categoriesData.success) {
                throw new Error(categoriesData.message || 'Failed to fetch categories');
            }

            // Buscar séries
            const seriesResponse = await fetch(
                `/api/iptv/streams?username=${encodeURIComponent(profile.username)}&password=${encodeURIComponent(profile.password)}&url=${encodeURIComponent(profile.url)}&type=series`
            );

            if (!seriesResponse.ok) {
                throw new Error('Failed to fetch series');
            }

            const seriesData = await seriesResponse.json();
            if (!seriesData.success) {
                throw new Error(seriesData.message || 'Failed to fetch series');
            }

            // Armazenar dados no IndexedDB
            await db.saveSeriesCategories(profile.id, categoriesData.data || []);
            await db.saveSeriesStreams(profile.id, seriesData.data || []);

            // Atualizar estado
            setSeriesLoaded(true);
        } catch (err) {
            console.error('Error downloading Series data:', err);
            alert('Erro ao baixar dados de Séries. Tente novamente.');
        } finally {
            setLoadingSeries(false);
        }
    };

    useEffect(() => {
        async function loadProfile() {
            try {
                const selectedProfile = await db.getSelectedProfile();
                if (!selectedProfile) {
                    router.push('/profiles');
                    return;
                }
                setProfile(selectedProfile);

                // Verificar se os dados já estão no IndexedDB
                const liveCategoriesData = await db.getLiveCategories(selectedProfile.id);
                const liveChannelsData = await db.getLiveStreams(selectedProfile.id);
                if (liveCategoriesData.length > 0 && liveChannelsData.length > 0) {
                    setLiveTVLoaded(true);
                }

                const movieCategoriesData = await db.getMovieCategories(selectedProfile.id);
                const movieStreamsData = await db.getMovieStreams(selectedProfile.id);
                if (movieCategoriesData.length > 0 && movieStreamsData.length > 0) {
                    setMoviesLoaded(true);
                }

                const seriesCategoriesData = await db.getSeriesCategories(selectedProfile.id);
                const seriesStreamsData = await db.getSeriesStreams(selectedProfile.id);
                if (seriesCategoriesData.length > 0 && seriesStreamsData.length > 0) {
                    setSeriesLoaded(true);
                }

                setLoading(false);
            } catch (err) {
                console.error('Error loading profile:', err);
                setLoading(false);
            }
        }

        loadProfile();
    }, [router]);

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-900">
                <Spinner size={12} />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-900 text-white">
            {/* Header */}
            <div className="p-6 text-center">
                <h1 className="text-3xl font-bold mb-2">Zihtv</h1>
                <div className="flex justify-center items-center">
                    <p className="text-gray-300">Welcome, {profile?.name}</p>
                    <Link href="/profiles" className="ml-2 text-sm text-blue-400 hover:text-blue-300">
                        Change
                    </Link>
                </div>
            </div>

            {/* Main Content */}
            <div className="p-4 max-w-5xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Live TV Button */}
                    <div className="group">
                        <div
                            onClick={liveTVLoaded ? navigateToLiveTV : downloadLiveTVData}
                            className="h-64 md:h-80 rounded-2xl border-2 border-purple-800 bg-gradient-to-br from-purple-900 to-indigo-900 p-6 flex flex-col items-center justify-center hover:shadow-lg hover:shadow-purple-900/30 hover:scale-105 transition-all duration-300 cursor-pointer"
                        >
                            <div className=" mb-4">
                                {loadingLiveTV ? (
                                    <Spinner size={12} />
                                ) : (
                                    <MdLiveTv className="h-20 w-20 md:h-24 md:w-24 text-purple-300" />
                                )}
                            </div>
                            <span className="text-2xl md:text-3xl font-semibold text-white group-hover:text-purple-200 transition-colors">
                                {liveTVLoaded ? 'Live TV' : loadingLiveTV ? 'Carregando...' : 'Baixar Live TV'}
                            </span>
                            {!liveTVLoaded && !loadingLiveTV && (
                                <p className="text-sm text-gray-400 mt-2">Baixe os dados para assistir</p>
                            )}
                        </div>
                    </div>

                    {/* Movies Button */}
                    <div className="group">
                        <div
                            onClick={moviesLoaded ? navigateToMovies : downloadMoviesData}
                            className="h-64 md:h-80 rounded-2xl border-2 border-blue-800 bg-gradient-to-br from-blue-900 to-indigo-900 p-6 flex flex-col items-center justify-center hover:shadow-lg hover:shadow-blue-900/30 hover:scale-105 transition-all duration-300 cursor-pointer"
                        >
                            <div className="h-20 w-20 md:h-24 md:w-24 mb-4">
                                {loadingMovies ? (
                                    <Spinner size={12} />
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-full w-full text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                                    </svg>
                                )}
                            </div>
                            <span className="text-2xl md:text-3xl font-semibold text-white group-hover:text-blue-200 transition-colors">
                                {moviesLoaded ? 'Movies' : loadingMovies ? 'Carregando...' : 'Baixar Movies'}
                            </span>
                            {!moviesLoaded && !loadingMovies && (
                                <p className="text-sm text-gray-400 mt-2">Baixe os dados para assistir</p>
                            )}
                        </div>
                    </div>

                    {/* Series Button */}
                    <div className="group">
                        <div
                            onClick={seriesLoaded ? navigateToSeries : downloadSeriesData}
                            className="h-64 md:h-80 rounded-2xl border-2 border-green-800 bg-gradient-to-br from-green-900 to-teal-900 p-6 flex flex-col items-center justify-center hover:shadow-lg hover:shadow-green-900/30 hover:scale-105 transition-all duration-300 cursor-pointer"
                        >
                            <div className="h-20 w-20 md:h-24 md:w-24 mb-4">
                                {loadingSeries ? (
                                    <Spinner size={12} />
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-full w-full text-green-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                )}
                            </div>
                            <span className="text-2xl md:text-3xl font-semibold text-white group-hover:text-green-200 transition-colors">
                                {seriesLoaded ? 'Series' : loadingSeries ? 'Carregando...' : 'Baixar Series'}
                            </span>
                            {!seriesLoaded && !loadingSeries && (
                                <p className="text-sm text-gray-400 mt-2">Baixe os dados para assistir</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}