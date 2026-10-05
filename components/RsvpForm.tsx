"use client";

import { useRef, useState, type FormEvent } from "react";

import { playCrazyFrog, playDirectedBy, releaseCrazyFrog } from "@/components/site-audio";
import { formatReplyDate } from "@/lib/format";
import type { EventAttendance, EventId, Rsvp } from "@/lib/types";

const EVENT_LABELS: Record<EventId, string> = {
  service: "Service",
  reception: "Reception",
  party: "Party",
};

type Props = {
  token: string;
  invited: EventId[];
  people: string[];
  initial: Rsvp | null;
};

function emptyEvents(): EventAttendance {
  return { service: false, reception: false, party: false };
}

function startingEvents(initial: Rsvp | null, invited: EventId[]): EventAttendance {
  const events = emptyEvents();
  for (const eventId of invited) {
    events[eventId] = initial ? initial.events[eventId] : true;
  }
  return events;
}

function replyPhrase(eventId: EventId): string {
  if (eventId === "party") return "the evening party";
  if (eventId === "service") return "the service";
  return "the reception";
}

function joinList(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

function partsLabel(events: EventAttendance, invited: EventId[]): string {
  if (invited.length === 1) return replyPhrase(invited[0]);
  const names = invited
    .filter((eventId) => events[eventId])
    .map((eventId) => EVENT_LABELS[eventId].toLowerCase());
  return joinList(names);
}

export function RsvpForm({ token, invited, people, initial }: Props) {
  const [attending, setAttending] = useState<boolean | null>(
    initial ? initial.attending : null,
  );
  const [events, setEvents] = useState<EventAttendance>(startingEvents(initial, invited));
  const [selected, setSelected] = useState<string[]>(
    initial?.attending ? initial.people : people,
  );
  const [dietary, setDietary] = useState(initial?.dietary ?? "");
  const [message, setMessage] = useState(initial?.message ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [recorded, setRecorded] = useState<Rsvp | null>(initial);
  const [notice, setNotice] = useState<"received" | "updated" | null>(null);
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  function togglePerson(name: string) {
    setSelected((current) =>
      current.includes(name)
        ? current.filter((person) => person !== name)
        : [...current, name],
    );
  }

  function toggleEvent(eventId: EventId) {
    setEvents((current) => ({ ...current, [eventId]: !current[eventId] }));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (attending === null) return;

    // Start before the request. Playback permission from this click is gone after await.
    const undoDirectedBy = attending ? null : playDirectedBy();

    setPending(true);
    setError("");

    const response = await fetch("/api/rsvp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        attending,
        events:
          invited.length === 1
            ? { ...emptyEvents(), [invited[0]]: true }
            : events,
        people: attending ? selected : [],
        dietary: attending ? dietary : "",
        message,
      }),
    });
    const data = (await response.json()) as {
      error?: string;
      updated?: boolean;
      rsvp?: Rsvp;
    };

    if (!response.ok || !data.rsvp) {
      undoDirectedBy?.();
      setError(data.error || "Your reply could not be saved.");
      setPending(false);
      return;
    }

    setRecorded(data.rsvp);
    setNotice(data.updated ? "updated" : "received");
    setOpen(false);
    setPending(false);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function acceptInvitation() {
    setAttending(true);
    playCrazyFrog();
    setEvents((current) => {
      if (invited.some((eventId) => current[eventId])) return current;
      return startingEvents(null, invited);
    });
    setSelected((current) => (current.length > 0 ? current : people));
  }

  const hasReply = recorded !== null;

  return (
    <form
      ref={formRef}
      className={hasReply ? "rsvp-form is-received" : "rsvp-form"}
      onSubmit={onSubmit}
    >
      {recorded ? (
        <div className="reply-received" role="status">
          <p className="reply-kicker">Reply received</p>
          <h3>{recorded.attending ? "Accepted" : "Declined"}</h3>
          <p>
            {notice === "updated"
              ? "Your reply has been updated."
              : notice === "received"
                ? "Your reply has been received."
                : `We received this reply on ${formatReplyDate(recorded.updatedAt)}.`}
          </p>
          <p className="reply-summary">
            {recorded.attending
              ? `${joinList(recorded.people)} for ${partsLabel(recorded.events, invited)}.`
              : "You have declined this invitation."}
          </p>
          <p className="reply-update">
            Open the form to change this. Sending it again replaces the reply we
            already have.
          </p>
        </div>
      ) : null}

      <div className="reply-panel">
        <button
          type="button"
          className={open || hasReply ? "button-quiet reply-expand" : "reply-expand"}
          aria-expanded={open}
          aria-controls="reply-fields"
          onClick={() => setOpen((current) => !current)}
        >
          {open
            ? "Close the form"
            : hasReply
              ? "Change your reply"
              : "Send a reply"}
        </button>

        {open ? (
          <div id="reply-fields">
            <fieldset className="choice-set">
              <legend>{hasReply ? "Change your answer" : "Will you join us?"}</legend>
              <label className="check">
                <input
                  type="radio"
                  name="attending"
                  required
                  checked={attending === true}
                  onChange={acceptInvitation}
                />
                Accepts with pleasure
              </label>
              <label className="check">
                <input
                  type="radio"
                  name="attending"
                  required
                  checked={attending === false}
                  onChange={() => {
                    setAttending(false);
                    releaseCrazyFrog();
                  }}
                />
                Declines with regret
              </label>
            </fieldset>

            {attending ? (
              <>
                {invited.length > 1 ? (
                  <fieldset className="choice-set">
                    <legend>Parts of the day</legend>
                    {invited.map((eventId) => (
                      <label className="check" key={eventId}>
                        <input
                          type="checkbox"
                          checked={events[eventId]}
                          onChange={() => toggleEvent(eventId)}
                        />
                        {EVENT_LABELS[eventId]}
                      </label>
                    ))}
                  </fieldset>
                ) : (
                  <p className="form-note">
                    You are replying for {invited[0] ? replyPhrase(invited[0]) : "this invitation"}.
                  </p>
                )}

                <fieldset className="choice-set">
                  <legend>Who is coming</legend>
                  {people.map((name) => (
                    <label className="check" key={name}>
                      <input
                        type="checkbox"
                        checked={selected.includes(name)}
                        onChange={() => togglePerson(name)}
                      />
                      {name}
                    </label>
                  ))}
                </fieldset>

                <label className="field" htmlFor="dietary">
                  <span>Dietary notes</span>
                  <textarea
                    id="dietary"
                    name="dietary"
                    rows={3}
                    maxLength={1000}
                    value={dietary}
                    onChange={(event) => setDietary(event.target.value)}
                  />
                </label>
              </>
            ) : null}

            <label className="field" htmlFor="message">
              <span>Message</span>
              <textarea
                id="message"
                name="message"
                rows={3}
                maxLength={1000}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
              />
            </label>

            {error ? (
              <p className="form-error" role="alert">
                {error}
              </p>
            ) : null}

            <button type="submit" disabled={pending || attending === null}>
              {pending ? "Sending" : hasReply ? "Update reply" : "Send reply"}
            </button>
          </div>
        ) : null}
      </div>
    </form>
  );
}
