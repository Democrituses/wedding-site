import Link from "next/link";

export default function NotFound() {
  return (
    <main className="column gate">
      <h1>Invitation not found</h1>
      <p className="lede">This page is not available.</p>
      <p className="quiet">
        <Link href="/">Look up your invitation</Link>
      </p>
    </main>
  );
}
