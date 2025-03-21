/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        loader: 'custom',
        loaderFile: './src/lib/imageLoader.ts',
        // Mantemos o Cloudinary como um domínio permitido para compatibilidade
        domains: ['res.cloudinary.com'],
    },
    reactStrictMode: true,
};

module.exports = nextConfig; 