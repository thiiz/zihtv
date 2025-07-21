"use client";

import { ProfileData } from "@/@types/ProfileData";
import Image from '@/components/Image';
import { Spinner } from '@/components/Spinner';
import { db } from "@/lib/db";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface Category {
    category_id: string;
    category_name: string;
}

interface LiveStream {
    stream_id: number;
    name: string;
    stream_icon: string;
    epg_channel_id: string;
    category_id: string;
}

export default function LiveTVPage() {
    const router = useRouter();
    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [loading, setLoading] = useState(true);
    const [contentLoading, setContentLoading] = useState(false);
    const [categories, setCategories] = useState<Category[]>([]);
    const [channels, setChannels] = useState<LiveStream[]>([]);
    const [filteredChannels, setFilteredChannels] = useState<LiveStream[]>([]);
    const [displayedChannels, setDisplayedChannels] = useState<LiveStream[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const channelsPerPage = 40;

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
            const cachedCategories = await db.getLiveCategories(profile.id);
            const cachedChannels = await db.getLiveStreams(profile.id);

            if (cachedCategories.length > 0 && cachedChannels.length > 0) {
                // Usar dados do IndexedDB
                setCategories(cachedCategories);
                setChannels(cachedChannels);
                setFilteredChannels(cachedChannels);
            } else {
                // Fetch categories
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

                setCategories(categoriesData.data || []);

                // Fetch all channels
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

                setCategories(categoriesData.data || []);
                setChannels(channelsData.data || []);
                setFilteredChannels(channelsData.data || []);

                // Armazenar dados no IndexedDB para uso futuro
                await db.saveLiveCategories(profile.id, categoriesData.data || []);
                await db.saveLiveStreams(profile.id, channelsData.data || []);
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
            setFilteredChannels(channels);
        } else {
            setFilteredChannels(channels.filter(channel => channel.category_id === categoryId));
        }
    };

    const handleChannelClick = (streamId: number) => {
        // Formato padrão é ts, mas poderia ser configurável pelo usuário
        const preferredFormat = 'm3u8'; // Opções: 'ts' ou 'm3u8'
        router.push(`/player/live/${streamId}?format=${preferredFormat}`);
    };

    // Load more channels when scrolling
    const loadMoreChannels = () => {
        if (loadingMore || !hasMore) return;

        setLoadingMore(true);
        const nextPage = page + 1;
        const startIndex = (nextPage - 1) * channelsPerPage;
        const endIndex = startIndex + channelsPerPage;
        const newChannels = filteredChannels.slice(startIndex, endIndex);

        if (newChannels.length > 0) {
            setDisplayedChannels(prev => [...prev, ...newChannels]);
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
                loadMoreChannels();
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [loadingMore, hasMore, page, filteredChannels]);

    // Initialize displayed channels when filtered channels change
    useEffect(() => {
        setDisplayedChannels(filteredChannels.slice(0, channelsPerPage));
        setPage(1);
        setHasMore(filteredChannels.length > channelsPerPage);
    }, [filteredChannels]);

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
                    <h1 className="text-xl md:text-2xl font-bold">Live TV</h1>
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
                        All Channels
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

            {/* Channels Grid */}
            <div className="p-4">
                {contentLoading ? (
                    <div className="flex justify-center items-center h-64">
                        <Spinner size={8} />
                    </div>
                ) : filteredChannels.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {displayedChannels.map((channel) => (
                            <div
                                key={channel.stream_id}
                                className="cursor-pointer bg-gray-800 rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300"
                                onClick={() => handleChannelClick(channel.stream_id)}
                            >
                                <div className="relative h-24 w-full bg-gray-700 flex items-center justify-center">
                                    {channel.stream_icon ? (
                                        <Image
                                            src={channel.stream_icon}
                                            alt={channel.name}
                                            width={80}
                                            height={60}
                                            className="max-h-20 object-contain"
                                            onError={(e) => {
                                                const target = e.target as HTMLImageElement;
                                                target.src = '/placeholder-channel.png';
                                            }
                                            }
                                        />
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                        </svg>
                                    )
                                    }
                                </div >
                                <div className="p-3">
                                    <h3 className="text-sm font-medium truncate text-center">{channel.name}</h3>
                                </div>
                            </div >
                        ))
                        }
                        {loadingMore && (
                            <div className="col-span-full flex justify-center py-4">
                                <Spinner size={6} />
                            </div>
                        )}
                    </div >
                ) : (
                    <div className="text-center py-12">
                        <p className="text-gray-400">No channels found in this category</p>
                    </div>
                )}
            </div >
        </div >
    );
}