'use client'

import { ProfileData } from '@/@types/ProfileData';
import Image from '@/components/Image';
import { Spinner } from '@/components/Spinner';
import { db } from '@/lib/db';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface Category {
    category_id: string;
    category_name: string;
}

interface Movie {
    stream_id: number;
    name: string;
    stream_icon: string;
    rating: string;
    plot: string;
    director: string;
    cast: string;
    genre: string;
    releaseDate: string;
    category_id: string;
}

export default function MoviesPage() {
    const router = useRouter();
    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [loading, setLoading] = useState(true);
    const [contentLoading, setContentLoading] = useState(false);
    const [categories, setCategories] = useState<Category[]>([]);
    const [movies, setMovies] = useState<Movie[]>([]);
    const [filteredMovies, setFilteredMovies] = useState<Movie[]>([]);
    const [displayedMovies, setDisplayedMovies] = useState<Movie[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const moviesPerPage = 30;

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
            const cachedCategories = await db.getMovieCategories(profile.id);
            const cachedMovies = await db.getMovieStreams(profile.id);

            if (cachedCategories.length > 0 && cachedMovies.length > 0) {
                // Usar dados do IndexedDB
                setCategories(cachedCategories);
                setMovies(cachedMovies);
                setFilteredMovies(cachedMovies);
            } else {
                // Fetch categories
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

                setCategories(categoriesData.data || []);

                // Fetch all movies
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

                setMovies(moviesData.data || []);
                setFilteredMovies(moviesData.data || []);

                // Armazenar dados no IndexedDB para uso futuro
                await db.saveMovieCategories(profile.id, categoriesData.data || []);
                await db.saveMovieStreams(profile.id, moviesData.data || []);
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
            setFilteredMovies(movies);
        } else {
            setFilteredMovies(movies.filter(movie => movie.category_id === categoryId));
        }
    };

    const handleMovieClick = (streamId: number) => {
        // Redirecionar para a página de detalhes do filme em vez do player
        router.push(`/movies/${streamId}`);
    };

    // Load more movies when scrolling
    const loadMoreMovies = () => {
        if (loadingMore || !hasMore) return;

        setLoadingMore(true);
        const nextPage = page + 1;
        const startIndex = (nextPage - 1) * moviesPerPage;
        const endIndex = startIndex + moviesPerPage;
        const newMovies = filteredMovies.slice(startIndex, endIndex);

        if (newMovies.length > 0) {
            setDisplayedMovies(prev => [...prev, ...newMovies]);
            setPage(nextPage);
        } else {
            setHasMore(false);
        }

        setLoadingMore(false);
    };

    // Handle scroll event for infinite scrolling
    useEffect(() => {
        const handleScroll = () => {
            if (window.innerHeight + document.documentElement.scrollTop >= document.documentElement.offsetHeight - 100) {
                loadMoreMovies();
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [loadingMore, hasMore, page, filteredMovies]);

    // Initialize displayed movies when filtered movies change
    useEffect(() => {
        setDisplayedMovies(filteredMovies.slice(0, moviesPerPage));
        setPage(1);
        setHasMore(filteredMovies.length > moviesPerPage);
    }, [filteredMovies]);

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
                    <h1 className="text-xl md:text-2xl font-bold">Movies</h1>
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
                        All Movies
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

            {/* Movies Grid */}
            <div className="p-4">
                {contentLoading ? (
                    <div className="flex justify-center items-center h-64">
                        <Spinner size={8} />
                    </div>
                ) : displayedMovies.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {displayedMovies.map((movie) => (
                            <div
                                key={movie.stream_id}
                                className="cursor-pointer bg-gray-800 rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300"
                                onClick={() => handleMovieClick(movie.stream_id)}
                            >
                                <div className="relative h-48 w-full">
                                    {movie.stream_icon ? (
                                        <Image
                                            src={movie.stream_icon}
                                            alt={movie.name}
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
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                            </svg>
                                        </div>
                                    )}
                                </div>
                                <div className="p-3">
                                    <h3 className="text-sm font-medium truncate">{movie.name}</h3>
                                    {movie.rating && (
                                        <div className="flex items-center mt-1">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                            </svg>
                                            <span className="text-xs ml-1">{movie.rating}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12">
                        <p className="text-gray-400">No movies found in this category</p>
                    </div>
                )}
            </div>
        </div>
    );
}