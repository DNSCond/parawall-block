import { parse } from "parse5";

/**
 * @param {string} html
 * @param {{
 *   maxCharactersPerParagraph?: number,
 *   maxWordsPerParagraph?: number,
 * }} limits
 * @returns {boolean} true if any paragraph exceeds limits
 */
export function exceedsParagraphLimits(html: string, limits: { maxCharactersPerParagraph?: number, maxWordsPerParagraph?: number } = {}): boolean {
  const { maxCharactersPerParagraph, maxWordsPerParagraph } = limits;

  if (
    maxCharactersPerParagraph == null
    && maxWordsPerParagraph == null
  ) {
    return false;
  }

  const document = parse(`${html}`);

  // @ts-expect-error
  function getInnerText(node) {
    if (node.nodeName === "#text") {
      return node.value;
    }
    if (!node.childNodes) return "";
    return node.childNodes.map(getInnerText).join("");
  }

  // @ts-expect-error
  function walk(node) {
    if (node.tagName === "p") {
      const text = getInnerText(node)
        .replace(/\s+/g, " ")
        .trim();

      if (text.length === 0) return false;

      if (
        maxCharactersPerParagraph != null &&
        text.length > maxCharactersPerParagraph
      ) {
        return true;
      }

      if (maxWordsPerParagraph != null) {
        const wordCount = text.split(/\s+/).filter(Boolean).length;
        if (wordCount > maxWordsPerParagraph) {
          return true;
        }
      }
    }

    if (node.childNodes) {
      for (const child of node.childNodes) {
        if (walk(child)) return true;
      }
    }

    return false;
  }

  return walk(document);
}
