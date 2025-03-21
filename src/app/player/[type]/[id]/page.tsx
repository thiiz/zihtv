"use client";

import { ProfileData } from '@/@types/ProfileData';
import { CustomVideoPlayer } from '@/components/CustomVideoPlayer';
import { Spinner } from '@/components/Spinner';
import { db } from '@/lib/db';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Usable, use, useEffect, useState } from 'react';

// Define an interface for the stream information
interface StreamInfo {
    title: string;
    description?: string;
    genre?: string;
    duration?: string | number;
    year?: string;
    director?: string;
    cast?: string;
    [key: string]: string | number | boolean | undefined; // More specific type for additional properties
}

export default function PlayerPage({ params }: {
    params: Usable<{ type: string; id: string; container: string; ext: string }>;
    searchParams: { [key: string]: string | string[] | undefined }
}) {
    const { type, id, container, ext } = use(params)

    const [profile, setProfile] = useState<ProfileData | null>(null);

    const [loading, setLoading] = useState(true);
    const [streamUrl, setStreamUrl] = useState<string | null>(null);
    const [streamInfo, setStreamInfo] = useState<StreamInfo | undefined>(undefined);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter()
    // Video player is now handled by the CustomVideoPlayer component

    // Load profile from IndexedDB
    useEffect(() => {
        async function loadProfile() {
            try {
                const selectedProfile = await db.getSelectedProfile();
                if (!selectedProfile) {
                    setError('No profile selected. Please select a profile first.');
                    setLoading(false);
                    return;
                }
                setProfile(selectedProfile);
            } catch (err) {
                console.error('Error loading profile:', err);
                setError('Failed to load profile');
                setLoading(false);
            }
        }

        loadProfile();
    }, []);

    // Fetch stream info when profile is loaded
    useEffect(() => {
        if (!profile || !id || !type) {
            if (profile && (!id || !type)) {
                setError('Missing required parameters');
                setLoading(false);
            }
            return;
        }

        const { username, password, url } = profile;

        async function fetchStreamInfo() {
            try {
                let streamType = '';
                let apiUrl = '';

                switch (type) {
                    case 'live':
                        streamType = 'Live TV';
                        apiUrl = `/api/iptv/stream?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&url=${encodeURIComponent(url)}&stream_id=${id}&stream_type=live${ext ? `&ext=m3u8` : ''}`;
                        break;
                    case 'movie':
                        streamType = 'Movie';
                        apiUrl = `/api/iptv/stream?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&url=${encodeURIComponent(url)}&stream_id=${id}&stream_type=movie${ext ? `&ext=${ext}` : ''}`;
                        break;
                    case 'episode':
                        streamType = 'Episode';
                        apiUrl = `/api/iptv/stream?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&url=${encodeURIComponent(url)}&stream_id=${id}&stream_type=series${container ? `&container=${container}` : ''}${ext ? `&ext=${ext}` : ''}`;
                        break;
                    default:
                        throw new Error('Invalid content type');
                }

                const response = await fetch(apiUrl);
                if (!response.ok) {
                    throw new Error(`API returned ${response.status}`);
                }

                const data = await response.json();
                if (!data.success) {
                    throw new Error(data.message || 'Failed to fetch stream URL');
                }

                setStreamInfo({
                    title: data.info?.title || `${streamType} Stream`,
                    description: data.info?.description || '',
                    ...data.info
                });

                setStreamUrl(data.streamUrl);
            } catch (err) {
                console.error('Error fetching stream URL:', err);
                setError(err instanceof Error ? err.message : 'Failed to fetch stream URL');
            } finally {
                setLoading(false);
            }
        }

        fetchStreamInfo();
    }, [id, type, profile, container, ext]);

    // HLS initialization is now handled by the CustomVideoPlayer component

    // Determine return link based on content type
    const getReturnLink = () => {
        switch (type) {
            case 'live':
                return '/livetv';
            case 'movie':
                return '/movies';
            case 'episode':
                return '/series';
            default:
                return '/dashboard';
        }
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-black">
                <Spinner size={12} color="border-blue-500" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex h-screen flex-col items-center justify-center bg-black text-white p-4">
                <div className="text-red-500 text-xl mb-4">Error: {error}</div>
                <Link href={getReturnLink()} className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded">
                    Return to {type === 'live' ? 'Live TV' : type === 'movie' ? 'Movies' : 'Series'}
                </Link>
            </div>
        );
    }

    if (!streamUrl) {
        return (
            <div className="flex h-screen flex-col items-center justify-center bg-black text-white">
                <div className="text-xl mb-4">No stream URL available</div>
                <Link href={getReturnLink()} className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded">
                    Return to {type === 'live' ? 'Live TV' : type === 'movie' ? 'Movies' : 'Series'}
                </Link>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen bg-black text-white">
            <div className="flex-1 w-full relative">
                <CustomVideoPlayer
                    streamUrl={streamUrl}
                    streamType={type as 'live' | 'movie' | 'episode'}
                    streamInfo={streamInfo}
                    onBack={() => router.push(getReturnLink())}
                    episodeData={type === 'episode' ? {
                        seasonNumber: parseInt(streamInfo?.season_number as string) || undefined,
                        episodeNumber: parseInt(streamInfo?.episode_number as string) || undefined,
                    } : undefined}
                />
            </div>
        </div>
    );
}