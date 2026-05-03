/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['axios', 'cheerio', 'p-limit', 'xml2js'],
};

module.exports = nextConfig;
