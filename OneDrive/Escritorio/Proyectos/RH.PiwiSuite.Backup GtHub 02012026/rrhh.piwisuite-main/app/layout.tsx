import type { Metadata } from 'next'
import './globals.css'
import Layout from '@/components/Layout'
import { CompanyProvider } from '@/lib/contexts/CompanyContext'

export const metadata: Metadata = {
  title: 'Sistema de Remuneraciones - Chile',
  description: 'Gestión de trabajadores y liquidaciones de sueldo',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body>
        <CompanyProvider>
          <Layout>{children}</Layout>
        </CompanyProvider>
      </body>
    </html>
  )
}

