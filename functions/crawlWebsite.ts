import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { baseUrl, maxPages = 20, render_spa = false } = await req.json();

    if (!baseUrl) {
      return Response.json({ error: 'Base URL is required' }, { status: 400 });
    }

    const baseUrlObj = new URL(baseUrl);
    const domain = baseUrlObj.hostname;
    const discoveredPages = new Set();
    const extractedPages = [];

    // Helper to extract routes from JavaScript
    const extractRoutesFromJS = (jsCode) => {
      const routes = [];
      const patterns = [
        /path:\s*["']([^"']+)["']/g,
        /route\(["']([^"']+)["']\)/g,
        /<Route path=["']([^"']+)["']/g,
        /href=["']\/([^"'\/][^"']*?)["']/g,
        /"pathname":\s*["']([^"']+)["']/g,
      ];
      
      for (const pattern of patterns) {
        let match;
        while ((match = pattern.exec(jsCode)) !== null) {
          let route = match[1];
          if (!route.startsWith('/')) route = '/' + route;
          routes.push(route);
        }
      }
      return routes;
    };

    // Helper to fetch and extract links from HTML
    const fetchAndExtractLinks = async (url) => {
      try {
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          }
        });
        
        if (!response.ok) return [];

        const html = await response.text();
        const links = new Set();
        
        // Extract links from HTML href attributes
        const linkRegex = /href=["']([^"']+)["']/gi;
        let match;
        while ((match = linkRegex.exec(html)) !== null) {
          let href = match[1];
          if (href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:')) continue;
          
          if (href.startsWith('/')) {
            href = baseUrlObj.origin + href;
          } else if (!href.startsWith('http')) {
            href = new URL(href, url).href;
          }
          
          const linkObj = new URL(href);
          if (linkObj.hostname === domain) {
            links.add(linkObj.origin + linkObj.pathname);
          }
        }
        
        // Extract script tags and fetch them for route analysis
        const scriptRegex = /<script[^>]*src=["']([^"']+)["']/gi;
        while ((match = scriptRegex.exec(html)) !== null) {
          let scriptUrl = match[1];
          if (scriptUrl.startsWith('/')) {
            scriptUrl = baseUrlObj.origin + scriptUrl;
          } else if (!scriptUrl.startsWith('http')) {
            scriptUrl = new URL(scriptUrl, url).href;
          }
          
          try {
            const scriptRes = await fetch(scriptUrl);
            if (scriptRes.ok) {
              const scriptCode = await scriptRes.text();
              const routes = extractRoutesFromJS(scriptCode);
              for (const route of routes) {
                const routeUrl = baseUrlObj.origin + route;
                links.add(routeUrl);
              }
            }
          } catch (e) {
            // Skip if script fetch fails
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

    // Discovery phase: combine multiple sources
    const allDiscoveredPages = new Set();
    
    // 1. Extract from main page and follow links
    let queue = [baseUrl];
    while (queue.length > 0 && allDiscoveredPages.size < maxPages) {
      const url = queue.shift();
      if (allDiscoveredPages.has(url)) continue;
      allDiscoveredPages.add(url);
      
      const newLinks = await fetchAndExtractLinks(url);
      for (const link of newLinks) {
        if (!allDiscoveredPages.has(link) && allDiscoveredPages.size < maxPages) {
          queue.push(link);
        }
      }
    }
    
    // 2. Try to fetch sitemap
    const sitemapUrls = await fetchSitemap();
    for (const url of sitemapUrls) {
      if (allDiscoveredPages.size < maxPages) {
        allDiscoveredPages.add(url);
      }
    }

    // Extraction phase
    const pages = Array.from(discoveredPages);
    
    for (let i = 0; i < pages.length; i++) {
      const pageUrl = pages[i];
      
      try {
        // Fetch page
        const response = await fetch(pageUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          }
        });
        
        if (!response.ok) continue;
        
        let html = await response.text();
        
        // If render_spa enabled and root is empty, generate with AI
        if (render_spa) {
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