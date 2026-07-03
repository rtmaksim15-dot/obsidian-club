export default function ComingSoon({ title, note }: { title: string; note: string }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-ob-black px-6 text-center text-ob-text">
      <p className="text-label mb-3">Not Yet Open</p>
      <h1 className="text-h1">{title}</h1>
      <p className="text-body mt-4 max-w-sm">{note}</p>
    </main>
  );
}
