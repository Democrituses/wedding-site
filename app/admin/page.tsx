import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import { ADMIN_COOKIE, adminEnabled, isValidSession } from "@/lib/auth";
import { formatReplyDate } from "@/lib/format";
import { listHouseholds } from "@/lib/guests";
import { addressLine } from "@/lib/names";
import { attendanceCount, summariseRsvps } from "@/lib/rsvp";
import { listRsvps } from "@/lib/rsvp-store";
import { EVENT_IDS, type EventId, type Household, type Rsvp } from "@/lib/types";

const EVENT_LABELS: Record<EventId, string> = {
  service: "Service",
  reception: "Reception",
  party: "Party",
};

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (!adminEnabled()) notFound();

  const cookieStore = await cookies();
  const signedIn = isValidSession(cookieStore.get(ADMIN_COOKIE)?.value);
  if (!signedIn) {
    const query = await searchParams;
    return (
      <main className="column gate">
        <h1>Replies</h1>
        <p className="lede">Enter the admin password to see who has replied.</p>
        <form className="gate-form" method="post" action="/api/admin/login">
          <label className="field" htmlFor="admin-password">
            <span>Password</span>
            <input
              id="admin-password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </label>
          {query.error ? (
            <p className="form-error" role="alert">
              That password is not correct.
            </p>
          ) : null}
          <button type="submit">Open replies</button>
        </form>
      </main>
    );
  }

  const households = listHouseholds();
  const replies = await listRsvps();
  const summary = summariseRsvps(households, replies);
  const byToken = new Map(replies.map((reply) => [reply.token, reply]));

  return (
    <main className="column admin">
      <header className="admin-header">
        <h1>Replies</h1>
        <div className="admin-actions">
          <a className="button" href="/api/admin/export">
            Download CSV
          </a>
          <form method="post" action="/api/admin/logout">
            <button className="button-quiet" type="submit">
              Log out
            </button>
          </form>
        </div>
      </header>

      <dl className="summary">
        <div>
          <dt>Service</dt>
          <dd>{summary.service}</dd>
        </div>
        <div>
          <dt>Reception</dt>
          <dd>{summary.reception}</dd>
        </div>
        <div>
          <dt>Party</dt>
          <dd>{summary.party}</dd>
        </div>
        <div>
          <dt>Accepted</dt>
          <dd>{summary.accepted}</dd>
        </div>
        <div>
          <dt>Declined</dt>
          <dd>{summary.declined}</dd>
        </div>
        <div>
          <dt>Awaiting</dt>
          <dd>{summary.awaiting}</dd>
        </div>
      </dl>

      <ul className="admin-list">
        {households.map((household) => (
          <HouseholdReply
            key={household.token}
            household={household}
            reply={byToken.get(household.token)}
          />
        ))}
      </ul>
    </main>
  );
}

function HouseholdReply({
  household,
  reply,
}: {
  household: Household;
  reply: Rsvp | undefined;
}) {
  const status = !reply
    ? "Awaiting reply"
    : reply.attending
      ? "Accepted"
      : "Declined";

  return (
    <li className="admin-card">
      <div className="admin-card-title">
        <h2>{addressLine(household.people)}</h2>
        <p className="quiet">
          {household.invite === "full" ? "Full invitation" : "Party invitation"}
          {" · "}
          {status}
        </p>
      </div>
      <p className="admin-names">
        {household.people.map((person) => person.name).join(", ")}
      </p>
      <p className="quiet">
        Private link <span className="token">/i/{household.token}</span>
      </p>
      <dl className="admin-counts">
        {EVENT_IDS.map((eventId) => {
          const count = attendanceCount(household, reply, eventId);
          return (
            <div key={eventId}>
              <dt>{EVENT_LABELS[eventId]}</dt>
              <dd>{count === null ? "—" : count}</dd>
            </div>
          );
        })}
      </dl>
      {reply?.attending ? (
        <p>Coming: {reply.people.join(", ")}</p>
      ) : null}
      {reply?.dietary ? <p>Dietary: {reply.dietary}</p> : null}
      {reply?.message ? <p>Message: {reply.message}</p> : null}
      {reply ? (
        <p className="quiet">Updated {formatReplyDate(reply.updatedAt)}</p>
      ) : null}
    </li>
  );
}
