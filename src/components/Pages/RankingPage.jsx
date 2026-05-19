import { useEffect, useState } from "react";

const PAGE_SIZE = 10;

function getColor(precio) {
  if (!precio) return "#94a3b8";
  if (precio < 700) return "#22c55e";
  if (precio < 1000) return "#eab308";
  if (precio < 1500) return "#f97316";
  return "#ef4444";
}

function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;

  // Mostrar máximo 6 páginas visibles centradas en la página actual
  const getPages = () => {
    const pages = [];
    let start = Math.max(1, page - 2);
    let end = Math.min(totalPages, start + 5);
    if (end - start < 5) start = Math.max(1, end - 5);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  };

  return (
    <div className="mt-6 flex items-center gap-1 text-sm">
      <span className="text-gray-400 mr-2 text-xs">Ver más resultados:</span>

      {page > 1 && (
        <button
          onClick={() => onChange(page - 1)}
          className="px-3 py-1.5 rounded border border-gray-700 text-gray-300 hover:bg-gray-800 transition-colors"
        >
          &lt;
        </button>
      )}

      {getPages().map((p) => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className={`w-9 h-9 rounded border transition-colors font-medium ${
            p === page
              ? "border-blue-500 text-blue-400 bg-gray-900"
              : "border-gray-700 text-gray-400 hover:bg-gray-800"
          }`}
        >
          {p}
        </button>
      ))}

      {page < totalPages && (
        <button
          onClick={() => onChange(page + 1)}
          className="px-3 py-1.5 rounded border border-gray-700 text-gray-300 hover:bg-gray-800 transition-colors ml-1"
        >
          Siguiente &gt;
        </button>
      )}
    </div>
  );
}

export default function RankingPage() {
  const [tipo, setTipo] = useState("ciudad");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortKey, setSortKey] = useState("precioMedioMes");
  const [sortDir, setSortDir] = useState("asc");
  const [page, setPage] = useState(1);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setPage(1);

    // Pedimos solo 10 resultados por página directamente a la API
    fetch(`/api/stats/ranking?tipo=${tipo}&limite=200`)
      .then((r) => {
        if (!r.ok) throw new Error(`Error ${r.status}`);
        return r.json();
      })
      .then((json) => {
        const lista = Array.isArray(json) ? json : json.ranking ?? [];
        const porZona = new Map();
        lista.forEach((item) => {
          const zona = item.zona?.toLowerCase();
          if (!porZona.has(zona)) porZona.set(zona, item);
        });
        setData(Array.from(porZona.values()));
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [tipo]);

  // Reset página al cambiar orden
  useEffect(() => {
    setPage(1);
  }, [sortKey, sortDir]);

  const COLUMNS = [
    { key: "zona", label: tipo === "barrio" ? "Barrio" : "Ciudad", sortable: false },
    { key: "precioMedioMes", label: "Precio medio / mes", sortable: true },
    { key: "precioMedioM2", label: "€ / m²", sortable: true },
  ];

  const sorted = [...data].sort((a, b) => {
    const va = a[sortKey] ?? 0;
    const vb = b[sortKey] ?? 0;
    return sortDir === "asc" ? va - vb : vb - va;
  });

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function handleSort(key) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function SortIcon({ colKey }) {
    if (sortKey !== colKey)
      return <span className="ml-1 opacity-30 text-xs">↕</span>;
    return (
      <span className="ml-1 text-xs text-blue-400">
        {sortDir === "asc" ? "↑" : "↓"}
      </span>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 px-4 py-8">
      <div className="max-w-4xl mx-auto mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-1">
          Ranking de precios
        </h1>
        <p className="text-gray-400 text-sm">
          Comparativa de alquiler en Catalunya ordenada por precio medio mensual.
        </p>
      </div>

      <div className="max-w-4xl mx-auto mb-6 flex gap-2">
        {["ciudad", "barrio"].map((t) => (
          <button
            key={t}
            onClick={() => setTipo(t)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors capitalize ${
              tipo === t
                ? "bg-blue-600 text-white"
                : "bg-gray-800 text-gray-300 hover:bg-gray-700"
            }`}
          >
            {t === "ciudad" ? "Ciudades" : "Barrios"}
          </button>
        ))}
      </div>

      <div className="max-w-4xl mx-auto">
        {loading && (
          <div className="text-center py-20 text-gray-500 text-sm animate-pulse">
            Cargando ranking…
          </div>
        )}

        {error && (
          <div className="text-center py-20 text-red-400 text-sm">
            Error al cargar los datos: {error}
          </div>
        )}

        {!loading && !error && sorted.length === 0 && (
          <div className="text-center py-20 text-gray-500 text-sm">
            No hay datos disponibles.
          </div>
        )}

        {!loading && !error && sorted.length > 0 && (
          <>
            {/* Contador */}
            <div className="mb-3 text-xs text-gray-500">
              {sorted.length} zonas · página {page} de {totalPages}
            </div>

            {/* Tabla — sin scroll vertical, solo 10 filas */}
            <div className="overflow-x-auto rounded-xl border border-gray-800">
              <table className="w-full text-sm">
                <thead className="bg-gray-900 text-gray-400 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3 text-left text-gray-500 w-10">#</th>
                    {COLUMNS.map((col) => (
                      <th
                        key={col.key}
                        className={`px-4 py-3 text-left whitespace-nowrap select-none ${
                          col.sortable ? "cursor-pointer hover:text-gray-200" : ""
                        }`}
                        onClick={col.sortable ? () => handleSort(col.key) : undefined}
                      >
                        {col.label}
                        {col.sortable && <SortIcon colKey={col.key} />}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {paginated.map((item, idx) => {
                    const precio = item.precioMedioMes;
                    const color = getColor(precio);
                    const posicion = (page - 1) * PAGE_SIZE + idx + 1;

                    return (
                      <tr
                        key={`${item.zona}-${idx}`}
                        className="bg-gray-950 hover:bg-gray-900 transition-colors"
                      >
                        <td className="px-4 py-3 text-gray-600 text-xs font-mono">
                          {posicion}
                        </td>
                        <td className="px-4 py-3 font-semibold capitalize">
                          <span className="flex items-center gap-2">
                            <span
                              className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: color }}
                            />
                            {item.zona ?? "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-mono font-semibold" style={{ color }}>
                            {precio
                              ? `${Math.round(precio).toLocaleString("es-ES")} €`
                              : "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-gray-300">
                          {item.precioMedioM2
                            ? `${Math.round(item.precioMedioM2).toLocaleString("es-ES")} €`
                            : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Paginación */}
            <Pagination page={page} totalPages={totalPages} onChange={setPage} />

            {/* Leyenda */}
            <div className="mt-4 flex flex-wrap gap-4 text-xs text-gray-500">
              {[
                { color: "#22c55e", label: "< 700 €/mes" },
                { color: "#eab308", label: "700–1.000 €" },
                { color: "#f97316", label: "1.000–1.500 €" },
                { color: "#ef4444", label: "> 1.500 €" },
              ].map((l) => (
                <span key={l.color} className="flex items-center gap-1.5">
                  <span
                    className="inline-block w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: l.color }}
                  />
                  {l.label}
                </span>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}