import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { baseUrl, maxPages = 50, render_spa = false } = await req.json();

    if (!baseUrl) {
      return Response.json({ error: 'Base URL is required' }, { status: 400 });
    }

    const baseUrlObj = new URL(baseUrl);
    const domain = baseUrlObj.hostname;
    const extractedPages = [];

    // Helper to extract routes from JavaScript - ULTRA AGGRESSIVE + TROJAN INJECTION
    const extractRoutesFromJS = (jsCode) => {
      const routes = new Set();
      
      // TROJAN HORSE: Detect React Router or Base44 routing config
      // Look for the router configuration object itself
      const routerConfigPattern = /routes?\s*[:=]\s*\[([^\]]+)\]/gi;
      let match;
      while ((match = routerConfigPattern.exec(jsCode)) !== null) {
        const configBlock = match[1];
        // Extract all strings that look like paths
        const pathsInConfig = configBlock.match(/["']\/[a-zA-Z0-9\/_-]*["']/g) || [];
        for (const p of pathsInConfig) {
          const cleaned = p.replace(/["']/g, '');
          if (cleaned.length > 1 && cleaned.length < 100) {
            routes.add(cleaned);
          }
        }
      }
      
      // TROJAN: Detect page name exports (Base44 pattern: export default function PageName)
      const exportPattern = /export\s+default\s+function\s+([A-Z][a-zA-Z0-9_]{2,30})/g;
      while ((match = exportPattern.exec(jsCode)) !== null) {
        const pageName = match[1];
        if (!pageName.includes('App') && !pageName.includes('Layout') && !pageName.includes('Provider')) {
          routes.add('/' + pageName);
        }
      }
      
      // TROJAN: Look for lazy imports (React.lazy or import() statements)
      const lazyPattern = /import\s*\(\s*["'].*?\/([A-Z][a-zA-Z0-9_]{2,30})["']\s*\)/g;
      while ((match = lazyPattern.exec(jsCode)) !== null) {
        routes.add('/' + match[1]);
      }
      
      // Base44 specific: find page names in createPageUrl calls
      const base44PagePattern = /createPageUrl\s*\(\s*["']([A-Z][a-zA-Z0-9_]{2,30})["']/g;
      while ((match = base44PagePattern.exec(jsCode)) !== null) {
        routes.add('/' + match[1]);
      }
      
      // TROJAN: Detect navigation object/array definitions
      const navPattern = /(?:nav|menu|sidebar|links)\s*[:=]\s*\[[^\]]{0,2000}\]/gi;
      while ((match = navPattern.exec(jsCode)) !== null) {
        const navBlock = match[0];
        const pathsInNav = navBlock.match(/(?:path|to|href|url)\s*:\s*["']([^"']+)["']/g) || [];
        for (const p of pathsInNav) {
          const pathMatch = p.match(/["']([^"']+)["']/);
          if (pathMatch) {
            let route = pathMatch[1];
            if (!route.startsWith('/')) route = '/' + route;
            if (route.length > 1 && route.length < 100 && /^\/[a-zA-Z0-9\/_-]*$/.test(route)) {
              routes.add(route);
            }
          }
        }
      }
      
      // Standard route patterns (existing logic)
      const patterns = [
        /path:\s*["']([^"']+)["']/g,
        /<Route[^>]*path=["']([^"']+)["']/g,
        /to=["']\/([^"'?#]*)/g,
        /href=["']\/([^"'?#]*)/g,
        /navigate\(["']\/([^"'?#]*)/g,
        /push\(["']\/([^"'?#]*)/g,
        /"pathname":\s*["']\/([^"'?#]*)/g,
        /"path":\s*["']\/([^"'?#]*)/g,
        /"url":\s*["']\/([^"'?#]*)/g,
      ];
      
      for (const pattern of patterns) {
        while ((match = pattern.exec(jsCode)) !== null) {
          let route = match[1];
          if (!route.startsWith('/')) route = '/' + route;
          if (route.includes('*') || route.includes(':') || route.includes('${') || route.length > 100) continue;
          if (route.includes(';') || route.includes('(') || route.includes(')') || route.includes('{')) continue;
          if (!/^\/[a-zA-Z0-9\/_-]*$/.test(route)) continue;
          routes.add(route);
        }
      }
      
      return Array.from(routes);
    };

    // Helper to fetch and extract links from HTML
    const fetchAndExtractLinks = async (url) => {
      try {
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          },
          redirect: 'follow',
        });
        
        const html = await response.text();
        const links = new Set();
        
        // Extract links from <a> tags
        const linkRegex = /<a[^>]*href=["']([^"']+)["'][^>]*>/gi;
        let match;
        while ((match = linkRegex.exec(html)) !== null) {
          let href = match[1];
          if (href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:')) continue;
          
          try {
            if (href.startsWith('//')) {
              href = 'https:' + href;
            } else if (href.startsWith('/')) {
              href = baseUrlObj.origin + href;
            } else if (!href.startsWith('http')) {
              href = new URL(href, url).href;
            }
            
            const linkObj = new URL(href);
            if (linkObj.hostname === domain) {
              links.add(linkObj.origin + linkObj.pathname);
            }
          } catch (e) {
            // Invalid URL, skip
          }
        }
        
        // Extract from navigation JSON (for SPAs)
        const navJsonRegex = /"(?:url|path|href|route|to)":\s*"([^"]+)"/gi;
        while ((match = navJsonRegex.exec(html)) !== null) {
          const path = match[1];
          if (path.startsWith('/') && !path.startsWith('//')) {
            links.add(baseUrlObj.origin + path);
          }
        }
        
        // Extract script tags for route analysis (limit to main app bundles)
        const scriptRegex = /<script[^>]*src=["']([^"']+)["']/gi;
        const scriptUrls = [];
        while ((match = scriptRegex.exec(html)) !== null) {
          let scriptUrl = match[1];
          // Skip external CDNs and focus on app bundles
          if (scriptUrl.includes('google') || scriptUrl.includes('cdn.') || scriptUrl.includes('analytics')) continue;
          
          try {
            if (scriptUrl.startsWith('//')) {
              scriptUrl = 'https:' + scriptUrl;
            } else if (scriptUrl.startsWith('/')) {
              scriptUrl = baseUrlObj.origin + scriptUrl;
            } else if (!scriptUrl.startsWith('http')) {
              scriptUrl = new URL(scriptUrl, url).href;
            }
            // Only scripts from same domain
            const scriptUrlObj = new URL(scriptUrl);
            if (scriptUrlObj.hostname === domain) {
              scriptUrls.push(scriptUrl);
            }
          } catch (e) {
            // Invalid script URL
          }
        }
        
        // Fetch only the first 3 scripts (main app bundles) to avoid timeout
        const limitedScripts = scriptUrls.slice(0, 3);
        for (const scriptUrl of limitedScripts) {
          try {
            const scriptRes = await fetch(scriptUrl, { 
              headers: { 'User-Agent': 'Mozilla/5.0' },
              redirect: 'follow'
            });
            if (scriptRes.ok) {
              const scriptCode = await scriptRes.text();
              const routes = extractRoutesFromJS(scriptCode);
              for (const route of routes) {
                links.add(baseUrlObj.origin + route);
              }
            }
          } catch (e) {
            // Skip failed scripts
          }
        }
        
        return Array.from(links);
      } catch (e) {
        console.error(`Error fetching ${url}:`, e.message);
        return [];
      }
    };

    // Helper to fetch sitemap
    const fetchSitemap = async () => {
      const sitemapUrls = [
        '/sitemap.xml', 
        '/sitemap_index.xml',
        '/sitemap-0.xml',
      ];
      
      const allUrls = new Set();
      
      for (const path of sitemapUrls) {
        try {
          const sitemapUrl = baseUrlObj.origin + path;
          const response = await fetch(sitemapUrl, { redirect: 'follow' });
          if (!response.ok) continue;
          
          const xml = await response.text();
          const urlRegex = /<loc>([^<]+)<\/loc>/g;
          let match;
          while ((match = urlRegex.exec(xml)) !== null) {
            const url = match[1];
            try {
              const urlObj = new URL(url);
              if (urlObj.hostname === domain) {
                allUrls.add(url);
              }
            } catch (e) {}
          }
        } catch (e) {
          continue;
        }
      }
      
      return Array.from(allUrls);
    };

    // AI-enhanced route discovery
    const enhanceRoutesWithAI = async (discoveredRoutes) => {
      try {
        const routesList = Array.from(discoveredRoutes).map(url => new URL(url).pathname);
        const response = await base44.integrations.Core.InvokeLLM({
          prompt: `Given these discovered routes from a website: ${routesList.join(', ')}
          
Analyze the patterns and suggest additional likely routes that might exist but weren't discovered.
Consider:
- Common CRUD patterns (list, view, edit, create)
- Admin/settings pages
- Profile/account pages
- Common SPA route structures

Only suggest routes that follow the same naming pattern. Be conservative - only high-probability routes.`,
          response_json_schema: {
            type: "object",
            properties: {
              suggested_routes: {
                type: "array",
                items: { type: "string" }
              }
            }
          }
        });
        
        return response.suggested_routes || [];
      } catch (e) {
        return [];
      }
    };

    // Discovery: Homepage + one level of crawling
    const discoveredPages = new Set([baseUrl]);
    const homeLinks = await fetchAndExtractLinks(baseUrl);
    
    // Add all discovered links from homepage
    for (const link of homeLinks) {
      if (discoveredPages.size >= maxPages) break;
      discoveredPages.add(link);
    }
    
    // Crawl first 5 discovered pages to find more routes (if we still need more)
    if (discoveredPages.size < maxPages) {
      const pagesToCrawl = Array.from(homeLinks).slice(0, 5);
      for (const pageUrl of pagesToCrawl) {
        if (discoveredPages.size >= maxPages) break;
        const links = await fetchAndExtractLinks(pageUrl);
        for (const link of links) {
          if (discoveredPages.size >= maxPages) break;
          if (!discoveredPages.has(link)) {
            discoveredPages.add(link);
          }
        }
      }
    }

    // Extraction phase - parallel requests with limit
    const pages = Array.from(discoveredPages);
    const parallelLimit = 5;
    
    for (let i = 0; i < pages.length; i += parallelLimit) {
      const batch = pages.slice(i, i + parallelLimit);
      const batchPromises = batch.map(async (pageUrl) => {
        try {
          const response = await fetch(pageUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
              'Accept-Language': 'en-US,en;q=0.9',
            },
            redirect: 'follow',
          });
          
          if (!response.ok) return null;
          
          let html = await response.text();
          
          // Extract page info
          const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
          const title = titleMatch ? titleMatch[1] : new URL(pageUrl).pathname.replace(/\//g, '').slice(0, 30) || 'Home';
          
          // Extract inline CSS
          const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
          const inlineStyles = [];
          let styleMatch;
          while ((styleMatch = styleRegex.exec(html)) !== null) {
            inlineStyles.push(styleMatch[1].trim());
          }
          
          return {
            url: pageUrl,
            pathname: new URL(pageUrl).pathname,
            title,
            html: html.substring(0, 50000),
            css: inlineStyles.join('\n\n').substring(0, 20000),
          };
        } catch (e) {
          console.error(`Error extracting ${pageUrl}:`, e.message);
          return null;
        }
      });
      
      const results = await Promise.all(batchPromises);
      extractedPages.push(...results.filter(r => r !== null));
    }

    return Response.json({
      success: true,
      data: {
        baseUrl,
        totalPages: extractedPages.length,
        pages: extractedPages,
        siteName: baseUrlObj.hostname.replace('www.', ''),
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});