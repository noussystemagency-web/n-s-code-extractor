import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { html, url } = await req.json();

    const issues = [];
    const suggestions = [];
    const good = [];

    // Title
    const titleMatch = (html || '').match(/<title[^>]*>(.*?)<\/title>/i);
    if (!titleMatch) {
      issues.push('Falta el tag <title>');
    } else {
      const title = titleMatch[1];
      if (title.length < 30) {
        suggestions.push(`Title muy corto (${title.length} chars). Recomendado: 30-60 caracteres`);
      } else if (title.length > 60) {
        suggestions.push(`Title muy largo (${title.length} chars). Recomendado: 30-60 caracteres`);
      } else {
        good.push('Title con longitud óptima');
      }
    }

    // Meta description
    const descMatch = (html || '').match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i);
    if (!descMatch) {
      issues.push('Falta meta description');
    } else {
      const desc = descMatch[1];
      if (desc.length < 120) {
        suggestions.push(`Meta description corta (${desc.length} chars). Recomendado: 120-160`);
      } else if (desc.length > 160) {
        suggestions.push(`Meta description larga (${desc.length} chars). Recomendado: 120-160`);
      } else {
        good.push('Meta description con longitud óptima');
      }
    }

    // Meta viewport
    if ((html || '').includes('name="viewport"')) {
      good.push('Meta viewport presente (mobile-friendly)');
    } else {
      issues.push('Falta meta viewport para móviles');
    }

    // Open Graph
    const hasOG = (html || '').includes('property="og:');
    if (hasOG) {
      good.push('Tags Open Graph detectados');
    } else {
      suggestions.push('Añade tags Open Graph para redes sociales');
    }

    // Headings
    const h1Count = ((html || '').match(/<h1[^>]*>/gi) || []).length;
    if (h1Count === 0) {
      issues.push('No hay ningún H1 en la página');
    } else if (h1Count === 1) {
      good.push('Estructura de H1 correcta (1 único H1)');
    } else {
      suggestions.push(`Múltiples H1 detectados (${h1Count}). Mejor usar solo 1`);
    }

    // Images with alt
    const images = [...(html || '').matchAll(/<img[^>]*>/gi)];
    const imagesWithAlt = images.filter(img => img[0].includes('alt=')).length;
    if (images.length > 0) {
      const percentage = Math.round((imagesWithAlt / images.length) * 100);
      if (percentage === 100) {
        good.push('Todas las imágenes tienen atributo alt');
      } else {
        suggestions.push(`${percentage}% de imágenes con alt (${imagesWithAlt}/${images.length})`);
      }
    }

    // Links
    const links = [...(html || '').matchAll(/<a[^>]*href=["']([^"']*)["'][^>]*>/gi)];
    const externalLinks = links.filter(l => l[1].startsWith('http')).length;
    const internalLinks = links.length - externalLinks;
    good.push(`${internalLinks} enlaces internos, ${externalLinks} enlaces externos`);

    // Semantic HTML
    const semanticTags = ['header', 'nav', 'main', 'article', 'section', 'aside', 'footer'];
    const foundTags = semanticTags.filter(tag => (html || '').includes(`<${tag}`));
    if (foundTags.length >= 4) {
      good.push(`Buen uso de HTML semántico (${foundTags.join(', ')})`);
    } else {
      suggestions.push('Usa más tags semánticos (header, nav, main, footer, etc.)');
    }

    // Calculate score
    const score = Math.max(0, 100 - (issues.length * 15 + suggestions.length * 5));

    return Response.json({
      success: true,
      data: {
        score: Math.round(score),
        issues,
        suggestions,
        good,
        summary: {
          title: titleMatch ? titleMatch[1] : null,
          description: descMatch ? descMatch[1] : null,
          h1_count: h1Count,
          images_total: images.length,
          images_with_alt: imagesWithAlt,
          links_total: links.length,
        }
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});