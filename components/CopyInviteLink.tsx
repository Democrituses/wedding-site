"use client";

import { useEffect, useState } from "react";

function copyText(value: string): boolean {
  const area = document.createElement("textarea");
  area.value = value;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.left = "-9999px";
  document.body.appendChild(area);
  area.select();
  const copied = document.execCommand("copy");
  area.remove();
  return copied;
}

export function CopyInviteLink({ token }: { token: string }) {
  const path = `/i/${token}`;
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);

  // Use the domain in the address bar, so a copied link matches the site that served this page.
  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const url = `${origin}${path}`;

  async function copy() {
    const full = `${window.location.origin}${path}`;
    // Copy during the click, before any await, so the browser still treats it as a user action.
    const legacy = copyText(full);
    let modern = false;
    try {
      await navigator.clipboard.writeText(full);
      modern = true;
    } catch {
      modern = false;
    }
    if (!modern && !legacy) return;
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <>
      <button type="button" className="copy-link" onClick={copy}>
        <span className="token">{origin ? url : path}</span>
      </button>
      {copied ? (
        <span className="copy-confirm" role="status">
          Copied
        </span>
      ) : null}
    </>
  );
}
