---
id: ADR-V4-002
title: Upload Fatura + OCR Claude Haiku 4.5 Vision (Fase 1B)
date: 2026-05-12
status: Aceite e implementado
deciders: [mario, architect-proptech]
sprint: feat/v4-ocr-facturas
vertical: V4 Energia
---

# ADR-V4-002 · Upload Fatura + OCR Claude Haiku 4.5 Vision

## Estado

**Aceite e implementado** — Mário aprovou em 2026-05-12. Schema aplicado e Edge Function deployed em `hkmvszkpxjbxmnixzqbl`.

---

## Contexto

A Fase 1+2 (ADR-V4-001) entregou motor BD-driven e ingestão ERSE/OMIE, mas o wizard do simulador continua a exigir input **manual** de todos os campos (segmento, kWh, kVA, comercializador actual, valor mensal). A manie.pt e concorrentes diferenciam-se pelo fluxo "zero fricção": cliente faz upload da fatura, sistema extrai todos os campos via OCR, wizard fica pre-preenchido.

Este ADR define a arquitectura para fechar esse gap (Fase 1B):
- Upload de PDF/imagem da fatura
- OCR via Claude Haiku 4.5 Vision
- Compactação e retenção indefinida do original
- Pre-preenchimento automático do wizard
- Drawer de detalhe do lead com preview da fatura

---

## Decisão

### 1. Modelo OCR — Claude Haiku 4.5 Vision

`claude-haiku-4-5-20251001` chamado directamente via Anthropic API a partir de Edge Function Deno.

- **Custo estimado**: ~$0.0008–$0.02 por fatura (input ~1500 tokens + output ~800 tokens)
- **Razão**: 20× mais barato que Sonnet, qualidade suficiente para facturas portuguesas com texto estruturado
- **Prompt**: especializado em facturas PT, lista enum de comercializadores do mercado livre, validação de CPE (formato `PT0002...` 22 chars), suporte bi/tri-horária (soma consumos, preço médio ponderado)

### 2. Storage e RGPD — manter compactado para sempre

- **Bucket**: `v4-facturas` privado (10MB max, mime types PDF/JPEG/PNG)
- **Compactação**:
  - PDF via `pdf-lib` (passthrough se redução < 15%)
  - Imagens enviadas directamente ao Claude (Haiku aceita até 5 MB)
- **Retenção**: indefinida — original comprimido fica sempre disponível para visualização
- **Soft-delete**: função `apagar_factura(UUID)` SECURITY DEFINER marca `apagado_em`
- **Aviso RGPD**: utilizador é avisado no upload, direito ao apagamento (Art. 17 RGPD) garantido por botão na UI

### 3. Schema — `v4_energia.facturas_uploaded`

19 colunas (ver migration `20260512_v4_ocr_facturas.sql`):
- Identificação: `id`, `pessoa_id`, `contrato_energia_id`, `uploaded_by`
- Ficheiro: `file_path`, `file_size_bytes`, `file_size_original_bytes`, `mime_type`
- OCR: `ocr_status` (pending|processing|completed|failed), `ocr_data` (jsonb), `ocr_model`, `ocr_attempts`, `ocr_confidence`, `erro_mensagem`
- Timestamps: `created_at`, `updated_at`, `ocr_started_at`, `ocr_completed_at`, `apagado_em`

**Schema `ocr_data` jsonb**:
```json
{
  "cpe": "PT0002000000123456789AB",
  "kva": 6.9,
  "kwh_mensal": 320,
  "comercializador": "EDP Comercial",
  "plano": "Tarifa Simples BTN",
  "preco_kwh": 0.1751,
  "iva_pct": 23,
  "total_mensal": 67.42,
  "periodo_inicio": "2026-04-01",
  "periodo_fim": "2026-04-30",
  "tipo_tarifa": "simples",
  "tensao": "BTN",
  "morada_local_consumo": "Rua X, Lisboa",
  "confidence": 0.92
}
```

### 4. Edge Function — `v4-ocr-fatura`

- Localização: `apps/v5-manutencao/supabase/functions/v4-ocr-fatura/index.ts`
- `verify_jwt = true` (rejeita anon)
- Pipeline: parse body → valida key → download Storage → compress PDF → base64 → Anthropic API → parse JSON → persist
- Tolerância: falha em parse devolve `failed` + `erro_mensagem`, nunca crash silencioso
- Smoke-tested: invocação com path inexistente devolve 500 com mensagem clara (não 503 ANTHROPIC_API_KEY missing → key presente)

### 5. RLS triple

| Tabela | Policy | Quem |
|---|---|---|
| `storage.objects` (bucket v4-facturas) | `facturas_owner_read` | dono (auth.uid em folder name) |
| `storage.objects` | `facturas_owner_insert` | dono |
| `storage.objects` | `facturas_staff_all` | staff |
| `v4_energia.facturas_uploaded` | `v4_facturas_owner_select` | uploaded_by ou staff |
| `v4_energia.facturas_uploaded` | `v4_facturas_owner_insert` | uploaded_by |
| `v4_energia.facturas_uploaded` | `v4_facturas_staff_update` | staff |

### 6. Componentes UI

- **`UploadFaturaStep.jsx`** — step 0 opcional no `ClienteSimulator`: dropzone + modal RGPD + progress bar + OCR result preview com confidence badge
- **`LeadDetalheDrawer.jsx`** — drawer 720px com ficha de cliente + preview PDF/imagem (react-pdf) + lista facturas + botão apagar
- **Dependências**: `react-dropzone`, `react-pdf`

---

## Alternativas consideradas

### A — Claude Sonnet 4.6 vision em vez de Haiku

**Rejeitada.** Sonnet é ~20× mais caro (~$0.02-0.05/fatura). Haiku 4.5 já tem qualidade suficiente para facturas estruturadas portuguesas. Sonnet só faz sentido se Haiku falhar consistentemente em layouts reais — pode-se adicionar fallback Haiku→Sonnet futuramente.

### B — Google Document AI ou Azure Form Recognizer

**Rejeitada.** Setup complicado (GCP/Azure credentials, billing separado), sem alinhamento com stack PropTech actual. CLAUDE.md já menciona Claude Vision como escolha canónica para extracção de PDFs.

### C — Auto-delete da fatura 24h após OCR

**Rejeitada por Mário.** O cliente quer poder consultar o original em qualquer momento (histórico, auditoria, re-processamento). Compromisso: compactar + manter para sempre + botão "apagar" disponível.

### D — Wizard sem step opcional (forçar manual)

**Rejeitada.** Anula o ponto de paridade com manie.pt. Step 0 fica opcional para casos onde o cliente não tem fatura digital à mão.

---

## Consequências

### Positivas

- Fluxo "zero fricção" — cliente carrega fatura, todos os campos pre-preenchidos
- Histórico completo de facturas por cliente
- Diferenciação face a poupa.pt, escolher.pt (que ainda não fazem OCR estruturado)
- Base para Fase 3 (tipologia + classe energética) — fatura tem morada que mapeia a tipologia
- Custo marginal baixo (~$0.001 por fatura)

### Negativas / Riscos

- Dependência de Anthropic API — se down, upload falha. Mitigação: fallback "preencher manualmente" sempre visível
- OCR pode interpretar mal facturas mal digitalizadas — confidence badge na UI permite o utilizador identificar baixa qualidade
- PII no Storage — Supabase encripta em rest (AES-256), RLS owner-only, mas requer DPA com cliente se houver muitas facturas
- Bundle size cresce de 423kB para 929kB com react-pdf — aceitável para web mas pesado para mobile

### Cross-vertical

- **V5 Manutenção** — tem caso de uso OCR para facturas de prestadores. Precisa Edge Function **própria** (campos diferentes — VAT, IBAN, NIF prestador). Não partilhar para evitar acoplamento.
- **V2 Condomínios** (`eozklslwfaqujaijvdnl`) — tem tabela `faturas_ocr` legacy (não reutilizável, schema antigo)
- **Shared library Anthropic** — adiada (YAGNI) até 3+ verticais terem OCR

---

## Verificação (executada)

- ✓ Migration `20260512_v4_ocr_facturas` aplicada em `hkmvszkpxjbxmnixzqbl`
- ✓ Migration adicional `20260512_v4_ocr_facturas_grants` (descoberta em runtime — service_role precisava GRANT USAGE)
- ✓ Bucket `v4-facturas` privado, 10MB max, 3 mime types permitidos
- ✓ 19 colunas em `v4_energia.facturas_uploaded`
- ✓ 6 RLS policies (3 storage + 3 tabela)
- ✓ Função `apagar_factura(UUID)` SECURITY DEFINER
- ✓ Edge Function `v4-ocr-fatura` deployed (ID `2321a8ca`, version 1, ACTIVE, verify_jwt=true)
- ✓ `ANTHROPIC_API_KEY` confirmada presente (smoke test não devolveu 503 config error)

---

## Pendente para Fase 1B+

- Cron `v4-cleanup-facturas-apagadas` para hard-delete do Storage 30 dias após `apagado_em`
- UI cliente-portal (para clientes finais consultarem as suas próprias facturas)
- Fallback Haiku → Sonnet se confidence < 0.5
- Testes E2E com facturas reais de EDP, Galp, Endesa, Goldenergy
