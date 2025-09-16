export function parseOffset(configXML, selector) {
  const node = configXML.querySelector(selector);
  if (!node) {
    console.warn(
      `[parseOffset] Kein Offset gefunden für Selektor: "${selector}"`
    );

    // alle Items in derselben Offset-Gruppe loggen
    const parts = selector.match(/offsets > (\w+)/);
    if (parts) {
      const group = parts[1];
      const candidates = configXML.querySelectorAll(`offsets > ${group} > item`);
      console.group(`[parseOffset] Verfügbare Items in <${group}>:`);
      candidates.forEach(item => {
        console.log(item.outerHTML);
      });
      console.groupEnd();
    }
    return null;
  }

  return {
    x: +node.getAttribute("x"),
    y: +node.getAttribute("y"),
    scaleX: +node.getAttribute("scaleX"),
    scaleY: +node.getAttribute("scaleY")
  };
}
