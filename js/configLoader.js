export async function loadConfig() {
  const res = await fetch("config.xml");
  const text = await res.text();
  return new DOMParser().parseFromString(text, "application/xml");
}
