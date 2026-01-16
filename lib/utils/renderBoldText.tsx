import { Text } from '@react-pdf/renderer'

// Función para renderizar texto con partes en negrita marcadas con asteriscos
export function renderBoldText(text: string, baseStyle: any) {
  // Dividir el texto por asteriscos
  const parts = text.split(/(\*[^*]+\*)/g)
  
  return parts.map((part, index) => {
    // Si la parte está entre asteriscos, renderizarla en negrita
    if (part.startsWith('*') && part.endsWith('*')) {
      const boldText = part.slice(1, -1) // Remover los asteriscos
      return (
        <Text key={index} style={{ ...baseStyle, fontFamily: 'Helvetica-Bold' }}>
          {boldText}
        </Text>
      )
    }
    // Texto normal
    return (
      <Text key={index} style={baseStyle}>
        {part}
      </Text>
    )
  })
}



