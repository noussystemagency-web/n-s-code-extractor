import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { baseUrl, maxPages = 50, phase = 'discover', urlsToExtract = [], cookies = '' } = await req.json();

    if (!baseUrl) {
      return Response.json({ error: 'Base URL is required' }, { status: 400 });
    }

    const SCRAPINGBEE_API_KEY = Deno.env.get('SCRAPINGBEE_API_KEY');
    if (!SCRAPINGBEE_API_KEY) {
      return Response.json({ error: 'SCRAPINGBEE_API_KEY not configured' }, { status: 500 });
    }

    const baseUrlObj = new URL(baseUrl);
    const domain = baseUrlObj.hostname;

    // Helper to render page with ScrapingBee
    const renderPage = async (url) => {
      try {
        const params = new URLSearchParams({
          api_key: SCRAPINGBEE_API_KEY,
          url: url,
          render_js: 'true',
          wait: '2000',
          premium_proxy: 'true',
        });

        if (cookies) {
          params.append('cookies', cookies);
        }

        const response = await fetch(`https://app.scrapingbee.com/api/v1/?${params.toString()}`);
        
        if (!response.ok) {
          const errorBody = await response.text();
          throw new Error(`ScrapingBee ${response.status}: ${errorBody.substring(0, 200)}`);
        }

        return await response.text();
      } catch (error) {
        console.error(`Error rendering ${url}:`, error.message);
        throw error;
      }
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
      
      const reactLinkRegex = /(?:to|data-to|data-path)=["']([^"']+)["']/gi;
      while ((match = reactLinkRegex.exec(html)) !== null) {
        let path = match[1];
        if (path.startsWith('/')) {
          links.add(baseUrlObj.origin + path);
        }
      }
      
      return Array.from(links);
    };

    // Helper to fetch manifest routes
    const fetchManifestRoutes = async () => {
      try {
        const manifestUrl = baseUrlObj.origin + '/manifest.json';
        const response = await fetch(manifestUrl);
        if (!response.ok) return [];
        
        const manifest = await response.json();
        const routes = [];
        
        if (manifest.routes) routes.push(...manifest.routes.map(r => baseUrlObj.origin + r));
        if (manifest.pages) routes.push(...manifest.pages.map(p => baseUrlObj.origin + p));
        if (manifest.start_url) routes.push(baseUrlObj.origin + manifest.start_url);
        
        return routes;
      } catch (e) {
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

    // PHASE 1: DISCOVERY - Fast URL collection
    if (phase === 'discover') {
      console.log('=== URL DISCOVERY PHASE ===');
      const allDiscoveredPages = new Set();
      const errors = [];
      
      // 1. Check manifest.json
      try {
        console.log('Checking manifest.json...');
        const manifestRoutes = await fetchManifestRoutes();
        if (manifestRoutes.length > 0) {
          console.log(`Found ${manifestRoutes.length} routes in manifest`);
          manifestRoutes.forEach(route => allDiscoveredPages.add(route));
        }
      } catch (error) {
        console.log('Manifest check failed:', error.message);
      }
      
      // 2. Render main page and extract all links (including sidebar)
      try {
        console.log('Rendering main page...');
        const mainPageHtml = await renderPage(baseUrl);
        allDiscoveredPages.add(baseUrl);
        
        const mainPageLinks = extractLinksFromHTML(mainPageHtml, baseUrl);
        console.log(`Found ${mainPageLinks.length} links in main page`);
        mainPageLinks.forEach(link => allDiscoveredPages.add(link));
      } catch (error) {
        errors.push(`Main page render failed: ${error.message}`);
        console.error('Main page error:', error.message);
        // Add base URL anyway
        allDiscoveredPages.add(baseUrl);
      }
      
      // 3. Check sitemap
      try {
        console.log('Checking sitemap...');
        const sitemapUrls = await fetchSitemap();
        if (sitemapUrls.length > 0) {
          console.log(`Found ${sitemapUrls.length} URLs in sitemap`);
          sitemapUrls.forEach(url => allDiscoveredPages.add(url));
        }
      } catch (error) {
        console.log('Sitemap check failed:', error.message);
      }
      
      const discoveredUrls = Array.from(allDiscoveredPages).slice(0, maxPages);
      console.log(`✓ Discovered ${discoveredUrls.length} unique URLs`);
      
      return Response.json({
        success: true,
        phase: 'discover',
        data: {
          urls: discoveredUrls,
          totalFound: discoveredUrls.length,
          errors: errors.length > 0 ? errors : undefined,
        }
      });
    }

    // PHASE 2: EXTRACTION - Process URLs one by one
    if (phase === 'extract') {
      if (!urlsToExtract || urlsToExtract.length === 0) {
        return Response.json({ error: 'No URLs provided for extraction' }, { status: 400 });
      }

      console.log(`=== EXTRACTION PHASE: Processing ${urlsToExtract.length} URLs ===`);
      const extractedPages = [];
      const extractionErrors = [];
      
      for (let i = 0; i < urlsToExtract.length; i++) {
        const pageUrl = urlsToExtract[i];
        console.log(`[${i + 1}/${urlsToExtract.length}] Extracting: ${pageUrl}`);
        
        try {
          const html = await renderPage(pageUrl);
          
          const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
          const title = titleMatch ? titleMatch[1].trim() : new URL(pageUrl).pathname.replace(/\//g, '').slice(0, 30) || 'Home';
          
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
            success: true,
          });
          
          console.log(`✓ Extracted: ${title}`);
        } catch (e) {
          const errorMsg = e.message || 'Unknown error';
          console.error(`✗ Error extracting ${pageUrl}:`, errorMsg);
          extractionErrors.push({ url: pageUrl, error: errorMsg });
          
          // Add failed page to results with error info
          extractedPages.push({
            url: pageUrl,
            pathname: new URL(pageUrl).pathname,
            title: `Error - ${new URL(pageUrl).pathname}`,
            html: '',
            css: '',
            success: false,
            error: errorMsg,
          });
        }
        
        // Small delay to avoid rate limiting
        if (i < urlsToExtract.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
      const successCount = extractedPages.filter(p => p.success).length;
      console.log(`Extraction complete: ${successCount}/${urlsToExtract.length} successful`);
      if (extractionErrors.length > 0) {
        console.log('Errors:', extractionErrors);
      }

      return Response.json({
        success: true,
        phase: 'extract',
        data: {
          baseUrl,
          totalPages: extractedPages.length,
          successfulPages: extractedPages.filter(p => p.success).length,
          failedPages: extractionErrors.length,
          pages: extractedPages,
          siteName: baseUrlObj.hostname.replace('www.', ''),
          errors: extractionErrors.length > 0 ? extractionErrors : undefined,
        }
      });
    }

    return Response.json({ error: 'Invalid phase parameter' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});