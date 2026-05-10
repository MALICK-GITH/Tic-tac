import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="page-shell">
      <section className="panel not-found-panel">
        <span className="eyebrow">Dossier introuvable</span>
        <h1 style={{ marginTop: '14px', fontSize: '1.6rem' }}>Le match demandé n’existe pas.</h1>
        <p style={{ marginTop: '10px', color: 'var(--muted)', lineHeight: 1.7 }}>
          Le flux live n’expose pas cet identifiant à cet instant. Retourne à la liste pour
          ouvrir un autre dossier de match.
        </p>
        <div style={{ marginTop: '18px' }}>
          <Link className="button-secondary button-secondary--compact" href="/">
            Retour à la liste
          </Link>
        </div>
      </section>
    </main>
  );
}
