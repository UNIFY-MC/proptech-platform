-- Template para criar um novo condomínio (multi-tenant V2)
-- Uso: substituir os placeholders e correr no SQL Editor do V1 Core Hub.
--
-- Pré-requisitos:
-- 1. Criar conta Gmail OAuth para o condomínio em /integrations (vai criar row em system.google_oauth_tokens)
-- 2. Definir o staff_id desse OAuth (ex: 'condominio.lote2b@prataowners.pt')
-- 3. Conhecer NIF, IBAN, morada, proprietários (administradores)
-- 4. Logo URL (opcional — pode adicionar depois)
--
-- Depois do INSERT:
-- - As fracções deste condomínio precisam de ter `condominio_id` definido (UPDATE manual ou via importação)
-- - Os condóminos+pessoas associados às fracções funcionam automaticamente

-- =============================================================================
-- INSERT do condomínio
-- =============================================================================
INSERT INTO v2_condominios.condominio (
  codigo,
  nome,
  nome_completo,
  nif,
  morada,
  codpostal,
  localidade,
  iban,
  banco,
  email,
  email_from_name,
  telefone,
  website,
  email_assinatura,
  email_signature_html,
  proprietarios,
  whatsapp,
  gmail_staff_id,
  portal_cor_primaria,
  portal_cor_accent,
  ativo
) VALUES (
  '002',                                              -- codigo (string único)
  '<<NOME_CURTO>>',                                   -- ex: 'Prata Lote 2B'
  'Condomínio <<NOME_COMPLETO>>',                     -- ex: 'Condomínio Prata Lote 2B'
  '<<NIF>>',                                          -- 9 dígitos
  '<<MORADA>>',                                       -- ex: 'Rua Madalena Iglésias, 16'
  '<<CP>>',                                           -- ex: '1950-322'
  '<<LOCALIDADE>>',                                   -- ex: 'Lisboa'
  '<<IBAN>>',                                         -- ex: 'PT50...'
  '<<BANCO>>',                                        -- ex: 'Caixa Geral'
  '<<EMAIL>>',                                        -- ex: 'condominio.lote2b@prataowners.pt'
  '<<EMAIL_FROM_NAME>>',                              -- ex: 'Condomínio Prata Lote 2B'
  '<<TELEFONE>>',                                     -- opcional
  '<<WEBSITE>>',                                      -- opcional
  -- Assinatura texto plano (multilinha com \n)
  E'A Administração do Condomínio do <<NOME_CURTO>>\nos proprietários\n\n<<PROP1>>    <<PROP2>>\n<<PROP3>>    <<PROP4>>\n\n<<MORADA>>\n<<CP>> <<LOCALIDADE>>\n\n<<EMAIL>>\n<<NOME_CURTO>> — Owners (WhatsApp)',
  -- Assinatura HTML rica (com CSS inline)
  '<div style="font-family:Arial,sans-serif;margin-top:18px;padding:14px 16px;background:#eef9ef;border-radius:6px;border:1px solid #d4e9d7;max-width:540px;">
    <div style="background:#a8d8a8;color:#1a3a1a;font-weight:600;padding:6px 14px;border-radius:14px;display:inline-block;font-size:13px;margin-bottom:6px;">A Administração do Condomínio do <<NOME_CURTO>></div>
    <div style="text-align:center;font-size:11px;color:#666;margin-bottom:8px;">os proprietários</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 24px;font-size:13px;color:#222;margin-bottom:10px;">
      <span><<PROP1>></span><span><<PROP2>></span>
      <span><<PROP3>></span><span><<PROP4>></span>
    </div>
    <div style="font-size:12px;color:#444;line-height:1.5;">
      <<MORADA>><br><<CP>> <<LOCALIDADE>><br>
      ✉ <a href="mailto:<<EMAIL>>" style="color:#1a5a1a;"><<EMAIL>></a><br>
      💬 <<NOME_CURTO>> — Owners (WhatsApp)
    </div>
  </div>',
  -- Proprietários como JSONB
  '[
    {"nome":"<<PROP1>>","role":"administrador"},
    {"nome":"<<PROP2>>","role":"administrador"},
    {"nome":"<<PROP3>>","role":"administrador"},
    {"nome":"<<PROP4>>","role":"administrador"}
  ]'::jsonb,
  '<<NOME_CURTO>> - Owners',                          -- whatsapp display name
  '<<GMAIL_STAFF_ID>>',                               -- ex: 'condominio.lote2b@prataowners.pt' (deve existir em system.google_oauth_tokens)
  '#1a5a1a',                                          -- cor primária portal
  '#a8d8a8',                                          -- cor accent portal
  true                                                -- activo
)
RETURNING id, codigo, nome;

-- =============================================================================
-- A seguir: ligar fracções ao condomínio 002
-- =============================================================================
-- Quando as fracções deste condomínio forem importadas/criadas, fazer:
--
--   UPDATE v2_condominios.fracoes
--   SET condominio_id = (SELECT id FROM v2_condominios.condominio WHERE codigo='002')
--   WHERE edificio_id IN (<<edificio_uuids>>);
--
-- =============================================================================
-- Como funciona o pipeline com multi-tenant
-- =============================================================================
-- 1. Email chega à p7.digitall@gmail.com (inbox central)
-- 2. gmail-classify-batch identifica intent + agente + acção
-- 3. gmail-auto-draft-batch chama gmail-draft-reply
-- 4. Agente (Fina/Clara/...) chama lookup_cliente → encontra fracção do remetente
-- 5. lookup_cliente retorna também o `condominios[0]` da fracção (assinatura + email)
-- 6. Sonnet escreve resposta em nome desse condomínio (não Property007)
-- 7. fn injecta email_signature_html no body_html
-- 8. fn persiste draft_condominio_id na email_messages
-- 9. Mário aprova → gmail-send-google lê draft_condominio_id → usa gmail_staff_id
--    desse condomínio → envia do email correcto com signature correcta
