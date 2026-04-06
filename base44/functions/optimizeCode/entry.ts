import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { html, css, js, options = {} } = await req.json();

    let optimizedHTML = html || '';
    let optimizedCSS = css || '';
    let optimizedJS = js || '';

    // HTML Optimization
    if (options.removeScripts) {
      optimizedHTML = optimizedHTML.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    }
    if (options.removeComments) {
      optimizedHTML = optimizedHTML.replace(/<!--[\s\S]*?-->/g, '');
      optimizedCSS = optimizedCSS.replace(/\/\*[\s\S]*?\*\//g, '');
      optimizedJS = optimizedJS.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*/g, '');
    }
    if (options.removeEmptyElements) {
      optimizedHTML = optimizedHTML.replace(/<(\w+)[^>]*>\s*<\/\1>/g, '');
    }
    if (options.removeInlineStyles && !options.preserveInlineStyles) {
      optimizedHTML = optimizedHTML.replace(/\sstyle=["'][^"']*["']/gi, '');
    }
    if (options.minifyHTML) {
      optimizedHTML = optimizedHTML
        .replace(/>\s+</g, '><')
        .replace(/\s{2,}/g, ' ')
        .trim();
    }

    // CSS Optimization
    if (options.removeUnusedCSS) {
      // Extract all classes and IDs from HTML
      const usedClasses = new Set([
        ...(optimizedHTML.match(/class=["']([^"']*)["']/gi) || [])
          .flatMap(m => m.match(/class=["']([^"']*)["']/)[1].split(/\s+/))
      ]);
      const usedIds = new Set([
        ...(optimizedHTML.match(/id=["']([^"']*)["']/gi) || [])
          .map(m => m.match(/id=["']([^"']*)["']/)[1])
      ]);

      // Filter CSS rules
      const cssRules = optimizedCSS.split('}').filter(Boolean);
      optimizedCSS = cssRules.filter(rule => {
        const selector = rule.split('{')[0]?.trim();
        if (!selector) return false;
        
        // Keep if selector matches used classes/ids or is a tag selector
        return /^[a-z]+$/i.test(selector) || // tag selectors
               [...usedClasses].some(c => selector.includes(`.${c}`)) ||
               [...usedIds].some(id => selector.includes(`#${id}`)) ||
               /^[@:*]/.test(selector); // pseudo, media queries, universal
      }).join('}\n') + '}';
    }
    if (options.combineMediaQueries) {
      const mediaQueries = {};
      optimizedCSS = optimizedCSS.replace(/@media[^{]+\{([^}]+\{[^}]+\})+\}/g, (match) => {
        const media = match.match(/@media[^{]+/)[0];
        const rules = match.match(/\{([\s\S]+)\}$/)[1];
        if (!mediaQueries[media]) mediaQueries[media] = [];
        mediaQueries[media].push(rules);
        return '';
      });
      optimizedCSS += '\n' + Object.entries(mediaQueries)
        .map(([media, rules]) => `${media} { ${rules.join(' ')} }`)
        .join('\n');
    }
    if (options.minifyCSS) {
      optimizedCSS = optimizedCSS
        .replace(/\s*([{}:;,])\s*/g, '$1')
        .replace(/;\}/g, '}')
        .replace(/\s{2,}/g, ' ')
        .trim();
    }

    // JS Optimization
    if (options.removeConsole) {
      optimizedJS = optimizedJS.replace(/console\.(log|debug|info|warn|error)\([^)]*\);?/g, '');
    }
    if (options.removeDebugger) {
      optimizedJS = optimizedJS.replace(/debugger;?/g, '');
    }
    if (options.minifyJS) {
      optimizedJS = optimizedJS
        .replace(/\s{2,}/g, ' ')
        .replace(/\s*([{}();,=+\-*/<>!&|])\s*/g, '$1')
        .trim();
    }

    // Calculate size reduction
    const originalSize = (html?.length || 0) + (css?.length || 0) + (js?.length || 0);
    const optimizedSize = optimizedHTML.length + optimizedCSS.length + optimizedJS.length;
    const reduction = originalSize > 0 ? ((1 - optimizedSize / originalSize) * 100).toFixed(1) : 0;

    return Response.json({
      success: true,
      data: {
        html: optimizedHTML,
        css: optimizedCSS,
        js: optimizedJS,
        stats: {
          original_size: `${(originalSize / 1024).toFixed(1)} KB`,
          optimized_size: `${(optimizedSize / 1024).toFixed(1)} KB`,
          reduction: `${reduction}%`,
        }
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});