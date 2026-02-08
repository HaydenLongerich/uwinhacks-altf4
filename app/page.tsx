import { LandingSections } from "@/components/landing/landing-sections";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ entry?: string }>;
}) {
  const params = await searchParams;
  const entry = params.entry === "auth" ? "auth" : undefined;

  return <LandingSections entry={entry} />;
}
