const spanishEmail = `From: kelvin tsui <tsuikelvin0804@gmail.com>
To: rfq-tsuikelvin0804_gmail@kelvinflow.com
Subject: Solicitud de cotización - Juntas de goma

Estimados señores,

Por favor envíen su cotización para los siguientes artículos:
TEST-005 - 500 piezas
TEST-002 - 800 piezas

Términos comerciales: FOB Shenzhen

Saludos cordiales,
Carlos Méndez
Importadora Andina`;

const lines = spanishEmail.split(/\r?\n/);
console.log('Total lines:', lines.length);

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const trimmed = line.trim();
  if (!trimmed) continue;

  const headerFilter = /^(?:From|To|Date|Subject|Cc|Bcc|Sent|Dear|Regards|Sincerely|Best regards|Trade Terms|Terms|Payment|Currency|Settlement|Required|Specifications|%\d|obj|endobj|stream|endstream)\b/i.test(trimmed);
  const skuMatch = trimmed.match(/\b([A-Z0-9]{2,}(?:[-_][A-Z0-9]+)+)\b/);
  console.log(`Line ${i}: "${trimmed}" -> headerFilter: ${headerFilter}, skuMatch: ${skuMatch ? skuMatch[1] : null}`);
}

// Check sign-off
const signOffRegex = /(?:Atentamente|Saludos\s+cordiales|Saludos|Cordialmente|Un\s+cordial\s+saludo|Atenciosamente|Com\s+os\s+melhores\s+cumprimentos|Cordialement|Bien\s+cordialement|Mit\s+freundlichen\s+Gr[uü][sß]en|Cordiali\s+saluti|Best\s+regards|Kind\s+regards|Warm\s+regards|Regards|Sincerely|Yours\s+truly)\s*[,:：\n\r]+([\s\S]{1,250})/i;
const signOffMatch = spanishEmail.match(signOffRegex);
console.log('signOffMatch:', signOffMatch ? signOffMatch[1] : null);

// Check From line
const fromMatch = spanishEmail.match(/From\s*[:：]?\s*(?:(?:(?:"([^"]+)")|([^<\n\r]+?))\s*)?<([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})>/i);
console.log('fromMatch:', fromMatch);
