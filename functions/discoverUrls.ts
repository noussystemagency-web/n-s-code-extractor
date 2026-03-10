import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { baseUrl, maxPages = 50 } = await req.json();

    if (!baseUrl) {
      return Response.json({ error: 'Base URL is required' }, { status: 400 });
    }

    const baseUrlObj = new URL(baseUrl);
    const domain = baseUrlObj.hostname;
    const discoveredUrls = new Set([baseUrl]);

    // Helper to extract links from HTML
    const extractLinksFromHtml = (html, pageUrl) => {
      const links = new Set();
      
      // Extract from <a> tags
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
            href = new URL(href, pageUrl).href;
          }
          
          const linkObj = new URL(href);
          if (linkObj.hostname === domain) {
            // Remove query params and hash for deduplication
            const cleanUrl = linkObj.origin + linkObj.pathname;
            links.add(cleanUrl);
          }
        } catch (e) {
          // Invalid URL, skip
        }
      }
      
      return Array.from(links);
    };

    // Helper to extract routes from JavaScript bundles
    const extractRoutesFromJS = (jsCode) => {
      const routes = new Set();
      
      // React Router patterns
      const routerConfigPattern = /routes?\s*[:=]\s*\[([^\]]+)\]/gi;
      let match;
      while ((match = routerConfigPattern.exec(jsCode)) !== null) {
        const configBlock = match[1];
        const pathsInConfig = configBlock.match(/["']\/[a-zA-Z0-9\/_-]*["']/g) || [];
        for (const p of pathsInConfig) {
          const cleaned = p.replace(/["']/g, '');
          if (cleaned.length > 1 && cleaned.length < 100) {
            routes.add(cleaned);
          }
        }
      }
      
      // Page name exports (Base44 pattern)
      const exportPattern = /export\s+default\s+function\s+([A-Z][a-zA-Z0-9_]{2,30})/g;
      while ((match = exportPattern.exec(jsCode)) !== null) {
        const pageName = match[1];
        if (!pageName.includes('App') && !pageName.includes('Layout') && !pageName.includes('Provider')) {
          routes.add('/' + pageName);
        }
      }
      
      // createPageUrl calls
      const base44PagePattern = /createPageUrl\s*\(\s*["']([A-Z][a-zA-Z0-9_]{2,30})["']/g;
      while ((match = base44PagePattern.exec(jsCode)) !== null) {
        routes.add('/' + match[1]);
      }
      
      // Standard route patterns
      const patterns = [
        /path:\s*["']([^"']+)["']/g,
        /<Route[^>]*path=["']([^"']+)["']/g,
        /to=["']\/([^"'?#]*)/g,
        /href=["']\/([^"'?#]*)/g,
      ];
      
      for (const pattern of patterns) {
        while ((match = pattern.exec(jsCode)) !== null) {
          let route = match[1];
          if (!route.startsWith('/')) route = '/' + route;
          if (route.includes('*') || route.includes(':') || route.length > 100) continue;
          if (!/^\/[a-zA-Z0-9\/_-]*$/.test(route)) continue;
          routes.add(route);
        }
      }
      
      return Array.from(routes);
    };

    // Fetch homepage
    const homeResponse = await fetch(baseUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      redirect: 'follow',
    });
    
    if (!homeResponse.ok) {
      return Response.json({ error: 'Failed to fetch homepage' }, { status: 400 });
    }
    
    const homeHtml = await homeResponse.text();
    
    // Extract links from homepage
    const homeLinks = extractLinksFromHtml(homeHtml, baseUrl);
    for (const link of homeLinks) {
      if (discoveredUrls.size >= maxPages) break;
      discoveredUrls.add(link);
    }
    
    // Extract routes from JavaScript bundles (limit to first 3 scripts)
    const scriptRegex = /<script[^>]*src=["']([^"']+)["']/gi;
    const scriptUrls = [];
    let match;
    while ((match = scriptRegex.exec(homeHtml)) !== null) {
      let scriptUrl = match[1];
      if (scriptUrl.includes('google') || scriptUrl.includes('cdn.') || scriptUrl.includes('analytics')) continue;
      
      try {
        if (scriptUrl.startsWith('//')) {
          scriptUrl = 'https:' + scriptUrl;
        } else if (scriptUrl.startsWith('/')) {
          scriptUrl = baseUrlObj.origin + scriptUrl;
        } else if (!scriptUrl.startsWith('http')) {
          scriptUrl = new URL(scriptUrl, baseUrl).href;
        }
        
        const scriptUrlObj = new URL(scriptUrl);
        if (scriptUrlObj.hostname === domain) {
          scriptUrls.push(scriptUrl);
        }
      } catch (e) {
        // Invalid script URL
      }
    }
    
    // Fetch and analyze first 3 scripts
    for (const scriptUrl of scriptUrls.slice(0, 3)) {
      if (discoveredUrls.size >= maxPages) break;
      try {
        const scriptRes = await fetch(scriptUrl, { 
          headers: { 'User-Agent': 'Mozilla/5.0' },
          redirect: 'follow'
        });
        if (scriptRes.ok) {
          const scriptCode = await scriptRes.text();
          const routes = extractRoutesFromJS(scriptCode);
          for (const route of routes) {
            if (discoveredUrls.size >= maxPages) break;
            discoveredUrls.add(baseUrlObj.origin + route);
          }
        }
      } catch (e) {
        // Skip failed scripts
      }
    }
    
    // Crawl first 3 discovered pages to find more links
    const pagesToCrawl = Array.from(homeLinks).slice(0, 3);
    for (const pageUrl of pagesToCrawl) {
      if (discoveredUrls.size >= maxPages) break;
      try {
        const pageRes = await fetch(pageUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          },
          redirect: 'follow',
        });
        if (pageRes.ok) {
          const pageHtml = await pageRes.text();
          const pageLinks = extractLinksFromHtml(pageHtml, pageUrl);
          for (const link of pageLinks) {
            if (discoveredUrls.size >= maxPages) break;
            discoveredUrls.add(link);
          }
        }
      } catch (e) {
        // Skip failed pages
      }
    }

    return Response.json({
      success: true,
      data: {
        urls: Array.from(discoveredUrls),
        totalUrls: discoveredUrls.size,
        baseUrl,
        siteName: baseUrlObj.hostname.replace('www.', ''),
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});