javascript:(async () => {
  const OVERLAY_ID = "yt-transcript-copy-overlay";
  const SEPARATOR = "\t";

  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  const text = node => (node?.textContent || "").replace(/\s+/g, " ").trim();

  const createElement = (tag, props = {}) => {
    const element = document.createElement(tag);

    for (const [key, value] of Object.entries(props)) {
      if (key === "text") {
        element.textContent = value;
      } else if (key === "style") {
        Object.assign(element.style, value);
      } else if (value === true) {
        element.setAttribute(key, key);
      } else if (value !== false && value != null) {
        element.setAttribute(key, value);
      }
    }

    return element;
  };

  const copyText = async value => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = value;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      textarea.remove();
    }
  };

  const parseNewTranscriptSegment = segment => {
    const time = text(segment.querySelector(".ytwTranscriptSegmentViewModelTimestamp"));

    const directText = [...segment.querySelectorAll("span")]
      .map(span => text(span))
      .filter(Boolean)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    if (directText) {
      return { time, text: directText };
    }

    const lines = (segment.innerText || segment.textContent || "")
      .split("\n")
      .map(line => line.trim())
      .filter(Boolean);

    const timeIndex = lines.findIndex(line => /^\d{1,2}:\d{2}(?::\d{2})?$/.test(line));
    const guessedTime = timeIndex >= 0 ? lines[timeIndex] : time;
    const guessedText = lines
      .filter((_, index) => index !== timeIndex)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    return { time: guessedTime, text: guessedText };
  };

  const parseOldTranscriptSegment = segment => {
    const time = text(segment.querySelector(".segment-timestamp, [class*='timestamp']"));
    const body = text(segment.querySelector(".segment-text, [class*='segment-text']"));

    if (body) {
      return { time, text: body };
    }

    const lines = (segment.innerText || segment.textContent || "")
      .split("\n")
      .map(line => line.trim())
      .filter(Boolean);

    const timeIndex = lines.findIndex(line => /^\d{1,2}:\d{2}(?::\d{2})?$/.test(line));
    const guessedTime = timeIndex >= 0 ? lines[timeIndex] : time;
    const guessedText = lines
      .filter((_, index) => index !== timeIndex)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    return { time: guessedTime, text: guessedText };
  };

  const getRows = () => {
    const newSegments = [
      ...document.querySelectorAll("transcript-segment-view-model"),
      ...document.querySelectorAll("macro-markers-panel-item-view-model transcript-segment-view-model")
    ];

    const uniqueNewSegments = [...new Set(newSegments)];

    if (uniqueNewSegments.length > 0) {
      return uniqueNewSegments
        .map(parseNewTranscriptSegment)
        .filter(row => row.text);
    }

    return [...document.querySelectorAll("ytd-transcript-segment-renderer")]
      .map(parseOldTranscriptSegment)
      .filter(row => row.text);
  };

  const findTranscriptButton = () => {
    const selectors = [
      "#primary-button > ytd-button-renderer > yt-button-shape > button",
      "#primary-button button",
      "button[aria-label*='文字起こし']",
      "button[aria-label*='transcript' i]"
    ];

    for (const selector of selectors) {
      try {
        const button = document.querySelector(selector);
        if (button) return button;
      } catch {
        // Ignore invalid selector support in older browsers.
      }
    }

    return [...document.querySelectorAll("button")].find(button => {
      const buttonText = text(button);
      const label = button.getAttribute("aria-label") || "";

      return (
        buttonText.includes("文字起こし") ||
        buttonText.includes("Show transcript") ||
        label.includes("文字起こし") ||
        /transcript/i.test(label)
      );
    });
  };

  const ensureRows = async () => {
    let rows = getRows();

    if (rows.length > 0) {
      return rows;
    }

    const button = findTranscriptButton();

    if (button) {
      button.click();

      for (let i = 0; i < 50; i++) {
        await sleep(200);
        rows = getRows();

        if (rows.length > 0) {
          return rows;
        }
      }
    }

    return rows;
  };

  const formatRows = (rows, mode) => {
    if (mode === "text-only") {
      return rows.map(row => row.text).join("\n");
    }

    return rows
      .map(row => row.time ? `${row.time}${SEPARATOR}${row.text}` : row.text)
      .join("\n");
  };

  document.getElementById(OVERLAY_ID)?.remove();

  const panel = createElement("div", {
    id: OVERLAY_ID,
    style: {
      position: "fixed",
      top: "16px",
      right: "16px",
      zIndex: "2147483647",
      width: "320px",
      padding: "14px",
      background: "rgba(20,20,20,.96)",
      color: "#fff",
      borderRadius: "12px",
      boxShadow: "0 8px 28px rgba(0,0,0,.35)",
      fontFamily: "Arial, sans-serif",
      fontSize: "14px",
      lineHeight: "1.5"
    }
  });

  const header = createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: "10px"
    }
  });

  const title = createElement("strong", { text: "字幕コピー" });
  const closeButton = createElement("button", {
    text: "×",
    style: {
      cursor: "pointer",
      border: "none",
      borderRadius: "6px",
      padding: "2px 8px",
      background: "#444",
      color: "#fff"
    }
  });

  const status = createElement("div", {
    text: "字幕行数を確認中...",
    style: {
      marginBottom: "10px",
      color: "#ddd"
    }
  });

  const timeTextLabel = createElement("label", {
    style: {
      display: "block",
      marginBottom: "6px",
      cursor: "pointer"
    }
  });

  const timeTextRadio = createElement("input", {
    type: "radio",
    name: "yt-transcript-copy-mode",
    value: "time-text"
  });

  const textOnlyLabel = createElement("label", {
    style: {
      display: "block",
      marginBottom: "12px",
      cursor: "pointer"
    }
  });

  const textOnlyRadio = createElement("input", {
    type: "radio",
    name: "yt-transcript-copy-mode",
    value: "text-only",
    checked: true
  });

  const copyButton = createElement("button", {
    text: "選択した形式でコピー",
    style: {
      cursor: "pointer",
      width: "100%",
      border: "none",
      borderRadius: "8px",
      padding: "8px 10px",
      background: "#fff",
      color: "#111",
      fontWeight: "600"
    }
  });

  const refreshButton = createElement("button", {
    text: "字幕を表示・再取得",
    style: {
      cursor: "pointer",
      width: "100%",
      border: "1px solid #666",
      borderRadius: "8px",
      padding: "7px 10px",
      background: "transparent",
      color: "#fff",
      marginTop: "8px"
    }
  });

  header.append(title, closeButton);
  timeTextLabel.append(timeTextRadio, document.createTextNode(" 時間 + 本文"));
  textOnlyLabel.append(textOnlyRadio, document.createTextNode(" 本文のみ"));
  panel.append(header, status, timeTextLabel, textOnlyLabel, copyButton, refreshButton);
  document.body.appendChild(panel);

  const updateStatus = async () => {
    status.textContent = "字幕を確認中...";
    const rows = await ensureRows();

    status.textContent = rows.length
      ? `字幕行数: ${rows.length}`
      : "字幕が見つからなかった。文字起こし欄を手動で表示してから再取得して。";

    return rows;
  };

  closeButton.addEventListener("click", () => panel.remove());
  refreshButton.addEventListener("click", () => void updateStatus());

  copyButton.addEventListener("click", async () => {
    status.textContent = "字幕を取得中...";
    const rows = await ensureRows();

    if (rows.length === 0) {
      status.textContent = "字幕が見つからなかった。文字起こし欄を手動で表示してから再取得して。";
      return;
    }

    const mode = panel.querySelector("input[name='yt-transcript-copy-mode']:checked").value;
    await copyText(formatRows(rows, mode));

    status.textContent = mode === "text-only"
      ? `本文のみコピーした: ${rows.length}行`
      : `時間 + 本文をコピーした: ${rows.length}行`;
  });

  void updateStatus();
})();
