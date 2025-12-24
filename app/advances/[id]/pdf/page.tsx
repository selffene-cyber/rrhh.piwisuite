import { createServerClient } from '@/lib/supabase/server'
import AdvancePDFViewer from '@/components/AdvancePDF'

export default async function AdvancePDFPage({ params }: { params: { id: string } }) {
  const supabase = createServerClient()

  const { data: advance, error: advanceError } = await supabase
    .from('advances')
    .select(`
      *,
      employees (*),
      companies (*)
    `)
    .eq('id', params.id)
    .single()

  if (advanceError || !advance) {
    return <div>Anticipo no encontrado</div>
  }

  return (
    <AdvancePDFViewer
      advance={advance}
      company={advance.companies}
      employee={advance.employees}
    />
  )
}

