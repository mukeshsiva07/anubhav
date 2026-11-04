import sanitizeHtml from 'sanitize-html';

const defaultOptions: sanitizeHtml.IOptions = {
  allowedTags: [
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'p', 'br', 'hr',
    'strong', 'b', 'em', 'i', 'u', 's', 'strike',
    'ul', 'ol', 'li', 'blockquote',
    'pre', 'code',
    'a', 'img',
    'mark', 'span', 'div',
    'table', 'thead', 'tbody', 'tr', 'th', 'td'
  ],
  allowedAttributes: {
    a: ['href', 'name', 'target', 'rel'],
    img: ['src', 'alt', 'title', 'width', 'height'],
    span: ['class', 'style'],
    div: ['class', 'style'],
    p: ['class', 'style'],
    code: ['class'],
    th: ['colspan', 'rowspan'],
    td: ['colspan', 'rowspan']
  },
  allowedStyles: {
    '*': {
      'text-align': [/^left$/, /^right$/, /^center$/, /^justify$/],
      'color': [/^#(0x)?[0-9a-f]+$/i, /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/],
      'background-color': [/^#(0x)?[0-9a-f]+$/i, /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/]
    }
  },
  allowedSchemes: ['http', 'https', 'data']
};

export function sanitizeContent(dirtyHtml: string): string {
  if (!dirtyHtml) return '';
  return sanitizeHtml(dirtyHtml, defaultOptions);
}

export function extractPlainText(html: string): string {
  if (!html) return '';
  return sanitizeHtml(html, {
    allowedTags: [],
    allowedAttributes: {}
  }).replace(/\s+/g, ' ').trim();
}

