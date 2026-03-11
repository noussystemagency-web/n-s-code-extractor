import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { baseUrl, maxPages = 20, render_spa = false, cookies = '' } = await req.json();

    if (!baseUrl) {
      return Response.json({ error: 'Base URL is required' }, { status: 400 });
    }

    const SCRAPINGBEE_API_KEY = Deno.env.get('SCRAPINGBEE_API_KEY');
    if (!SCRAPINGBEE_API_KEY) {
      return Response.json({ error: 'SCRAPINGBEE_API_KEY not configured' }, { status: 500 });
    }

    const baseUrlObj = new URL(baseUrl);
    const domain = baseUrlObj.hostname;
    const discoveredPages = new Set();
    const extractedPages = [];

    // Helper to render page with ScrapingBee
    const renderPage = async (url) => {
      const params = new URLSearchParams({
        api_key: SCRAPINGBEE_API_KEY,
        url: url,
        render_js: 'true',
        wait: '2000',
        premium_proxy: 'true',
      });

      if (cookies) {
        // Parse cookies and format for ScrapingBee
        const cookieParams = cookies.split(';').map(c => c.trim()).filter(c => c);
        cookieParams.forEach(cookie => {
          params.append('cookies', cookie);
        });
      }

      const response = await fetch(`https://app.scrapingbee.com/api/v1/?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`ScrapingBee error: ${response.status}`);
      }

      return await response.text();
    };

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

    // Helper to extract links from rendered HTML
    const extractLinksFromHTML = (html, pageUrl) => {
      const links = new Set();
      const linkRegex = /href=["']([^"']+)["']/gi;
      let match;
      
      while ((match = linkRegex.exec(html)) !== null) {
        let href = match[1];
        if (href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:')) continue;
        
        try {
          const absoluteUrl = new URL(href, pageUrl);
          if (absoluteUrl.hostname === domain) {
            links.add(absoluteUrl.origin + absoluteUrl.pathname);
          }
        } catch (e) {
          // Invalid URL
        }
      }
      
      return Array.from(links);
    };

    // Helper to fetch and extract links
    const fetchAndExtractLinks = async (url) => {
      try {
        const html = await renderPage(url);
        return extractLinksFromHTML(html, url);
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
    const pages = Array.from(allDiscoveredPages);
    
    for (let i = 0; i < pages.length; i++) {
      const pageUrl = pages[i];
      
      try {
        // Render page with ScrapingBee
        const html = await renderPage(pageUrl);
        
        // Extract title
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