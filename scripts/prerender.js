import fs from 'fs';
import path from 'path';

const distDir = path.resolve('dist');
const templatePath = path.join(distDir, 'index.html');

if (!fs.existsSync(templatePath)) {
  console.error('Template not found at', templatePath);
  process.exit(1);
}

const template = fs.readFileSync(templatePath, 'utf8');

const pages = [
  {
    path: '/',
    title: 'Typed agent runtime for the JVM · TraceGraph',
    description: 'TraceGraph is a typed execution-graph runtime for the JVM. Replay runs, resume checkpoints, and observe every step.',
    url: 'https://www.tracegraph.site/'
  },
  {
    path: '/docs',
    title: 'Docs · TraceGraph',
    description: 'Documentation for TraceGraph.',
    url: 'https://www.tracegraph.site/docs'
  },
  {
    path: '/api',
    title: 'API reference · TraceGraph',
    description: 'REST endpoints for TraceGraph.',
    url: 'https://www.tracegraph.site/api'
  },
  {
    path: '/changelog',
    title: 'Changelog · TraceGraph',
    description: 'Release notes for TraceGraph.',
    url: 'https://www.tracegraph.site/changelog'
  }
];

pages.forEach((page) => {
  let html = template;

  // Replace title
  html = html.replace(/<title>.*?<\/title>/g, `<title>${page.title}</title>`);

  // Replace or inject meta description
  if (html.includes('name="description"')) {
    html = html.replace(/<meta name="description" content=".*?"/g, `<meta name="description" content="${page.description}"`);
  } else {
    html = html.replace('</head>', `    <meta name="description" content="${page.description}" />\n  </head>`);
  }

  // Replace canonical link
  if (html.includes('rel="canonical"')) {
    html = html.replace(/<link rel="canonical" href=".*?"/g, `<link rel="canonical" href="${page.url}"`);
  } else {
    html = html.replace('</head>', `    <link rel="canonical" href="${page.url}" />\n  </head>`);
  }

  // Replace og:title
  if (html.includes('property="og:title"')) {
    html = html.replace(/<meta property="og:title" content=".*?"/g, `<meta property="og:title" content="${page.title}"`);
  } else {
    html = html.replace('</head>', `    <meta property="og:title" content="${page.title}" />\n  </head>`);
  }

  // Replace og:description
  if (html.includes('property="og:description"')) {
    html = html.replace(/<meta property="og:description" content=".*?"/g, `<meta property="og:description" content="${page.description}"`);
  } else {
    html = html.replace('</head>', `    <meta property="og:description" content="${page.description}" />\n  </head>`);
  }

  // Replace og:url
  if (html.includes('property="og:url"')) {
    html = html.replace(/<meta property="og:url" content=".*?"/g, `<meta property="og:url" content="${page.url}"`);
  } else {
    html = html.replace('</head>', `    <meta property="og:url" content="${page.url}" />\n  </head>`);
  }

  // Inject or replace og:image
  const ogImage = 'https://www.tracegraph.site/og-image.png';
  if (html.includes('property="og:image"')) {
    html = html.replace(/<meta property="og:image" content=".*?"/g, `<meta property="og:image" content="${ogImage}"`);
  } else {
    html = html.replace('</head>', `    <meta property="og:image" content="${ogImage}" />\n  </head>`);
  }

  // Inject or replace twitter:title
  if (html.includes('name="twitter:title"')) {
    html = html.replace(/<meta name="twitter:title" content=".*?"/g, `<meta name="twitter:title" content="${page.title}"`);
  } else {
    html = html.replace('</head>', `    <meta name="twitter:title" content="${page.title}" />\n  </head>`);
  }

  // Inject or replace twitter:description
  if (html.includes('name="twitter:description"')) {
    html = html.replace(/<meta name="twitter:description" content=".*?"/g, `<meta name="twitter:description" content="${page.description}"`);
  } else {
    html = html.replace('</head>', `    <meta name="twitter:description" content="${page.description}" />\n  </head>`);
  }

  // Inject or replace twitter:image
  if (html.includes('name="twitter:image"')) {
    html = html.replace(/<meta name="twitter:image" content=".*?"/g, `<meta name="twitter:image" content="${ogImage}"`);
  } else {
    html = html.replace('</head>', `    <meta name="twitter:image" content="${ogImage}" />\n  </head>`);
  }

  if (page.path === '/') {
    // Write back to index.html
    fs.writeFileSync(templatePath, html, 'utf8');
    console.log('Pre-rendered / -> dist/index.html');
  } else {
    // Create directory and write index.html
    const targetDir = path.join(distDir, page.path.slice(1));
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    fs.writeFileSync(path.join(targetDir, 'index.html'), html, 'utf8');
    console.log(`Pre-rendered ${page.path} -> dist${page.path}/index.html`);
  }
});
