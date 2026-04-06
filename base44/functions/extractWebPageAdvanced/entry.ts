import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import puppeteer from 'npm:puppeteer@23.11.1';

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

    // Launch headless browser
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ]
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    // Set user agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // Intercept resources
    const resources = {
      stylesheets: [],
      scripts: [],
      fonts: [],
      images: [],
    };

    await page.setRequestInterception(true);
    page.on('request', request => request.continue());
    page.on('response', async response => {
      const type = response.request().resourceType();
      const url = response.url();
      
      if (type === 'stylesheet') {
        try {
          const css = await response.text();
          resources.stylesheets.push({ url, content: css.substring(0, 100000) });
        } catch (e) {}
      } else if (type === 'font') {
        resources.fonts.push(url);
      } else if (type === 'image') {
        resources.images.push(url);
      }
    });

    // Navigate and wait for page load
    await page.goto(url, { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });

    // Wait for dynamic content
    await page.waitForTimeout(2000);

    // Extract computed styles for all elements
    const computedData = await page.evaluate(() => {
      const getAllComputedStyles = () => {
        const elements = document.querySelectorAll('*');
        const styles = new Map();
        
        elements.forEach((el, idx) => {
          if (idx < 500) { // Limit to first 500 elements
            const computed = window.getComputedStyle(el);
            const important = {
              display: computed.display,
              position: computed.position,
              width: computed.width,
              height: computed.height,
              margin: computed.margin,
              padding: computed.padding,
              backgroundColor: computed.backgroundColor,
              color: computed.color,
              fontSize: computed.fontSize,
              fontFamily: computed.fontFamily,
              fontWeight: computed.fontWeight,
            };
            styles.set(idx, important);
          }
        });
        
        return Object.fromEntries(styles);
      };

      return {
        html: document.documentElement.outerHTML,
        title: document.title,
        computedStyles: getAllComputedStyles(),
        fonts: [...new Set(
          Array.from(document.querySelectorAll('*'))
            .map(el => window.getComputedStyle(el).fontFamily)
            .filter(f => f && f !== 'inherit')
        )],
        colors: [...new Set(
          Array.from(document.querySelectorAll('*'))
            .flatMap(el => {
              const style = window.getComputedStyle(el);
              return [style.color, style.backgroundColor, style.borderColor].filter(Boolean);
            })
        )],
        scripts: Array.from(document.scripts).map(s => ({
          src: s.src,
          inline: s.src ? null : s.textContent?.substring(0, 10000),
        })),
        links: Array.from(document.querySelectorAll('link[rel="stylesheet"]')).map(l => l.href),
      };
    });

    // Take screenshot
    const screenshot = await page.screenshot({ 
      encoding: 'base64',
      fullPage: false,
      type: 'jpeg',
      quality: 80,
    });

    await browser.close();

    // Extract inline styles from HTML
    const styleMatches = [...computedData.html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)];
    const inlineStyles = styleMatches.map(m => m[1].trim()).join('\n\n');

    // Combine all CSS
    const allCSS = [
      inlineStyles,
      ...resources.stylesheets.map(s => `/* ${s.url} */\n${s.content}`),
    ].filter(Boolean).join('\n\n');

    // Extract colors from CSS
    const colorRegex = /#[0-9a-fA-F]{3,8}\b|rgba?\([^)]+\)|hsla?\([^)]+\)/gi;
    const cssColors = [...allCSS.matchAll(colorRegex)].map(m => m[0]);
    const allColors = [...new Set([...computedData.colors, ...cssColors])];

    // Detect framework
    let framework = 'HTML/CSS/JS';
    const htmlLower = computedData.html.toLowerCase();
    if (htmlLower.includes('__next') || htmlLower.includes('_next')) framework = 'Next.js';
    else if (htmlLower.includes('__nuxt')) framework = 'Nuxt.js';
    else if (htmlLower.includes('data-reactroot') || htmlLower.includes('react')) framework = 'React';
    else if (htmlLower.includes('ng-') || htmlLower.includes('angular')) framework = 'Angular';
    else if (htmlLower.includes('data-v-') || htmlLower.includes('vue')) framework = 'Vue.js';
    else if (htmlLower.includes('svelte')) framework = 'Svelte';

    // Upload screenshot
    const screenshotBlob = new Blob([Uint8Array.from(atob(screenshot), c => c.charCodeAt(0))], { type: 'image/jpeg' });
    let screenshotUrl = null;
    try {
      const uploadRes = await base44.integrations.Core.UploadFile({ file: screenshotBlob });
      screenshotUrl = uploadRes.file_url;
    } catch (e) {}

    return Response.json({
      success: true,
      data: {
        html: computedData.html.substring(0, 200000),
        css: {
          inline: inlineStyles.substring(0, 100000),
          external: resources.stylesheets,
          links: computedData.links,
          computed: computedData.computedStyles,
        },
        js: {
          inline: computedData.scripts.filter(s => s.inline).map(s => s.inline),
          external_links: computedData.scripts.filter(s => s.src).map(s => s.src),
        },
        assets: {
          images: [...new Set([...resources.images, ...computedData.html.match(/src=["']([^"']+)["']/gi)?.map(m => m.match(/src=["']([^"']+)["']/)[1]) || []])].slice(0, 100),
          fonts: [...new Set([...resources.fonts, ...computedData.fonts])],
          colors: allColors.slice(0, 80),
        },
        structure: [],
        metadata: {
          title: computedData.title,
          framework,
          total_size: `${(computedData.html.length / 1024).toFixed(1)} KB`,
          css_count: resources.stylesheets.length,
          script_count: computedData.scripts.length,
          image_count: resources.images.length,
          fonts_count: computedData.fonts.length,
        },
        screenshot_url: screenshotUrl,
      }
    });
  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});