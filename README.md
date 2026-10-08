# Wedding invitations

A private invitation for each household. Full invitations include the church service, the reception, and the evening party. Party invitations include only the evening party at the Officers' Mess.

Guests open a private link, or type their name on the home page if they have lost it. The guest list, replies, and picture scores are stored in Postgres.

## Run

```bash
cp .env.example .env.local
npm install
npm run dev
```

Set `DATABASE_URL`, `ADMIN_PASSWORD`, and `SESSION_SECRET` in `.env.local`, then open `/admin` to read replies and copy each private link. The local sample password is `wedding-admin` if you use the `.env.local` created for development.

This app needs a long-running Node server (`npm run dev` or `npm run start`). RSVPs are not kept on a static export.

## Change the wording

Edit [`data/wedding.ts`](data/wedding.ts).

- `couple.first` and `couple.second` are the names on the invitation.
- Leave `dateLabel`, times, addresses, dress, or travel as `""` to show “To be confirmed”.
- `events` holds the service, reception, and party. `visibleTo` decides who can see each one. Do not add `"party"` to the service or reception.
- `timeline` is the order of the day. A row appears only when its event is on that guest’s invitation.

## Add a household

Open `/admin` and add a household, or upload a CSV with columns `household`, `name`, `service`, `reception`, and `party`. Each household gets a private link such as `/i/k7nq2p`.

A guest can enter a full name, the names as addressed on the card (“James and Eleanor”), or a first name when only one household has it. A shared first name asks for the full name.
