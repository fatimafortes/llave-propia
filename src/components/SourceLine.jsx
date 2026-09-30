// "Fuente · revisado · Límite" line required next to every route (hard rule 8).
export default function SourceLine({ source, limit }) {
  return (
    <p className="source">
      Fuente:{' '}
      <a href={source.url} target="_blank" rel="noopener noreferrer">
        {source.label}
      </a>{' '}
      · revisado {source.reviewed} · Límite: {limit}
    </p>
  )
}
