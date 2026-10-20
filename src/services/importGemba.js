import * as XLSX from 'xlsx'

const norm = (s) => String(s ?? '').replace(/\u00a0/g, ' ').trim().replace(/\s+/g, ' ')
const cleanText = (s) => {
  if (!s) return null
  return String(s).replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim().toUpperCase()
}

// 🔴 FONCTION CRUCIALE : Lecture de date 100% infaillible
function parseExcelDate(v) {
  if (v == null || v === '') return null
  
  // 1. Si c'est déjà une date (objet Date)
  if (v instanceof Date) {
    return `${v.getFullYear()}-${String(v.getMonth() + 1).padStart(2, '0')}-${String(v.getDate()).padStart(2, '0')}`
  }

  // 2. Si c'est un nombre (numéro de série Excel)
  if (typeof v === 'number') {
    const date = new Date(Math.round((v - 25569) * 86400 * 1000))
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  }

  // 3. Si c'est une chaîne de caractères (ex: "14/10/2026" ou "2026-10-14")
  const str = String(v).trim()
  
  // Format JJ/MM/AAAA
  const matchSlash = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (matchSlash) {
    const [_, day, month, year] = matchSlash
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }

  // Format AAAA-MM-JJ
  const matchDash = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (matchDash) {
    const [_, year, month, day] = matchDash
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }

  // Si c'est un autre format de texte, on laisse JS essayer
  const d = new Date(str)
  if (!isNaN(d)) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }

  return null
}

export async function parseGembaFile(file) {
  const buf = await file.arrayBuffer()
  
  // On désactive la conversion automatique des dates pour gérer le format nous-mêmes
  const wb = XLSX.read(buf, { type: 'array', cellDates: false, raw: true })
  const ws = wb.Sheets[wb.SheetNames[0]]
  if (!ws) throw new Error('Aucune feuille trouvée dans le fichier.')

  const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, blankrows: false })
  if (aoa.length < 2) throw new Error('Fichier vide.')

  let headerIdx = -1
  for (let i = 0; i < Math.min(aoa.length, 10); i++) {
    const row = (aoa[i] ?? []).map(norm)
    if (row.includes('Date') && row.includes('Point M')) {
      headerIdx = i
      break
    }
  }
  if (headerIdx < 0) throw new Error('En-têtes Gemba introuvables (Date / Point M).')

  const header = aoa[headerIdx].map(norm)
  const idx = (name) => header.indexOf(norm(name))

  const iDate = idx('Date')
  const iLigne = idx('Ligne')
  const iUAP = idx('UAP')
  const iAuditeur = idx('Auditeur')
  const iPointM = idx('Point M')
  const iQuestion = idx('Question')
  const iReponse = idx('Réponse')
  const iAction = idx('Action Corrective')
  const iPilote = idx('Pilote')
  const iDateAction = idx('Date Action')
  const iScore = idx('Score (%)')

  const rows = []
  let lastDate = null
  let lastLigne = null
  let lastUAP = null

  for (let r = headerIdx + 1; r < aoa.length; r++) {
    const row = aoa[r]
    if (!row) continue
    if (row.every(cell => cell === null || cell === '')) continue;

    const question = norm(row[iQuestion])
    const pointM = norm(row[iPointM])
    
    // On garde la ligne si elle a une question OU un point M
    if (!question && !pointM) continue;

    // Gestion des dates/lignes fusionnées (on garde la valeur précédente)
    if (row[iDate]) lastDate = row[iDate]
    if (row[iLigne]) lastLigne = row[iLigne]
    if (row[iUAP]) lastUAP = row[iUAP]

    // On utilise notre parseur de date infaillible
    const dateStr = parseExcelDate(lastDate)
    if (!dateStr) continue // Si pas de date valide, on ignore la ligne

    rows.push({
      date: dateStr,
      ligne: cleanText(lastLigne) || '',
      uap: cleanText(lastUAP) || '',
      auditeur: cleanText(row[iAuditeur]) || '',
      point_m: pointM,
      question: question || pointM,
      reponse: norm(row[iReponse]).toUpperCase(),
      action: norm(row[iAction]),
      pilote: cleanText(row[iPilote]),
      date_action: parseExcelDate(row[iDateAction]),
      score: Number(row[iScore]) || 0
    })
  }

  return rows
}
