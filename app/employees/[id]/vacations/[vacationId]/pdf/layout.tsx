export default function PDFLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Layout vacío - no incluir Layout component para mostrar solo el PDF
  return <div style={{ margin: 0, padding: 0, width: '100vw', height: '100vh', overflow: 'hidden' }}>{children}</div>
}
