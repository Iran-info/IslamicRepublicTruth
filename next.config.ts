import type { NextConfig } from "next";

const repositoryName = "IslamicRepublicTruth";
const isGitHubPages = process.env.GITHUB_ACTIONS === "true";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  basePath: isGitHubPages ? `/${repositoryName}` : "",
  assetPrefix: isGitHubPages ? `/${repositoryName}/` : undefined,
  env: { NEXT_PUBLIC_BASE_PATH: isGitHubPages ? `/${repositoryName}` : "" },
};

export default nextConfig;
