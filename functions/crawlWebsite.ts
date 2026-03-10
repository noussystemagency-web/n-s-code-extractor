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

    // Helper to extract routes from JavaScript - ULTRA AGGRESSIVE
    const extractRoutesFromJS = (jsCode) => {
      const routes = new Set();
      
      // Base44 specific: find page names (e.g., createPageUrl("Dashboard"))
      const base44PagePattern = /["']([A-Z][a-zA-Z0-9_]{2,30})["']/g;
      let match;
      while ((match = base44PagePattern.exec(jsCode)) !== null) {
        const pageName = match[1];
        // Common Base44 page names
        if (pageName.length >= 3 && pageName.length <= 30 && /^[A-Z]/.test(pageName)) {
          routes.add('/' + pageName);
        }
      }
      
      // Standard route patterns
      const patterns = [
        /path:\s*["']([^"']+)["']/g,
        /<Route[^>]*path=["']([^"']+)["']/g,
        /to=["']\/([^"'?#]*)/g,
        /href=["']\/([^"'?#]*)/g,
        /navigate\(["']\/([^"'?#]*)/g,
        /createPageUrl\(["']([^"'?#]*)/g,
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
        
        // Fetch app scripts in parallel for route discovery (limit to 5 largest)
        const scriptPromises = scriptUrls.map(async (scriptUrl) => {
          try {
            const scriptRes = await fetch(scriptUrl, { 
              headers: { 'User-Agent': 'Mozilla/5.0' },
              redirect: 'follow'
            });
            if (scriptRes.ok) {
              const scriptCode = await scriptRes.text();
              return extractRoutesFromJS(scriptCode);
            }
          } catch (e) {
            // Skip failed scripts
          }
          return [];
        });
        
        const allRoutes = await Promise.all(scriptPromises);
        for (const routes of allRoutes) {
          for (const route of routes) {
            links.add(baseUrlObj.origin + route);
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

    // Discovery phase: aggressive crawling
    const discoveredPages = new Set();
    const queue = [baseUrl];
    discoveredPages.add(baseUrl);
    
    // 1. Try sitemap first (fastest)
    const sitemapUrls = await fetchSitemap();
    for (const url of sitemapUrls) {
      if (discoveredPages.size < maxPages && !discoveredPages.has(url)) {
        discoveredPages.add(url);
        queue.push(url);
      }
    }
    
    // 2. Crawl pages breadth-first until we hit maxPages
    let crawlIndex = 0;
    while (crawlIndex < queue.length && discoveredPages.size < maxPages) {
      const currentUrl = queue[crawlIndex];
      crawlIndex++;
      
      const newLinks = await fetchAndExtractLinks(currentUrl);
      
      for (const link of newLinks) {
        if (!discoveredPages.has(link) && discoveredPages.size < maxPages) {
          discoveredPages.add(link);
          queue.push(link);
        }
      }
      
      // Limit crawl depth to prevent infinite loops
      if (crawlIndex > Math.min(maxPages, 20)) break;
    }
    
    // AI enhancement: suggest additional routes
    if (discoveredPages.size < maxPages) {
      const aiSuggested = await enhanceRoutesWithAI(discoveredPages);
      for (const route of aiSuggested) {
        const fullUrl = baseUrlObj.origin + (route.startsWith('/') ? route : '/' + route);
        if (!discoveredPages.has(fullUrl) && discoveredPages.size < maxPages) {
          // Verify the route exists before adding
          try {
            const testRes = await fetch(fullUrl, { 
              method: 'HEAD',
              headers: { 'User-Agent': 'Mozilla/5.0' },
              redirect: 'follow'
            });
            if (testRes.ok) {
              discoveredPages.add(fullUrl);
              queue.push(fullUrl);
            }
          } catch (e) {
            // Route doesn't exist, skip
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