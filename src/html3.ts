import { parse } from "parse5";

export interface ParagraphCounts {
  text: string;
  characters: number;
  words: number;
}

export interface HTMLMDResponse {
  paragraphs: ParagraphCounts[];
  hrefs: URL[];
  baseHTML?: URL;
}

/**
 * Extracts paragraphs and links, resolves relative URLs using a <base> tag or a provided baseURL.
 * Returns baseHTML as a URL if a <base> tag is found.
 */
export function parseHTMLMD(html: string, baseURL?: string): HTMLMDResponse {
  const document = parse(html);

  const paragraphs: ParagraphCounts[] = [];
  const hrefs: URL[] = [];
  let baseHTML: URL | undefined;
  let resolvedBase: string | undefined = baseURL;

  // @ts-expect-error parse5 node typing
  function getInnerText(node): string {
    if (node.nodeName === "#text") return node.value;
    if (!node.childNodes) return "";
    return node.childNodes.map(getInnerText).join("");
  }

  // @ts-expect-error parse5 node typing
  function getAttribute(node, name: string): string | null {
    if (!node.attrs) return null; // @ts-expect-error
    const attr = node.attrs.find(a => a.name === name);
    return attr ? attr.value : null;
  }

  // First pass: find <base> href if present
  // @ts-expect-error parse5 node typing
  function findBase(node): void {
    if (node.tagName === "base") {
      const href = getAttribute(node, "href");
      if (href) {
        try {
          baseHTML = new URL(href, baseURL);
          resolvedBase = baseHTML.href;
        } catch {
          // ignore invalid base href
        }
      }
    }
    if (node.childNodes) {
      for (const child of node.childNodes) findBase(child);
    }
  }
  findBase(document);

  // Main walk to collect paragraphs and links
  // @ts-expect-error parse5 node typing
  function walk(node): void {
    if (node.tagName === "p") {
      const text = getInnerText(node).replace(/\s+/g, " ").trim();
      if (text.length > 0) {
        paragraphs.push({
          text,
          characters: text.length,
          words: text.split(/\s+/).filter(Boolean).length,
        });
      }
    }

    if (node.tagName === "a") {
      const href = getAttribute(node, "href");
      if (href) {
        try {
          hrefs.push(new URL(href, resolvedBase || undefined));
        } catch {
          // ignore invalid URLs
        }
      }
    }

    if (node.childNodes) {
      for (const child of node.childNodes) walk(child);
    }
  }

  walk(document);

  return { paragraphs, hrefs, baseHTML };
}
