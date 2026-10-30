import { Mascot } from '@/components/brand/tato';
export default function Loading() {
  return (
    <div className="loading-view" role="status" aria-label="Carregando seus registros">
      <div className="loading-heading">
        <div className="skeleton skeleton-heading" />
        <Mascot expression="pensativo" size={74} />
      </div>
      <div className="loading-columns">
        <div>
          <div className="skeleton skeleton-hero" />
          <div className="skeleton skeleton-strip" />
          <div className="skeleton skeleton-report" />
        </div>
        <div className="skeleton skeleton-list" />
      </div>
      <span className="sr-only">Carregando seus registros…</span>
    </div>
  );
}
