"use client";

import { ProfileData } from '@/@types/ProfileData';
import CustomVideoPlayer from '@/components/CustomVideoPlayer'; // Import correto
import { Spinner } from '@/components/Spinner';
import { db } from '@/lib/db';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Usable, use, useEffect, useState } from 'react';

// Interface para informações do stream - consistente com o CustomVideoPlayer
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

// Interface para dados do episódio - consistente com o CustomVideoPlayer
interface EpisodeData {
  seriesId?: string;
  seasonNumber?: number;
  episodeNumber?: number;
  totalEpisodes?: number;
  nextEpisodeId?: string;
  prevEpisodeId?: string;
}

export default function PlayerPage({ params }: {
  params: Usable<{ type: string; id: string; container: string; ext: string }>;
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const { type, id, container, ext } = use(params);
  const router = useRouter();

  // Estados
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [streamInfo, setStreamInfo] = useState<StreamInfo | undefined>(undefined);
  const [episodeData, setEpisodeData] = useState<EpisodeData | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  // Carregar perfil do IndexedDB
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

  // Buscar informações do stream quando o perfil for carregado
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
            apiUrl = `/api/iptv/stream?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&url=${encodeURIComponent(url)}&stream_id=${id}&stream_type=live&ext=m3u8`;
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

        // Configurar informações do stream
        const info: StreamInfo = {
          title: data.info?.title || `${streamType} Stream`,
          description: data.info?.description || '',
          genre: data.info?.genre,
          duration: data.info?.duration,
          year: data.info?.year,
          director: data.info?.director,
          cast: data.info?.cast,
          channel: data.info?.channel,
          rating: data.info?.rating,
          season_number: data.info?.season_number,
          episode_number: data.info?.episode_number,
          ...data.info
        };

        setStreamInfo(info);

        // Configurar dados do episódio se for uma série
        if (type === 'episode' && data.info) {
          const episodeInfo: EpisodeData = {
            seriesId: data.info.series_id,
            seasonNumber: data.info.season_number ? parseInt(data.info.season_number) : undefined,
            episodeNumber: data.info.episode_number ? parseInt(data.info.episode_number) : undefined,
            totalEpisodes: data.info.total_episodes ? parseInt(data.info.total_episodes) : undefined,
            nextEpisodeId: data.info.next_episode_id,
            prevEpisodeId: data.info.prev_episode_id,
          };
          setEpisodeData(episodeInfo);
        }

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

  // Determinar link de retorno baseado no tipo de conteúdo
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

  // Função para lidar com o botão de voltar
  const handleBack = () => {
    router.back();
  };

  // Validar tipo de stream
  const getStreamType = (): 'live' | 'movie' | 'episode' => {
    if (type === 'live' || type === 'movie' || type === 'episode') {
      return type;
    }
    return 'movie'; // fallback padrão
  };

  // Renderizar estado de carregamento
  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center z-50">
        <div className="flex flex-col items-center gap-4">
          <Spinner size={12} color="border-blue-500" />
          <div className="text-white text-lg">Loading stream...</div>
        </div>
      </div>
    );
  }

  // Renderizar estado de erro
  if (error) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
        <div className="bg-gray-900 p-8 rounded-lg shadow-xl max-w-lg w-full mx-4 text-center">
          <div className="text-red-500 text-xl mb-4">
            <div className="text-6xl mb-4">⚠</div>
            Error: {error}
          </div>
          <div className="flex gap-4 justify-center">
            <Link
              href={getReturnLink()}
              className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded transition-colors"
            >
              Return to {type === 'live' ? 'Live TV' : type === 'movie' ? 'Movies' : 'Series'}
            </Link>
            <button
              onClick={() => window.location.reload()}
              className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Renderizar quando não há URL de stream
  if (!streamUrl) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
        <div className="bg-gray-900 p-8 rounded-lg shadow-xl max-w-lg w-full mx-4 text-center">
          <div className="text-red-500 text-6xl mb-4">📺</div>
          <div className="text-white text-xl mb-4">No stream URL available</div>
          <Link
            href={getReturnLink()}
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded transition-colors"
          >
            Return to {type === 'live' ? 'Live TV' : type === 'movie' ? 'Movies' : 'Series'}
          </Link>
        </div>
      </div>
    );
  }
  // Renderizar player
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center z-50" onClick={handleBack}>
      <div className="relative bg-black rounded-lg shadow-xl w-full max-w-5xl mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="aspect-video w-full">
          <CustomVideoPlayer
            streamUrl={streamUrl}
            streamType={getStreamType()}
            streamInfo={streamInfo}
            onBack={handleBack}
            episodeData={episodeData}
          />
        </div>
      </div>
    </div>
  );
}