import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import puppeteer from 'npm:puppeteer@23.9.0';

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

    const baseUrlObj = new URL(baseUrl);
    const domain = baseUrlObj.hostname;
    const discoveredPages = new Set();
    const extractedPages = [];

    // Launch Puppeteer browser
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });

    const parseCookies = (cookieString) => {
      if (!cookieString) return [];
      return cookieString.split(';').map(c => {
        const [name, ...valueParts] = c.trim().split('=');
        return {
          name: name.trim(),
          value: valueParts.join('=').trim(),
          domain: domain,
        };
      }).filter(c => c.name && c.value);
    };

    const cookieObjects = parseCookies(cookies);

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

    // Helper to fetch and extract links using Puppeteer
    const fetchAndExtractLinks = async (url) => {
      const page = await browser.newPage();
      try {
        // Set cookies
        if (cookieObjects.length > 0) {
          await page.setCookie(...cookieObjects);
        }

        // Navigate and wait for content
        await page.goto(url, { 
          waitUntil: 'networkidle2',
          timeout: 15000,
        });

        // Wait for dynamic content
        await page.waitForTimeout(2000);

        // Extract links from rendered page
        const links = await page.evaluate((currentDomain) => {
          const extractedLinks = new Set();
          document.querySelectorAll('a[href]').forEach(a => {
            let href = a.getAttribute('href');
            if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:')) return;
            
            try {
              const absoluteUrl = new URL(href, window.location.href);
              if (absoluteUrl.hostname === currentDomain) {
                extractedLinks.add(absoluteUrl.origin + absoluteUrl.pathname);
              }
            } catch (e) {
              // Invalid URL
            }
          });
          return Array.from(extractedLinks);
        }, domain);

        await page.close();
        return links;
      } catch (e) {
        console.error(`Error fetching ${url}:`, e.message);
        await page.close();
        return [];
      }
    };

    // Helper to fetch sitemap
    const fetchSitemap = async () => {
      try {
        const sitemapUrl = baseUrlObj.origin + '/sitemap.xml';
        const headers = { 'User-Agent': 'Mozilla/5.0' };
        if (cookies) headers['Cookie'] = cookies;
        const response = await fetch(sitemapUrl, { headers });
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

    // Extraction phase with Puppeteer
    const pages = Array.from(allDiscoveredPages);
    
    for (let i = 0; i < pages.length; i++) {
      const pageUrl = pages[i];
      const page = await browser.newPage();
      
      try {
        // Set cookies
        if (cookieObjects.length > 0) {
          await page.setCookie(...cookieObjects);
        }

        // Navigate and wait for JavaScript execution
        await page.goto(pageUrl, { 
          waitUntil: 'networkidle2',
          timeout: 15000,
        });

        // Wait for dynamic content to render
        await page.waitForTimeout(2000);

        // Get rendered HTML
        const html = await page.content();
        
        // Extract title
        const title = await page.title() || new URL(pageUrl).pathname.replace(/\//g, '').slice(0, 30) || 'Home';
        
        // Extract inline CSS
        const inlineStyles = await page.evaluate(() => {
          const styles = [];
          document.querySelectorAll('style').forEach(style => {
            if (style.textContent) styles.push(style.textContent.trim());
          });
          return styles;
        });
        
        extractedPages.push({
          url: pageUrl,
          pathname: new URL(pageUrl).pathname,
          title,
          html: html.substring(0, 100000),
          css: inlineStyles.join('\n\n'),
        });
        
        await page.close();
      } catch (e) {
        console.error(`Error extracting ${pageUrl}:`, e.message);
        await page.close();
      }
    }

    // Close browser
    await browser.close();

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
    // Ensure browser is closed on error
    try {
      if (browser) await browser.close();
    } catch (e) {
      // Ignore
    }
    return Response.json({ error: error.message }, { status: 500 });
  }
});