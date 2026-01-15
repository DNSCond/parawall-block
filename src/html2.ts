import { parse } from "parse5";

export interface ParagraphCounts {
  text: string;
  characters: number;
  words: number;
}

/**
 * Extracts character and word counts for each <p> element in the HTML.
 */
export function getParagraphCounts(html: string): ParagraphCounts[] {
  const document = parse(`${html}`);
  const results: ParagraphCounts[] = [];

  // @ts-expect-error parse5 node typing
  function getInnerText(node): string {
    if (node.nodeName === "#text") {
      return node.value;
    }
    if (!node.childNodes) return "";
    return node.childNodes.map(getInnerText).join("");
  }

  // @ts-expect-error parse5 node typing
  function walk(node): void {
    if (node.tagName === "p") {
      const text = getInnerText(node)
        .replace(/\s+/g, " ")
        .trim();

      if (text.length > 0) {
        results.push({
          text,
          characters: text.length,
          words: text.split(/\s+/).filter(Boolean).length,
        });
      }
    }

    if (node.childNodes) {
      for (const child of node.childNodes) {
        walk(child);
      }
    }
  }

  walk(document);
  return results;
}

export interface ParagraphTotals {
  characters: number;
  words: number;
}

/**
 * Returns total character and word counts across all <p> elements.
 */
export function getParagraphTotals(html: string): ParagraphTotals {
  const document = parse(`${html}`);

  let totalCharacters = 0;
  let totalWords = 0;

  // @ts-expect-error parse5 node typing
  function getInnerText(node): string {
    if (node.nodeName === "#text") {
      return node.value;
    }
    if (!node.childNodes) return "";
    return node.childNodes.map(getInnerText).join("");
  }

  // @ts-expect-error parse5 node typing
  function walk(node): void {
    if (node.tagName === "p") {
      const text = getInnerText(node)
        .replace(/\s+/g, " ")
        .trim();

      if (text.length > 0) {
        totalCharacters += text.length;
        totalWords += text.split(/\s+/).filter(Boolean).length;
      }
    }

    if (node.childNodes) {
      for (const child of node.childNodes) {
        walk(child);
      }
    }
  }

  walk(document);

  return {
    characters: totalCharacters,
    words: totalWords,
  };
}
