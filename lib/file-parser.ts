export async function parseFileToText(file: File): Promise<string> {
  const name = file.name.toLowerCase()
  const buffer = await file.arrayBuffer()

  if (name.endsWith('.csv') || name.endsWith('.txt')) {
    return new TextDecoder().decode(buffer)
  }

  if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
    const XLSX = await import('xlsx')
    const wb = XLSX.read(buffer, { type: 'array' })
    const lines: string[] = []
    wb.SheetNames.forEach(sheetName => {
      const ws = wb.Sheets[sheetName]
      const csv = XLSX.utils.sheet_to_csv(ws)
      lines.push(csv)
    })
    return lines.join('\n')
  }

  if (name.endsWith('.docx') || name.endsWith('.doc')) {
    const mammoth = await import('mammoth')
    const result = await mammoth.extractRawText({ buffer: Buffer.from(buffer) })
    return result.value
  }

  return new TextDecoder().decode(buffer)
}
