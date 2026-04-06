import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { html, css } = await req.json();

    const issues = [];
    const warnings = [];
    const suggestions = [];

    // Check for alt text in images
    const imgRegex = /<img[^>]*>/gi;
    const images = [...(html || '').matchAll(imgRegex)];
    images.forEach((img, i) => {
      if (!img[0].includes('alt=')) {
        issues.push({
          type: 'missing_alt',
          severity: 'error',
          message: `Imagen ${i + 1} sin atributo alt`,
          element: img[0].substring(0, 100),
        });
      }
    });

    // Check for heading hierarchy
    const h1Count = (html || '').match(/<h1[^>]*>/gi)?.length || 0;
    if (h1Count === 0) {
      issues.push({
        type: 'missing_h1',
        severity: 'error',
        message: 'No se encontró ningún <h1> en la página',
      });
    } else if (h1Count > 1) {
      warnings.push({
        type: 'multiple_h1',
        severity: 'warning',
        message: `Se encontraron ${h1Count} elementos <h1> (debería haber solo 1)`,
      });
    }

    // Check for form labels
    const inputs = [...(html || '').matchAll(/<input[^>]*>/gi)];
    inputs.forEach((input, i) => {
      const hasId = input[0].includes('id=');
      const hasAriaLabel = input[0].includes('aria-label=');
      if (!hasId && !hasAriaLabel) {
        warnings.push({
          type: 'unlabeled_input',
          severity: 'warning',
          message: `Input ${i + 1} sin label asociado ni aria-label`,
          element: input[0].substring(0, 100),
        });
      }
    });

    // Check color contrast (basic)
    const colorRegex = /color:\s*([^;]+);/gi;
    const bgRegex = /background(?:-color)?:\s*([^;]+);/gi;
    const colors = [...(css || '').matchAll(colorRegex)];
    const backgrounds = [...(css || '').matchAll(bgRegex)];
    
    if (colors.length > 0 || backgrounds.length > 0) {
      suggestions.push({
        type: 'color_contrast',
        severity: 'info',
        message: 'Verifica el contraste de colores manualmente (WCAG AA: 4.5:1 para texto normal)',
      });
    }

    // Check for ARIA landmarks
    const hasMain = (html || '').includes('<main') || (html || '').includes('role="main"');
    const hasNav = (html || '').includes('<nav') || (html || '').includes('role="navigation"');
    
    if (!hasMain) {
      suggestions.push({
        type: 'missing_landmark',
        severity: 'info',
        message: 'Considera añadir un elemento <main> o role="main"',
      });
    }

    // Check for skip links
    const hasSkipLink = (html || '').toLowerCase().includes('skip to content') || 
                        (html || '').toLowerCase().includes('saltar al contenido');
    if (!hasSkipLink) {
      suggestions.push({
        type: 'missing_skip_link',
        severity: 'info',
        message: 'Considera añadir un "skip to content" link para usuarios de teclado',
      });
    }

    // Calculate score
    const totalChecks = issues.length + warnings.length + suggestions.length;
    const score = totalChecks === 0 ? 100 : Math.max(0, 100 - (issues.length * 20 + warnings.length * 10 + suggestions.length * 5));

    return Response.json({
      success: true,
      data: {
        score: Math.round(score),
        issues,
        warnings,
        suggestions,
        summary: {
          total_issues: issues.length,
          total_warnings: warnings.length,
          total_suggestions: suggestions.length,
        }
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});