(function () {
  var existing = document.getElementById("__bookmarklet_dark_mode__");
  if (existing) {
    existing.remove();
  } else {
    var style = document.createElement("style");
    style.id = "__bookmarklet_dark_mode__";
    style.textContent = [
      "html { filter: invert(1) hue-rotate(180deg) !important; }",
      "img, video, canvas, svg { filter: invert(1) hue-rotate(180deg) !important; }"
    ].join("\n");
    document.head.appendChild(style);
  }
})();
