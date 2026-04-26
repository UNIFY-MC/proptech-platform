-- Sprint 3.3.14-fix-ux8 · Tarefa D — imagem_url em combos
-- Aplicar em: hkmvszkpxjbxmnixzqbl (V1 Core Hub)

ALTER TABLE v5_manutencao.combos
  ADD COLUMN IF NOT EXISTS imagem_url text;

UPDATE v5_manutencao.combos SET imagem_url = CASE slug
  WHEN 'pack-inverno'    THEN 'https://images.unsplash.com/photo-1543589077-47d81606c1bf?w=800&q=80'
  WHEN 'reset-primavera' THEN 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=800&q=80'
  WHEN 'pre-venda-casa'  THEN 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&q=80'
  WHEN 'pack-verao'      THEN 'https://images.unsplash.com/photo-1572724013060-7e5c5c4d3527?w=800&q=80'
  ELSE imagem_url
END;
