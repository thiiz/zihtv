"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Settings,
  ArrowLeft,
  SkipBack,
  SkipForward,
  Subtitles,
  ChevronLeft,
  ChevronRight,
  Radio,
  Film,
  MonitorPlay,
  Loader2,
  Clock,
  Calendar,
  User,
  Star
} from 'lucide-react';
import Hls from 'hls.js';

interface StreamInfo {
  title?: string;
  description?: string;
  genre?: string;
  duration?: string | number;
  year?: string;
  director?: string;
  cast?: string;
  channel?: string;
  rating?: string;
  season_number?: string;
  episode_number?: string;
  [key: string]: string | number | boolean | undefined;
}

interface EpisodeData {
  seriesId?: string;
  seasonNumber?: number;
  episodeNumber?: number;
  totalEpisodes?: number;
  nextEpisodeId?: string;
  prevEpisodeId?: string;
}

interface CustomVideoPlayerProps {
  streamUrl: string;
  streamType: 'live' | 'movie' | 'episode';
  streamInfo?: StreamInfo;
  onBack?: () => void;
  episodeData?: EpisodeData;
}

export default function CustomVideoPlayer({
  streamUrl,
  streamType,
  streamInfo,
  onBack,
  episodeData
}: CustomVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hlsRef = useRef<Hls | null>(null);

  // Video state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [bufferedTime, setBufferedTime] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);

  // UI state
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quality, setQuality] = useState('auto');

  // Advanced features
  const [showSubtitles, setShowSubtitles] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [autoPlayNext, setAutoPlayNext] = useState(true);

  // Performance optimization: Update progress less frequently
  const updateProgress = useCallback(() => {
    if (videoRef.current && !isDragging) {
      setCurrentTime(videoRef.current.currentTime);

      // Update buffered time
      const video = videoRef.current;
      if (video.buffered.length > 0) {
        const buffered = video.buffered.end(video.buffered.length - 1);
        setBufferedTime(buffered);
      }
    }
  }, [isDragging]);

  // Apply volume, mute, and playback rate changes
  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.volume = volume;
    }
  }, [volume]);

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.muted = isMuted;
    }
  }, [isMuted]);

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  // Initialize video and handle events
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !streamUrl) return;

    // Reset states
    setError(null);
    setIsBuffering(true);

    // Set initial volume
    video.volume = volume;
    video.muted = isMuted;
    video.playbackRate = playbackRate;

    // Load video source
    if (streamUrl.endsWith('.m3u8')) {
      if (Hls.isSupported()) {
        const hls = new Hls();
        hlsRef.current = hls;
        hls.loadSource(streamUrl);
        hls.attachMedia(video);
        hls.on(Hls.Events.ERROR, (event, data) => {
          if (data.fatal) {
            setError(`Playback error: ${data.details}`);
            console.error(`HLS.js fatal error: ${data.details}`, data);
          } else {
            console.warn(`HLS.js non-fatal error: ${data.details}`, data)
          }
        });
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        // Native HLS support (e.g., Safari)
        video.src = streamUrl;
      } else {
        setError('HLS playback is not supported in this browser.');
        setIsBuffering(false);
      }
    } else {
      video.src = streamUrl;
    }

    const handleLoadStart = () => setIsBuffering(true);
    const handleLoadedMetadata = () => {
      setDuration(video.duration);
      setIsBuffering(false);
    };
    const handleCanPlay = () => setIsBuffering(false);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleWaiting = () => setIsBuffering(true);
    const handlePlaying = () => setIsBuffering(false);
    const handleTimeUpdate = updateProgress;
    const handleVolumeChange = () => {
      setVolume(video.volume);
      setIsMuted(video.muted);
    };
    const handleError = (e: Event) => {
      const target = e.target as HTMLVideoElement;
      // Avoid showing generic error if HLS.js is handling it
      if (!hlsRef.current) {
        setError(`Video error: ${target.error?.message || 'Unknown error'}`);
      }
      setIsBuffering(false);
    };
    const handleEnded = () => {
      setIsPlaying(false);
      if (streamType === 'episode' && episodeData?.nextEpisodeId && autoPlayNext) {
        // Auto-play next episode logic would be implemented here
        console.log('Auto-playing next episode...');
      }
    };

    // Add event listeners
    video.addEventListener('loadstart', handleLoadStart);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('playing', handlePlaying);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('volumechange', handleVolumeChange);
    video.addEventListener('error', handleError);
    video.addEventListener('ended', handleEnded);

    // Cleanup
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      video.removeEventListener('loadstart', handleLoadStart);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('playing', handlePlaying);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('volumechange', handleVolumeChange);
      video.removeEventListener('error', handleError);
      video.removeEventListener('ended', handleEnded);
      video.src = '';
    };
  }, [streamUrl, updateProgress, streamType, episodeData, autoPlayNext]);

  // Handle mouse movement and controls visibility
  useEffect(() => {
    const container = playerContainerRef.current;
    if (!container) return;

    const showControlsWithTimeout = () => {
      setShowControls(true);

      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }

      controlsTimeoutRef.current = setTimeout(() => {
        if (isPlaying) {
          setShowControls(false);
        }
      }, 3000);
    };

    const handleMouseMove = showControlsWithTimeout;
    const handleMouseEnter = () => setShowControls(true);
    const handleMouseLeave = () => {
      if (isPlaying) {
        setShowControls(false);
      }
    };

    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mouseenter', handleMouseEnter);
    container.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseenter', handleMouseEnter);
      container.removeEventListener('mouseleave', handleMouseLeave);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [isPlaying]);

  // Handle fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!videoRef.current) return;

      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlayPause();
          break;
        case 'm':
          toggleMute();
          break;
        case 'f':
          toggleFullscreen();
          break;
        case 'ArrowLeft':
          seek(currentTime - 10);
          break;
        case 'ArrowRight':
          seek(currentTime + 10);
          break;
        case 'ArrowUp':
          e.preventDefault();
          changeVolume(Math.min(1, volume + 0.1));
          break;
        case 'ArrowDown':
          e.preventDefault();
          changeVolume(Math.max(0, volume - 0.1));
          break;
        case 'Escape':
          if (isFullscreen) {
            document.exitFullscreen();
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [currentTime, volume, isFullscreen]);

  // Control functions
  const togglePlayPause = useCallback(() => {
    if (!videoRef.current) return;

    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play().catch(console.error);
    }
  }, [isPlaying]);

  const toggleMute = useCallback(() => {
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
  }, []);

  const changeVolume = useCallback((newVolume: number) => {
    if (!videoRef.current) return;
    videoRef.current.volume = Math.max(0, Math.min(1, newVolume));
  }, []);

  const seek = useCallback((time: number) => {
    if (!videoRef.current) return;
    const clampedTime = Math.max(0, Math.min(duration, time));
    const wasPlaying = isPlaying;
    videoRef.current.currentTime = clampedTime;
    setCurrentTime(clampedTime);

    // Resume playback if video was playing before seeking
    if (wasPlaying) {
      videoRef.current.play().catch(console.error);
    }
  }, [duration, isPlaying]);

  const toggleFullscreen = useCallback(() => {
    const container = playerContainerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen().catch(console.error);
    } else {
      document.exitFullscreen();
    }
  }, []);

  const changePlaybackRate = useCallback((rate: number) => {
    if (!videoRef.current) return;
    videoRef.current.playbackRate = rate;
    setPlaybackRate(rate);
  }, []);

  // Utility functions
  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '00:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return h > 0 ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}` : `${m}:${s.toString().padStart(2, '0')}`;
  };

  const getStreamTypeIcon = () => {
    switch (streamType) {
      case 'live': return <Radio className="w-4 h-4" />;
      case 'movie': return <Film className="w-4 h-4" />;
      case 'episode': return <MonitorPlay className="w-4 h-4" />;
      default: return null;
    }
  };

  const renderStreamInfo = () => {
    if (!streamInfo) return null;

    return (
      <div className="bg-black/80 backdrop-blur-sm p-4 rounded-lg max-w-md">
        <div className="flex items-center gap-2 mb-2">
          {getStreamTypeIcon()}
          <span className="text-sm font-medium text-blue-400 uppercase tracking-wide">
            {streamType === 'live' ? 'Live TV' : streamType === 'movie' ? 'Movie' : 'Episode'}
          </span>
        </div>

        <h3 className="text-lg font-semibold mb-2 text-white">{streamInfo.title}</h3>

        {streamInfo.description && (
          <p className="text-sm text-gray-300 mb-3 line-clamp-3">{streamInfo.description}</p>
        )}

        <div className="grid grid-cols-2 gap-2 text-xs text-gray-400">
          {streamInfo.year && (
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>{streamInfo.year}</span>
            </div>
          )}
          {streamInfo.genre && (
            <div className="flex items-center gap-1">
              <Star className="w-3 h-3" />
              <span>{streamInfo.genre}</span>
            </div>
          )}
          {streamInfo.director && (
            <div className="flex items-center gap-1">
              <User className="w-3 h-3" />
              <span>{streamInfo.director}</span>
            </div>
          )}
          {streamInfo.rating && (
            <div className="flex items-center gap-1">
              <Star className="w-3 h-3" />
              <span>{streamInfo.rating}</span>
            </div>
          )}
          {streamType === 'episode' && episodeData && (
            <div className="col-span-2 text-blue-400">
              S{episodeData.seasonNumber} E{episodeData.episodeNumber}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderContentSpecificControls = () => {
    switch (streamType) {
      case 'live':
        return (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-red-600 px-2 py-1 rounded-full text-xs font-medium">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
              LIVE
            </div>
          </div>
        );

      case 'episode':
        return (
          <div className="flex items-center gap-2">
            {episodeData?.prevEpisodeId && (
              <button
                className="p-2 hover:bg-white/20 rounded-full transition-colors"
                title="Previous Episode"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}

            {episodeData && (
              <span className="text-sm font-medium px-2">
                S{episodeData.seasonNumber} E{episodeData.episodeNumber}
              </span>
            )}

            {episodeData?.nextEpisodeId && (
              <button
                className="p-2 hover:bg-white/20 rounded-full transition-colors"
                title="Next Episode"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            )}
          </div>
        );

      case 'movie':
        return (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSubtitles(!showSubtitles)}
              className={`p-2 rounded-full transition-colors ${showSubtitles ? 'bg-blue-600' : 'hover:bg-white/20'}`}
              title="Subtitles"
            >
              <Subtitles className="w-5 h-5" />
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-black text-white">
        <div className="text-center p-8">
          <div className="text-red-500 text-6xl mb-4">⚠</div>
          <h3 className="text-xl mb-2">Playback Error</h3>
          <p className="text-gray-400 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={playerContainerRef}
      className="relative w-full h-full bg-black overflow-hidden group"
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        className="w-full h-full object-contain cursor-pointer"
        playsInline
        onClick={togglePlayPause}
        onDoubleClick={toggleFullscreen}
      />

      {/* Loading/Buffering Overlay */}
      {isBuffering && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
            <span className="text-white text-sm">Loading...</span>
          </div>
        </div>
      )}

      {/* Controls Overlay */}
      <div
        className={`absolute inset-0 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0'
        } ${showControls ? 'pointer-events-auto' : 'pointer-events-none'}`}
      >
        {/* Top Bar */}
        <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/80 to-transparent">
          <div className="flex items-center justify-between">
            <button
              onClick={onBack}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>

            <div className="flex-1 px-4">
              {streamInfo?.title && (
                <h1 className="text-lg font-semibold truncate">{streamInfo.title}</h1>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowInfo(!showInfo)}
                className="p-2 hover:bg-white/20 rounded-full transition-colors"
                title="Info"
              >
                <Clock className="w-5 h-5" />
              </button>
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-2 hover:bg-white/20 rounded-full transition-colors"
                title="Settings"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Center Play Button */}
        {!isPlaying && !isBuffering && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <button
              onClick={togglePlayPause}
              className="w-20 h-20 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center transition-colors pointer-events-auto"
            >
              <Play className="w-10 h-10 ml-1" fill="currentColor" />
            </button>
          </div>
        )}

        {/* Bottom Controls */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
          {/* Progress Bar */}
          <div className="mb-4">
            <div className="relative h-1 bg-white/20 rounded-full cursor-pointer group"
              onClick={(e) => {
                const container = e.currentTarget;
                const rect = container.getBoundingClientRect();
                const pos = (e.clientX - rect.left) / rect.width;
                const newTime = pos * duration;

                // Apply the new time
                if (videoRef.current) {
                  videoRef.current.currentTime = newTime;
                  setCurrentTime(newTime);

                  // Resume playback if video was playing
                  if (isPlaying) {
                    videoRef.current.play().catch(console.error);
                  }
                }
              }}>
              {/* Buffered progress */}
              <div
                className="absolute top-0 left-0 h-full bg-white/30 rounded-full"
                style={{ width: `${(bufferedTime / duration) * 100 || 0}%` }}
              />
              {/* Current progress */}
              <div
                className="absolute top-0 left-0 h-full bg-blue-500 rounded-full"
                style={{ width: `${(currentTime / duration) * 100 || 0}%` }}
              />
              {/* Scrubber */}
              <input
                type="range"
                min="0"
                max={duration || 100}
                value={currentTime}
                onChange={(e) => {
                  setIsDragging(true);
                  const time = parseFloat(e.target.value);
                  setCurrentTime(time);
                  // Update video time directly
                  if (videoRef.current) {
                    videoRef.current.currentTime = time;
                  }
                }}
                onMouseUp={() => {
                  setIsDragging(false);
                  // Resume playback if it was playing
                  if (isPlaying && videoRef.current) {
                    videoRef.current.play().catch(console.error);
                  }
                }}
                onTouchEnd={() => {
                  setIsDragging(false);
                  // Resume playback if it was playing
                  if (isPlaying && videoRef.current) {
                    videoRef.current.play().catch(console.error);
                  }
                }}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div
                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-blue-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ left: `${(currentTime / duration) * 100 || 0}%`, transform: 'translateX(-50%) translateY(-50%)' }}
              />
            </div>
          </div>

          {/* Control Bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Play/Pause */}
              <button onClick={togglePlayPause} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" fill="currentColor" />}
              </button>

              {/* Skip buttons for episodes */}
              {streamType === 'episode' && (
                <>
                  <button className="p-2 hover:bg-white/20 rounded-full transition-colors">
                    <SkipBack className="w-5 h-5" />
                  </button>
                  <button className="p-2 hover:bg-white/20 rounded-full transition-colors">
                    <SkipForward className="w-5 h-5" />
                  </button>
                </>
              )}

              {/* Volume */}
              <div className="flex items-center gap-2 group/volume">
                <button onClick={toggleMute} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                  {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </button>
                <div className="w-0 group-hover/volume:w-20 transition-all duration-200 overflow-hidden">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={isMuted ? 0 : volume}
                    onChange={(e) => changeVolume(parseFloat(e.target.value))}
                    className="w-20 h-1 bg-white/20 rounded-full appearance-none cursor-pointer slider"
                  />
                </div>
              </div>

              {/* Time Display */}
              <div className="text-sm text-white/80 font-mono">
                {formatTime(currentTime)} / {formatTime(duration)}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Content-specific controls */}
              {renderContentSpecificControls()}

              {/* Fullscreen */}
              <button onClick={toggleFullscreen} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="absolute right-4 bottom-20 bg-black/90 backdrop-blur-sm p-4 rounded-lg shadow-xl min-w-48">
            <h3 className="text-white font-semibold mb-3">Settings</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Quality</span>
                <select
                  value={quality}
                  onChange={(e) => setQuality(e.target.value)}
                  className="bg-white/10 text-white text-sm rounded px-2 py-1 border-0 outline-0"
                >
                  <option value="auto">Auto</option>
                  <option value="1080p">1080p</option>
                  <option value="720p">720p</option>
                  <option value="480p">480p</option>
                  <option value="360p">360p</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm">Speed</span>
                <select
                  value={playbackRate}
                  onChange={(e) => changePlaybackRate(parseFloat(e.target.value))}
                  className="bg-white/10 text-white text-sm rounded px-2 py-1 border-0 outline-0"
                >
                  <option value="0.5">0.5x</option>
                  <option value="0.75">0.75x</option>
                  <option value="1">Normal</option>
                  <option value="1.25">1.25x</option>
                  <option value="1.5">1.5x</option>
                  <option value="2">2x</option>
                </select>
              </div>

              {streamType === 'episode' && (
                <div className="flex items-center justify-between">
                  <span className="text-sm">Auto-play Next</span>
                  <button
                    onClick={() => setAutoPlayNext(!autoPlayNext)}
                    className={`w-10 h-5 rounded-full transition-colors relative ${
                      autoPlayNext ? 'bg-blue-600' : 'bg-white/20'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform ${
                        autoPlayNext ? 'translate-x-5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Info Panel */}
        {showInfo && streamInfo && (
          <div className="absolute left-4 bottom-20">
            {renderStreamInfo()}
          </div>
        )}
      </div>

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
        }

        .slider::-webkit-slider-track {
          width: 100%;
          height: 4px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 2px;
        }

        .line-clamp-3 {
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
}