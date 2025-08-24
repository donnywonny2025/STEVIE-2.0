import { json, type LoaderFunction, type LoaderFunctionArgs } from '@remix-run/cloudflare';
import { qualityCurator } from '~/lib/quality/QualityCurationManager';

/**
 * Diagnostic API for troubleshooting connection issues
 */

interface AppContext {
  env?: {
    GITHUB_ACCESS_TOKEN?: string;
    NETLIFY_TOKEN?: string;
  };
}

export const loader: LoaderFunction = async ({ request, context }: LoaderFunctionArgs & { context: AppContext }) => {
  // Get environment variables
  const envVars = {
    hasGithubToken: Boolean(process.env.GITHUB_ACCESS_TOKEN || context.env?.GITHUB_ACCESS_TOKEN),
    hasNetlifyToken: Boolean(process.env.NETLIFY_TOKEN || context.env?.NETLIFY_TOKEN),
    nodeEnv: process.env.NODE_ENV,
  };

  // Check cookies
  const cookieHeader = request.headers.get('Cookie') || '';
  const cookies = cookieHeader.split(';').reduce(
    (acc, cookie) => {
      const [key, value] = cookie.trim().split('=');

      if (key) {
        acc[key] = value;
      }

      return acc;
    },
    {} as Record<string, string>,
  );

  const hasGithubTokenCookie = Boolean(cookies.githubToken);
  const hasGithubUsernameCookie = Boolean(cookies.githubUsername);
  const hasNetlifyCookie = Boolean(cookies.netlifyToken);

  // Get local storage status (this can only be checked client-side)
  const localStorageStatus = {
    explanation: 'Local storage can only be checked on the client side. Use browser devtools to check.',
    githubKeysToCheck: ['github_connection'],
    netlifyKeysToCheck: ['netlify_connection'],
  };

  // Check if CORS might be an issue
  const corsStatus = {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  };

  // Check if API endpoints are reachable
  const apiEndpoints = {
    githubUser: '/api/system/git-info?action=getUser',
    githubRepos: '/api/system/git-info?action=getRepos',
    githubOrgs: '/api/system/git-info?action=getOrgs',
    githubActivity: '/api/system/git-info?action=getActivity',
    gitInfo: '/api/system/git-info',
  };

  // Test GitHub API connectivity
  let githubApiStatus;

  try {
    const githubResponse = await fetch('https://api.github.com/zen', {
      method: 'GET',
      headers: {
        Accept: 'application/vnd.github.v3+json',
      },
    });

    githubApiStatus = {
      isReachable: githubResponse.ok,
      status: githubResponse.status,
      statusText: githubResponse.statusText,
    };
  } catch (error) {
    githubApiStatus = {
      isReachable: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }

  // Test Netlify API connectivity
  let netlifyApiStatus;

  try {
    const netlifyResponse = await fetch('https://api.netlify.com/api/v1/', {
      method: 'GET',
    });

    netlifyApiStatus = {
      isReachable: netlifyResponse.ok,
      status: netlifyResponse.status,
      statusText: netlifyResponse.statusText,
    };
  } catch (error) {
    netlifyApiStatus = {
      isReachable: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }

  // Test Quality Intelligence System
  let qualitySystemStatus;
  
  try {
    // Initialize quality system if not already done
    await qualityCurator.initialize();
    
    // Get quality system health and performance stats
    const qualityHealth = qualityCurator.getHealthStatus();
    const qualityStats = qualityCurator.getPerformanceStats();
    
    // Test a quick lookup to verify functionality
    const testStart = performance.now();
    const testGuidance = await qualityCurator.getGuidance('button', 'ui');
    const testTime = performance.now() - testStart;
    
    qualitySystemStatus = {
      isEnabled: true,
      health: qualityHealth,
      performance: qualityStats,
      testLookup: {
        component: 'button',
        found: !!testGuidance,
        lookupTimeMs: Math.round(testTime * 100) / 100,
        withinTarget: testTime < 50 // <50ms target
      },
      capabilities: {
        qualityGuidance: true,
        tierSystem: true,
        libraryRecommendations: true,
        bestPractices: true
      }
    };
    
  } catch (error) {
    qualitySystemStatus = {
      isEnabled: false,
      error: error instanceof Error ? error.message : String(error),
      fallbackMode: 'Scout Intelligence only',
      impact: 'No quality guidance, base functionality preserved'
    };
  }
  const technicalDetails = {
    serverTimestamp: new Date().toISOString(),
    userAgent: request.headers.get('User-Agent'),
    referrer: request.headers.get('Referer'),
    host: request.headers.get('Host'),
    method: request.method,
    url: request.url,
  };

  // Return diagnostics
  return json(
    {
      status: 'success',
      environment: envVars,
      cookies: {
        hasGithubTokenCookie,
        hasGithubUsernameCookie,
        hasNetlifyCookie,
      },
      localStorage: localStorageStatus,
      apiEndpoints,
      externalApis: {
        github: githubApiStatus,
        netlify: netlifyApiStatus,
      },
      qualityIntelligence: qualitySystemStatus,
      corsStatus,
      technicalDetails,
    },
    {
      headers: corsStatus.headers,
    },
  );
};
