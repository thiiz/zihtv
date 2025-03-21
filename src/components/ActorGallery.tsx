'use client';

import { useEffect, useState } from 'react';
import Image from './Image';
import { Spinner } from './Spinner';
import { Actor } from '@/@types/Actor';



interface ActorGalleryProps {
    cast: string;
    tmdbId?: number;
}

export default function ActorGallery({ cast, tmdbId }: ActorGalleryProps) {
    const [actors, setActors] = useState<Actor[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!cast && !tmdbId) return;

        async function fetchActors() {
            setLoading(true);
            setError(null);
            try {
                // Se temos o ID do TMDB, podemos buscar o elenco diretamente do filme
                if (tmdbId) {
                    const response = await fetch(`/api/tmdb/cast?movie_id=${tmdbId}`);
                    if (!response.ok) {
                        throw new Error(`API returned ${response.status}`);
                    }
                    const data = await response.json();
                    if (data.success && data.data && data.data.cast) {
                        // Filtrar apenas atores com imagem de perfil
                        const actorsWithImages = data.data.cast
                            .filter((actor: Actor) => actor.profile_path)
                            .slice(0, 10); // Limitar a 10 atores

                        setActors(actorsWithImages.map((actor: Actor) => ({
                            id: actor.id,
                            name: actor.name,
                            profile_path: actor.profile_path,
                            image_url: `https://image.tmdb.org/t/p/w185${actor.profile_path}`,
                            popularity: actor.popularity || 0
                        })));
                    }
                } else if (cast) {
                    // Se não temos o ID do TMDB, buscamos os atores pelo nome
                    const actorNames = cast.split(',').map(name => name.trim()).slice(0, 5); // Limitar a 5 atores principais

                    const actorPromises = actorNames.map(async (name) => {
                        try {
                            const response = await fetch(`/api/tmdb/cast?name=${encodeURIComponent(name)}`);
                            if (!response.ok) return null;

                            const data = await response.json();
                            return data.success && data.data ? data.data : null;
                        } catch (err) {
                            console.error(`Error fetching actor ${name}:`, err);
                            return null;
                        }
                    });

                    const actorResults = await Promise.all(actorPromises);
                    const validActors = actorResults.filter(actor => actor && actor.image_url) as Actor[];
                    setActors(validActors);
                }
            } catch (err) {
                console.error('Error fetching actors:', err);
                setError('Failed to load actor images');
            } finally {
                setLoading(false);
            }
        }

        fetchActors();
    }, [cast, tmdbId]);

    if (loading) {
        return (
            <div className="py-4 flex justify-center">
                <Spinner size={8} />
            </div>
        );
    }

    if (error) {
        return <div className="text-red-500 py-2">{error}</div>;
    }

    if (actors.length === 0) {
        return null; // Não mostrar nada se não houver atores com imagens
    }

    return (
        <div className="mt-6">
            <h3 className="text-gray-400 text-sm mb-3">Cast Gallery</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {actors.map((actor) => (
                    <div key={actor.id} className="flex flex-col items-center">
                        <div className="relative w-24 h-24 md:w-32 md:h-32 rounded-full overflow-hidden mb-2">
                            <Image
                                src={actor.image_url}
                                alt={actor.name}
                                layout="fill"
                                objectFit="cover"
                                className="rounded-full"
                                fallbackSrc="/placeholder-image.svg"
                            />
                        </div>
                        <span className="text-center text-sm">{actor.name}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}