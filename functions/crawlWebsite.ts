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
    const queue = [baseUrl];
    const extractedPages = [];

    // Helper to fetch and extract links
    const fetchAndExtractLinks = async (url) => {
      try {
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          }
        });
        
        if (!response.ok) return [];

        const html = await response.text();
        
        // Extract all links
        const linkRegex = /href=["']([^"']+)["']/gi;
        const links = [];
        let match;
        while ((match = linkRegex.exec(html)) !== null) {
          let href = match[1];
          
          // Skip anchors and special links
          if (href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:')) continue;
          
          // Convert relative to absolute
          if (href.startsWith('/')) {
            href = baseUrlObj.origin + href;
          } else if (!href.startsWith('http')) {
            href = new URL(href, url).href;
          }
          
          // Only include internal links
          const linkObj = new URL(href);
          if (linkObj.hostname === domain) {
            // Remove hash and query params for cleaner URLs
            const cleanUrl = linkObj.origin + linkObj.pathname;
            links.push(cleanUrl);
          }
        }
        
        return [...new Set(links)];
      } catch (e) {
        console.error(`Error fetching ${url}:`, e.message);
        return [];
      }
    };

    // Discovery phase
    while (queue.length > 0 && discoveredPages.size < maxPages) {
      const url = queue.shift();
      
      if (discoveredPages.has(url)) continue;
      discoveredPages.add(url);
      
      const newLinks = await fetchAndExtractLinks(url);
      for (const link of newLinks) {
        if (!discoveredPages.has(link) && discoveredPages.size < maxPages) {
          queue.push(link);
        }
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