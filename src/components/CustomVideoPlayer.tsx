"use client";

import Hls from 'hls.js';
import { useEffect, useRef, useState } from 'react';

interface CustomVideoPlayerProps {
    streamUrl: string;
    streamType: 'live' | 'movie' | 'episode';
    streamInfo?: {
        title?: string;
        description?: string;
        genre?: string;
        duration?: string | number;
        year?: string;
        director?: string;
        cast?: string;
        [key: string]: string | number | boolean | undefined;
    };
    onBack?: () => void;
    episodeData?: {
        seriesId?: string;
        seasonNumber?: number;
        episodeNumber?: number;
        totalEpisodes?: number;
        nextEpisodeId?: string;
        prevEpisodeId?: string;
    };
}

export function CustomVideoPlayer({
    streamUrl,
    streamType,
    streamInfo,
    onBack,
    episodeData
}: CustomVideoPlayerProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const hlsRef = useRef<Hls | null>(null);
    const playerContainerRef = useRef<HTMLDivElement>(null);

    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showControls, setShowControls] = useState(true);
    const [buffering, setBuffering] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showSubtitles, setShowSubtitles] = useState(false);
    const [controlsTimeout, setControlsTimeout] = useState<NodeJS.Timeout | null>(null);

    // Initialize HLS player
    useEffect(() => {
        if (!streamUrl || !videoRef.current) return;

        // Cleanup previous HLS instance if it exists
        if (hlsRef.current) {
            hlsRef.current.destroy();
            hlsRef.current = null;
        }

        // Check if the URL is an HLS stream
        const isHLSStream = streamUrl.endsWith('.m3u8');

        if (isHLSStream && Hls.isSupported()) {
            const hls = new Hls({
                enableWorker: true,
                lowLatencyMode: streamType === 'live', // Enable low latency for live streams
                backBufferLength: streamType === 'live' ? 30 : 60, // Smaller back buffer for live
            });

            hls.loadSource(streamUrl);
            hls.attachMedia(videoRef.current);
            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                videoRef.current?.play().catch(error => {
                    console.error('Error playing video:', error);
                });
            });

            // Add error handling
            hls.on(Hls.Events.ERROR, (event, data) => {
                if (data.fatal) {
                    switch (data.type) {
                        case Hls.ErrorTypes.NETWORK_ERROR:
                            console.error('Network error, trying to recover...');
                            hls.startLoad();
                            break;
                        case Hls.ErrorTypes.MEDIA_ERROR:
                            console.error('Media error, trying to recover...');
                            hls.recoverMediaError();
                            break;
                        default:
                            console.error('Fatal error, cannot recover:', data);
                            hls.destroy();
                            break;
                    }
                }
            });

            hlsRef.current = hls;
        } else {
            // Fallback to native playback for non-HLS streams
            videoRef.current.src = streamUrl;
        }

        // Cleanup function
        return () => {
            if (hlsRef.current) {
                hlsRef.current.destroy();
                hlsRef.current = null;
            }
        };
    }, [streamUrl, streamType]);

    // Handle video events
    useEffect(() => {
        const videoElement = videoRef.current;
        if (!videoElement) return;

        const handlePlay = () => setIsPlaying(true);
        const handlePause = () => setIsPlaying(false);
        const handleTimeUpdate = () => setCurrentTime(videoElement.currentTime);
        const handleDurationChange = () => setDuration(videoElement.duration);
        const handleVolumeChange = () => {
            setVolume(videoElement.volume);
            setIsMuted(videoElement.muted);
        };
        const handleWaiting = () => setBuffering(true);
        const handlePlaying = () => setBuffering(false);
        const handleEnded = () => {
            setIsPlaying(false);
            // Auto-play next episode if available for series
            if (streamType === 'episode' && episodeData?.nextEpisodeId) {
                // Logic to play next episode would go here
                console.log('Auto-playing next episode:', episodeData.nextEpisodeId);
            }
        };

        // Add event listeners
        videoElement.addEventListener('play', handlePlay);
        videoElement.addEventListener('pause', handlePause);
        videoElement.addEventListener('timeupdate', handleTimeUpdate);
        videoElement.addEventListener('durationchange', handleDurationChange);
        videoElement.addEventListener('volumechange', handleVolumeChange);
        videoElement.addEventListener('waiting', handleWaiting);
        videoElement.addEventListener('playing', handlePlaying);
        videoElement.addEventListener('ended', handleEnded);

        // Cleanup event listeners
        return () => {
            videoElement.removeEventListener('play', handlePlay);
            videoElement.removeEventListener('pause', handlePause);
            videoElement.removeEventListener('timeupdate', handleTimeUpdate);
            videoElement.removeEventListener('durationchange', handleDurationChange);
            videoElement.removeEventListener('volumechange', handleVolumeChange);
            videoElement.removeEventListener('waiting', handleWaiting);
            videoElement.removeEventListener('playing', handlePlaying);
            videoElement.removeEventListener('ended', handleEnded);
        };
    }, [streamType, episodeData]);

    // Handle mouse movement to show/hide controls
    useEffect(() => {
        const container = playerContainerRef.current;
        if (!container) return;

        const handleMouseMove = () => {
            setShowControls(true);

            // Clear existing timeout
            if (controlsTimeout) {
                clearTimeout(controlsTimeout);
            }

            // Set new timeout to hide controls after 3 seconds
            const timeout = setTimeout(() => {
                if (isPlaying) {
                    setShowControls(false);
                }
            }, 3000);

            setControlsTimeout(timeout);
        };

        container.addEventListener('mousemove', handleMouseMove);

        return () => {
            container.removeEventListener('mousemove', handleMouseMove);
            if (controlsTimeout) {
                clearTimeout(controlsTimeout);
            }
        };
    }, [isPlaying, controlsTimeout]);

    // Handle fullscreen changes
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);

        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
        };
    }, []);

    // Player control functions
    const togglePlay = () => {
        if (!videoRef.current) return;

        if (isPlaying) {
            videoRef.current.pause();
        } else {
            videoRef.current.play().catch(error => {
                console.error('Error playing video:', error);
            });
        }
    };

    const toggleMute = () => {
        if (!videoRef.current) return;
        videoRef.current.muted = !videoRef.current.muted;
    };

    const changeVolume = (newVolume: number) => {
        if (!videoRef.current) return;
        videoRef.current.volume = newVolume;
    };

    const seek = (time: number) => {
        if (!videoRef.current) return;
        videoRef.current.currentTime = time;
    };

    const toggleFullscreen = () => {
        const container = playerContainerRef.current;
        if (!container) return;

        if (!document.fullscreenElement) {
            container.requestFullscreen().catch(err => {
                console.error('Error attempting to enable fullscreen:', err);
            });
        } else {
            document.exitFullscreen();
        }
    };

    // Format time (seconds to MM:SS or HH:MM:SS)
    const formatTime = (timeInSeconds: number) => {
        if (isNaN(timeInSeconds)) return '00:00';

        const hours = Math.floor(timeInSeconds / 3600);
        const minutes = Math.floor((timeInSeconds % 3600) / 60);
        const seconds = Math.floor(timeInSeconds % 60);

        if (hours > 0) {
            return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }

        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };

    // Render content-specific controls
    const renderContentSpecificControls = () => {
        switch (streamType) {
            case 'live':
                return (
                    <div className="live-controls bg-gray-800 bg-opacity-80 p-2 rounded-md">
                        <span className="text-red-500 flex items-center">
                            <span className="h-2 w-2 bg-red-500 rounded-full mr-2 animate-pulse"></span>
                            LIVE
                        </span>
                        {/* Channel controls would go here */}
                    </div>
                );

            case 'movie':
                return (
                    <div className="movie-controls flex items-center space-x-4">
                        {/* Chapter selection would go here */}
                        <button
                            onClick={() => setShowSubtitles(!showSubtitles)}
                            className={`p-1 rounded ${showSubtitles ? 'bg-blue-600' : 'bg-gray-700'}`}
                            title="Subtitles"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 4h-1m3 0h-3" />
                            </svg>
                        </button>
                    </div>
                );

            case 'episode':
                return (
                    <div className="episode-controls flex items-center space-x-4">
                        {episodeData?.prevEpisodeId && (
                            <button
                                className="p-1 rounded bg-gray-700 hover:bg-gray-600"
                                title="Previous Episode"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                        )}

                        {episodeData && (
                            <span className="text-sm">
                                S{episodeData.seasonNumber} E{episodeData.episodeNumber}
                            </span>
                        )}

                        {episodeData?.nextEpisodeId && (
                            <button
                                className="p-1 rounded bg-gray-700 hover:bg-gray-600"
                                title="Next Episode"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                        )}
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div
            ref={playerContainerRef}
            className="relative w-full h-full bg-black overflow-hidden"
        >
            {/* Video Element */}
            <video
                ref={videoRef}
                className="w-full h-full object-contain"
                playsInline
                onClick={togglePlay}
            />

            {/* Buffering Indicator */}
            {buffering && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
            )}

            {/* Controls Overlay */}
            <div
                className={`absolute inset-0 flex flex-col justify-between transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}
                style={{ pointerEvents: showControls ? 'auto' : 'none' }}
            >
                {/* Top Controls */}
                <div className="p-4 bg-gradient-to-b from-black to-transparent">
                    <div className="flex justify-between items-center">
                        {/* Back Button */}
                        <button
                            onClick={onBack}
                            className="text-white hover:text-blue-400 transition-colors"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                        </button>
                        {streamInfo?.title && <h1 className="text-lg font-semibold truncate max-w-[70%]">{streamInfo.title}</h1>}
                        <div className="flex items-center space-x-2">
                            {/* Settings button */}
                            <button
                                onClick={() => setShowSettings(!showSettings)}
                                className="text-white hover:text-blue-400 transition-colors"
                                title="Settings"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Center Play/Pause Button */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    {!isPlaying && (
                        <button
                            onClick={togglePlay}
                            className="w-20 h-20 bg-black bg-opacity-50 rounded-full flex items-center justify-center pointer-events-auto"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </button>
                    )}
                </div>

                {/* Bottom Controls */}
                <div className="p-4 bg-gradient-to-t from-black to-transparent">
                    {/* Progress Bar */}
                    <div className="mb-2 relative">
                        <input
                            type="range"
                            min="0"
                            max={duration || 100}
                            value={currentTime}
                            onChange={(e) => seek(parseFloat(e.target.value))}
                            className="w-full h-1 bg-gray-700 rounded-full appearance-none cursor-pointer"
                            style={{
                                background: `linear-gradient(to right, #3b82f6 ${(currentTime / (duration || 1)) * 100}%, #374151 ${(currentTime / (duration || 1)) * 100}%)`
                            }}
                        />
                    </div>

                    <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-4">
                            {/* Play/Pause Button */}
                            <button onClick={togglePlay} className="text-white hover:text-blue-400 transition-colors">
                                {isPlaying ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                )}
                            </button>

                            {/* Volume Control */}
                            <div className="flex items-center space-x-2">
                                <button onClick={toggleMute} className="text-white hover:text-blue-400 transition-colors">
                                    {isMuted || volume === 0 ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" clipRule="evenodd" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                                        </svg>
                                    ) : volume < 0.5 ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" clipRule="evenodd" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072" />
                                        </svg>
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" clipRule="evenodd" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072" />
                                        </svg>
                                    )}
                                </button>
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.01"
                                    value={isMuted ? 0 : volume}
                                    onChange={(e) => changeVolume(parseFloat(e.target.value))}
                                    className="w-16 h-1 bg-gray-700 rounded-full appearance-none cursor-pointer"
                                    style={{
                                        background: `linear-gradient(to right, #3b82f6 ${(isMuted ? 0 : volume) * 100}%, #374151 ${(isMuted ? 0 : volume) * 100}%)`
                                    }}
                                />
                            </div>

                            {/* Time Display */}
                            <div className="text-sm text-gray-300">
                                {formatTime(currentTime)} / {formatTime(duration)}
                            </div>
                        </div>

                        <div className="flex items-center space-x-4">
                            {/* Content-specific controls */}
                            {renderContentSpecificControls()}

                            {/* Fullscreen Button */}
                            <button onClick={toggleFullscreen} className="text-white hover:text-blue-400 transition-colors">
                                {isFullscreen ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M15 9H19.5M15 9V4.5M15 15v4.5M15 15H4.5M15 15h4.5M9 15v4.5" />
                                    </svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
                                    </svg>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Settings Panel */}
            {showSettings && (
                <div className="absolute right-4 bottom-20 bg-gray-800 bg-opacity-90 p-4 rounded-md shadow-lg">
                    <h3 className="text-white font-semibold mb-2">Settings</h3>
                    <div className="space-y-2">
                        {/* Quality settings would go here */}
                        <div className="flex items-center justify-between">
                            <span>Quality</span>
                            <select className="bg-gray-700 text-white rounded px-2 py-1">
                                <option value="auto">Auto</option>
                                <option value="1080p">1080p</option>
                                <option value="720p">720p</option>
                                <option value="480p">480p</option>
                                <option value="360p">360p</option>
                            </select>
                        </div>

                        {/* Playback speed */}
                        <div className="flex items-center justify-between">
                            <span>Speed</span>
                            <select
                                className="bg-gray-700 text-white rounded px-2 py-1"
                                onChange={(e) => {
                                    if (videoRef.current) {
                                        videoRef.current.playbackRate = parseFloat(e.target.value);
                                    }
                                }}
                                defaultValue="1"
                            >
                                <option value="0.5">0.5x</option>
                                <option value="0.75">0.75x</option>
                                <option value="1">Normal</option>
                                <option value="1.25">1.25x</option>
                                <option value="1.5">1.5x</option>
                                <option value="2">2x</option>
                            </select>
                        </div>
                    </div>
                </div>
            )}

            {/* Stream Info (if available) */}
            {streamInfo && (
                <div className="absolute left-0 right-0 bottom-0 p-4 bg-gradient-to-t from-black to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300">
                    <div className="flex flex-col space-y-1">
                        {streamInfo.title && (
                            <h2 className="text-lg font-semibold">{streamInfo.title}</h2>
                        )}
                        {streamInfo.description && (
                            <p className="text-sm text-gray-300">{streamInfo.description}</p>
                        )}
                        <div className="flex flex-wrap gap-2 text-xs text-gray-400">
                            {streamInfo.year && <span>Year: {streamInfo.year}</span>}
                            {streamInfo.genre && <span>• Genre: {streamInfo.genre}</span>}
                            {streamInfo.director && <span>• Director: {streamInfo.director}</span>}
                            {streamInfo.cast && <span>• Cast: {streamInfo.cast}</span>}
                            {streamType === 'live' && streamInfo.channel && <span>• Channel: {streamInfo.channel}</span>}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}