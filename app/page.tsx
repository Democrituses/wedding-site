import { NameGate } from "@/components/NameGate";
import { wedding } from "@/data/wedding";
import { coupleInitials } from "@/lib/names";

export default function HomePage() {
  return (
    <main className="column gate">
      <p className="monogram">
        {coupleInitials(wedding.couple.first, wedding.couple.second)}
      </p>
      <h1>Your invitation</h1>
      <p className="lede">
        Enter your name as it appears on your invitation.
      </p>
      <NameGate />
      <p className="quiet">
        If you were sent a private link, you can open that directly.
      </p>
    </main>
  );
}
