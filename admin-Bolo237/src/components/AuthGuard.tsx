/**
 * AuthGuard simplifie — la protection est geree par le middleware serveur.
 * Ce composant sert uniquement de wrapper transparent.
 * Le middleware redirige vers /login si pas de session.
 */
export default function AuthGuard({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
