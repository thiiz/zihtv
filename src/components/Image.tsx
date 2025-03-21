import NextImage, { ImageProps as NextImageProps } from 'next/image';
import customImageLoader from '../lib/imageLoader';

// Estendendo o tipo de propriedades do Next Image
export interface ImageProps extends NextImageProps {
    fallbackSrc?: string;
}

/**
 * Componente Image personalizado que permite usar qualquer URL de imagem
 * sem restrições de domínio, com tratamento de erro.
 */
export default function Image({
    src,
    alt,
    fallbackSrc = '/placeholder-image.svg',
    ...props
}: ImageProps) {
    return (
        <NextImage
            loader={customImageLoader}
            src={src}
            alt={alt || 'Image'}
            onError={(e) => {
                // Se a imagem falhar ao carregar, use a imagem de fallback
                const target = e.target as HTMLImageElement;
                target.src = fallbackSrc;
            }}
            {...props}
        />
    );
} 