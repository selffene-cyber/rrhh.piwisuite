export default function SetupPage() {
  return (
    <div style={{ minHeight: '100vh', padding: '40px', background: '#0b1220', color: '#e5e7eb' }}>
      <div style={{ maxWidth: 860, margin: '0 auto' }}>
        <h1 style={{ fontSize: 28, marginBottom: 10 }}>Configuración Local</h1>
        <p style={{ marginBottom: 24, color: '#cbd5e1' }}>
          Falta configurar Supabase para poder usar la aplicación en local.
        </p>

        <div
          style={{
            background: '#0f172a',
            border: '1px solid #1f2937',
            borderRadius: 12,
            padding: 20,
            marginBottom: 18,
          }}
        >
          <h2 style={{ fontSize: 18, marginBottom: 10 }}>1) Crea tu archivo `.env.local`</h2>
          <pre
            style={{
              background: '#020617',
              border: '1px solid #1f2937',
              borderRadius: 10,
              padding: 14,
              overflowX: 'auto',
              color: '#e5e7eb',
            }}
          >{`NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_clave_anon_aqui`}</pre>
          <p style={{ marginTop: 12, color: '#cbd5e1' }}>
            Tip: también puedes copiar <code>env.example</code> a <code>.env.local</code> y luego completar los valores.
          </p>
        </div>

        <div
          style={{
            background: '#0f172a',
            border: '1px solid #1f2937',
            borderRadius: 12,
            padding: 20,
            marginBottom: 18,
          }}
        >
          <h2 style={{ fontSize: 18, marginBottom: 10 }}>2) Ejecuta el proyecto</h2>
          <pre
            style={{
              background: '#020617',
              border: '1px solid #1f2937',
              borderRadius: 10,
              padding: 14,
              overflowX: 'auto',
              color: '#e5e7eb',
            }}
          >{`npm install
npm run dev`}</pre>
        </div>

        <div style={{ color: '#cbd5e1' }}>
          <p>
            Para el setup completo de la base de datos (tablas, RLS y migraciones), revisa{' '}
            <code>SETUP.md</code> y los scripts en <code>supabase/</code>.
          </p>
        </div>
      </div>
    </div>
  )
}


