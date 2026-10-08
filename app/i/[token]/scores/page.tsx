import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";

import { ScoreboardPanel } from "@/components/ScoreProvider";
import { wedding } from "@/data/wedding";
import { findHousehold } from "@/lib/guests";
import { coupleInitials } from "@/lib/names";

type ScoreParams = { params: Promise<{ token: string }> };

export async function generateMetadata({ params }: ScoreParams): Promise<Metadata> {
  await connection();
  const { token } = await params;
  const household = await findHousehold(token);
  if (!household) return { title: "High scores" };
  return { title: "High scores" };
}

export default async function ScoresPage({ params }: ScoreParams) {
  await connection();
  const { token } = await params;
  const household = await findHousehold(token);
  if (!household) notFound();

  return (
    <>
      <header className="topbar">
        <p className="monogram">
          {coupleInitials(wedding.couple.first, wedding.couple.second)}
        </p>
        <nav className="anchor-nav" aria-label="Scores">
          <Link href={`/i/${household.token}`}>Invitation</Link>
        </nav>
      </header>

      <main className="column">
        <section className="page-section score-page" aria-label="High scores">
          <h2>High scores</h2>
          <ScoreboardPanel />
        </section>
      </main>
    </>
  );
}
