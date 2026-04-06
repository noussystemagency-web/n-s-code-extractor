import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { url, options = {} } = await req.json();

    if (!url) {
      return Response.json({ error: 'URL is required' }, { status: 400 });
    }

    let html = '';
    let screenshot_url = null;

    // Use ScrapingBee if render_spa is enabled
    if (options.render_spa) {
      const SCRAPINGBEE_API_KEY = Deno.env.get('SCRAPINGBEE_API_KEY');
      if (!SCRAPINGBEE_API_KEY) {
        return Response.json({ error: 'SCRAPINGBEE_API_KEY not configured' }, { status: 500 });
      }

      const params = new URLSearchParams({
        api_key: SCRAPINGBEE_API_KEY,
        url: url,
        render_js: 'true',
        wait: '3000',
        premium_proxy: 'true',
        screenshot: 'true',
        screenshot_full_page: 'true',
      });

      const response = await fetch(`https://app.scrapingbee.com/api/v1/?${params.toString()}`);
      
      if (!response.ok) {
        return Response.json({ error: `ScrapingBee error: ${response.status}` }, { status: 400 });
      }

      html = await response.text();
      
      // Get screenshot URL from response headers
      const screenshotHeader = response.headers.get('spb-screenshot');
      if (screenshotHeader) {
        screenshot_url = screenshotHeader;
      }
    } else {
      // Regular fetch without JS rendering
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
        }
      });

      if (!response.ok) {
        return Response.json({ error: `Failed to fetch: ${response.status}` }, { status: 400 });
      }

      html = await response.text();
    }

    // Extract inline CSS
    const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
    const inlineStyles = [];
    let match;
    while ((match = styleRegex.exec(html)) !== null) {
      inlineStyles.push(match[1].trim());
    }

    // Extract external CSS links
    const linkRegex = /<link[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*>/gi;
    const cssLinks = [];
    while ((match = linkRegex.exec(html)) !== null) {
      let href = match[1];
      if (href.startsWith('//')) href = 'https:' + href;
      else if (href.startsWith('/')) {
        const urlObj = new URL(url);
        href = urlObj.origin + href;
      }
      cssLinks.push(href);
    }

    // Fetch external CSS
    const externalCSS = [];
    for (const link of cssLinks.slice(0, 10)) {
      try {
        const cssRes = await fetch(link);
        if (cssRes.ok) {
          const cssText = await cssRes.text();
          externalCSS.push({ url: link, content: cssText.substring(0, 50000) });
        }
      } catch (e) {
        externalCSS.push({ url: link, content: '/* Failed to fetch */', error: true });
      }
    }

    // Extract inline scripts
    const scriptRegex = /<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/gi;
    const inlineScripts = [];
    while ((match = scriptRegex.exec(html)) !== null) {
      if (match[1].trim()) inlineScripts.push(match[1].trim().substring(0, 20000));
    }

    // Extract external script URLs
    const extScriptRegex = /<script[^>]*src=["']([^"']+)["'][^>]*>/gi;
    const scriptLinks = [];
    while ((match = extScriptRegex.exec(html)) !== null) {
      scriptLinks.push(match[1]);
    }

    // Extract images
    const imgRegex = /<img[^>]*src=["']([^"']+)["'][^>]*>/gi;
    const images = [];
    while ((match = imgRegex.exec(html)) !== null) {
      let src = match[1];
      if (src.startsWith('/') && !src.startsWith('//')) {
        const urlObj = new URL(url);
        src = urlObj.origin + src;
      }
      images.push(src);
    }

    // Extract fonts from CSS
    const fontRegex = /font-family:\s*['"]?([^;'"}\n,]+)/gi;
    const fonts = new Set();
    const allCSS = [...inlineStyles, ...externalCSS.map(c => c.content)].join('\n');
    while ((match = fontRegex.exec(allCSS)) !== null) {
      fonts.add(match[1].trim());
    }
    // Google Fonts
    const googleFontRegex = /fonts\.googleapis\.com\/css2?\?family=([^"'&]+)/gi;
    while ((match = googleFontRegex.exec(html)) !== null) {
      fonts.add(decodeURIComponent(match[1]).replace(/\+/g, ' '));
    }

    // Extract colors from CSS
    const colorRegex = /#[0-9a-fA-F]{3,8}\b|rgba?\([^)]+\)|hsla?\([^)]+\)/gi;
    const colors = new Set();
    while ((match = colorRegex.exec(allCSS)) !== null) {
      colors.add(match[0]);
    }

    // Extract meta info
    const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
    const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);

    // Simple DOM structure analysis
    const tagRegex = /<(header|nav|main|footer|aside|section|article|div|form|table|ul|ol)\b[^>]*(?:class=["']([^"']*)["'])?[^>]*>/gi;
    const structure = [];
    while ((match = tagRegex.exec(html)) !== null) {
      structure.push({
        tag: match[1],
        classes: match[2] || '',
      });
      if (structure.length > 200) break;
    }

    // Detect framework
    let framework = 'Unknown';
    if (html.includes('__next') || html.includes('_next')) framework = 'Next.js';
    else if (html.includes('__nuxt') || html.includes('nuxt')) framework = 'Nuxt.js';
    else if (html.includes('data-reactroot') || html.includes('__REACT')) framework = 'React';
    else if (html.includes('ng-') || html.includes('ng-app')) framework = 'Angular';
    else if (html.includes('data-v-') || html.includes('__vue')) framework = 'Vue.js';
    else if (html.includes('data-svelte')) framework = 'Svelte';
    if (html.includes('tailwind') || allCSS.includes('tailwindcss')) framework += ' + Tailwind';

    return Response.json({
      success: true,
      data: {
        html: html.substring(0, 200000),
        css: {
          inline: inlineStyles.join('\n\n'),
          external: externalCSS,
          links: cssLinks,
        },
        js: {
          inline: inlineScripts,
          external_links: scriptLinks,
        },
        assets: {
          images: [...new Set(images)].slice(0, 50),
          fonts: [...fonts],
          colors: [...colors].slice(0, 50),
        },
        structure: structure.slice(0, 100),
        metadata: {
          title: titleMatch ? titleMatch[1] : '',
          description: descMatch ? descMatch[1] : '',
          framework,
          total_size: `${(html.length / 1024).toFixed(1)} KB`,
          css_count: cssLinks.length,
          script_count: scriptLinks.length,
          image_count: images.length,
        },
        screenshot_url,
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});