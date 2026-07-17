"use client";
import React, { useState, useRef, useEffect } from "react";
import { unreadCount } from "./labLogic";

// Sunumsal bildirim merkezi — zil + okunmamış rozeti + açılır liste.
// State (notes/SSE) LabApp'te tutulur; bu bileşen yalnız gösterir + okundu/temizle çağırır.
const TYPE_ICON = { teacher: "✉️", broadcast: "📢", system: "🔔", help: "✋", machine: "🖥️", flag: "⚑" };

function timeAgo(ts) {
  if (!ts) return "";
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "az önce";
  const m = Math.floor(s / 60); if (m < 60) return m + " dk önce";
  const h = Math.floor(m / 60); if (h < 24) return h + " sa önce";
  try { return new Date(ts).toLocaleDateString("tr"); } catch { return ""; }
}

export default function NotificationCenter({ notes = [], onMarkAllRead, onClear }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const unread = unreadCount(notes);

  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && unread && onMarkAllRead) onMarkAllRead();
  };

  const sorted = [...notes].sort((a, b) => (b.ts || 0) - (a.ts || 0)).slice(0, 30);

  return (
    <div className="noticenter" ref={ref}>
      <button className="bell" title="Bildirimler" onClick={toggle} aria-label="Bildirimler">
        🔔{unread > 0 && <span className="bell-badge">{unread > 9 ? "9+" : unread}</span>}
      </button>
      {open && (
        <div className="noti-pop">
          <div className="noti-h">
            <span>Bildirimler</span><span style={{ flex: 1 }} />
            {notes.length > 0 && <button className="kbtn ghost" style={{ padding: "2px 8px", fontSize: 11 }} onClick={onClear}>temizle</button>}
          </div>
          <div className="noti-list">
            {sorted.length === 0 && <div className="noti-empty">Henüz bildirim yok.</div>}
            {sorted.map((m) => (
              <div key={m.id} className={"noti-item" + (m.read ? "" : " unread") + (m.priority === "urgent" ? " urgent" : "")}>
                <span className="noti-ic">{TYPE_ICON[m.type] || "🔔"}</span>
                <div className="noti-body">
                  {m.title ? <div className="noti-title">{m.title}</div> : null}
                  <div className="noti-text">{m.from ? <b>{m.from}: </b> : null}{m.text}</div>
                  <div className="noti-ts">{timeAgo(m.ts)}{m.priority === "urgent" ? <span className="noti-urgent">ACİL</span> : null}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
