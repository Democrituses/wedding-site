"use client";

import { useRouter } from "next/navigation";
import { useState, type AnimationEvent, type FormEvent } from "react";

import { armIlluminati, cancelIlluminati, playIlluminati } from "@/components/site-audio";

export function NameGate() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [mark, setMark] = useState(0);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    armIlluminati();

    const response = await fetch("/api/lookup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = (await response.json()) as { status?: string; token?: string };

    if (data.status === "found" && typeof data.token === "string") {
      cancelIlluminati();
      router.push(`/i/${data.token}`);
      return;
    }

    if (data.status === "ambiguous") {
      cancelIlluminati();
      setMessage(
        "More than one invitation matches that name. Please enter the full name as it appears on your invitation.",
      );
    } else if (response.status === 429) {
      cancelIlluminati();
      setMessage("Please wait a moment and try again.");
    } else {
      playIlluminati();
      setMark((current) => current + 1);
      setMessage(
        "We couldn't find that name. Check the spelling on your invitation.",
      );
    }
    setPending(false);
  }

  function clearMark(event: AnimationEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget) return;
    setMark(0);
  }

  return (
    <>
      {mark > 0 ? (
        <div key={mark} className="illuminati-mark" aria-hidden="true" onAnimationEnd={clearMark}>
          <svg viewBox="0 0 200 180" focusable="false">
            <polygon
              points="100,8 192,172 8,172"
              fill="rgba(12,0,24,0.78)"
              stroke="#ff4fd8"
              strokeWidth="7"
              strokeLinejoin="round"
            />
            <ellipse cx="100" cy="110" rx="28" ry="17" fill="#3dfff3" />
            <circle cx="100" cy="110" r="8" fill="#1a0524" />
          </svg>
        </div>
      ) : null}
      <form className="gate-form" onSubmit={onSubmit}>
      <label className="field" htmlFor="guest-name">
        <span>Your name</span>
        <input
          id="guest-name"
          name="name"
          type="text"
          autoComplete="name"
          required
          maxLength={120}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </label>
      {message ? (
        <p className="form-note" role="status">
          {message}
        </p>
      ) : null}
      <button type="submit" disabled={pending}>
        {pending ? "Looking" : "Find invitation"}
      </button>
    </form>
    </>
  );
}
