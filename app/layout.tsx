import type { Metadata } from 'next'
import './globals.css'
import Layout from '@/components/Layout'
import { CompanyProvider } from '@/lib/contexts/CompanyContext'

export const metadata: Metadata = {
  title: 'Sistema de Remuneraciones - Chile',
  description: 'Gestión de trabajadores y liquidaciones de sueldo',
  icons: {
    icon: [
      { url: '/favicon-96x96.png', sizes: '96x96', type: 'image/png' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: 'any' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    other: [
      {
        rel: 'shortcut icon',
        url: '/favicon.ico',
      },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'PiwiSuite',
  },
  manifest: '/site.webmanifest',
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

