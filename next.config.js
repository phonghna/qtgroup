/** @type {import('next').NextConfig} */
const nextConfig = {
  // The whole front-end is one hand-built static HTML file (public/index.html),
  // carried over unchanged from the Claude Artifact demo. Next.js here only
  // hosts it plus the /api/collections/* routes that back it with a real
  // database, so "/" is simply rewritten to that static file instead of
  // going through the React app router page tree.
  async rewrites() {
    return [
      { source: "/", destination: "/index.html" },
    ];
  },
};

module.exports = nextConfig;
