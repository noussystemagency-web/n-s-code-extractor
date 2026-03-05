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
    const discoveredPages = new Set();
    const extractedPages = [];

    // Helper to extract routes from JavaScript (improved for SPA detection)
    const extractRoutesFromJS = (jsCode) => {
      const routes = new Set();
      const patterns = [
        /path:\s*["']([^"']+)["']/g,
        /route\(["']([^"']+)["']\)/g,
        /<Route path=["']([^"']+)["']/g,
        /href=["']\/([^"'\/][^"']*?)["']/g,
        /"pathname":\s*["']([^"']+)["']/g,
        /\?id=([^&\s"']+)/g,  // Captura parámetros de URL
        /\/([a-zA-Z0-9_-]+)/g,  // Rutas dinámicas comunes
      ];
      
      for (const pattern of patterns) {
        let match;
        while ((match = pattern.exec(jsCode)) !== null) {
          let route = match[1];
          if (route && route.length < 50 && !route.match(/\.(js|css|png|jpg|gif|svg)/i)) {
            if (!route.startsWith('/')) route = '/' + route;
            routes.add(route);
          }
        }
      }
      return Array.from(routes);
    };

    // Helper to fetch and extract links from HTML (fast, no script fetching)
    const fetchAndExtractLinks = async (url) => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const response = await fetch(url, {
          signal: controller.signal,
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
        });
        clearTimeout(timeout);
        
        if (!response.ok) return { html: null, links: [] };

        const html = await response.text();
        const links = new Set();
        
        const linkRegex = /href=["']([^"'#?]+)["']/gi;
        let match;
        while ((match = linkRegex.exec(html)) !== null) {
          let href = match[1];
          if (!href || href.startsWith('javascript:') || href.startsWith('mailto:') || href.match(/\.(pdf|jpg|jpeg|png|gif|svg|ico|zip|css|js)$/i)) continue;
          
          if (href.startsWith('/')) {
            href = baseUrlObj.origin + href;
          } else if (!href.startsWith('http')) {
            try { href = new URL(href, url).href; } catch { continue; }
          }
          
          try {
            const linkObj = new URL(href);
            if (linkObj.hostname === domain) {
              links.add(linkObj.origin + linkObj.pathname);
            }
          } catch { continue; }
        }
        
        return { html, links: Array.from(links) };
      } catch (e) {
        return { html: null, links: [] };
      }
    };

    // Helper to fetch sitemap
    const fetchSitemap = async () => {
      try {
        const sitemapUrl = baseUrlObj.origin + '/sitemap.xml';
        const response = await fetch(sitemapUrl);
        if (!response.ok) return [];
        
        const xml = await response.text();
        const urlRegex = /<loc>([^<]+)<\/loc>/g;
        const urls = [];
        let match;
        while ((match = urlRegex.exec(xml)) !== null) {
          const url = match[1];
          const urlObj = new URL(url);
          if (urlObj.hostname === domain) {
            urls.push(url);
          }
        }
        return urls;
      } catch (e) {
        return [];
      }
    };

    // Cache HTML to avoid re-fetching
    const htmlCache = new Map();

    // BFS: start from baseUrl, follow all internal <a href> links recursively until maxPages reached
    const visited = new Set();
    const queue = [baseUrl];

    while (queue.length > 0 && visited.size < maxPages) {
      const url = queue.shift();
      if (visited.has(url)) continue;
      visited.add(url);

      const { html, links } = await fetchAndExtractLinks(url);
      if (html) htmlCache.set(url, html);

      for (const link of links) {
        if (!visited.has(link) && !queue.includes(link)) {
          queue.push(link);
        }
      }
    }

    // Also try sitemap for any pages not found by BFS
    const sitemapUrls = await fetchSitemap();
    for (const url of sitemapUrls) {
      if (!visited.has(url) && visited.size < maxPages) {
        visited.add(url);
      }
    }

    // Extraction phase - all discovered pages
    const pages = Array.from(visited).slice(0, maxPages);
    
    for (let i = 0; i < pages.length; i++) {
      const pageUrl = pages[i];
      
      try {
        // Use cached HTML if available, otherwise fetch
        let html = htmlCache.get(pageUrl);
        if (!html) {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 5000);
          const response = await fetch(pageUrl, {
            signal: controller.signal,
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
          });
          clearTimeout(timeout);
          if (!response.ok) continue;
          html = await response.text();
        }
        
        // If render_spa enabled and root is empty, generate with AI (skip to save time)
        if (render_spa && i < 5) {
          const rootRegex = /<div[^>]*id=["']root["'][^>]*>(.*?)<\/div>/is;
          const rootMatch = rootRegex.exec(html);
          const rootContent = rootMatch ? rootMatch[1].trim() : '';
          
          if (!rootContent || rootContent.length < 100) {
            // Extract metadata
            const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
            const title = titleMatch ? titleMatch[1] : 'Page';
            const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
            const description = descMatch ? descMatch[1] : '';
            
            // Generate with AI
            const aiResponse = await base44.integrations.Core.InvokeLLM({
              prompt: `Generate realistic HTML for a dashboard/app page titled "${title}". Description: "${description}". 
Return ONLY HTML markup for <div id="root"></div> content - no wrapper divs, no explanations.`,
              response_json_schema: {
                type: 'object',
                properties: {
                  html: { type: 'string' }
                }
              }
            });
            
            if (aiResponse?.html) {
              html = html.replace(
                /<div[^>]*id=["']root["'][^>]*>(.*?)<\/div>/is,
                `<div id="root">${aiResponse.html}</div>`
              );
            }
          }
        }
        
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
        
        extractedPages.push({
          url: pageUrl,
          pathname: new URL(pageUrl).pathname,
          title,
          html: html.substring(0, 100000),
          css: inlineStyles.join('\n\n'),
        });
        
      } catch (e) {
        console.error(`Error extracting ${pageUrl}:`, e.message);
      }
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