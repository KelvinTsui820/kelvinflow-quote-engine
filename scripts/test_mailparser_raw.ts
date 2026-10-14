import { simpleParser } from 'mailparser';

const rawMime = `MIME-Version: 1.0
Date: Wed, 14 Oct 2026 08:27:50 +0800
Message-ID: <test123456@mail.gmail.com>
Subject: Solicitud de cotización - Juntas de goma
From: kelvin tsui <tsuikelvin0804@gmail.com>
To: rfq-tsuikelvin0804_gmail@kelvinflow.com
Content-Type: multipart/alternative; boundary="000000000000abcd1234"

--000000000000abcd1234
Content-Type: text/plain; charset="UTF-8"
Content-Transfer-Encoding: quoted-printable

Estimados se=C3=B1ores,

Por favor env=C3=ADen su cotizaci=C3=B3n para los siguientes art=C3=ADculos:
TEST-005 - 500 piezas
TEST-002 - 800 piezas

T=C3=A9rminos comerciales: FOB Shenzhen

Saludos cordiales,
Carlos M=C3=A9ndez
Importadora Andina

--000000000000abcd1234
Content-Type: text/html; charset="UTF-8"

<div>Estimados señores...</div>
--000000000000abcd1234--`;

(async () => {
  const parsed = await simpleParser(rawMime);
  console.log('parsed.messageId:', parsed.messageId);
  console.log('parsed.from:', parsed.from?.value);
  console.log('parsed.subject:', parsed.subject);
  console.log('parsed.text:');
  console.log(parsed.text);
})();
