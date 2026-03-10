import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { url: testUrl } = await req.json();

    const baseUrlObj = new URL(testUrl);
    const domain = baseUrlObj.hostname;

    const response = await fetch(testUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      redirect: 'manual',
    });
    
    const html = await response.text();
    
    // Extract script tags
    const scriptRegex = /<script[^>]*src=["']([^"']+)["']/gi;
    const scriptUrls = [];
    let match;
    while ((match = scriptRegex.exec(html)) !== null) {
      let scriptUrl = match[1];
      if (scriptUrl.startsWith('//')) {
        scriptUrl = 'https:' + scriptUrl;
      } else if (scriptUrl.startsWith('/')) {
        scriptUrl = baseUrlObj.origin + scriptUrl;
      } else if (!scriptUrl.startsWith('http')) {
        scriptUrl = new URL(scriptUrl, testUrl).href;
      }
      scriptUrls.push(scriptUrl);
    }
    
    // Try to fetch first script
    let firstScriptContent = null;
    let firstScriptError = null;
    if (scriptUrls.length > 0) {
      try {
        const scriptRes = await fetch(scriptUrls[0], {
          headers: { 'User-Agent': 'Mozilla/5.0' },
          redirect: 'follow'
        });
        firstScriptContent = {
          url: scriptUrls[0],
          ok: scriptRes.ok,
          status: scriptRes.status,
          contentLength: (await scriptRes.text()).length
        };
      } catch (e) {
        firstScriptError = e.message;
      }
    }
    
    return Response.json({
      success: true,
      htmlLength: html.length,
      scriptTagsFound: scriptUrls.length,
      scriptUrls: scriptUrls.slice(0, 5),
      firstScriptTest: firstScriptContent,
      firstScriptError
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});