import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import { CopyInviteLink } from "@/components/CopyInviteLink";
import { ADMIN_COOKIE, adminEnabled, isValidSession } from "@/lib/auth";
import { invitedLabel } from "@/lib/content";
import { formatReplyDate } from "@/lib/format";
import { listHouseholds } from "@/lib/guests";
import { TOKEN_PATTERN } from "@/lib/guest-store";
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
  searchParams: Promise<{
    error?: string;
    guestError?: string;
    added?: string;
    removed?: string;
    imported?: string;
    skipped?: string;
  }>;
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

  const query = await searchParams;
  const households = await listHouseholds();
  const replies = await listRsvps();
  const summary = summariseRsvps(households, replies);
  const byToken = new Map(replies.map((reply) => [reply.token, reply]));
  const added =
    query.added && TOKEN_PATTERN.test(query.added) ? query.added : "";
  const importedCount = /^\d+$/.test(query.imported ?? "") ? Number(query.imported) : null;
  const skipped = (query.skipped ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

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

      <section className="admin-editor" aria-label="Guest list">
        <h2>Add a household</h2>
        {query.guestError ? (
          <p className="form-error" role="alert">
            {query.guestError}
          </p>
        ) : null}
        {added ? (
          <p className="form-note" role="status">
            Added. Private link <CopyInviteLink token={added} />
          </p>
        ) : null}
        {query.removed === "1" ? (
          <p className="form-note" role="status">
            That household was removed.
          </p>
        ) : null}
        {importedCount !== null ? (
          <p className="form-note" role="status">
            {importedCount === 0
              ? "No households were added."
              : importedCount === 1
                ? "Added 1 household."
                : `Added ${importedCount} households.`}
          </p>
        ) : null}
        {skipped.length > 0 ? (
          <ul className="admin-skips">
            {skipped.map((line, index) => (
              <li key={`${index}-${line}`}>{line}</li>
            ))}
          </ul>
        ) : null}

        <form className="gate-form" method="post" action="/api/admin/guests">
          <label className="field" htmlFor="guest-names">
            <span>Names</span>
            <textarea
              id="guest-names"
              name="names"
              rows={4}
              required
              placeholder="One full name per line"
            />
          </label>
          <fieldset className="choice-set">
            <legend>Invited to</legend>
            <label className="check">
              <input type="checkbox" name="service" />
              Service
            </label>
            <label className="check">
              <input type="checkbox" name="reception" />
              Reception
            </label>
            <label className="check">
              <input type="checkbox" name="party" />
              Party
            </label>
          </fieldset>
          <button type="submit">Add household</button>
        </form>

        <form
          className="gate-form admin-upload"
          method="post"
          action="/api/admin/guests/import"
          encType="multipart/form-data"
        >
          <h2>Upload a guest list</h2>
          <label className="field" htmlFor="guest-csv">
            <span>CSV file</span>
            <input id="guest-csv" name="file" type="file" accept=".csv,text/csv" required />
          </label>
          <button type="submit">Upload CSV</button>
          <p className="quiet admin-note">
            Columns: household, name, service, reception, party. Use yes or no
            for each event. Rows that share a household name become one
            invitation. Leave household blank for a single guest.
          </p>
        </form>
      </section>

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
          {invitedLabel(household.events)}
          {" · "}
          {status}
        </p>
      </div>
      <p className="admin-names">
        {household.people.map((person) => person.name).join(", ")}
      </p>
      <p className="quiet">
        Private link <CopyInviteLink token={household.token} />
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
      <form method="post" action="/api/admin/guests/remove">
        <input type="hidden" name="token" value={household.token} />
        <button className="button-quiet" type="submit">
          Remove
        </button>
      </form>
    </li>
  );
}
