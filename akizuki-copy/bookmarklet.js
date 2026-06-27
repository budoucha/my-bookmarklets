javascript:(async () => {
  const abs = u => u ? new URL(u, location.href).href : "";
  const text = s => (s || "").replace(/\s+/g, " ").trim();

  const body = text(document.body.innerText);
  const h1 = text(document.querySelector("h1")?.innerText) || text(document.title);
  const productName = h1
    .replace(/^\[\d+\]\s*/, "")
    .replace(/:\s*.*$/, "");

  const model = (
    body.match(/型番\s+([^\s]+)/) ||
    body.match(/型番[:：]\s*([^\s]+)/) ||
    []
  )[1] || "";

  const links = [...document.querySelectorAll("a")]
    .map(a => ({
      t: text(a.innerText || a.textContent),
      href: abs(a.getAttribute("href"))
    }))
    .filter(x => x.href);

  const manual = links.find(x =>
    /マニュアル|説明書|取扱説明書/i.test(x.t)
  )?.href || "";

  const datasheet = links.find(x =>
    /データシート|参考資料/i.test(x.t)
  )?.href || "";

  const row = [
    model,
    location.href,
    productName,
    manual,
    datasheet
  ].join("\t");

  try {
    await navigator.clipboard.writeText(row);
    alert("コピーした:\n" + row);
  } catch (e) {
    prompt("コピーして:", row);
  }
})();
