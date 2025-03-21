'use client'

import { ProfileData } from '@/@types/ProfileData';
import Image from '@/components/Image';
import { Spinner } from '@/components/Spinner';
import { db } from '@/lib/db';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

interface Category {
    category_id: string;
    category_name: string;
}

interface Series {
    series_id: number;
    name: string;
    cover: string;
    plot: string;
    cast: string;
    director: string;
    genre: string;
    releaseDate: string;
    rating: string;
    category_id: string;
}

export default function SeriesPage() {
    const router = useRouter();
    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [loading, setLoading] = useState(true);
    const [contentLoading, setContentLoading] = useState(false);
    const [categories, setCategories] = useState<Category[]>([]);
    const [seriesList, setSeriesList] = useState<Series[]>([]);
    const [filteredSeries, setFilteredSeries] = useState<Series[]>([]);
    const [displayedSeries, setDisplayedSeries] = useState<Series[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const seriesPerPage = 30;

    useEffect(() => {
        async function loadProfile() {
            try {
                const selectedProfile = await db.getSelectedProfile();
                if (!selectedProfile) {
                    router.push('/profiles');
                    return;
                }
                setProfile(selectedProfile);
                loadContent(selectedProfile);
            } catch (err) {
                console.error('Error loading profile:', err);
                setError('Failed to load profile');
                setLoading(false);
            }
        }

        loadProfile();
    }, [router]);

    async function loadContent(profile: ProfileData) {
        setContentLoading(true);
        try {
            // Verificar se os dados já estão no IndexedDB
            const cachedCategories = await db.getSeriesCategories(profile.id);
            const cachedSeries = await db.getSeriesStreams(profile.id);

            if (cachedCategories.length > 0 && cachedSeries.length > 0) {
                // Usar dados do IndexedDB
                setCategories(cachedCategories);
                setSeriesList(cachedSeries);
                setFilteredSeries(cachedSeries);
            } else {
                // Fetch categories
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

                setCategories(categoriesData.data || []);

                // Fetch all series
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

                setSeriesList(seriesData.data || []);
                setFilteredSeries(seriesData.data || []);

                // Armazenar dados no IndexedDB para uso futuro
                await db.saveSeriesCategories(profile.id, categoriesData.data || []);
                await db.saveSeriesStreams(profile.id, seriesData.data || []);
            }

        } catch (err) {
            console.error('Error loading content:', err);
            setError(err instanceof Error ? err.message : 'Error loading content');
        } finally {
            setContentLoading(false);
            setLoading(false);
        }
    }

    const handleCategoryClick = (categoryId: string) => {
        setSelectedCategory(categoryId);
        setPage(1); // Reset page when changing category
        if (categoryId === 'all') {
            setFilteredSeries(seriesList);
        } else {
            setFilteredSeries(seriesList.filter(series => series.category_id === categoryId));
        }
    };

    const handleSeriesClick = (seriesId: number) => {
        router.push(`/series/details/${seriesId}`);
    };

    // Load more series when scrolling
    const loadMoreSeries = useCallback(() => {
        if (loadingMore || !hasMore) return;

        setLoadingMore(true);
        const nextPage = page + 1;
        const startIndex = (nextPage - 1) * seriesPerPage;
        const endIndex = startIndex + seriesPerPage;
        const newSeries = filteredSeries.slice(startIndex, endIndex);

        if (newSeries.length > 0) {
            setDisplayedSeries(prev => [...prev, ...newSeries]);
            setPage(nextPage);
        } else {
            setHasMore(false);
        }

        setLoadingMore(false);
    }, [loadingMore, hasMore, page, filteredSeries, seriesPerPage]);

    // Handle scroll event for infinite scrolling
    useEffect(() => {
        const handleScroll = () => {
            if (window.innerHeight + document.documentElement.scrollTop >= document.documentElement.offsetHeight - 100) {
                loadMoreSeries();
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [loadMoreSeries]);

    // Initialize displayed series when filtered series change
    useEffect(() => {
        setDisplayedSeries(filteredSeries.slice(0, seriesPerPage));
        setPage(1);
        setHasMore(filteredSeries.length > seriesPerPage);
    }, [filteredSeries]);

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
                <Link href="/dashboard" className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded">
                    Return to Dashboard
                </Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-900 text-white">
            {/* Header */}
            <div className="bg-gray-800 p-4 flex justify-between items-center shadow-md">
                <div className="flex items-center space-x-4">
                    <Link href="/dashboard" className="text-blue-400 hover:text-blue-300">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                    </Link>
                    <h1 className="text-xl md:text-2xl font-bold">TV Series</h1>
                </div>
                <div className="flex items-center">
                    <span className="mr-2">Welcome, {profile?.name}</span>
                    <Link href="/profiles" className="text-sm text-blue-400 hover:text-blue-300">
                        Change
                    </Link>
                </div>
            </div>

            {/* Categories */}
            <div className="p-4 bg-gray-800 overflow-x-auto">
                <div className="flex space-x-2 pb-2">
                    <button
                        onClick={() => handleCategoryClick('all')}
                        className={`px-4 py-2 rounded-full whitespace-nowrap ${selectedCategory === 'all'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            }`}
                    >
                        All Series
                    </button>
                    {categories.map((category) => (
                        <button
                            key={category.category_id}
                            onClick={() => handleCategoryClick(category.category_id)}
                            className={`px-4 py-2 rounded-full whitespace-nowrap ${selectedCategory === category.category_id
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                }`}
                        >
                            {category.category_name}
                        </button>
                    ))}
                </div>
            </div>

            {/* Series Grid */}
            <div className="p-4">
                {contentLoading ? (
                    <div className="flex justify-center items-center h-64">
                        <Spinner size={8} />
                    </div>
                ) : filteredSeries.length > 0 ? (
                    <>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {displayedSeries.map((series) => (
                                <div
                                    key={series.series_id}
                                    className="cursor-pointer bg-gray-800 rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300"
                                    onClick={() => handleSeriesClick(series.series_id)}
                                >
                                    <div className="relative h-48 w-full">
                                        {series.cover ? (
                                            <Image
                                                src={series.cover}
                                                alt={series.name}
                                                layout="fill"
                                                objectFit="cover"
                                                className="transition-opacity duration-300"
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
                                    <div className="p-3">
                                        <h3 className="text-sm font-medium truncate">{series.name}</h3>
                                        {series.rating && (
                                            <div className="flex items-center mt-1">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                                </svg>
                                                <span className="text-xs ml-1">{series.rating}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                        {loadingMore && (
                            <div className="flex justify-center items-center py-4">
                                <Spinner size={6} />
                            </div>
                        )}
                        {!hasMore && filteredSeries.length > seriesPerPage && (
                            <div className="text-center py-4 text-gray-400">
                                No more series to load
                            </div>
                        )}
                    </>
                ) : (
                    <div className="text-center py-12">
                        <p className="text-gray-400">No series found in this category</p>
                    </div>
                )}
            </div>
        </div>
    );
}