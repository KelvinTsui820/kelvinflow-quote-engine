import { GeminiAIService } from '../src/services/gemini.service.js';

const ai = new GeminiAIService();

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

const result = (ai as any).extractPOOfflineFallback({ text: spanishEmail });
console.log('BuyerName:', result.data.BuyerContact.Name);
console.log('CustomerName:', result.data.CustomerName);
console.log('Items:', result.data.Items.map((i: any) => ({ sku: i.SKU, qty: i.Quantity })));
