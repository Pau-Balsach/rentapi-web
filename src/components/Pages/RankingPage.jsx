import { useEffect, useState } from "react";

function getColor(precio) {
  if (!precio) return "#94a3b8";
  if (precio < 700) return "#22c55e";
  if (precio < 1000) return "#eab308";
  if (precio < 1500) return "#f97316";
  return "#ef4444";
}

export default function RankingPage() {
  const [tipo, setTipo] = useState("ciudad");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortKey, setSortKey] = useState("precioMedioMes");
  const [sortDir, setSortDir] = useState("asc");

  useEffect(() => {
    setLoading(true);
    setError(null);

    const limite = 200;
    fetch(`/api/stats/ranking?tipo=${tipo}&limite=${limite}`)
      .then((r) => {
        if (!r.ok) throw new Error(`Error ${r.status}`);
        return r.json();
      })
      .then((json) => {
        const lista = Array.isArray(json) ? json : json.ranking ?? [];
        const porZona = new Map();
        lista.forEach(item => {
          const zona = item.zona?.toLowerCase();
          if (!porZona.has(zona)) {
            porZona.set(zona, item);
          }
        });
        setData(Array.from(porZona.values()));
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [tipo]);

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
          <div className="overflow-x-auto overflow-y-auto max-h-[70vh] rounded-xl border border-gray-800">
            <table className="w-full text-sm">
              <thead className="bg-gray-900 text-gray-400 text-xs uppercase tracking-wider sticky top-0 z-10">
                <tr>
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
                {sorted.map((item, idx) => {
                  const precio = item.precioMedioMes;
                  const color = getColor(precio);

                  return (
                    <tr
                      key={`${item.zona}-${idx}`}
                      className="bg-gray-950 hover:bg-gray-900 transition-colors"
                    >
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
                          {precio ? `${Math.round(precio).toLocaleString("es-ES")} €` : "—"}
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
        )}

        {!loading && !error && sorted.length > 0 && (
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
        )}
      </div>
    </div>
  );
}