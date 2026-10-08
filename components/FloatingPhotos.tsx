import { readdir } from "node:fs/promises";
import path from "node:path";
import { connection } from "next/server";

import { FloatingField } from "@/components/FloatingField";

// Pictures dropped in public/floating join the drift without a code change.
export async function FloatingPhotos() {
  await connection();
  const directory = path.join(process.cwd(), "public", "floating");
  let names: string[] = [];
  try {
    const entries = await readdir(directory);
    names = entries.filter((name) => /\.(png|jpe?g|webp|gif)$/i.test(name));
  } catch {
    names = [];
  }

  if (names.length === 0) return null;

  const images = names.map((name) => `/floating/${encodeURIComponent(name)}`);
  return <FloatingField images={images} />;
}
