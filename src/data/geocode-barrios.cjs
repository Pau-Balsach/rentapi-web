// ============================================================
// GEOCODE BARRIOS — consulta la BD, geocodifica los barrios
// que faltan en barrios-coords.json y actualiza el fichero.
//
// Uso: node geocode-barrios.cjs
// Requiere: npm install pg
// ============================================================

const { Client } = require('pg');
const fs         = require('fs');
const path       = require('path');
const https      = require('https');

// ─── Config desde config.properties ─────────────────────────────────────────
const CONFIG_PROPERTIES = 'C:\\Users\\pbalsach\\IdeaProjects\\rentapi-scraper\\src\\main\\resources\\config.properties';

function loadProperties(filePath) {
  const lines = fs.readFileSync(filePath, 'utf8').split('\n');
  const props = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx < 0) continue;
    props[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
  }
  return props;
}

const props    = loadProperties(CONFIG_PROPERTIES);
const jdbcMatch = props['db.url'].match(/jdbc:postgresql:\/\/([^:]+):(\d+)\/(.+)/);
if (!jdbcMatch) { console.error('No se pudo parsear db.url'); process.exit(1); }

const DB_CONFIG = {
  host:     jdbcMatch[1],
  port:     parseInt(jdbcMatch[2]),
  database: jdbcMatch[3],
  user:     props['db.user'],
  password: props['db.password'],
  ssl:      { rejectUnauthorized: false },
};

const COORDS_FILE        = path.join(__dirname, 'barrios-coords.json');
const NOMINATIM_DELAY_MS = 2000; // entre barrios
const NOMINATIM_INTENTO_DELAY_MS = 2500; // entre intentos del mismo barrio
const USER_AGENT         = 'RentAPI-geocoder/1.0 (contacto@example.com)';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ─── Nominatim: una petición ─────────────────────────────────────────────────
// Photon (Komoot) — basado en OSM, sin registro, sin límite estricto
function photonGet(query) {
  return new Promise((resolve) => {
    const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=1&bbox=-0.5,40.0,3.5,42.9`;
    https.get(url, { headers: { 'User-Agent': USER_AGENT }, timeout: 10000 }, (res) => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        try {
          const r = JSON.parse(body);
          if (r.features && r.features.length > 0) {
            const [lng, lat] = r.features[0].geometry.coordinates;
            resolve({
              lat: parseFloat(lat.toFixed(7)),
              lng: parseFloat(lng.toFixed(7)),
            });
          } else {
            resolve(null);
          }
        } catch { resolve(null); }
      });
    }).on('error', () => resolve(null)).on('timeout', () => resolve(null));
  });
}

// Mantenemos nominatimGet por si Photon falla
function nominatimGet(query) {
  return new Promise((resolve) => {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=es`;
    https.get(url, { headers: { 'User-Agent': USER_AGENT }, timeout: 10000 }, (res) => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        try {
          const r = JSON.parse(body);
          resolve(r.length > 0 ? {
            lat: parseFloat(parseFloat(r[0].lat).toFixed(7)),
            lng: parseFloat(parseFloat(r[0].lon).toFixed(7)),
          } : null);
        } catch { resolve(null); }
      });
    }).on('error', () => resolve(null)).on('timeout', () => resolve(null));
  });
}

// ─── Geocodificar con 3 intentos de fallback ─────────────────────────────────
// 1. barrio + ciudad + Cataluña       → más preciso
// 2. barrio + ciudad (sin región)     → para pueblos fuera de Cataluña
// 3. solo ciudad + Cataluña           → último recurso, al menos ubica la ciudad
async function geocodificar(nombreBarrio, nombreCiudad) {
  const queries = [
    `${nombreBarrio}, ${nombreCiudad}, Cataluña`,
    `${nombreBarrio}, ${nombreCiudad}`,
    `${nombreCiudad}, Cataluña`,
  ];

  for (let i = 0; i < queries.length; i++) {
    if (i > 0) await sleep(NOMINATIM_INTENTO_DELAY_MS);
    // Intentar Photon primero
    const r = await photonGet(queries[i]);
    if (r) return { coords: r, intento: i + 1 };
    // Si Photon falla, intentar Nominatim
    await sleep(500);
    const r2 = await nominatimGet(queries[i] + ', España');
    if (r2) return { coords: r2, intento: i + 1 };
  }
  return { coords: null, intento: 0 };
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  // 1. Cargar JSON existente
  let coords = {};
  if (fs.existsSync(COORDS_FILE)) {
    coords = JSON.parse(fs.readFileSync(COORDS_FILE, 'utf8'));
    console.log(`JSON cargado: ${Object.keys(coords).length} ciudades`);
  }

  // 2. Conectar BD
  const client = new Client(DB_CONFIG);
  await client.connect();
  console.log('Conectado a la BD\n');

  const { rows } = await client.query(`
    SELECT b.nombre AS barrio_nombre, b.slug AS barrio_slug,
           c.nombre AS ciudad_nombre, c.slug AS ciudad_slug
    FROM barrios b
    JOIN ciudades c ON b.ciudad_id = c.id
    ORDER BY c.slug, b.slug
  `);
  await client.end();
  console.log(`Barrios en BD: ${rows.length}`);

  // 3. Filtrar pendientes
  const pendientes = rows.filter(r => {
    const cc = coords[r.ciudad_slug];
    return !cc || !cc[r.barrio_slug];
  });

  console.log(`Ya tienen coords: ${rows.length - pendientes.length}`);
  console.log(`Pendientes: ${pendientes.length}\n`);

  if (pendientes.length === 0) {
    console.log('✅ Todos los barrios ya tienen coordenadas');
    return;
  }

  // 4. Geocodificar
  let ok = 0, fallback = 0, fallidos = 0;
  const fallidos_lista = [];

  for (let i = 0; i < pendientes.length; i++) {
    const r = pendientes[i];
    process.stdout.write(`[${i + 1}/${pendientes.length}] ${r.ciudad_slug} / ${r.barrio_slug} → `);

    const { coords: resultado, intento } = await geocodificar(r.barrio_nombre, r.ciudad_nombre);

    if (resultado) {
      if (!coords[r.ciudad_slug]) coords[r.ciudad_slug] = {};
      coords[r.ciudad_slug][r.barrio_slug] = resultado;

      if (intento === 1) {
        console.log(`✅ ${resultado.lat}, ${resultado.lng}`);
        ok++;
      } else {
        console.log(`⚠️  ${resultado.lat}, ${resultado.lng} (fallback intento ${intento})`);
        fallback++;
      }
    } else {
      console.log('❌ no encontrado');
      fallidos++;
      fallidos_lista.push(`${r.ciudad_slug} / ${r.barrio_slug}`);
    }

    // Guardar cada 50 barrios por si se interrumpe
    if ((i + 1) % 50 === 0) {
      fs.writeFileSync(COORDS_FILE, JSON.stringify(coords, null, 2), 'utf8');
      console.log(`  💾 Guardado parcial (${i + 1} procesados)`);
    }

    if (i < pendientes.length - 1) await sleep(NOMINATIM_DELAY_MS);
    // sleep extra cada 10 barrios para no saturar Nominatim
    if ((i + 1) % 10 === 0) await sleep(3000);
  }

  // 5. Guardar resultado final ordenado
  const ordenado = Object.fromEntries(Object.entries(coords).sort(([a], [b]) => a.localeCompare(b)));
  fs.writeFileSync(COORDS_FILE, JSON.stringify(ordenado, null, 2), 'utf8');

  console.log(`\n=== RESUMEN ===`);
  console.log(`✅ Exactos:   ${ok}`);
  console.log(`⚠️  Fallback: ${fallback} (coordenadas de la ciudad, no del barrio)`);
  console.log(`❌ No encontrados: ${fallidos}`);
  console.log(`💾 Guardado en: ${COORDS_FILE}`);

  if (fallidos_lista.length > 0) {
    const logPath = path.join(__dirname, 'geocode-fallidos.txt');
    fs.writeFileSync(logPath, fallidos_lista.join('\n'), 'utf8');
    console.log(`\nBarrios no encontrados → ${logPath}`);
  }
}

main().catch(e => { console.error('Error fatal:', e); process.exit(1); });
