// Markdown -> sanitized HTML. The output of renderMarkdown() is the only user-authored HTML the
// app ever passes to {@html}. Everything else is rendered as text by Svelte.
import { Marked } from 'marked';
import sanitizeHtml from 'sanitize-html';

const marked = new Marked({ gfm: true, breaks: false, async: false });

const ALLOWED_TAGS = [
	'p',
	'br',
	'h2',
	'h3',
	'h4',
	'blockquote',
	'ul',
	'ol',
	'li',
	'strong',
	'em',
	'del',
	'code',
	'pre',
	'hr',
	'a'
];

const SANITIZE: sanitizeHtml.IOptions = {
	allowedTags: ALLOWED_TAGS,
	allowedAttributes: { a: ['href', 'title', 'rel', 'target'] },
	allowedSchemes: ['http', 'https', 'mailto'],
	allowedSchemesAppliedToAttributes: ['href'],
	allowProtocolRelative: false,
	disallowedTagsMode: 'discard',
	// Authors cannot set h1: the page title is the only h1. Map headings down one level.
	transformTags: {
		h1: 'h2',
		h5: 'h4',
		h6: 'h4',
		a: (tagName, attribs) => ({
			tagName,
			attribs: { ...attribs, rel: 'nofollow ugc noopener noreferrer', target: '_blank' }
		})
	}
};

export function renderMarkdown(md: string): string {
	const raw = marked.parse(md) as string;
	return sanitizeHtml(raw, SANITIZE);
}

/** Plain text for excerpts and meta descriptions: strips every tag. */
export function toPlainText(md: string): string {
	const html = marked.parse(md) as string;
	return sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} }).replace(/\s+/g, ' ').trim();
}

export function excerptOf(md: string, max = 180): string {
	// First prose paragraph (skip headings, lists, quotes) so excerpts read as a sentence.
	const para = md
		.split(/\n\s*\n/)
		.map((b) => b.trim())
		.find((b) => b && !/^(#|[-*+]\s|\d+\.\s|>)/.test(b));
	const text = toPlainText(para ?? md);
	if (text.length <= max) return text;
	const cut = text.slice(0, max);
	return cut.slice(0, cut.lastIndexOf(' ') > 80 ? cut.lastIndexOf(' ') : max).trimEnd() + '…';
}

/** Escapes nothing; collapses whitespace and strips control characters from plain-text input. */
export function cleanText(s: string): string {
	// eslint-disable-next-line no-control-regex -- intentionally removing control characters
	return s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim();
}

export function slugify(s: string): string {
	return (
		s
			.toLowerCase()
			.normalize('NFKD')
			.replace(/[̀-ͯ]/g, '')
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-+|-+$/g, '')
			.slice(0, 70) || 'post'
	);
}
