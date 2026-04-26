-- Sprint 3.3.14-fix-ux10 — prestadores_equipa_cliente + colunas prestadores
-- Aplicar em: hkmvszkpxjbxmnixzqbl (V1 Core Hub)

ALTER TABLE v5_manutencao.prestadores
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS especialidades jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS verificado boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS ordem int DEFAULT 100;

UPDATE v5_manutencao.prestadores SET
  bio = 'Canalizador profissional com 8 anos de experiência. Especialista em sistemas de aquecimento e canalização residencial.',
  especialidades = '["Canalização residencial","Sistemas aquecimento","Reparações urgentes"]'::jsonb,
  verificado = true, ordem = 10
WHERE iniciais = 'AF';

UPDATE v5_manutencao.prestadores SET
  bio = 'Electricista certificado · trabalhos residenciais e comerciais. Instalações, iluminação e quadros.',
  especialidades = '["Instalações eléctricas","Iluminação LED","Quadros eléctricos"]'::jsonb,
  verificado = true, ordem = 20
WHERE iniciais = 'RG';

UPDATE v5_manutencao.prestadores SET
  bio = 'Limpeza profissional residencial e comercial. Equipamentos próprios, produtos hipoalergénicos disponíveis.',
  especialidades = '["Limpeza profunda","Pós-obra","Subscrições mensais"]'::jsonb,
  verificado = true, ordem = 30
WHERE iniciais = 'SM';

UPDATE v5_manutencao.prestadores SET
  bio = 'Técnico de jardim e piscinas. Tratamento, manutenção e sistemas de rega automática.',
  especialidades = '["Jardim","Piscinas","Rega automática"]'::jsonb,
  verificado = true, ordem = 40
WHERE iniciais = 'MC';

CREATE TABLE IF NOT EXISTS v5_manutencao.prestadores_equipa_cliente (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pessoa_id uuid NOT NULL,
  prestador_id uuid REFERENCES v5_manutencao.prestadores(id),
  num_servicos_partilhados int DEFAULT 1,
  ultima_interaccao timestamptz DEFAULT now(),
  favorito boolean DEFAULT false,
  notas_privadas text,
  UNIQUE(pessoa_id, prestador_id)
);

-- Seed Maria Santos com 3 prestadores da sua equipa (SM é favorita)
INSERT INTO v5_manutencao.prestadores_equipa_cliente
  (pessoa_id, prestador_id, num_servicos_partilhados, favorito)
VALUES
  ('9ef5000a-827b-4486-9c5d-352545e4de91','da174e7d-89a1-41ac-a66b-f5f63b1a5cb7', 4, false),
  ('9ef5000a-827b-4486-9c5d-352545e4de91','b70d6528-2ef0-4a43-855b-9fd6d9b45a14', 8, true),
  ('9ef5000a-827b-4486-9c5d-352545e4de91','5edef2be-9339-4a8e-8c7a-472199f1a4e1', 2, false)
ON CONFLICT (pessoa_id, prestador_id) DO NOTHING;
