export default async function OrgPage(props: PageProps<"/org/[slug]">) {
  const { slug } = await props.params;

  return (
    <main className="min-h-screen p-8">
      <h1 className="text-2xl font-bold">{slug}</h1>
    </main>
  );
}
