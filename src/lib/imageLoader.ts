import type { ImageLoader } from 'next/image';

/**
 * Custom image loader that allows loading images from any domain
 * This bypasses the domain restrictions in next/image component
 */
const customImageLoader: ImageLoader = ({ src, width, quality }) => {
    // If the source is already a complete URL, return it with width and quality parameters
    if (src.startsWith('http://') || src.startsWith('https://')) {
        // Check if the URL already has query parameters
        const hasQueryParams = src.includes('?');
        const separator = hasQueryParams ? '&' : '?';

        // Return the URL with width and quality parameters
        return `${src}${separator}w=${width}&q=${quality || 75}`;
    }

    // For local images, use the default Next.js loader behavior
    return `/_next/image?url=${encodeURIComponent(src)}&w=${width}&q=${quality || 75}`;
};

export default customImageLoader; 