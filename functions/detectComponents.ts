import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { html, css } = await req.json();

    const components = [];

    // Detect buttons
    const buttons = [...(html || '').matchAll(/<button[^>]*>([\s\S]*?)<\/button>/gi)];
    buttons.forEach((btn, i) => {
      const classes = btn[0].match(/class=["']([^"']*)["']/)?.[1] || '';
      components.push({
        type: 'button',
        name: `Button${i + 1}`,
        html: btn[0],
        classes,
        text: btn[1].replace(/<[^>]*>/g, '').trim(),
      });
    });

    // Detect cards
    const cardRegex = /<div[^>]*class=["'][^"']*card[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi;
    const cards = [...(html || '').matchAll(cardRegex)];
    cards.forEach((card, i) => {
      components.push({
        type: 'card',
        name: `Card${i + 1}`,
        html: card[0].substring(0, 500),
        classes: card[0].match(/class=["']([^"']*)["']/)?.[1] || '',
      });
    });

    // Detect forms
    const forms = [...(html || '').matchAll(/<form[^>]*>([\s\S]*?)<\/form>/gi)];
    forms.forEach((form, i) => {
      const inputs = (form[0].match(/<input/gi) || []).length;
      components.push({
        type: 'form',
        name: `Form${i + 1}`,
        html: form[0].substring(0, 500),
        inputs_count: inputs,
      });
    });

    // Detect navigation
    const navs = [...(html || '').matchAll(/<nav[^>]*>([\s\S]*?)<\/nav>/gi)];
    navs.forEach((nav, i) => {
      const links = (nav[0].match(/<a[^>]*>/gi) || []).length;
      components.push({
        type: 'navigation',
        name: `Navigation${i + 1}`,
        html: nav[0].substring(0, 500),
        links_count: links,
      });
    });

    // Detect modals
    const modalRegex = /<div[^>]*class=["'][^"']*modal[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi;
    const modals = [...(html || '').matchAll(modalRegex)];
    modals.forEach((modal, i) => {
      components.push({
        type: 'modal',
        name: `Modal${i + 1}`,
        html: modal[0].substring(0, 500),
      });
    });

    // Detect tables
    const tables = [...(html || '').matchAll(/<table[^>]*>([\s\S]*?)<\/table>/gi)];
    tables.forEach((table, i) => {
      const rows = (table[0].match(/<tr[^>]*>/gi) || []).length;
      components.push({
        type: 'table',
        name: `Table${i + 1}`,
        html: table[0].substring(0, 500),
        rows_count: rows,
      });
    });

    // Detect headers
    const headers = [...(html || '').matchAll(/<header[^>]*>([\s\S]*?)<\/header>/gi)];
    headers.forEach((header, i) => {
      components.push({
        type: 'header',
        name: `Header${i + 1}`,
        html: header[0].substring(0, 500),
      });
    });

    // Detect footers
    const footers = [...(html || '').matchAll(/<footer[^>]*>([\s\S]*?)<\/footer>/gi)];
    footers.forEach((footer, i) => {
      components.push({
        type: 'footer',
        name: `Footer${i + 1}`,
        html: footer[0].substring(0, 500),
      });
    });

    // Detect sidebars
    const sidebarRegex = /<(?:div|aside)[^>]*class=["'][^"']*sidebar[^"']*["'][^>]*>([\s\S]*?)<\/(?:div|aside)>/gi;
    const sidebars = [...(html || '').matchAll(sidebarRegex)];
    sidebars.forEach((sidebar, i) => {
      components.push({
        type: 'sidebar',
        name: `Sidebar${i + 1}`,
        html: sidebar[0].substring(0, 500),
      });
    });

    return Response.json({
      success: true,
      data: {
        components,
        summary: {
          total: components.length,
          by_type: components.reduce((acc, c) => {
            acc[c.type] = (acc[c.type] || 0) + 1;
            return acc;
          }, {}),
        }
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});