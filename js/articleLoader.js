let articleXML;

/**
 * Lädt die Artikelliste aus article-list.xml
 */
export async function loadArticles() {
  const res = await fetch("article-list.xml");
  const text = await res.text();
  articleXML = new DOMParser().parseFromString(text, "application/xml");
}

/**
 * Holt eine Artikelnummer anhand von Typ + Key
 */
export function lookupArticle(type, key) {
  if (!articleXML) return null;
  const node = articleXML.querySelector(`${type}[key="${key}"]`);
  if (!node) return null;

  const number = node.getAttribute("number");
  const priceAttr = node.getAttribute("price");
  const price = priceAttr ? parseFloat(priceAttr) : null;

  return { number, price };
}
