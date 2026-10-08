import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";

import { Fact } from "@/components/Fact";
import { RsvpForm } from "@/components/RsvpForm";
import {
  wedding,
  type LogisticsJourney,
  type LogisticsSection,
  type TimelineItem,
  type WeddingEvent,
} from "@/data/wedding";
import {
  invitationRequest,
  invitedEventIds,
  isPartyOnly,
  visibleEvents,
  visibleLogistics,
  visibleTimeline,
} from "@/lib/content";
import { findHousehold } from "@/lib/guests";
import { addressLine, coupleInitials } from "@/lib/names";
import { getRsvp } from "@/lib/rsvp-store";

type InviteParams = { params: Promise<{ token: string }> };

export async function generateMetadata({ params }: InviteParams): Promise<Metadata> {
  await connection();
  const { token } = await params;
  const household = await findHousehold(token);
  if (!household) return { title: "Invitation" };
  return { title: `Invitation for ${addressLine(household.people)}` };
}

export default async function InvitePage({ params }: InviteParams) {
  await connection();
  const { token } = await params;
  const household = await findHousehold(token);
  if (!household) notFound();

  const events = visibleEvents(household.events);
  const timeline = visibleTimeline(household.events);
  const reply = await getRsvp(household.token);
  const greeting = addressLine(household.people);
  const paperTimeline = timeline.filter((item) => item.eventId !== "party");
  const partyTimeline = timeline.filter((item) => item.eventId === "party");
  const paperEvents = events.filter((event) => event.id !== "party");
  const partyEvent = events.find((event) => event.id === "party");

  return (
    <>
      <header className="topbar">
        <p className="monogram">
          {coupleInitials(wedding.couple.first, wedding.couple.second)}
        </p>
        <nav className="anchor-nav" aria-label="On this page">
          <a href="#invitation">Invitation</a>
          <a href="#day">The day</a>
          <a href="#details">Details</a>
          <a href="#travel">Travel</a>
          <a href="#reply">Reply</a>
          <Link href={`/i/${household.token}/scores`}>Scores</Link>
        </nav>
      </header>

      <main className="column">
        <section id="invitation" className="invite-card" aria-label="Invitation">
          <h1>
            <span className="couple-name">{wedding.couple.first}</span>
            <span className="ampersand">&</span>
            <span className="couple-name">{wedding.couple.second}</span>
          </h1>
          <hr className="divider" />
          <p className="request">{invitationRequest(household.events)}</p>
          <p className="invite-date">
            <strong>
              <Fact value={wedding.dateLabel} />
            </strong>
          </p>
          {isPartyOnly(household.events) ? (
            <p className="mess-kicker on-paper">Officers&apos; Mess</p>
          ) : null}
          <hr className="divider" />
          <p className="addressed">{greeting}</p>
        </section>

        <section id="day" className="page-section">
          <h2>The day</h2>
          {paperTimeline.length > 0 ? (
            <Timeline items={paperTimeline} />
          ) : null}
          {partyTimeline.length > 0 ? (
            <div className="mess-panel">
              <p className="mess-kicker">Officers&apos; Mess</p>
              <Timeline items={partyTimeline} />
            </div>
          ) : null}
        </section>

        <section id="details" className="page-section">
          <h2>Details</h2>
          {paperEvents.map((event) => (
            <EventDetails key={event.id} event={event} />
          ))}
          {partyEvent ? (
            <div className="mess-panel">
              <p className="mess-kicker">Officers&apos; Mess</p>
              <EventDetails event={partyEvent} />
            </div>
          ) : null}
        </section>

        {visibleLogistics(household.events).map((section, index) => (
          <Logistics key={section.id} section={section} anchor={index === 0 ? "travel" : undefined} />
        ))}

        <section id="reply" className="page-section">
          <h2>Reply</h2>
          <RsvpForm
            token={household.token}
            invited={invitedEventIds(household.events)}
            people={household.people.map((person) => person.name)}
            initial={reply}
          />
        </section>
      </main>
    </>
  );
}

function Timeline({ items }: { items: TimelineItem[] }) {
  return (
    <ol className="timeline">
      {items.map((item) => (
        <li key={item.id}>
          <p className="timeline-time">
            <Fact value={item.time} />
          </p>
          <div>
            <p className="timeline-title">{item.title}</p>
            <p className="timeline-detail">{item.detail}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

function Logistics({
  section,
  anchor,
}: {
  section: LogisticsSection;
  anchor?: string;
}) {
  return (
    <section id={anchor} className="page-section">
      <h2>{section.title}</h2>
      {section.intro?.trim() ? <p className="logistics-intro">{section.intro}</p> : null}
      <ul className="logistics-list">
        {section.entries.map((entry) => {
          const notes = [entry.detail, entry.text].filter((note) => note?.trim());
          return (
            <li key={entry.name} className="logistics-entry">
              <p className="logistics-name">{entry.name}</p>
              {notes.map((note) => (
                <p key={note}>{note}</p>
              ))}
              {entry.phones?.length || entry.links?.length ? (
                <p className="logistics-links">
                  {entry.phones?.map((phone) => (
                    <a key={phone} href={`tel:${phone.replace(/\D/g, "")}`}>
                      {phone}
                    </a>
                  ))}
                  {entry.links?.map((link) => (
                    <a key={link.href} href={link.href} target="_blank" rel="noopener noreferrer">
                      {link.label}
                    </a>
                  ))}
                </p>
              ) : null}
              {entry.serviceData ? (
                <Journey title="To the service" journey={entry.serviceData} />
              ) : null}
              {entry.endOfServiceData ? (
                <Journey title="After the party" journey={entry.endOfServiceData} />
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Journey({ title, journey }: { title: string; journey: LogisticsJourney }) {
  return (
    <div className="logistics-journey">
      <p className="logistics-journey-title">{title}</p>
      {journey.text.trim() ? <p>{journey.text}</p> : null}
      <dl>
        <div>
          <dt>Route</dt>
          <dd>
            <Fact value={journey.publicTransport} />
          </dd>
        </div>
        <div>
          <dt>Time</dt>
          <dd>
            <Fact value={journey.publicTransportTime} />
          </dd>
        </div>
        <div>
          <dt>Cost</dt>
          <dd>
            <Fact value={journey.publicTransportCost} />
          </dd>
        </div>
      </dl>
    </div>
  );
}

function EventDetails({ event }: { event: WeddingEvent }) {
  return (
    <article className="event-details">
      <h3>{event.title}</h3>
      <dl>
        <div>
          <dt>Time</dt>
          <dd>
            <Fact value={event.time} />
          </dd>
        </div>
        <div>
          <dt>Place</dt>
          <dd>
            <Fact value={event.venue} />
          </dd>
        </div>
        <div>
          <dt>Address</dt>
          <dd>
            <Fact value={event.address} />
          </dd>
        </div>
        <div>
          <dt>Dress</dt>
          <dd>
            <Fact value={event.dress} />
          </dd>
        </div>
        {event.militaryDress?.trim() ? (
          <div>
            <dt>Military Dress</dt>
            <dd>
              <Fact value={event.militaryDress} />
            </dd>
          </div>
        ) : null}
        <div>
          <dt>Travel</dt>
          <dd>
            <Fact value={event.travel} />
          </dd>
        </div>
      </dl>
      {event.notes.trim() ? <p className="event-notes">{event.notes}</p> : null}
    </article>
  );
}
