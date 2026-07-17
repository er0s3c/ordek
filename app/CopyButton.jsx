"use client";
import React, { useState } from "react";
import { toast } from "@/lib/toast";

// Genel tek-tık kopyalama butonu. value string ya da () => string olabilir.
// Güvenlik: yalnız verilen (kullanıcı-girdisi/istemci-güvenli) metni kopyalar — flag store import etmez.
export default function CopyButton({
  value, label = "Kopyala", title = "panoya kopyala",
  className = "kbtn sm", compact = false, silent = false,
}) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    const text = typeof value === "function" ? value() : value;
    if (!text) return;
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(String(text));
      } else {
        const ta = document.createElement("textarea");
        ta.value = String(text); ta.style.position = "fixed"; ta.style.opacity = "0";
        document.body.appendChild(ta); ta.select(); document.execCommand("copy"); ta.remove();
      }
      setDone(true);
      if (!silent) toast("Kopyalandı", "ok");
      setTimeout(() => setDone(false), 1400);
    } catch { if (!silent) toast("Kopyalanamadı", "err"); }
  };
  return (
    <button type="button" className={className} title={title} onClick={copy}>
      {done ? (compact ? "✓" : "✓ Kopyalandı") : (compact ? "⧉" : "⧉ " + label)}
    </button>
  );
}
