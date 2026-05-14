// v4-ocr-fatura/index.ts
// ADR-V4-002 · Upload Fatura + OCR Claude Haiku 4.5 Vision
// POST /functions/v1/v4-ocr-fatura
// Auth: JWT obrigatório (verify_jwt=true)
// Body: { file_path: string, pessoa_id?: string, contrato_energia_id?: string }

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ============================================================
// PROMPT — extractor especializado em facturas PT
// ============================================================
const PROMPT_EXTRACT_FACTURA = `
És um extractor especializado em facturas de electricidade portuguesas.
Analisa esta fatura e devolve APENAS um JSON válido (sem markdown, sem prefixos) com:
{
  "cpe": "PT00...",        // 22 caracteres se completo
  "kva": número,           // potência contratada
  "kwh_mensal": número,    // consumo mensal em kWh
  "comercializador": "Eni Plenitude" | "Luzboa" | "Ibelectra" | "Goldenergy" | "Coopernico" | "Endesa" | "Galp Power" | "EDP Comercial" | "outro",
  "plano": string,         // nome do plano/tarifário
  "preco_kwh": número,     // €/kWh sem IVA
  "iva_pct": 23 | 13 | 6,
  "total_mensal": número,  // € com IVA
  "periodo_inicio": "YYYY-MM-DD",
  "periodo_fim": "YYYY-MM-DD",
  "tipo_tarifa": "simples" | "bi_horaria" | "tri_horaria" | "indexada",
  "tensao": "BTN" | "BTE",
  "morada_local_consumo": string,
  "confidence": 0.0 a 1.0  // tua confiança global
}
Se um campo não for legível, devolve null nesse campo e baixa confidence proporcionalmente.
Para bi/tri-horária, soma os consumos ponta+cheia(+vazio) em kwh_mensal e usa preço médio ponderado em preco_kwh.
NUNCA inventes valores.
`.trim();

// ============================================================
// HANDLER PRINCIPAL
// ============================================================
Deno.serve(async (req: Request) => {
  // --- CORS preflight ---
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      },
    });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ ok: false, error: 'método não suportado' }, 405);
  }

  // --- Auth: rejeitar anon (verify_jwt=true garante token válido) ---
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return jsonResponse({ ok: false, error: 'não autorizado' }, 401);
  }

  // --- Parse body ---
  let body: { file_path?: string; pessoa_id?: string; contrato_energia_id?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ ok: false, error: 'body inválido — JSON esperado' }, 400);
  }

  const { file_path, pessoa_id, contrato_energia_id } = body;

  if (!file_path || typeof file_path !== 'string' || file_path.trim() === '') {
    return jsonResponse({ ok: false, error: 'file_path obrigatório' }, 400);
  }

  // --- Validar ANTHROPIC_API_KEY antes de arrancar ---
  const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!anthropicApiKey) {
    console.error('[v4-ocr-fatura] ANTHROPIC_API_KEY em falta nos secrets da Edge Function');
    return jsonResponse({
      ok: false,
      error: 'configuração incompleta: ANTHROPIC_API_KEY não configurada nos secrets Supabase',
    }, 503);
  }

  // --- Cliente Supabase com service role (acesso cross-user a Storage + BD) ---
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    db: { schema: 'v4_energia' },
  });

  // --- Extrair uploaded_by do JWT ---
  let uploadedBy: string | null = null;
  try {
    const tokenPayload = authHeader.replace('Bearer ', '');
    const payloadBase64 = tokenPayload.split('.')[1];
    const payloadJson = atob(payloadBase64.replace(/-/g, '+').replace(/_/g, '/'));
    const payload = JSON.parse(payloadJson);
    uploadedBy = payload.sub ?? null;
  } catch (e) {
    console.warn('[v4-ocr-fatura] Não foi possível extrair sub do JWT:', e);
  }

  // --- Criar registo inicial na BD ---
  const { data: factura, error: insertError } = await supabaseAdmin
    .from('facturas_uploaded')
    .insert({
      file_path: file_path.trim(),
      pessoa_id: pessoa_id ?? null,
      contrato_energia_id: contrato_energia_id ?? null,
      uploaded_by: uploadedBy,
      ocr_status: 'processing',
      ocr_model: 'claude-haiku-4-5-20251001',
      ocr_started_at: new Date().toISOString(),
      ocr_attempts: 1,
    })
    .select('id')
    .single();

  if (insertError || !factura) {
    console.error('[v4-ocr-fatura] Erro ao criar registo:', insertError);
    return jsonResponse({ ok: false, error: `erro ao criar registo: ${insertError?.message}` }, 500);
  }

  const facturaId: string = factura.id;
  console.log(`[v4-ocr-fatura] Registo criado: ${facturaId} | path: ${file_path}`);

  try {
    // --- Descarregar ficheiro do Storage ---
    const { data: fileData, error: downloadError } = await supabaseAdmin.storage
      .from('v4-facturas')
      .download(file_path.trim());

    if (downloadError || !fileData) {
      throw new Error(`Storage download falhou: ${downloadError?.message ?? 'ficheiro não encontrado'}`);
    }

    const originalBytes = fileData.size;
    const mimeType = fileData.type || inferMimeType(file_path);
    console.log(`[v4-ocr-fatura] Ficheiro descarregado: ${originalBytes} bytes, tipo: ${mimeType}`);

    let processedData: Blob = fileData;
    let finalMimeType = mimeType;
    let compressedBytes = originalBytes;

    if (mimeType === 'application/pdf') {
      try {
        const { PDFDocument } = await import('https://esm.sh/pdf-lib@1.17.1');
        const pdfBytes = await fileData.arrayBuffer();
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const savedBytes = await pdfDoc.save({ useObjectStreams: true });
        const savedBlob = new Blob([savedBytes], { type: 'application/pdf' });
        if (savedBlob.size < originalBytes * 0.85) {
          processedData = savedBlob;
          compressedBytes = savedBlob.size;
          console.log(`[v4-ocr-fatura] PDF comprimido: ${originalBytes} → ${compressedBytes} bytes`);
          await supabaseAdmin.storage
            .from('v4-facturas')
            .update(file_path.trim(), processedData, { upsert: true, contentType: 'application/pdf' });
        } else {
          console.log(`[v4-ocr-fatura] PDF: compressão insuficiente, mantém original`);
        }
      } catch (pdfErr) {
        console.warn('[v4-ocr-fatura] pdf-lib falhou, passthrough:', pdfErr);
      }
    } else {
      if (originalBytes > 3_500_000) {
        console.warn(`[v4-ocr-fatura] Imagem grande (${originalBytes} bytes) — pode exceder limite Claude`);
      }
    }

    // --- Actualizar tamanhos na BD ---
    await supabaseAdmin
      .from('facturas_uploaded')
      .update({
        file_size_original_bytes: originalBytes,
        file_size_bytes: compressedBytes,
        mime_type: finalMimeType,
      })
      .eq('id', facturaId);

    // --- Converter para base64 ---
    const arrayBuffer = await processedData.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    let base64 = '';
    const chunkSize = 8192;
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      base64 += String.fromCharCode(...uint8Array.slice(i, i + chunkSize));
    }
    base64 = btoa(base64);

    const mediaType = normalizeMediaType(finalMimeType);
    console.log(`[v4-ocr-fatura] Base64 pronto: ${base64.length} chars, mediaType: ${mediaType}`);

    // --- Chamar Claude Haiku 4.5 com vision ---
    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: base64,
              },
            },
            {
              type: 'text',
              text: PROMPT_EXTRACT_FACTURA,
            },
          ],
        }],
      }),
    });

    if (!anthropicResponse.ok) {
      const errText = await anthropicResponse.text();
      throw new Error(`Anthropic API ${anthropicResponse.status}: ${errText.substring(0, 300)}`);
    }

    const anthropicData = await anthropicResponse.json();
    const rawText: string = anthropicData.content?.[0]?.text ?? '';
    console.log(`[v4-ocr-fatura] Resposta Claude: ${rawText.substring(0, 200)}`);

    // --- Parse do JSON devolvido ---
    let ocrData: Record<string, unknown>;
    try {
      const cleanText = rawText.replace(/^```json\s*/i, '').replace(/\s*```$/, '').trim();
      ocrData = JSON.parse(cleanText);
    } catch {
      throw new Error(`OCR output não é JSON válido: ${rawText.substring(0, 200)}`);
    }

    const confidence = typeof ocrData.confidence === 'number'
      ? Math.min(1, Math.max(0, ocrData.confidence))
      : 0;

    const hasCriticalFields = ocrData.cpe != null || ocrData.kwh_mensal != null || ocrData.total_mensal != null;
    if (!hasCriticalFields) {
      console.warn('[v4-ocr-fatura] Nenhum campo crítico extraído — qualidade de imagem pode ser baixa');
    }

    // --- Persistir resultado ---
    await supabaseAdmin
      .from('facturas_uploaded')
      .update({
        ocr_status: 'completed',
        ocr_data: ocrData,
        ocr_confidence: confidence,
        ocr_completed_at: new Date().toISOString(),
      })
      .eq('id', facturaId);

    console.log(`[v4-ocr-fatura] OCR concluído: ${facturaId}, confidence: ${confidence}`);

    return jsonResponse({
      ok: true,
      data: {
        factura_id: facturaId,
        ocr_data: ocrData,
        ocr_confidence: confidence,
      },
    }, 200);

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[v4-ocr-fatura] Erro no pipeline: ${msg}`);

    await supabaseAdmin
      .from('facturas_uploaded')
      .update({
        ocr_status: 'failed',
        erro_mensagem: msg,
        ocr_completed_at: new Date().toISOString(),
      })
      .eq('id', facturaId);

    return jsonResponse({ ok: false, error: msg, data: { factura_id: facturaId } }, 500);
  }
});

// ============================================================
// HELPERS
// ============================================================

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

function inferMimeType(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return 'application/pdf';
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'png') return 'image/png';
  return 'application/octet-stream';
}

function normalizeMediaType(mime: string): 'application/pdf' | 'image/jpeg' | 'image/png' {
  if (mime === 'application/pdf') return 'application/pdf';
  if (mime === 'image/png') return 'image/png';
  return 'image/jpeg';
}
