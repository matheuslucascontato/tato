export default function Loading() {
  return (
    <main className="loading" aria-busy="true">
      <p role="status">Organizando suas informações…</p>
      <div className="skeleton" />
    </main>
  );
}
