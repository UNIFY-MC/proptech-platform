# Catálogo de Serviços — v5-manutencao

**Atualizado**: 22 Abr 2026
**Total**: 153 serviços em 8 categorias (8 personalizados + 145 fixos)
**Detalhe rico**: 100% — todos os serviços têm `tagline`, `inclui`, `nao_inclui`, `duracao_tipica` e `faq`
**Fonte da verdade**: `supabase/migrations/20260422_catalogo_completo.sql`

Este documento lista todos os serviços com IDs, preços e flags. É sincronizado com o SQL — se alterar um, actualizar o outro.

**Convenções**:
- Preços em **EUR**, formato português. `Promo` é o preço após desconto (~10-15% abaixo do `Base`).
- ⭐ = Popular (mais pedidos da subcategoria) · 🌿 = Eco (eficiência energética/hídrica)
- Todos os serviços têm **garantia de 90 dias** e a **taxa de deslocação de €5,90** é adicionada no checkout.
- Serviço personalizado de cada categoria é o **hero no topo da lista** (ID começa com `personalizado-`).
- Preço dos personalizados é **por hora** (base com desconto); o cliente indica as horas estimadas.
- Todos os 153 serviços têm detalhe rico carregado no SQL: `tagline`, `inclui`, `nao_inclui`, `duracao_tipica` e `faq`.
- **Agrupamento por tipologia/tamanho** (ver secção abaixo): 26 serviços individuais por tipologia são apresentados na lista como 9 cartões-pai "desde €X", com um ecrã de selecção de variante antes do detalhe.

---

## 🧩 Agrupamento por tipologia — 9 grupos-pai

Serviços que só variam em tamanho ou tipologia são apresentados ao cliente como **um único cartão** com preço "desde €X", mais um ecrã intermédio para escolher a variante. Reduz significativamente o ruído visual na lista.

No schema SQL, isto está modelado com a coluna `servicos.servico_pai_id` que aponta ao pai. Serviços-pai têm `tipo='grupo'` e não são reserváveis directamente — só as variantes é que entram nas ordens.

| Pai (`tipo='grupo'`) | Variantes (filhos) | Pré-sel. ⭐ | Desde |
|---|---|---|---:|
| `cln-home` Limpeza doméstica | t1, **t2**, t3, t4 | T2 | €35,91 |
| `cln-deep` Limpeza profunda | t1, **t2**, t3, t4 | T2 | €62,91 |
| `cln-move` Limpeza de mudança | t1, **t2**, t3, t4 | T2 | €59,90 |
| `cln-sofa` Limpeza de sofá | 2, **3**, L | 3 lugares | €49,41 |
| `cln-mattress` Higienização de colchão | s, **d** | Casal | €26,91 |
| `jar-mow` Corte de relva | **s**, m, l | até 100m² | €26,91 |
| `jar-maint` Manutenção mensal de jardim | s, **m**, l | Médio | €53,91 |
| `pol-maint` Manutenção mensal de piscina | s, **m**, l | Média | €62,91 |
| `pnt-apt` Pintura de apartamento completo | t1, **t2**, t3 | T2 | €494,91 |
| `pos-clean` Limpeza pós-obra | t1, **t2**, t3, t4 | T2 | €134,91 |

**10 grupos** consolidando **33 serviços individuais**.

### Opções dinâmicas nos serviços de limpeza

Os grupos `cln-home`, `cln-deep`, `cln-move` e `cln-sofa` têm **opções dinâmicas** no ecrã de detalhe que alteram o preço final:

**Produtos e materiais** (aplica-se aos 4 grupos)
- `Eu forneço` — default, incluído no preço base
- `Técnica traz` — +€4,00 (sofá) ou +€6,00 (profunda/mudança)

### Venda recorrente — 8 templates de frequência (configuráveis via admin)

Serviços que fazem sentido recorrentes usam **8 templates de frequência** armazenadas na tabela `frequency_templates` na DB (editáveis via admin, sem tocar em código). A tabela `servicos` tem a coluna `frequency_template` que aponta à template pelo ID.

O frontend carrega as templates no arranque (1 query) e renderiza as opções conforme cada serviço.

| Template | Opções | Aplica-se a |
|---|---|---|
| `cln_home` | Pontual · Mensal (4v, −15%) · Mensal+Profunda (−12%) | `cln-home` (grupo) |
| `cln_occasional` | Pontual · Trimestral (−10%) · Semestral (−5%) | `cln-bathroom-deep`, `cln-oven`, `cln-fridge` |
| `cln_office` | Pontual · Semanal (−20%) · Quinzenal (−15%) · Mensal (−10%) | `cln-office-small` |
| `jardim_corte` | Pontual · Semanal (−15%) · Quinzenal (−12%) · Mensal (−8%) | `jar-mow` (grupo) |
| `sazonal_cut` | Pontual · Semestral (−10%) · Anual (−5%) | `jar-hedge-prune`, `jar-weed`, `jar-scarify` |
| `plano_gradual` | Mensal · Trimestral (−3%) · Semestral (−6%) · Anual (−10%) | `jar-maint` (grupo), `pol-maint` (grupo) |
| `piscina_quimica` | Pontual · Quinzenal (−12%) · Mensal (−8%) | `pol-chem-basic`, `pol-chem-full`, `pol-vacuum` |
| `manutencao_anual` | Pontual · Plano anual (−10% + lembrete + prioridade) | `mnt-ac-main`, `mnt-water-heater` |

**Cobertura total**: 13 serviços individuais + 3 grupos (que afectam mais 10 variantes). Os restantes serviços ficam sem opção de frequência (são pontuais por natureza).

**Para o admin configurar**: UI CRUD sobre `frequency_templates` — mudar discounts, labels, hints, ou adicionar novas templates. O frontend pega automaticamente depois de um refresh.

As opções escolhidas pelo cliente são guardadas na ordem em `ordens.metadata` (JSONB):
```json
{ "produtos": "tecnica_traz", "frequencia": "semestral", "preco_extras": 4.00 }
```

**Query para a lista** (só pais + serviços soltos):
```sql
SELECT * FROM servicos
WHERE categoria_id = ? AND activo = TRUE AND servico_pai_id IS NULL
ORDER BY ordem;
```

**Query para o ecrã de variante**:
```sql
SELECT * FROM servicos
WHERE servico_pai_id = ? AND activo = TRUE
ORDER BY ordem;
```

---

## 1. 🧹 Limpeza (25 serviços)

### Personalizado
| ID | Serviço | Promo | Base |
|---|---|---:|---:|
| `personalizado-cln` | **Limpeza personalizada** (€/h) | €44,91 | €49,90 |

### Regular
| ID | Serviço | Promo | Base |
|---|---|---:|---:|
| `cln-home-t1` ⭐ | Limpeza doméstica T0/T1 | €35,91 | €39,90 |
| `cln-home-t2` ⭐ 📋 | Limpeza doméstica T2 | €44,91 | €49,90 |
| `cln-home-t3` | Limpeza doméstica T3 | €62,91 | €69,90 |
| `cln-home-t4` | Limpeza doméstica T4+ | €80,91 | €89,90 |
| `cln-monthly` | Limpeza mensal (pack 4 visitas) | €161,91 | €179,90 |
| `cln-bathroom-deep` | Limpeza profunda de casa de banho | €35,91 | €39,90 |

### Limpeza profunda
| ID | Serviço | Promo | Base |
|---|---|---:|---:|
| `cln-deep-t1` | Limpeza profunda T0/T1 | €71,91 | €79,90 |
| `cln-deep-t2` ⭐ | Limpeza profunda T2 | €89,91 | €99,90 |
| `cln-deep-t3` | Limpeza profunda T3 | €116,91 | €129,90 |
| `cln-deep-t4` | Limpeza profunda T4+ | €143,91 | €159,90 |

### Têxteis
| ID | Serviço | Promo | Base |
|---|---|---:|---:|
| `cln-sofa-2` | Higienização de sofá 2 lugares | €40,41 | €44,90 |
| `cln-sofa-3` ⭐ | Higienização de sofá 3 lugares | €58,41 | €64,90 |
| `cln-sofa-L` | Higienização de sofá chaise longue | €76,41 | €84,90 |
| `cln-mattress-s` | Higienização de colchão solteiro | €31,41 | €34,90 |
| `cln-mattress-d` | Higienização de colchão casal | €40,41 | €44,90 |
| `cln-carpet` | Higienização de tapete (por m²) | €8,91 | €9,90 |
| `cln-curtains` | Limpeza de cortinados | €40,41 | €44,90 |

### Superfícies
| ID | Serviço | Promo | Base |
|---|---|---:|---:|
| `cln-windows` | Limpeza de janelas (por divisão) | €26,91 | €29,90 |
| `cln-oven` | Limpeza de forno | €40,41 | €44,90 |
| `cln-fridge` | Limpeza de frigorífico | €35,91 | €39,90 |
| `cln-tiles` | Limpeza profunda de azulejos (por m²) | €7,11 | €7,90 |

### Pós-obra (ligeira)
| ID | Serviço | Promo | Base |
|---|---|---:|---:|
| `cln-post-work-t1` | Limpeza pós-obra ligeira T1 | €107,91 | €119,90 |
| `cln-post-work-t2` | Limpeza pós-obra ligeira T2 | €143,91 | €159,90 |
| `cln-office-small` | Limpeza de escritório pequeno | €62,91 | €69,90 |

---

## 2. 🔧 Manutenção (21 serviços)

### Personalizado
| ID | Serviço | Promo | Base |
|---|---|---:|---:|
| `personalizado-mnt` | **Manutenção personalizada** (€/h) | €44,91 | €49,90 |

### Montagem e instalação
| ID | Serviço | Promo | Base |
|---|---|---:|---:|
| `mnt-furniture` ⭐ 📋 | Montagem de mobiliário (IKEA, Conforama…) | €44,91 | €49,90 |
| `mnt-tv-55` ⭐ | Montagem de TV até 55" | €44,91 | €49,90 |
| `mnt-tv-big` | Montagem de TV > 55" | €62,91 | €69,90 |
| `mnt-blinds-manual` | Instalação de estores manuais | €53,91 | €59,90 |
| `mnt-blinds-elec` | Instalação de estores eléctricos | €89,91 | €99,90 |
| `mnt-blinds-mount` | Substituição de fita/correia de estore | €35,91 | €39,90 |
| `mnt-wardrobe` | Montagem de roupeiro | €98,91 | €109,90 |
| `mnt-bed` | Montagem de cama | €35,91 | €39,90 |
| `mnt-table-chairs` | Montagem de mesa + cadeiras | €44,91 | €49,90 |

### Reparação
| ID | Serviço | Promo | Base |
|---|---|---:|---:|
| `mnt-lock-replace` ⭐ | Substituição de fechadura | €53,91 | €59,90 |
| `mnt-lock-urgent` | Abertura de porta urgente | €89,91 | €99,90 |
| `mnt-door-adjust` | Ajuste e reparação de porta | €35,91 | €39,90 |
| `mnt-window` | Reparação de janela | €44,91 | €49,90 |
| `mnt-drawer` | Reparação de gaveta ou porta de armário | €31,41 | €34,90 |

### Ajustes
| ID | Serviço | Promo | Base |
|---|---|---:|---:|
| `mnt-hinges` | Substituição de dobradiças e puxadores | €22,41 | €24,90 |
| `mnt-curtains` | Instalação de varão de cortinas | €31,41 | €34,90 |
| `mnt-sink-seal` | Substituição de silicone de banca ou lava-loiça | €26,91 | €29,90 |
| `mnt-silicone` | Aplicação de silicone (por metro) | €4,41 | €4,90 |

### Fixação
| ID | Serviço | Promo | Base |
|---|---|---:|---:|
| `mnt-shelf` | Fixação de prateleira | €22,41 | €24,90 |
| `mnt-frames` | Fixação de quadros ou espelhos | €17,91 | €19,90 |

---

## 3. 🌿 Jardim (17 serviços)

### Personalizado
| ID | Serviço | Promo | Base |
|---|---|---:|---:|
| `personalizado-jar` | **Jardim personalizado** (€/h) | €44,91 | €49,90 |

### Corte e manutenção
| ID | Serviço | Promo | Base |
|---|---|---:|---:|
| `jar-mow-s` ⭐ 📋 | Corte de relva pequena (≤ 100 m²) | €31,41 | €34,90 |
| `jar-mow-m` | Corte de relva média (100-300 m²) | €53,91 | €59,90 |
| `jar-mow-l` | Corte de relva grande (> 300 m²) | €89,91 | €99,90 |
| `jar-maint-s` | Manutenção de jardim pequeno | €44,91 | €49,90 |
| `jar-maint-m` | Manutenção de jardim médio | €80,91 | €89,90 |
| `jar-maint-l` | Manutenção de jardim grande | €125,91 | €139,90 |

### Poda e limpeza
| ID | Serviço | Promo | Base |
|---|---|---:|---:|
| `jar-hedge-prune` | Poda de sebes | €44,91 | €49,90 |
| `jar-prune-s` | Poda de árvore pequena | €62,91 | €69,90 |
| `jar-prune-m` | Poda de árvore média | €116,91 | €129,90 |
| `jar-weed` | Remoção de ervas daninhas | €35,91 | €39,90 |
| `jar-autumn` | Limpeza de folhas de outono | €40,41 | €44,90 |
| `jar-scarify` | Escarificação de relva | €62,91 | €69,90 |

### Plantação e design
| ID | Serviço | Promo | Base |
|---|---|---:|---:|
| `jar-lawn-new` | Instalação de relva nova (por m²) | €13,41 | €14,90 |
| `jar-hedge-plant` | Plantação de sebe (por metro) | €17,91 | €19,90 |

### Rega
| ID | Serviço | Promo | Base |
|---|---|---:|---:|
| `jar-irrig-install` 🌿 | Instalação de sistema de rega automática | €224,91 | €249,90 |
| `jar-irrig-repair` | Reparação de sistema de rega | €53,91 | €59,90 |

---

## 4. 🏊 Piscina (14 serviços)

### Personalizado
| ID | Serviço | Promo | Base |
|---|---|---:|---:|
| `personalizado-pol` | **Piscina personalizada** (€/h) | €44,91 | €49,90 |

### Tratamento químico
| ID | Serviço | Promo | Base |
|---|---|---:|---:|
| `pol-chem-basic` | Análise e correção química (básica) | €40,41 | €44,90 |
| `pol-chem-full` | Tratamento químico completo | €62,91 | €69,90 |

### Manutenção
| ID | Serviço | Promo | Base |
|---|---|---:|---:|
| `pol-maint-s` | Manutenção mensal piscina pequena | €107,91 | €119,90 |
| `pol-maint-m` ⭐ 📋 | Manutenção mensal piscina média | €143,91 | €159,90 |
| `pol-maint-l` | Manutenção mensal piscina grande | €179,91 | €199,90 |
| `pol-vacuum` | Aspiração de piscina (avulso) | €44,91 | €49,90 |
| `pol-filter-clean` | Limpeza de filtro | €35,91 | €39,90 |

### Reparação
| ID | Serviço | Promo | Base |
|---|---|---:|---:|
| `pol-filter-replace` | Substituição de filtro | €125,91 | €139,90 |
| `pol-pump-replace` | Substituição de bomba | €224,91 | €249,90 |
| `pol-leak-repair` | Reparação de fuga em piscina | €89,91 | €99,90 |

### Abertura e fecho
| ID | Serviço | Promo | Base |
|---|---|---:|---:|
| `pol-open` ⭐ | Abertura de piscina (início de época) | €116,91 | €129,90 |
| `pol-close` | Fecho de piscina (invernagem) | €98,91 | €109,90 |
| `pol-cover` | Instalação/substituição de cobertura | €161,91 | €179,90 |

---

## 5. 🎨 Pintura (16 serviços)

### Personalizado
| ID | Serviço | Promo | Base |
|---|---|---:|---:|
| `personalizado-pnt` | **Pintura personalizada** (€/h) | €49,90 | €54,90 |

### Interior
| ID | Serviço | Promo | Base |
|---|---|---:|---:|
| `pnt-room-s` | Pintar quarto pequeno | €116,91 | €129,90 |
| `pnt-room-m` | Pintar quarto médio | €161,91 | €179,90 |
| `pnt-living-s` ⭐ | Pintar sala pequena | €197,91 | €219,90 |
| `pnt-living-l` | Pintar sala grande | €269,91 | €299,90 |
| `pnt-apt-t1` | Pintar apartamento T1 completo | €485,91 | €539,90 |
| `pnt-apt-t2` ⭐ 📋 | Pintar apartamento T2 completo | €665,91 | €739,90 |
| `pnt-apt-t3` | Pintar apartamento T3 completo | €899,91 | €999,90 |

### Exterior
| ID | Serviço | Promo | Base |
|---|---|---:|---:|
| `pnt-facade-m2` | Pintura de fachada (por m²) | €13,41 | €14,90 |

### Preparação
| ID | Serviço | Promo | Base |
|---|---|---:|---:|
| `pnt-cracks` | Reparação de fissuras (por ponto) | €17,91 | €19,90 |
| `pnt-stucco-m2` | Aplicação de estuque (por m²) | €22,41 | €24,90 |
| `pnt-anti-damp` 🌿 | Tratamento anti-humidade | €143,91 | €159,90 |

### Especial
| ID | Serviço | Promo | Base |
|---|---|---:|---:|
| `pnt-door` | Pintura de porta interior | €62,91 | €69,90 |
| `pnt-window` | Pintura de janela de madeira | €71,91 | €79,90 |
| `pnt-radiator` | Pintura de radiador | €44,91 | €49,90 |
| `pnt-varnish` | Envernizamento de madeira (por m²) | €26,91 | €29,90 |

---

## 6. ⚡ Elétrica (17 serviços)

### Personalizado
| ID | Serviço | Promo | Base |
|---|---|---:|---:|
| `personalizado-elc` | **Elétrica personalizada** (€/h) | €49,90 | €54,90 |

### Tomadas e interruptores
| ID | Serviço | Promo | Base |
|---|---|---:|---:|
| `elc-outlet-replace` ⭐ | Substituição de tomada | €22,41 | €24,90 |
| `elc-outlet-new` | Instalação de tomada nova | €44,91 | €49,90 |
| `elc-switch-replace` | Substituição de interruptor | €22,41 | €24,90 |

### Iluminação
| ID | Serviço | Promo | Base |
|---|---|---:|---:|
| `elc-ceiling-light` ⭐ | Instalação de candeeiro de tecto | €35,91 | €39,90 |
| `elc-light-point` | Novo ponto de luz | €62,91 | €69,90 |
| `elc-spots` | Instalação de focos embutidos (até 4) | €80,91 | €89,90 |
| `elc-led-retrofit` 🌿 | Substituição para iluminação LED | €53,91 | €59,90 |
| `elc-outdoor-light` | Instalação de iluminação exterior | €71,91 | €79,90 |

### Quadro elétrico
| ID | Serviço | Promo | Base |
|---|---|---:|---:|
| `elc-board-repair` ⭐ 📋 | Reparação de quadro elétrico | €71,91 | €79,90 |
| `elc-board-new` | Instalação de quadro elétrico novo | €314,91 | €349,90 |
| `elc-certificate` | Certificação eléctrica | €179,91 | €199,90 |

### Diagnóstico
| ID | Serviço | Promo | Base |
|---|---|---:|---:|
| `elc-diag` | Diagnóstico de avaria eléctrica | €44,91 | €49,90 |

### Aparelhos
| ID | Serviço | Promo | Base |
|---|---|---:|---:|
| `elc-fan-ceiling` | Instalação de ventoinha de tecto | €80,91 | €89,90 |
| `elc-extractor` | Instalação de extractor | €62,91 | €69,90 |
| `elc-bell` | Substituição de campainha | €35,91 | €39,90 |
| `elc-appliance` | Ligação de electrodoméstico fixo | €53,91 | €59,90 |

---

## 7. 🚿 Canalização (31 serviços)

IDs mantidos no estilo original OSCAR (kebab-case descritivo).

### Personalizado
| ID | Serviço | Promo | Base |
|---|---|---:|---:|
| `personalizado-can` | **Canalização personalizada** (€/h) | €44,91 | €49,90 |

### Autoclismo e sanita
| ID | Serviço | Promo | Base |
|---|---|---:|---:|
| `auto-repair` ⭐ 📋 | Reparação de autoclismo | €36,46 | €42,90 |
| `auto-install` | Instalação de autoclismo | €30,43 | €32,90 |
| `seat-repair` | Reparar tampo de sanita | €27,65 | €29,90 |
| `seat-replace` | Substituir tampo de sanita | €29,25 | €32,50 |
| `toilet-replace` | Substituir sanita | €79,11 | €87,90 |
| `toilet-install` | Instalar sanita | €57,15 | €63,50 |
| `toilet-remove` | Remover sanita | €57,15 | €63,50 |
| `toilet-unclog` | Desentupir sanita | €105,75 | €117,50 |

### Torneiras
| ID | Serviço | Promo | Base |
|---|---|---:|---:|
| `bath-tap-repair` | Reparar torneira de casa de banho | €35,55 | €39,50 |
| `sink-tap-repair` | Reparar torneira de lava-loiça | €35,55 | €39,50 |
| `sink-tap-replace` | Substituir torneira de lavatório | €29,61 | €32,90 |
| `kitchen-tap-eff` 🌿 | Substituir torneira de lava-loiça (Eficiência) | €39,15 | €43,50 |
| `bath-tap-eff` 🌿 | Substituir torneira de casa de banho (Eficiência) | €35,55 | €39,50 |
| `safety-tap` | Substituir torneira de segurança | €18,40 | €19,90 |
| `bath-tap-install` | Instalar torneira de banheira | €35,55 | €39,50 |

### Fugas e diagnósticos
| ID | Serviço | Promo | Base |
|---|---|---:|---:|
| `leak-diagnosis` | Diagnóstico de fuga de água | €35,55 | €39,50 |
| `kitchen-leak` ⭐ | Fuga de água no lava-loiça | €42,21 | €46,90 |
| `sink-leak` | Fuga de água no lavatório | €40,37 | €42,50 |
| `shower-leak` | Reparar cabine de duche (Fuga de água) | €207,18 | €212,50 |

### Desentupimentos
| ID | Serviço | Promo | Base |
|---|---|---:|---:|
| `kitchen-unclog` | Desentupir lava-loiça | €70,97 | €83,50 |
| `bathroom-unclog` | Desentupir casa de banho | €83,25 | €92,50 |

### Lavatório
| ID | Serviço | Promo | Base |
|---|---|---:|---:|
| `valve-replace` | Substituir válvula de lavatório | €33,15 | €34,90 |
| `vanity-replace` | Substituir móvel de lavatório | €82,35 | €91,50 |
| `vanity-install` | Instalar móvel de lavatório | €53,01 | €58,90 |

### Duche e banheira
| ID | Serviço | Promo | Base |
|---|---|---:|---:|
| `shower-column` | Substituir coluna de duche | €43,11 | €47,90 |
| `shower-head-eff` 🌿 | Substituir chuveiro (Eficiência energética) | €35,01 | €38,90 |
| `shower-cabin` | Substituir cabine de duche | €227,66 | €233,50 |
| `tub-to-shower` | Substituir banheira por duche | €2 084,50 | — |

### Manutenção
| ID | Serviço | Promo | Base |
|---|---|---:|---:|
| `grout-replace` | Substituir juntas de azulejos | €35,64 | €41,93 |

---

## 8. 🧱 Pós-Obra (12 serviços)

### Personalizado
| ID | Serviço | Promo | Base |
|---|---|---:|---:|
| `personalizado-pos` | **Pós-obra personalizado** (€/h) | €49,90 | €54,90 |

### Limpeza de obra
| ID | Serviço | Promo | Base |
|---|---|---:|---:|
| `pos-clean-t1` | Limpeza pós-obra T0/T1 | €134,91 | €149,90 |
| `pos-clean-t2` ⭐ 📋 | Limpeza pós-obra T2 | €179,91 | €199,90 |
| `pos-clean-t3` | Limpeza pós-obra T3 | €233,91 | €259,90 |
| `pos-clean-t4` | Limpeza pós-obra T4+ | €296,91 | €329,90 |
| `pos-clean-comm` | Limpeza pós-obra comercial (por m²) | €4,41 | €4,90 |
| `pos-windows` | Limpeza de vidros pós-obra | €53,91 | €59,90 |

### Remoção de entulho
| ID | Serviço | Promo | Base |
|---|---|---:|---:|
| `pos-debris-s` | Remoção de entulho pequeno (< 1m³) | €80,91 | €89,90 |
| `pos-debris-m` | Remoção de entulho médio (1-3m³) | €134,91 | €149,90 |

### Remates e acabamentos
| ID | Serviço | Promo | Base |
|---|---|---:|---:|
| `pos-protect-floor` | Proteção de pavimento (por m²) | €3,51 | €3,90 |
| `pos-paint-touch` | Retoques de pintura pós-obra | €80,91 | €89,90 |
| `pos-silicone` | Acabamento de silicones e vedantes | €40,41 | €44,90 |

---

## Resumo executivo

| Categoria | Total | ⭐ Popular | 🌿 Eco | 📋 Com detalhe |
|---|---:|---:|---:|---:|
| 🧹 Limpeza | 25 | 4 | 0 | 25 |
| 🔧 Manutenção | **31** | **6** | 0 | **31** |
| 🌿 Jardim | 17 | 1 | 1 | 17 |
| 🏊 Piscina | 14 | 2 | 0 | 14 |
| 🎨 Pintura | 16 | 2 | 1 | 16 |
| ⚡ Elétrica | 17 | 3 | 1 | 17 |
| 🚿 Canalização | 31 | 2 | 3 | 31 |
| 🧱 Pós-Obra | 12 | 1 | 0 | 12 |
| **TOTAL** | **163** | **21** | **6** | **163** |

**Novidades nesta iteração** (inspiradas no InstaService USA):
- 🎄 **Subcategoria "Sazonal e festivo"** na Manutenção: luzes de Natal (grupo com 3 variantes), desmontagem, árvore, decoração exterior (6 serviços)
- 🔨 **Subcategoria "Fixação e instalação"**: pendurar quadros e espelhos (popular — procurado todo o ano)
- 🛡️ **Subcategoria "Segurança doméstica"**: baby proofing
- 🚀 **Manutenção anual de AC** e **Manutenção anual de esquentador** (pedido Mario)

Total de **10 serviços novos** desde a versão anterior (153 → 163).

---

## Evolução futura — variações e extras

Todos os 153 serviços já têm detalhe rico completo (tagline, inclui, não inclui, duração típica, FAQ). Para enriquecer ainda mais o produto comercial, os próximos passos naturais são:

**Variações por serviço** (tabela `servico_variacoes`, já no schema):
- Limpeza: variações por frequência (avulsa / quinzenal / mensal) com desconto
- Pintura: variações por tipo de tinta (standard / premium / ecológica)
- Elétrica: variações por tipo de peça (standard / marca premium)

**Extras por serviço** (tabela `servico_extras`, já no schema):
- Limpeza: engomadoria (€8/h), lavagem de loiça (€4/visita), limpeza de frigorífico como addon
- Montagem: elevação ao andar (€15), remoção de embalagens (€5)
- Pintura: cor premium (€40 extra), 3ª demão para cores escuras (€40)

**Imagens por serviço**: adicionar URL de imagem representativa em `servicos.imagem_url` para o grid de serviços — aumenta significativamente a taxa de conversão face a um grid só de texto.

Estas três evoluções podem ser adicionadas incrementalmente pelo admin sem tocar no código da app.
