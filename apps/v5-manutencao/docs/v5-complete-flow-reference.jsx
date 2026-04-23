import { useState, useRef, useMemo } from "react";
import {
  ArrowLeft, X, Check, Clock, Camera, Plus, MapPin, ChevronRight,
  Shield, Lock, MessageSquare, FileImage, RefreshCw, Wrench,
  Sparkles, Trash2, Tag, Receipt, Banknote, CreditCard, Info,
  Calendar, MapPinned, PartyPopper, Search, Star, Leaf, Zap,
  Home as HomeIcon, Compass, ClipboardList, User, Bell,
  Droplets, Paintbrush, Trees, Waves, Zap as ZapIcon,
  Hammer, Sparkle, Building2,
} from "lucide-react";

// ═══════════════════════════════════════════════════════════════════
// PALETA v5-manutencao — VERDE FLORESTA
// ═══════════════════════════════════════════════════════════════════
const C = {
  forest:        "#0B3D2E",
  forestDeep:    "#072819",
  forestSoft:    "#164E3A",
  emerald:       "#10B981",
  emeraldDark:   "#059669",
  emeraldBright: "#22C55E",
  emeraldSoft:   "#D1FAE5",
  emeraldPale:   "#ECFDF5",
  cream:         "#FAFAF6",
  paper:         "#FFFFFF",
  ink:           "#0A1620",
  stone:         "#6B7685",
  stoneLight:    "#E5E7EB",
  line:          "#ECE9E2",
  amber:         "#F59E0B",
  amberSoft:     "#FEF3C7",
  discount:      "#DC2626",
  discountSoft:  "#FEE2E2",
};

// ═══════════════════════════════════════════════════════════════════
// CONSTANTES DE NEGÓCIO
// ═══════════════════════════════════════════════════════════════════
const TRAVEL_FEE = 5.90;
const PROTECTION_FEE = 0.98;
const PROTECTION_FEE_NOW = 0.00;
const IMEDIATO_FEE = 6.90;
const HOJE_FEE = 3.90;
const PROMO_CODE = "CHEGUEI50_";
const PROMO_SAVINGS = 4.99;
const BOOKING_BUFFER_MIN = 90;

const TIMESLOTS = [
  "07:00","07:30","08:00","08:30","09:00","09:30","10:00","10:30",
  "11:00","11:30","12:00","12:30","13:00","13:30","14:00","14:30",
  "15:00","15:30","16:00","16:30","17:00","17:30","18:00","18:30",
  "19:00","19:30","20:00","20:30","21:00","21:30","22:00",
];

// ═══════════════════════════════════════════════════════════════════
// CATÁLOGO COMPLETO — 8 categorias, ~100 serviços
// Preços referência do mercado português 2026
// ═══════════════════════════════════════════════════════════════════

const CATEGORIES = [
  {
    id: "limpeza",
    nome: "Limpeza",
    slug: "limpeza",
    icon: Sparkle,
    emoji: "🧽",
    tagline: "Casa impecável, sem levantar um dedo",
    hero: "A sua casa merece o melhor cuidado.",
    color: "#10B981",
    personalizadoRate: 14.90,
    personalizadoRateOriginal: 16.90,
    subcategorias: [
      {
        id: "domestica", nome: "Limpeza doméstica", icon: "🏠",
        services: [
          // GRUPO: Limpeza regular (antes eram 5 serviços T0-T4)
          { id: "cln-home", name: "Limpeza doméstica", popular: true, hasProductsOption: true, productsExtraPrice: 4.00, frequencyTemplate: "cln_home",
            tagline: "Limpeza regular completa, pela técnica da sua confiança.",
            tipo: "grupo",
            variants: [
              { id: "cln-home-t0-t1", label: "T0/T1", hint: "até 60m²",  price: 29.90, priceOriginal: 32.90 },
              { id: "cln-home-t2",    label: "T2",    hint: "60-90m²",   price: 39.90, priceOriginal: 44.90, popular: true },
              { id: "cln-home-t3",    label: "T3",    hint: "90-120m²",  price: 49.90, priceOriginal: 55.90 },
              { id: "cln-home-t4",    label: "T4+",   hint: "> 120m²",   price: 59.90, priceOriginal: 66.90 },
            ],
            duracao: "2h - 5h segundo tipologia",
            inclui: [
              "Aspiração e lavagem de pavimentos",
              "Desinfecção de casas de banho",
              "Remoção de pó em todas as divisões",
              "Limpeza exterior de mobiliário e cozinha",
              "Troca de sacos do lixo e cama (se preparada)",
              "Produtos e equipamento profissional incluídos",
            ],
            naoInclui: [
              "Lavagem de loiça",
              "Engomadoria",
              "Limpeza de vidros interiores (ver serviço dedicado)",
              "Limpeza de forno ou frigorífico",
            ],
            faq: [
              { q: "Como escolho a tipologia?", a: "T0/T1 até 60m², T2 60-90m², T3 90-120m², T4+ acima. Se tiver dúvida, escolha pela área aproximada." },
              { q: "Tenho de fornecer produtos?", a: "Não — a técnica traz todos os produtos e materiais." },
              { q: "Posso tornar recorrente?", a: "Sim — há packs mensais com desconto e a mesma técnica sempre." },
            ],
          },
          // GRUPO: Limpeza profunda (antes eram 3 serviços T1-T3)
          { id: "cln-deep", name: "Limpeza profunda", popular: true, hasProductsOption: true, productsExtraPrice: 6.00,
            tagline: "Renovação total — para mudanças, pós-obra ligeira ou 1-2x/ano.",
            tipo: "grupo",
            variants: [
              { id: "cln-deep-t1", label: "T0/T1", hint: "até 60m²",  price: 69.90,  priceOriginal: 79.90 },
              { id: "cln-deep-t2", label: "T2",    hint: "60-90m²",   price: 89.90,  priceOriginal: 99.90, popular: true },
              { id: "cln-deep-t3", label: "T3",    hint: "90-120m²",  price: 119.90, priceOriginal: 133.90 },
              { id: "cln-deep-t4", label: "T4+",   hint: "> 120m²",   price: 159.90, priceOriginal: 179.90 },
            ],
            duracao: "4h - 8h segundo tipologia",
            inclui: [
              "Tudo da limpeza regular + extras",
              "Interior de armários (cozinha e roupeiros)",
              "Descalcificação de torneiras e azulejos",
              "Rodapés, caixilhos, estores, portas",
              "Desinfecção final com produto profissional",
              "Garantia — se ficar algo por limpar, voltamos em 48h",
            ],
            naoInclui: [
              "Interior do forno ou frigorífico a fundo",
              "Lavagem de sofás e colchões (ver Têxteis)",
              "Vidros exteriores em altura",
            ],
            faq: [
              { q: "Com que frequência?", a: "1-2x/ano para casas normais, ou em mudanças e pós-obras." },
              { q: "Posso morar durante?", a: "Sim — trabalhamos divisão a divisão e coordenamos com o residente." },
            ],
          },
        ],
      },
      {
        id: "especializada", nome: "Limpezas especializadas", icon: "✨",
        services: [
          { id: "sofa-2",           name: "Limpeza de sofá 2 lugares",        price: 29.90, priceOriginal: 34.90 },
          { id: "sofa-3",           name: "Limpeza de sofá 3 lugares",        price: 39.90, priceOriginal: 44.90 },
          { id: "colchao-casal",    name: "Limpeza de colchão de casal",      price: 34.90, priceOriginal: 38.90 },
          { id: "vidros",           name: "Limpeza de vidros",                price: 19.90, priceOriginal: 22.90 },
          { id: "exaustor",         name: "Limpeza de exaustor",              price: 24.90, priceOriginal: 27.90 },
          { id: "forno",            name: "Limpeza de forno",                 price: 29.90, priceOriginal: 33.90 },
          { id: "ar-cond-higien",   name: "Higienização de ar condicionado",  price: 39.90, priceOriginal: 44.90, eco: true },
          { id: "tapete",           name: "Limpeza de tapete (até 6m²)",      price: 14.90, priceOriginal: 17.90 },
        ],
      },
      {
        id: "mudanca", nome: "Mudança e ocasional", icon: "📦",
        services: [
          // GRUPO: Limpeza de mudança (antes eram 3 serviços T1/T2/T3)
          { id: "cln-move", name: "Limpeza de mudança", hasProductsOption: true, productsExtraPrice: 6.00,
            tagline: "Casa vazia impecável — para entrega ao novo inquilino ou mudança para casa nova.",
            tipo: "grupo",
            variants: [
              { id: "cln-move-t1", label: "T0/T1", hint: "até 60m²",  price: 59.90,  priceOriginal: 69.90 },
              { id: "cln-move-t2", label: "T2",    hint: "60-90m²",   price: 79.90,  priceOriginal: 89.90,  popular: true },
              { id: "cln-move-t3", label: "T3",    hint: "90-120m²",  price: 99.90,  priceOriginal: 113.90 },
              { id: "cln-move-t4", label: "T4+",   hint: "> 120m²",   price: 129.90, priceOriginal: 149.90 },
            ],
            duracao: "3h - 8h segundo tipologia",
            inclui: [
              "Aspiração completa de pavimentos",
              "Limpeza profunda de casas de banho e cozinha",
              "Interior de todos os armários e roupeiros vazios",
              "Vidros, caixilhos, rodapés e portas",
              "Relatório fotográfico final para o senhorio",
              "Produtos profissionais (opcional — ver Opções)",
            ],
            naoInclui: [
              "Remoção de entulho ou mobiliário (ver Pós-Obra)",
              "Pequenas reparações (ver Manutenção)",
              "Pintura ou retoques",
            ],
            faq: [
              { q: "Quando agendar?", a: "Casa já vazia e chaves disponíveis. Idealmente 1-2 dias antes da entrega." },
              { q: "Diferença para limpeza profunda?", a: "Mudança é em casa vazia — mais rápida e focada no essencial. Profunda é em casa habitada, 1-2x/ano." },
              { q: "Emitem fotos para o senhorio?", a: "Sim — relatório fotográfico final que pode usar como prova do estado de entrega." },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "manutencao",
    nome: "Manutenção",
    slug: "manutencao",
    icon: Wrench,
    emoji: "🔧",
    tagline: "A sua casa em forma, o ano todo",
    hero: "Preventivo sai sempre mais barato que curativo.",
    color: "#059669",
    personalizadoRate: 29.90,
    personalizadoRateOriginal: 32.90,
    subcategorias: [
      {
        id: "climatizacao", nome: "Climatização", icon: "❄️",
        services: [
          { id: "ac-manut",         name: "Manutenção ar condicionado (1 unid.)", price: 49.90, priceOriginal: 55.90, popular: true },
          { id: "esquentador",      name: "Manutenção de esquentador",            price: 39.90, priceOriginal: 44.90, popular: true },
          { id: "caldeira",         name: "Manutenção de caldeira a gás",         price: 69.90, priceOriginal: 79.90 },
          { id: "combustao",        name: "Análise de combustão",                 price: 24.90, priceOriginal: 27.90 },
        ],
      },
      {
        id: "faz-tudo", nome: "Faz-tudo (Handyman)", icon: "🛠️",
        services: [
          { id: "pequena-reparacao",name: "Pequenas reparações (1h)",             price: 24.90, priceOriginal: 27.90, popular: true },
          { id: "lampadas",         name: "Substituição de lâmpadas em altura",   price: 14.90, priceOriginal: 17.90 },
          { id: "furar-fixar",      name: "Furar e fixar prateleiras",            price: 24.90, priceOriginal: 27.90 },
          { id: "quadros",          name: "Fixação de quadros e espelhos",        price: 19.90, priceOriginal: 22.90 },
          { id: "montagem-movel",   name: "Montagem de mobília (por peça)",       price: 34.90, priceOriginal: 39.90 },
        ],
      },
      {
        id: "portas-janelas", nome: "Portas e janelas", icon: "🚪",
        services: [
          { id: "estore-repara",    name: "Reparação de estores",                 price: 34.90, priceOriginal: 38.90 },
          { id: "estore-fita",      name: "Substituição de fita de estore",       price: 29.90, priceOriginal: 33.90 },
          { id: "dobradicas",       name: "Ajuste de dobradiças",                 price: 19.90, priceOriginal: 22.90 },
          { id: "fechadura-lub",    name: "Lubrificação de fechaduras",           price: 14.90, priceOriginal: 17.90 },
          { id: "fechadura-subst",  name: "Substituição de fechadura",            price: 39.90, priceOriginal: 44.90 },
        ],
      },
      {
        id: "electrodomesticos", nome: "Electrodomésticos", icon: "🔌",
        services: [
          { id: "maq-lavar",        name: "Instalação de máquina de lavar",       price: 34.90, priceOriginal: 38.90 },
          { id: "maq-secar",        name: "Instalação de máquina de secar",       price: 34.90, priceOriginal: 38.90 },
          { id: "exaustor-inst",    name: "Instalação de exaustor",               price: 59.90, priceOriginal: 66.90 },
          { id: "placa-inducao",    name: "Instalação de placa de indução",       price: 74.90, priceOriginal: 84.90 },
        ],
      },
    ],
  },
  {
    id: "jardim",
    nome: "Jardim",
    slug: "jardim",
    icon: Trees,
    emoji: "🌿",
    tagline: "Um jardim que se cuida sozinho",
    hero: "Deixe a natureza connosco.",
    color: "#16A34A",
    personalizadoRate: 19.90,
    personalizadoRateOriginal: 22.90,
    subcategorias: [
      {
        id: "corte", nome: "Corte de relva", icon: "🌱",
        services: [
          { id: "corte-100",        name: "Corte de relva até 100m²",             price: 24.90, priceOriginal: 27.90 },
          { id: "corte-300",        name: "Corte de relva até 300m²",             price: 39.90, priceOriginal: 44.90, popular: true,
            tagline: "Corte profissional de relva até 300m² — recomendado quinzenal na época.",
            duracao: "1h - 1h30",
            frequencyTemplate: "jardim_corte",
            inclui: [
              "Corte uniforme com máquina profissional",
              "Aparo de cantos e bordas",
              "Remoção do material cortado (até 1m³)",
              "Combustível e equipamento incluídos",
            ],
            naoInclui: [
              "Escarificação (ver Desmuscagem)",
              "Tratamento fertilizante",
              "Poda de árvores ou sebes",
            ],
            faq: [
              { q: "Frequência ideal?", a: "Primavera/verão a cada 10-15 dias. Outono/inverno a cada 3-4 semanas." },
              { q: "E se chover?", a: "Reagendamos sem custo — relva molhada corta-se mal." },
            ],
          },
          { id: "corte-500",        name: "Corte de relva até 500m²",             price: 59.90, priceOriginal: 66.90 },
          { id: "corte-plus",       name: "Corte de relva +500m²",                price: 89.90, priceOriginal: 99.90 },
        ],
      },
      {
        id: "poda", nome: "Poda", icon: "✂️",
        services: [
          { id: "sebes",            name: "Poda de sebes (até 10m linear)",       price: 19.90, priceOriginal: 22.90 },
          { id: "arvore-peq",       name: "Poda de árvores pequenas",             price: 39.90, priceOriginal: 44.90 },
          { id: "arvore-med",       name: "Poda de árvores médias",               price: 69.90, priceOriginal: 79.90 },
          { id: "abate",            name: "Abate de árvore (até 5m)",             price: 119.90, priceOriginal: 134.90 },
        ],
      },
      {
        id: "tratamento", nome: "Tratamento", icon: "💧",
        services: [
          { id: "desmuscagem",      name: "Desmuscagem de relva",                 price: 49.90, priceOriginal: 55.90, eco: true },
          { id: "pragas-jardim",    name: "Tratamento de pragas",                 price: 34.90, priceOriginal: 38.90 },
          { id: "escarificacao",    name: "Escarificação de relva",               price: 59.90, priceOriginal: 66.90, eco: true },
          { id: "adubacao",         name: "Adubação de jardim",                   price: 24.90, priceOriginal: 27.90, eco: true },
        ],
      },
      {
        id: "instalacao-jardim", nome: "Instalação", icon: "🌻",
        services: [
          { id: "rega-auto",        name: "Instalação de rega automática (50m²)", price: 149.90, priceOriginal: 169.90 },
          { id: "rega-manut",       name: "Manutenção de sistema de rega",        price: 39.90, priceOriginal: 44.90 },
          { id: "plantacao-sebe",   name: "Plantação de sebe",                    price: 19.90, priceOriginal: 22.90 },
        ],
      },
    ],
  },
  {
    id: "piscina",
    nome: "Piscina",
    slug: "piscina",
    icon: Waves,
    emoji: "🏊",
    tagline: "Água cristalina, todo o ano",
    hero: "A sua piscina pronta, sempre que quiser mergulhar.",
    color: "#0891B2",
    personalizadoRate: 39.90,
    personalizadoRateOriginal: 44.90,
    subcategorias: [
      {
        id: "manut-piscina", nome: "Manutenção", icon: "🔄",
        services: [
          { id: "manut-semanal",    name: "Manutenção semanal",                   price: 39.90, priceOriginal: 44.90, popular: true,
            tagline: "Manutenção regular da piscina — água cristalina durante a época.",
            duracao: "1h por visita",
            frequencyTemplate: "plano_gradual",
            inclui: [
              "Análise e correção química (pH, cloro, alcalinidade)",
              "Aspiração do fundo",
              "Limpeza da linha de água e skimmers",
              "Retrolavagem do filtro",
              "Produtos químicos básicos incluídos",
            ],
            naoInclui: [
              "Reparações de equipamento avariado (orçamento)",
              "Abertura/fecho de época (serviços separados)",
            ],
            faq: [
              { q: "Plano anual com desconto?", a: "Sim — compromisso de 12 meses oferece −10% e prioridade na agenda." },
              { q: "Se houver tempestade?", a: "Visita de recuperação com desconto dentro do plano." },
            ],
          },
          { id: "manut-quinzenal",  name: "Manutenção quinzenal",                 price: 59.90, priceOriginal: 66.90 },
          { id: "manut-mensal",     name: "Manutenção mensal",                    price: 89.90, priceOriginal: 99.90 },
        ],
      },
      {
        id: "sazonal", nome: "Abertura e fecho", icon: "🌞",
        services: [
          { id: "abertura",         name: "Abertura de piscina (pós-inverno)",    price: 129.90, priceOriginal: 146.90 },
          { id: "fecho",            name: "Fecho de piscina (pré-inverno)",       price: 99.90, priceOriginal: 113.90 },
        ],
      },
      {
        id: "reparacao-piscina", nome: "Reparação", icon: "🔧",
        services: [
          { id: "fuga-piscina",     name: "Reparação de fuga",                    price: 149.90, priceOriginal: 169.90 },
          { id: "filtro-piscina",   name: "Substituição de filtro",               price: 89.90, priceOriginal: 99.90 },
          { id: "bomba",            name: "Reparação de bomba",                   price: 79.90, priceOriginal: 89.90 },
          { id: "liner",            name: "Substituição de liner",                price: 599.90, priceOriginal: null },
        ],
      },
      {
        id: "agua", nome: "Análise de água", icon: "💧",
        services: [
          { id: "analise",          name: "Análise de água",                      price: 14.90, priceOriginal: 17.90,
            tagline: "Análise completa da água — pH, cloro, alcalinidade.",
            duracao: "30 min",
            frequencyTemplate: "piscina_quimica",
            inclui: [
              "Análise completa (pH, cloro, alcalinidade)",
              "Correção se necessário (dentro dos parâmetros normais)",
              "Relatório com valores antes/depois",
            ],
            naoInclui: [
              "Correcções químicas extensas",
              "Tratamento de algas (ver serviço separado)",
            ],
            faq: [
              { q: "Frequência recomendada?", a: "Semanal no verão, quinzenal na época intermédia. Plano recorrente oferece −12% quinzenal e −8% mensal." },
            ],
          },
          { id: "choque",           name: "Tratamento de choque",                 price: 49.90, priceOriginal: 55.90 },
          { id: "ph",               name: "Equilíbrio de pH",                     price: 24.90, priceOriginal: 27.90 },
        ],
      },
    ],
  },
  {
    id: "pintura",
    nome: "Pintura",
    slug: "pintura",
    icon: Paintbrush,
    emoji: "🎨",
    tagline: "Casa nova, sem sair de casa",
    hero: "Paredes impecáveis, tintas de qualidade.",
    color: "#7C3AED",
    personalizadoRate: 24.90,
    personalizadoRateOriginal: 27.90,
    subcategorias: [
      {
        id: "interior", nome: "Interior", icon: "🏠",
        services: [
          { id: "quarto",           name: "Pintura de quarto",                    price: 89.90, priceOriginal: 99.90 },
          { id: "sala",             name: "Pintura de sala",                      price: 129.90, priceOriginal: 146.90, popular: true },
          { id: "casa-t1",          name: "Pintura de casa T1",                   price: 299.90, priceOriginal: 339.90 },
          { id: "casa-t2",          name: "Pintura de casa T2",                   price: 449.90, priceOriginal: 509.90, popular: true },
          { id: "casa-t3",          name: "Pintura de casa T3",                   price: 599.90, priceOriginal: 679.90 },
          { id: "tecto",            name: "Pintura de tecto",                     price: 39.90, priceOriginal: 44.90 },
          { id: "casa-banho",       name: "Pintura de casa de banho",             price: 69.90, priceOriginal: 78.90 },
        ],
      },
      {
        id: "exterior", nome: "Exterior", icon: "🏡",
        services: [
          { id: "fachada",          name: "Pintura de fachada (até 50m²)",        price: 299.90, priceOriginal: 339.90 },
          { id: "varanda",          name: "Pintura de varanda",                   price: 89.90, priceOriginal: 99.90 },
          { id: "portao",           name: "Pintura de portão",                    price: 59.90, priceOriginal: 66.90 },
        ],
      },
      {
        id: "complementar", nome: "Complementar", icon: "🖌️",
        services: [
          { id: "porta",            name: "Pintura de porta (cada)",              price: 24.90, priceOriginal: 27.90 },
          { id: "janela",           name: "Pintura de janela (cada)",             price: 34.90, priceOriginal: 38.90 },
          { id: "radiador",         name: "Pintura de radiador (cada)",           price: 19.90, priceOriginal: 22.90 },
          { id: "verniz",           name: "Aplicação de verniz de madeira",       price: 49.90, priceOriginal: 55.90 },
        ],
      },
      {
        id: "preparacao", nome: "Preparação e retoque", icon: "🔨",
        services: [
          { id: "buracos",          name: "Reparação de buracos e fissuras",      price: 24.90, priceOriginal: 27.90 },
          { id: "prep-paredes",     name: "Preparação de paredes (lixar, primário)", price: 19.90, priceOriginal: 22.90 },
          { id: "retoque-pintura",  name: "Retoque de pintura (1h)",              price: 29.90, priceOriginal: 33.90 },
        ],
      },
    ],
  },
  {
    id: "eletrica",
    nome: "Elétrica",
    slug: "eletrica",
    icon: ZapIcon,
    emoji: "⚡",
    tagline: "Casa segura, energia controlada",
    hero: "Electricistas certificados — segurança em primeiro lugar.",
    color: "#EAB308",
    personalizadoRate: 49.90,
    personalizadoRateOriginal: 55.90,
    subcategorias: [
      {
        id: "instalacoes", nome: "Pequenas instalações", icon: "🔌",
        services: [
          { id: "tomada-subst",     name: "Substituição de tomada",               price: 19.90, priceOriginal: 22.90, popular: true },
          { id: "interruptor",      name: "Substituição de interruptor",          price: 19.90, priceOriginal: 22.90 },
          { id: "tomada-nova",      name: "Instalação de tomada nova",            price: 39.90, priceOriginal: 44.90 },
          { id: "ponto-luz",        name: "Instalação de ponto de luz",           price: 44.90, priceOriginal: 49.90 },
        ],
      },
      {
        id: "reparacoes", nome: "Reparações", icon: "🔧",
        services: [
          { id: "diagnostico",      name: "Diagnóstico eléctrico",                price: 39.90, priceOriginal: 44.90 },
          { id: "quadro",           name: "Reparar quadro eléctrico",             price: 63.50, priceOriginal: 71.90, popular: true },
          { id: "disjuntor",        name: "Substituir disjuntor",                 price: 29.90, priceOriginal: 33.90 },
          { id: "curto",            name: "Reparação de curto-circuito",          price: 49.90, priceOriginal: 55.90 },
        ],
      },
      {
        id: "iluminacao", nome: "Iluminação", icon: "💡",
        services: [
          { id: "candeeiro",        name: "Instalação de candeeiro",              price: 29.90, priceOriginal: 33.90 },
          { id: "aplique",          name: "Instalação de aplique",                price: 24.90, priceOriginal: 27.90 },
          { id: "led",              name: "Instalação de iluminação LED",         price: 34.90, priceOriginal: 38.90, eco: true },
          { id: "calha-led",        name: "Instalação de calha LED",              price: 39.90, priceOriginal: 44.90, eco: true },
        ],
      },
      {
        id: "smart-home", nome: "Smart home", icon: "📱",
        services: [
          { id: "videoporteiro",    name: "Instalação de videoporteiro",          price: 59.90, priceOriginal: 66.90 },
          { id: "sensor",           name: "Instalação de sensor de presença",     price: 44.90, priceOriginal: 49.90 },
          { id: "smart-tomada",     name: "Instalação de tomada inteligente",     price: 24.90, priceOriginal: 27.90 },
          { id: "smart-luz",        name: "Instalação de iluminação inteligente", price: 44.90, priceOriginal: 49.90 },
        ],
      },
    ],
  },
  {
    id: "canalizacao",
    nome: "Canalização",
    slug: "canalizacao",
    icon: Droplets,
    emoji: "🚿",
    tagline: "Sem fugas, sem stress",
    hero: "Canalizadores verificados — garantia de 90 dias.",
    color: "#0EA5E9",
    personalizadoRate: 44.91,
    personalizadoRateOriginal: 49.90,
    subcategorias: [
      {
        id: "autoclismo", nome: "Autoclismo e sanita", icon: "🚽",
        services: [
          { id: "auto-repair",     name: "Reparação de autoclismo",                price: 36.46, priceOriginal: 42.90, popular: true },
          { id: "auto-install",    name: "Instalação de autoclismo",               price: 30.43, priceOriginal: 32.90 },
          { id: "seat-repair",     name: "Reparar tampo de sanita",                price: 27.65, priceOriginal: 29.90 },
          { id: "seat-replace",    name: "Substituir tampo de sanita",             price: 29.25, priceOriginal: 32.50 },
          { id: "toilet-replace",  name: "Substituir sanita",                      price: 79.11, priceOriginal: 87.90 },
          { id: "toilet-install",  name: "Instalar sanita",                        price: 57.15, priceOriginal: 63.50 },
          { id: "toilet-unclog",   name: "Desentupir sanita",                      price: 105.75, priceOriginal: 117.50 },
        ],
      },
      {
        id: "torneiras", nome: "Torneiras", icon: "🚰",
        services: [
          { id: "bath-tap-repair", name: "Reparar torneira de casa de banho",      price: 35.55, priceOriginal: 39.50 },
          { id: "sink-tap-repair", name: "Reparar torneira de lava-loiça",         price: 35.55, priceOriginal: 39.50 },
          { id: "sink-tap-replace",name: "Substituir torneira de lavatório",       price: 29.61, priceOriginal: 32.90 },
          { id: "kitchen-tap-eff", name: "Substituir torneira lava-loiça (Eco)",   price: 39.15, priceOriginal: 43.50, eco: true },
          { id: "safety-tap",      name: "Substituir torneira de segurança",       price: 18.40, priceOriginal: 19.90 },
        ],
      },
      {
        id: "fugas", nome: "Fugas e diagnósticos", icon: "💧",
        services: [
          { id: "leak-diagnosis",  name: "Diagnóstico de fuga de água",            price: 35.55, priceOriginal: 39.50 },
          { id: "kitchen-leak",    name: "Fuga de água no lava-loiça",             price: 42.21, priceOriginal: 46.90, popular: true },
          { id: "sink-leak",       name: "Fuga de água no lavatório",              price: 40.37, priceOriginal: 42.50 },
        ],
      },
      {
        id: "desentupimentos", nome: "Desentupimentos", icon: "🌊",
        services: [
          { id: "kitchen-unclog",  name: "Desentupir lava-loiça",                  price: 70.97, priceOriginal: 83.50 },
          { id: "bathroom-unclog", name: "Desentupir casa de banho",               price: 83.25, priceOriginal: 92.50 },
        ],
      },
      {
        id: "duche", nome: "Duche e banheira", icon: "🚿",
        services: [
          { id: "shower-column",   name: "Substituir coluna de duche",             price: 43.11,  priceOriginal: 47.90 },
          { id: "shower-head-eff", name: "Substituir chuveiro (Eco)",              price: 35.01,  priceOriginal: 38.90, eco: true },
          { id: "shower-cabin",    name: "Substituir cabine de duche",             price: 227.66, priceOriginal: 233.50 },
          { id: "tub-to-shower",   name: "Substituir banheira por duche",          price: 2084.50, priceOriginal: null },
        ],
      },
    ],
  },
  {
    id: "pos-obra",
    nome: "Pós-Obra",
    slug: "pos-obra",
    icon: Building2,
    emoji: "🏗️",
    tagline: "Do entulho ao brilho, tratamos de tudo",
    hero: "A sua obra terminada — deixe connosco o fecho perfeito.",
    color: "#EA580C",
    personalizadoRate: 19.90,
    personalizadoRateOriginal: 22.90,
    subcategorias: [
      {
        id: "limpeza-obra", nome: "Limpeza pós-obra", icon: "🧹",
        services: [
          { id: "obra-t1",          name: "Limpeza pós-obra T1",                  price: 149.90, priceOriginal: 169.90 },
          { id: "obra-t2",          name: "Limpeza pós-obra T2",                  price: 199.90, priceOriginal: 226.90, popular: true },
          { id: "obra-t3",          name: "Limpeza pós-obra T3",                  price: 279.90, priceOriginal: 316.90 },
          { id: "tinta-vidros",     name: "Remoção de tinta de vidros",           price: 29.90, priceOriginal: 33.90 },
          { id: "polimento",        name: "Polimento de pavimento",               price: 89.90, priceOriginal: 99.90 },
        ],
      },
      {
        id: "remocao", nome: "Remoção de entulho", icon: "📦",
        services: [
          { id: "entulho-peq",      name: "Remoção de entulho pequeno (1m³)",     price: 49.90, priceOriginal: 55.90 },
          { id: "entulho-med",      name: "Remoção de entulho médio (3m³)",       price: 99.90, priceOriginal: 113.90 },
          { id: "entulho-grd",      name: "Remoção de entulho grande (5m³)",      price: 199.90, priceOriginal: 226.90 },
        ],
      },
      {
        id: "acabamentos", nome: "Acabamentos", icon: "🔨",
        services: [
          { id: "silicone",         name: "Silicone de banheira e duche",         price: 29.90, priceOriginal: 33.90 },
          { id: "juntas-pos-obra",  name: "Encerramento de juntas",               price: 39.90, priceOriginal: 44.90 },
          { id: "rodapes",          name: "Fixação de rodapés",                   price: 19.90, priceOriginal: 22.90 },
          { id: "calafet",          name: "Calafetagem",                          price: 34.90, priceOriginal: 38.90 },
        ],
      },
    ],
  },
];

// Shortcut para buscar categoria por id
const getCategory = (id) => CATEGORIES.find(c => c.id === id);

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════
function eur(n) { return `€${n.toFixed(2).replace(".", ",")}`; }

function fmtDate(d) {
  const months = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function getDays() {
  const dayNames = ["Domingo","Segunda","Terça","Quarta","Quinta","Sexta","Sábado"];
  const today = new Date();
  const days = [];
  for (let i = 0; i < 5; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const label = i === 0 ? "Hoje" : i === 1 ? "Amanhã" : dayNames[d.getDay()];
    days.push({
      id: i === 0 ? "hoje" : i === 1 ? "amanha" : `d${i}`,
      label, date: fmtDate(d),
      extra: i === 0 ? HOJE_FEE : 0, dateObj: d,
    });
  }
  return days;
}

function isSlotBookable(dayId, time, now = new Date()) {
  if (dayId !== "hoje") return true;
  const [h, m] = time.split(":").map(Number);
  const slotTime = new Date(now);
  slotTime.setHours(h, m, 0, 0);
  const earliest = new Date(now.getTime() + BOOKING_BUFFER_MIN * 60000);
  return slotTime >= earliest;
}

function hasAvailableSlotsToday(now = new Date()) {
  return TIMESLOTS.some(t => isSlotBookable("hoje", t, now));
}

// ═══════════════════════════════════════════════════════════════════
// UI PRIMITIVES
// ═══════════════════════════════════════════════════════════════════

function Shell({ children }) {
  return (
    <div style={{
      maxWidth: 440, margin: "0 auto", minHeight: "100vh",
      background: C.cream,
      fontFamily: "'Outfit', -apple-system, BlinkMacSystemFont, sans-serif",
      color: C.ink, display: "flex", flexDirection: "column", position: "relative",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Outfit:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; background: ${C.forestDeep}; }
        button { font-family: inherit; }
        .serif { font-family: 'Fraunces', Georgia, serif; font-optical-sizing: auto; letter-spacing: -0.01em; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes fadeIn  { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
      {children}
    </div>
  );
}

function TopBar({ onBack, title, subtitle, onClose, trailing }) {
  return (
    <div style={{
      position: "sticky", top: 0, background: C.cream, zIndex: 20,
      padding: "14px 18px 12px", borderBottom: `1px solid ${C.line}`,
      display: "flex", alignItems: "center", gap: 12,
    }}>
      {onBack && (
        <button onClick={onBack} style={{
          width: 36, height: 36, borderRadius: 999,
          background: "transparent", border: `1px solid ${C.line}`,
          display: "grid", placeItems: "center", cursor: "pointer", color: C.ink,
        }}>
          <ArrowLeft size={18} />
        </button>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="serif" style={{
          fontSize: 17, fontWeight: 600, letterSpacing: -0.2,
          textAlign: onClose ? "center" : "left",
        }}>{title}</div>
        {subtitle && <div style={{ fontSize: 12, color: C.stone, marginTop: 1 }}>{subtitle}</div>}
      </div>
      {trailing}
      {onClose && (
        <button onClick={onClose} style={{
          width: 36, height: 36, borderRadius: 999,
          background: "transparent", border: `1px solid ${C.line}`,
          display: "grid", placeItems: "center", cursor: "pointer", color: C.ink,
        }}>
          <X size={18} />
        </button>
      )}
    </div>
  );
}

function PrimaryButton({ children, onClick, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      width: "100%",
      background: disabled ? C.stoneLight : C.emerald,
      color: disabled ? C.stone : C.paper,
      border: "none", borderRadius: 14, padding: "16px",
      fontSize: 15, fontWeight: 600,
      cursor: disabled ? "not-allowed" : "pointer", letterSpacing: 0.1,
      boxShadow: disabled ? "none" : `0 8px 24px -10px ${C.emerald}`,
    }}>{children}</button>
  );
}

function StickyCTA({ children, banner }) {
  return (
    <div style={{
      position: "sticky", bottom: 0, zIndex: 15, marginTop: "auto", background: C.cream,
    }}>
      {banner && (
        <div style={{
          background: C.forest, color: C.paper,
          padding: "10px 18px", fontSize: 12.5, fontWeight: 500, textAlign: "center",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
        }}>
          <Tag size={13} color={C.emeraldBright} />
          {banner}
        </div>
      )}
      <div style={{ padding: "14px 18px 20px" }}>{children}</div>
    </div>
  );
}

function ValueRow({ icon: Icon, title, desc }) {
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
      <div style={{
        width: 36, height: 36, flexShrink: 0, borderRadius: 10,
        background: C.emeraldPale, color: C.emerald,
        display: "grid", placeItems: "center",
      }}>
        <Icon size={18} />
      </div>
      <div style={{ flex: 1, paddingTop: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: C.ink }}>{title}</div>
        <div style={{ fontSize: 12.5, color: C.stone, marginTop: 3, lineHeight: 1.45 }}>{desc}</div>
      </div>
    </div>
  );
}

function Chip({ children, icon: Icon, tone = "default" }) {
  const styles = {
    default:  { bg: C.paper,        fg: C.ink,          border: C.line },
    emerald:  { bg: C.emeraldSoft,  fg: C.emeraldDark,  border: C.emeraldSoft },
    eco:      { bg: "#E8F5EE",      fg: "#2D7A5F",      border: "#E8F5EE" },
    amber:    { bg: C.amberSoft,    fg: "#92400E",      border: C.amberSoft },
    discount: { bg: C.discountSoft, fg: C.discount,     border: C.discountSoft },
  }[tone];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "3px 9px", borderRadius: 999,
      background: styles.bg, color: styles.fg, border: `1px solid ${styles.border}`,
      fontSize: 11, fontWeight: 600, letterSpacing: 0.2, whiteSpace: "nowrap",
    }}>
      {Icon && <Icon size={11} />}
      {children}
    </span>
  );
}

function PriceTag({ price, priceOriginal, size = "md" }) {
  const sz = { sm: { c: 15, o: 11 }, md: { c: 17, o: 12 }, lg: { c: 22, o: 13 } }[size];
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
      {priceOriginal && priceOriginal > price && (
        <span style={{ fontSize: sz.o, color: C.stone, textDecoration: "line-through" }}>
          {eur(priceOriginal)}
        </span>
      )}
      <span className="serif" style={{ fontSize: sz.c, fontWeight: 600, color: C.forest }}>
        {eur(price)}
      </span>
    </div>
  );
}

function Divisor() {
  return (
    <div style={{
      height: 8, background: C.cream, margin: "20px 0",
      borderTop: `1px solid ${C.line}`, borderBottom: `1px solid ${C.line}`,
    }} />
  );
}

// ───── Secções de detalhe do serviço (Inclui / Não inclui / FAQ) ─────
function DetailSection({ title, icon: Icon, iconColor, children }) {
  return (
    <div style={{ marginTop: 22 }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 8, marginBottom: 12,
      }}>
        {Icon && (
          <div style={{
            width: 24, height: 24, borderRadius: 6,
            background: `${iconColor}15`, color: iconColor,
            display: "grid", placeItems: "center",
          }}>
            <Icon size={14} />
          </div>
        )}
        <div className="serif" style={{ fontSize: 15, fontWeight: 600, color: C.ink }}>
          {title}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {children}
      </div>
    </div>
  );
}

function DetailItem({ icon: Icon, iconColor, children }) {
  return (
    <div style={{
      display: "flex", gap: 10, alignItems: "flex-start",
      fontSize: 13, lineHeight: 1.45, color: C.ink,
    }}>
      {Icon && (
        <Icon size={14} color={iconColor} style={{ flexShrink: 0, marginTop: 3 }} />
      )}
      <div style={{ flex: 1 }}>{children}</div>
    </div>
  );
}

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{
      border: `1px solid ${C.line}`, borderRadius: 10, overflow: "hidden",
      background: C.paper,
    }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: "100%", padding: "12px 14px",
          background: "transparent", border: "none", cursor: "pointer",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          gap: 10, textAlign: "left",
          fontSize: 13, fontWeight: 600, color: C.ink,
          fontFamily: "inherit",
        }}
      >
        <span style={{ flex: 1 }}>{q}</span>
        <ChevronRight
          size={16} color={C.stone}
          style={{ transform: open ? "rotate(90deg)" : "none", transition: "transform 0.15s" }}
        />
      </button>
      {open && (
        <div style={{
          padding: "0 14px 14px",
          fontSize: 13, lineHeight: 1.5, color: C.stone,
        }}>
          {a}
        </div>
      )}
    </div>
  );
}

// ───── Opções dinâmicas do serviço (produtos, frequência) ─────

// Templates de frequência — cada serviço aplicável aponta à sua em frequencyTemplate
const FREQUENCY_TEMPLATES = {
  // Limpeza doméstica regular
  cln_home: [
    { id: "pontual",          label: "Pontual",                      hint: "1 visita apenas",                  multiplier: 1,    discount: 0,    suffix: "" },
    { id: "mensal",           label: "Plano mensal (4 visitas/mês)", hint: "Mesma técnica sempre · −15%",      multiplier: 4,    discount: 0.15, suffix: "/mês" },
    { id: "mensal-profunda",  label: "Mensal + profunda trimestral", hint: "4 regulares + 1 profunda/3 meses", multiplier: 4.33, discount: 0.12, suffix: "/mês", includesDeep: true },
  ],

  // Limpezas ocasionais recorrentes (casa de banho profunda, forno, frigo)
  cln_occasional: [
    { id: "pontual",    label: "Pontual",      hint: "1 visita apenas",                 multiplier: 1, discount: 0,    suffix: "" },
    { id: "trimestral", label: "Trimestral",   hint: "1 visita cada 3 meses · −10%",    multiplier: 1, discount: 0.10, suffix: "/visita", perVisit: true },
    { id: "semestral",  label: "Semestral",    hint: "1 visita cada 6 meses · −5%",     multiplier: 1, discount: 0.05, suffix: "/visita", perVisit: true },
  ],

  // Limpeza de escritório — pode ser muito frequente
  cln_office: [
    { id: "pontual",   label: "Pontual",    hint: "1 visita apenas",          multiplier: 1, discount: 0,    suffix: "" },
    { id: "semanal",   label: "Semanal",    hint: "4 visitas/mês · −20%",     multiplier: 4, discount: 0.20, suffix: "/mês" },
    { id: "quinzenal", label: "Quinzenal",  hint: "2 visitas/mês · −15%",     multiplier: 2, discount: 0.15, suffix: "/mês" },
    { id: "mensal",    label: "Mensal",     hint: "1 visita/mês · −10%",      multiplier: 1, discount: 0.10, suffix: "/mês" },
  ],

  // Corte de relva — muito sazonal, alta frequência possível
  jardim_corte: [
    { id: "pontual",   label: "Pontual",    hint: "1 corte apenas",          multiplier: 1, discount: 0,    suffix: "" },
    { id: "semanal",   label: "Semanal",    hint: "4 cortes/mês · −15%",     multiplier: 4, discount: 0.15, suffix: "/mês" },
    { id: "quinzenal", label: "Quinzenal",  hint: "2 cortes/mês · −12%",     multiplier: 2, discount: 0.12, suffix: "/mês" },
    { id: "mensal",    label: "Mensal",     hint: "1 corte/mês · −8%",       multiplier: 1, discount: 0.08, suffix: "/mês" },
  ],

  // Sazonal (sebes, ervas daninhas) — 2x/ano típico
  sazonal_cut: [
    { id: "pontual",   label: "Pontual",    hint: "1 visita apenas",            multiplier: 1, discount: 0,    suffix: "" },
    { id: "semestral", label: "Semestral",  hint: "2 visitas/ano · −10%",       multiplier: 1, discount: 0.10, suffix: "/visita", perVisit: true },
    { id: "anual",     label: "Anual",      hint: "1 visita/ano · −5%",         multiplier: 1, discount: 0.05, suffix: "/visita", perVisit: true },
  ],

  // Serviços já mensais — gradação de compromisso (jar-maint, pol-maint)
  plano_gradual: [
    { id: "mensal",     label: "Mensal",       hint: "Sem compromisso",                           multiplier: 1, discount: 0,    suffix: "/mês" },
    { id: "trimestral", label: "Trimestral",   hint: "3 meses comprometidos · −3%",               multiplier: 1, discount: 0.03, suffix: "/mês" },
    { id: "semestral",  label: "Semestral",    hint: "6 meses comprometidos · −6%",               multiplier: 1, discount: 0.06, suffix: "/mês" },
    { id: "anual",      label: "Plano anual",  hint: "12 meses · −10% · prioridade na agenda",    multiplier: 1, discount: 0.10, suffix: "/mês" },
  ],

  // Piscina química — alta frequência no verão
  piscina_quimica: [
    { id: "pontual",   label: "Pontual",    hint: "1 tratamento apenas",            multiplier: 1, discount: 0,    suffix: "" },
    { id: "quinzenal", label: "Quinzenal",  hint: "2 tratamentos/mês · −12%",       multiplier: 2, discount: 0.12, suffix: "/mês" },
    { id: "mensal",    label: "Mensal",     hint: "1 tratamento/mês · −8%",         multiplier: 1, discount: 0.08, suffix: "/mês" },
  ],

  // Serviços anuais por natureza (AC, esquentador, escarificação) — pontual ou plano anual
  manutencao_anual: [
    { id: "pontual", label: "Pontual",      hint: "1 visita apenas",                                    multiplier: 1, discount: 0,    suffix: "" },
    { id: "anual",   label: "Plano anual",  hint: "12 meses · lembrete automático · −10% · prioridade", multiplier: 1, discount: 0.10, suffix: "/visita", perVisit: true },
  ],
};

const PRODUCTS_OPTIONS = [
  { id: "cliente",  label: "Eu forneço produtos e materiais", hint: "Detergentes, panos e sacos seus",  extra: 0 },
  { id: "tecnica",  label: "Técnica traz produtos",            hint: "Profissional, não precisa preparar nada" }, // preço de extra vem de service.productsExtraPrice
];

function getFrequencyOptions(service, parent) {
  const templateKey = (parent || service)?.frequencyTemplate;
  if (!templateKey || !FREQUENCY_TEMPLATES[templateKey]) return null;
  return FREQUENCY_TEMPLATES[templateKey];
}

function calcDynamicPrice(basePrice, productsId, frequencyId, productsExtra, deepPrice, frequencyOptions) {
  const prodExtra = productsId === "tecnica" ? (productsExtra || 0) : 0;
  if (!frequencyOptions) return basePrice + prodExtra;
  const freq = frequencyOptions.find(f => f.id === frequencyId);
  if (!freq) return basePrice + prodExtra;

  // Per-visita: preço é apenas base × (1-desc), não multiplicado
  if (freq.perVisit) {
    return (basePrice + prodExtra) * (1 - freq.discount);
  }

  // Mensal: base × multiplicador × (1-desconto)
  let total = (basePrice + prodExtra) * freq.multiplier * (1 - freq.discount);
  if (freq.includesDeep && deepPrice) {
    total += (deepPrice / 3) * (1 - freq.discount);
  }
  return total;
}

function OptionRow({ selected, label, hint, priceLabel, onClick, accent }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: selected ? `${accent}08` : C.paper,
        border: `2px solid ${selected ? accent : C.line}`,
        borderRadius: 12, padding: "12px 14px",
        display: "flex", alignItems: "center", gap: 12,
        cursor: "pointer", textAlign: "left", width: "100%",
        transition: "all 0.15s",
      }}
    >
      <div style={{
        width: 18, height: 18, borderRadius: 999,
        border: `2px solid ${selected ? accent : C.stoneLight}`,
        background: selected ? accent : "transparent",
        display: "grid", placeItems: "center", flexShrink: 0,
      }}>
        {selected && <Check size={10} color={C.paper} strokeWidth={3} />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: C.ink, lineHeight: 1.3 }}>
          {label}
        </div>
        {hint && (
          <div style={{ fontSize: 11.5, color: C.stone, marginTop: 3, lineHeight: 1.3 }}>
            {hint}
          </div>
        )}
      </div>
      {priceLabel && (
        <div style={{ fontSize: 12.5, fontWeight: 600, color: accent, flexShrink: 0 }}>
          {priceLabel}
        </div>
      )}
    </button>
  );
}

function OptionsSection({ service, parent, productsId, setProductsId, frequencyId, setFrequencyId, accent }) {
  // Props vindas do grupo-pai (quando existe) para saber se tem opções
  const src = parent || service;
  const frequencyOptions = getFrequencyOptions(service, parent);
  const hasFrequency = !!frequencyOptions;
  if (!src.hasProductsOption && !hasFrequency) return null;

  return (
    <div style={{ marginTop: 22 }}>
      <div className="serif" style={{ fontSize: 15, fontWeight: 600, color: C.ink, marginBottom: 12 }}>
        Opções
      </div>

      {src.hasProductsOption && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, color: C.stone, marginBottom: 8, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.3 }}>
            Produtos e materiais
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {PRODUCTS_OPTIONS.map(opt => (
              <OptionRow
                key={opt.id}
                selected={productsId === opt.id}
                onClick={() => setProductsId(opt.id)}
                label={opt.label}
                hint={opt.hint}
                priceLabel={opt.id === "tecnica" && src.productsExtraPrice
                  ? `+${`€${src.productsExtraPrice.toFixed(2).replace(".", ",")}`}`
                  : null}
                accent={accent}
              />
            ))}
          </div>
        </div>
      )}

      {hasFrequency && (
        <div>
          <div style={{ fontSize: 12, color: C.stone, marginBottom: 8, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.3 }}>
            Frequência
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {frequencyOptions.map(opt => (
              <OptionRow
                key={opt.id}
                selected={frequencyId === opt.id}
                onClick={() => setFrequencyId(opt.id)}
                label={opt.label}
                hint={opt.hint}
                priceLabel={opt.discount > 0 ? `−${Math.round(opt.discount * 100)}%` : null}
                accent={accent}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// ECRÃ HOME
// ═══════════════════════════════════════════════════════════════════

function HomeScreen({ onSelectCategory }) {
  const team = [
    { initials: "AF", name: "António Ferreira", specialty: "Canalização · Elétrica", rating: 4.9 },
    { initials: "RG", name: "Ricardo Gomes",    specialty: "Manutenção · Pintura",   rating: 5.0 },
    { initials: "SM", name: "Sandra Matos",     specialty: "Limpeza · Pós-obra",     rating: 4.9 },
  ];

  return (
    <Shell>
      {/* Hero verde escuro */}
      <div style={{
        background: `linear-gradient(135deg, ${C.forestDeep} 0%, ${C.forest} 100%)`,
        color: C.paper,
        padding: "16px 18px 28px",
        position: "relative", overflow: "hidden",
      }}>
        {/* Decoração circular */}
        <div style={{
          position: "absolute", right: -60, top: -60,
          width: 220, height: 220, borderRadius: 999,
          background: `radial-gradient(circle, ${C.emerald} 0%, transparent 70%)`,
          opacity: 0.2, pointerEvents: "none",
        }} />

        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", gap: 10, marginBottom: 24,
          position: "relative",
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 999,
            background: C.emerald, color: C.paper,
            display: "grid", placeItems: "center",
            fontSize: 13, fontWeight: 700,
          }}>M</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600 }}>Maria Santos</div>
            <div style={{ fontSize: 11, opacity: 0.65 }}>cliente</div>
          </div>
          <button style={{
            width: 36, height: 36, borderRadius: 999,
            background: "rgba(255,255,255,0.1)", border: "none",
            color: C.paper, display: "grid", placeItems: "center", cursor: "pointer",
          }}>
            <Bell size={16} />
          </button>
        </div>

        {/* Badge rede */}
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          color: C.emeraldBright,
          fontSize: 10, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase",
          marginBottom: 12, position: "relative",
        }}>
          <Lock size={11} /> Rede de confiança — Técnicos nominais
        </div>

        {/* Título */}
        <div className="serif" style={{
          fontSize: 30, fontWeight: 500, lineHeight: 1.1, letterSpacing: -0.5,
          marginBottom: 8, position: "relative",
        }}>
          A sua equipa,<br/>
          <span style={{ color: C.emeraldBright, fontStyle: "italic" }}>sempre a mesma.</span>
        </div>

        <div style={{
          fontSize: 13, opacity: 0.8, marginBottom: 18, position: "relative",
        }}>
          Técnico fixo. Relatório fotográfico. Preço garantido.
        </div>

        {/* Search com assistente IA (stub visual) */}
        <div style={{
          display: "flex", gap: 8, position: "relative",
        }}>
          <div style={{
            flex: 1, display: "flex", alignItems: "center", gap: 10,
            background: C.paper, borderRadius: 14,
            padding: "12px 16px",
          }}>
            <Search size={16} color={C.stone} />
            <input
              placeholder="Como podemos ajudar?"
              style={{
                flex: 1, border: "none", outline: "none", background: "transparent",
                fontSize: 13.5, fontFamily: "inherit", color: C.ink,
              }}
            />
            <button
              title="Assistente IA — em breve"
              onClick={(e) => {
                e.stopPropagation();
                alert("Assistente IA — em breve!\n\nDescreva o que precisa por palavras suas e nós sugerimos os serviços certos do catálogo.");
              }}
              style={{
                width: 28, height: 28, borderRadius: 8,
                background: `linear-gradient(135deg, ${C.emerald} 0%, ${C.emeraldBright} 100%)`,
                color: C.paper, border: "none", cursor: "pointer",
                display: "grid", placeItems: "center",
                flexShrink: 0,
              }}
            >
              <Sparkles size={14} />
            </button>
          </div>
        </div>

        {/* Stats */}
        <div style={{
          display: "flex", gap: 14, marginTop: 14, position: "relative",
          fontSize: 12, fontWeight: 600,
        }}>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <Star size={13} fill={C.amber} color={C.amber} /> 4.9/5
          </span>
          <span style={{ opacity: 0.4 }}>·</span>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <Check size={13} color={C.emeraldBright} /> +500 serviços
          </span>
          <span style={{ opacity: 0.4 }}>·</span>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <Lock size={13} color={C.emeraldBright} /> Técnico fixo
          </span>
        </div>
      </div>

      {/* Grid de categorias */}
      <div style={{ padding: "24px 18px 0" }}>
        <div className="serif" style={{
          fontSize: 20, fontWeight: 600, marginBottom: 14, letterSpacing: -0.2,
        }}>
          O que precisa?
        </div>
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8,
        }}>
          {CATEGORIES.map(cat => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                onClick={() => onSelectCategory(cat.id)}
                style={{
                  background: C.paper,
                  border: `1px solid ${C.line}`, borderRadius: 14,
                  padding: "14px 6px", cursor: "pointer",
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
                  transition: "all 0.15s",
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = C.emerald;
                  e.currentTarget.style.transform = "translateY(-1px)";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = C.line;
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: `${cat.color}15`, color: cat.color,
                  display: "grid", placeItems: "center",
                }}>
                  <Icon size={20} />
                </div>
                <div style={{
                  fontSize: 11, fontWeight: 600, color: C.ink,
                  textAlign: "center", lineHeight: 1.15,
                }}>
                  {cat.nome}
                </div>
              </button>
            );
          })}
        </div>

        {/* CTA Personalizado — para quem não sabe classificar o pedido */}
        <button
          onClick={() => onSelectCategory("__personalizado__")}
          style={{
            width: "100%", marginTop: 16,
            background: `linear-gradient(135deg, ${C.forest} 0%, ${C.forestSoft} 100%)`,
            color: C.paper, border: "none", borderRadius: 14,
            padding: "14px 16px",
            display: "flex", alignItems: "center", gap: 12,
            cursor: "pointer",
            boxShadow: `0 2px 8px ${C.forest}20`,
            textAlign: "left",
          }}
        >
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: `linear-gradient(135deg, ${C.emerald} 0%, ${C.emeraldBright} 100%)`,
            display: "grid", placeItems: "center", flexShrink: 0,
          }}>
            <Sparkles size={20} color={C.paper} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 2 }}>
              Não encontra o que procura?
            </div>
            <div style={{ fontSize: 11.5, opacity: 0.8 }}>
              Descreva o trabalho — enviamos o técnico certo
            </div>
          </div>
          <ChevronRight size={18} color={C.paper} style={{ opacity: 0.7 }} />
        </button>
      </div>

      {/* A nossa equipa */}
      <div style={{ padding: "28px 18px 24px" }}>
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "baseline",
          marginBottom: 14,
        }}>
          <div className="serif" style={{ fontSize: 20, fontWeight: 600, letterSpacing: -0.2 }}>
            A nossa equipa
          </div>
          <span style={{ fontSize: 12, color: C.emerald, fontWeight: 600, cursor: "pointer" }}>
            Ver todos →
          </span>
        </div>
        <div className="no-scrollbar" style={{
          display: "flex", gap: 10, overflowX: "auto",
          paddingBottom: 4, marginRight: -18, paddingRight: 18,
        }}>
          {team.map(member => (
            <div key={member.initials} style={{
              flex: "0 0 140px",
              background: C.paper, border: `1px solid ${C.line}`,
              borderRadius: 14, padding: 14, textAlign: "center",
            }}>
              <div style={{
                width: 56, height: 56, borderRadius: 999,
                background: C.emerald, color: C.paper,
                display: "grid", placeItems: "center", margin: "0 auto",
                fontSize: 17, fontWeight: 700,
              }}>
                {member.initials}
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, marginTop: 10 }}>{member.name}</div>
              <div style={{ fontSize: 10.5, color: C.stone, marginTop: 4, lineHeight: 1.3, height: 28 }}>
                {member.specialty}
              </div>
              <div style={{ display: "flex", justifyContent: "center", gap: 2, marginTop: 6 }}>
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={10} fill={C.amber} color={C.amber} />
                ))}
              </div>
              <div style={{ fontSize: 11, color: C.stone, marginTop: 2 }}>{member.rating}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom nav com FAB central para pedido personalizado rápido */}
      <div style={{
        marginTop: "auto",
        background: C.paper,
        borderTop: `1px solid ${C.line}`,
        position: "relative",
      }}>
        {/* FAB central — elevado acima da barra */}
        <button
          onClick={() => onSelectCategory("__personalizado__")}
          aria-label="Pedido personalizado"
          style={{
            position: "absolute",
            top: -22, left: "50%", transform: "translateX(-50%)",
            width: 56, height: 56, borderRadius: 999,
            background: `linear-gradient(135deg, ${C.emerald} 0%, ${C.emeraldBright} 100%)`,
            border: `4px solid ${C.paper}`,
            color: C.paper, cursor: "pointer",
            display: "grid", placeItems: "center",
            boxShadow: `0 4px 12px ${C.emerald}55, 0 2px 4px ${C.ink}15`,
            zIndex: 2,
            transition: "transform 0.15s",
          }}
          onMouseEnter={e => e.currentTarget.style.transform = "translateX(-50%) translateY(-2px)"}
          onMouseLeave={e => e.currentTarget.style.transform = "translateX(-50%)"}
        >
          <Sparkles size={22} strokeWidth={2.4} />
        </button>

        {/* Barra de navegação */}
        <div style={{
          padding: "10px 18px 14px",
          display: "grid",
          gridTemplateColumns: "1fr 1fr 72px 1fr 1fr",
          gap: 4,
          alignItems: "end",
        }}>
          {[
            { icon: HomeIcon,      label: "Início",    active: true,  col: 1 },
            { icon: Compass,       label: "Explorar",  active: false, col: 2 },
            null, // espaço reservado do FAB
            { icon: ClipboardList, label: "Pedidos",   active: false, col: 4 },
            { icon: User,          label: "Perfil",    active: false, col: 5 },
          ].map((tab, i) => {
            if (!tab) return <div key="fab-spacer" />;
            const TabIcon = tab.icon;
            return (
              <button key={tab.label} style={{
                background: "transparent", border: "none", cursor: "pointer",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                padding: "6px 0", color: tab.active ? C.emerald : C.stone,
              }}>
                <TabIcon size={20} />
                <span style={{ fontSize: 10.5, fontWeight: tab.active ? 600 : 500 }}>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Label do FAB — fica por baixo, pequeno */}
        <div style={{
          position: "absolute",
          top: 38, left: "50%", transform: "translateX(-50%)",
          fontSize: 9.5, fontWeight: 600, color: C.emerald,
          whiteSpace: "nowrap", pointerEvents: "none",
          letterSpacing: 0.2,
        }}>
          Personalizado
        </div>
      </div>
    </Shell>
  );
}

// ═══════════════════════════════════════════════════════════════════
// BOTTOM SHEET (igual ao anterior)
// ═══════════════════════════════════════════════════════════════════

function BottomSheet({ title, onClose, children, footer }) {
  return (
    <>
      <div onClick={onClose} style={{
        position: "fixed", inset: 0, zIndex: 50, background: "rgba(7, 40, 25, 0.55)",
        animation: "fadeIn 0.2s ease", maxWidth: 440, margin: "0 auto",
      }} />
      <div style={{
        position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 51,
        maxWidth: 440, margin: "0 auto", background: C.cream,
        borderTopLeftRadius: 24, borderTopRightRadius: 24,
        maxHeight: "92vh", display: "flex", flexDirection: "column",
        animation: "slideUp 0.25s cubic-bezier(.2,.8,.2,1)",
        boxShadow: `0 -20px 60px -10px rgba(0,0,0,0.3)`,
      }}>
        <div style={{ height: 22, display: "grid", placeItems: "center", flexShrink: 0 }}>
          <div style={{ width: 36, height: 4, background: C.stoneLight, borderRadius: 999 }} />
        </div>
        <div style={{
          padding: "0 18px 12px", display: "flex", alignItems: "center", gap: 12,
          borderBottom: `1px solid ${C.line}`, flexShrink: 0,
        }}>
          <button onClick={onClose} style={{
            width: 34, height: 34, borderRadius: 999, background: "transparent",
            border: "none", cursor: "pointer", display: "grid", placeItems: "center", color: C.ink,
          }}><X size={18} /></button>
          <div className="serif" style={{
            flex: 1, fontSize: 17, fontWeight: 600, textAlign: "center", paddingRight: 34,
          }}>{title}</div>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 18px 0" }}>{children}</div>
        {footer && (
          <div style={{
            padding: "12px 18px 20px", borderTop: `1px solid ${C.line}`,
            background: C.cream, flexShrink: 0,
          }}>{footer}</div>
        )}
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MODAL — SELECIONAR DATA
// ═══════════════════════════════════════════════════════════════════

function ScheduleModal({ onClose, slots, onConfirm }) {
  const now = new Date();
  const DAYS = useMemo(() => getDays(), []);
  const todayAvailable = hasAvailableSlotsToday(now);

  const [activeDay, setActiveDay] = useState(() => {
    if (slots && slots.length > 0) return slots[0].day;
    return todayAvailable ? "hoje" : "amanha";
  });
  const [selected, setSelected] = useState(slots || []);

  const slotKey = (day, time) => `${day}|${time}`;
  const isSelected = (day, time) => selected.some(s => s.key === slotKey(day, time));

  const toggleSlot = (day, time) => {
    if (!isSlotBookable(day, time, now)) return;
    const key = slotKey(day, time);
    setSelected(prev => {
      if (prev.some(s => s.key === key)) return prev.filter(s => s.key !== key);
      if (prev.length >= 5) return prev;
      const dayObj = DAYS.find(d => d.id === day);
      return [...prev, { key, day, time, dayLabel: dayObj.label, dayDate: dayObj.date }];
    });
  };

  const footer = (
    <div>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        marginBottom: 10, padding: "0 4px",
      }}>
        <span style={{ fontSize: 13, color: C.ink, fontWeight: 500 }}>
          {selected.length === 0
            ? "Nenhum horário selecionado"
            : `${selected.length} horário${selected.length > 1 ? "s" : ""} selecionado${selected.length > 1 ? "s" : ""}`}
        </span>
        {selected.length > 0 && (
          <button onClick={() => setSelected([])} style={{
            background: "transparent", border: "none", cursor: "pointer",
            color: C.stone, fontSize: 13, fontWeight: 500, textDecoration: "underline",
          }}>Limpar tudo</button>
        )}
      </div>
      <PrimaryButton onClick={() => onConfirm(selected)} disabled={selected.length === 0}>
        Confirmar
      </PrimaryButton>
    </div>
  );

  return (
    <BottomSheet title="Selecionar data" onClose={onClose} footer={footer}>
      <div className="no-scrollbar" style={{
        display: "flex", gap: 0, overflowX: "auto",
        borderBottom: `1px solid ${C.line}`, marginBottom: 16,
      }}>
        {DAYS.map(d => {
          const isActive = activeDay === d.id;
          const daySlots = selected.filter(s => s.day === d.id).length;
          const isHojeDisabled = d.id === "hoje" && !todayAvailable;
          return (
            <button key={d.id}
              onClick={() => !isHojeDisabled && setActiveDay(d.id)}
              disabled={isHojeDisabled}
              style={{
                flex: "0 0 auto", padding: "10px 14px",
                background: "transparent", border: "none",
                borderBottom: `2px solid ${isActive ? C.forest : "transparent"}`,
                cursor: isHojeDisabled ? "not-allowed" : "pointer",
                textAlign: "left", minWidth: 92, opacity: isHojeDisabled ? 0.4 : 1,
              }}>
              <div style={{
                fontSize: 14, fontWeight: isActive ? 700 : 500,
                color: isActive ? C.ink : C.stone,
                display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap",
              }}>
                {d.label}
                {daySlots > 0 && (
                  <span style={{
                    background: C.emerald, color: C.paper,
                    fontSize: 10, fontWeight: 700,
                    minWidth: 16, height: 16, borderRadius: 999,
                    display: "inline-grid", placeItems: "center", padding: "0 4px",
                  }}>{daySlots}</span>
                )}
                {d.extra > 0 && (
                  <span style={{ fontSize: 10.5, color: C.amber, fontWeight: 600 }}>
                    +{eur(d.extra)}
                  </span>
                )}
              </div>
              <div style={{ fontSize: 11, color: C.stone, marginTop: 2 }}>{d.date}</div>
            </button>
          );
        })}
      </div>

      <div style={{
        background: C.emeraldPale, border: `1px solid ${C.emeraldSoft}`,
        borderRadius: 12, padding: "10px 12px",
        display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 16,
      }}>
        <Calendar size={16} color={C.emerald} style={{ flexShrink: 0, marginTop: 2 }} />
        <div style={{ fontSize: 12.5, color: C.forestSoft, lineHeight: 1.4 }}>
          Tem um horário flexível? Pode selecionar <strong>até 5 horários</strong> — aumenta a probabilidade de conseguir o técnico de preferência.
        </div>
      </div>

      {activeDay === "hoje" && !todayAvailable && (
        <div style={{
          background: C.amberSoft, border: `1px solid ${C.amber}`,
          borderRadius: 12, padding: "12px 14px", marginBottom: 16,
          display: "flex", gap: 10, alignItems: "flex-start",
        }}>
          <Info size={16} color={C.amber} style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={{ fontSize: 12.5, color: "#92400E", lineHeight: 1.4 }}>
            Sem horários disponíveis hoje. Escolha outro dia ou use <strong>Imediato</strong> para chegada em 30-40 min.
          </div>
        </div>
      )}

      <div style={{
        display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, paddingBottom: 16,
      }}>
        {TIMESLOTS.map(t => {
          const bookable = isSlotBookable(activeDay, t, now);
          const sel = isSelected(activeDay, t);
          const atLimit = selected.length >= 5 && !sel;
          const disabled = !bookable || atLimit;
          return (
            <button key={t}
              onClick={() => toggleSlot(activeDay, t)}
              disabled={disabled}
              style={{
                background: sel ? C.forest : C.paper,
                color: sel ? C.paper : !bookable ? C.stoneLight : atLimit ? C.stoneLight : C.ink,
                border: `1.5px solid ${sel ? C.forest : !bookable ? C.stoneLight : C.line}`,
                borderRadius: 10, padding: "10px 0",
                fontSize: 13, fontWeight: 600,
                cursor: disabled ? "not-allowed" : "pointer",
                opacity: !bookable ? 0.35 : atLimit ? 0.5 : 1,
                textDecoration: !bookable ? "line-through" : "none",
              }}
            >{t}</button>
          );
        })}
      </div>
    </BottomSheet>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MODAL — FOTOGRAFIAS E NOTAS
// ═══════════════════════════════════════════════════════════════════

function PhotosNotesModal({ onClose, notes, photos, onConfirm }) {
  const [localNotes, setLocalNotes] = useState(notes || "");
  const [localPhotos, setLocalPhotos] = useState(photos || []);

  const addPhoto = () => {
    if (localPhotos.length < 5) setLocalPhotos(p => [...p, { id: Date.now(), placeholder: true }]);
  };
  const removePhoto = (id) => setLocalPhotos(p => p.filter(x => x.id !== id));

  const footer = (
    <PrimaryButton onClick={() => onConfirm({ notes: localNotes, photos: localPhotos })}>
      Guardar
    </PrimaryButton>
  );

  return (
    <BottomSheet title="Fotografias e notas" onClose={onClose} footer={footer}>
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, color: C.ink, marginBottom: 6 }}>Fotografias</div>
        <div style={{ fontSize: 12.5, color: C.stone, marginBottom: 12, lineHeight: 1.4 }}>
          Adicione imagens para ajudar o técnico a preparar-se.
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
          {localPhotos.map(p => (
            <div key={p.id} style={{
              aspectRatio: "1", borderRadius: 12,
              background: C.emeraldPale, border: `1px solid ${C.emeraldSoft}`,
              display: "grid", placeItems: "center", position: "relative",
            }}>
              <FileImage size={24} color={C.emerald} />
              <button onClick={() => removePhoto(p.id)} style={{
                position: "absolute", top: 4, right: 4, width: 24, height: 24, borderRadius: 999,
                background: "rgba(0,0,0,0.6)", color: C.paper, border: "none", cursor: "pointer",
                display: "grid", placeItems: "center",
              }}><X size={12} /></button>
            </div>
          ))}
          {localPhotos.length < 5 && (
            <button onClick={addPhoto} style={{
              aspectRatio: "1", borderRadius: 12, background: C.paper,
              border: `1.5px dashed ${C.stoneLight}`,
              display: "grid", placeItems: "center", cursor: "pointer", color: C.stone,
            }}><Plus size={24} /></button>
          )}
        </div>
      </div>

      <div style={{ marginTop: 24 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: C.ink, marginBottom: 6 }}>Notas sobre o serviço</div>
        <div style={{ fontSize: 12.5, color: C.stone, marginBottom: 12, lineHeight: 1.4 }}>
          Adicione notas como os exemplos seguintes:
        </div>
        <div style={{
          background: C.paper, border: `1px solid ${C.line}`,
          borderRadius: 12, padding: 12, marginBottom: 12,
        }}>
          <ExampleLine>Se precisa que o técnico compre algum material</ExampleLine>
          <ExampleLine>Marca e modelo do aparelho avariado, e o erro que aparece</ExampleLine>
          <ExampleLine>Áreas específicas da casa que deseja que sejam intervencionadas</ExampleLine>
          <ExampleLine last>Instruções de acesso — porteiro, código do prédio, estacionamento</ExampleLine>
        </div>
        <textarea
          value={localNotes} onChange={e => setLocalNotes(e.target.value)} maxLength={200}
          placeholder="Ex: Torneira da cozinha pinga há 2 dias. Prédio com porteiro no R/C."
          style={{
            width: "100%", minHeight: 100, background: C.paper,
            border: `1px solid ${C.line}`, borderRadius: 12, padding: 14,
            fontSize: 13.5, fontFamily: "inherit", color: C.ink,
            resize: "vertical", outline: "none",
          }}
        />
      </div>
      <div style={{ height: 8 }} />
    </BottomSheet>
  );
}

function ExampleLine({ children, last }) {
  return (
    <div style={{
      display: "flex", gap: 8, alignItems: "flex-start",
      paddingBottom: last ? 0 : 8, marginBottom: last ? 0 : 8,
      borderBottom: last ? "none" : `1px dashed ${C.line}`,
    }}>
      <div style={{
        width: 4, height: 4, borderRadius: 999, background: C.emerald,
        marginTop: 8, flexShrink: 0,
      }} />
      <div style={{ fontSize: 12.5, color: C.stone, lineHeight: 1.45 }}>{children}</div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MODAL — DADOS DE FATURAÇÃO
// ═══════════════════════════════════════════════════════════════════

function BillingModal({ onClose, billing, onConfirm }) {
  const [local, setLocal] = useState(billing || {
    nome: "", nif: "", morada: "", cp: "", localidade: "",
  });
  const canSave = local.nome && local.nif && local.morada && local.cp && local.localidade;

  const footer = (
    <PrimaryButton onClick={() => onConfirm(local)} disabled={!canSave}>
      Guardar
    </PrimaryButton>
  );

  return (
    <BottomSheet title="Informações de faturação" onClose={onClose} footer={footer}>
      <div>
        <div style={{
          fontSize: 13, fontWeight: 700, color: C.ink,
          textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 14,
        }}>Identificação fiscal</div>
        <FormField label="Nome" value={local.nome}
          onChange={v => setLocal(p => ({ ...p, nome: v }))} placeholder="Nome completo" />
        <FormField label="NIF" value={local.nif}
          onChange={v => setLocal(p => ({ ...p, nif: v.replace(/\D/g, "").slice(0, 9) }))}
          placeholder="9 dígitos" inputMode="numeric" />
      </div>
      <div style={{ marginTop: 28 }}>
        <div style={{
          fontSize: 13, fontWeight: 700, color: C.ink,
          textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 14,
        }}>Morada de faturação</div>
        <FormField label="Morada" value={local.morada}
          onChange={v => setLocal(p => ({ ...p, morada: v }))} placeholder="Rua, número, andar" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.3fr", gap: 10 }}>
          <FormField label="Código postal" value={local.cp}
            onChange={v => setLocal(p => ({ ...p, cp: v }))} placeholder="0000-000" />
          <FormField label="Localidade" value={local.localidade}
            onChange={v => setLocal(p => ({ ...p, localidade: v }))} placeholder="Cidade" />
        </div>
      </div>
      <div style={{ height: 8 }} />
    </BottomSheet>
  );
}

function FormField({ label, value, onChange, placeholder, inputMode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 12, color: C.stone, fontWeight: 500, marginBottom: 6 }}>{label}</div>
      <input
        value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} inputMode={inputMode}
        style={{
          width: "100%", padding: "12px 14px",
          background: C.paper, border: `1px solid ${C.line}`,
          borderRadius: 10, fontSize: 14, color: C.ink,
          fontFamily: "inherit", outline: "none",
        }}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// JÁ FALTA POUCO
// ═══════════════════════════════════════════════════════════════════

function JaFaltaPouco() {
  const steps = [
    { icon: Check,       title: "Confirmar e agendar",          current: true },
    { icon: PartyPopper, title: "Confirmação imediata" },
    { icon: MapPinned,   title: "Acompanha o técnico no mapa" },
    { icon: Shield,      title: "Problema resolvido" },
  ];
  return (
    <div style={{
      background: `linear-gradient(135deg, ${C.forest} 0%, ${C.forestSoft} 100%)`,
      color: C.paper, borderRadius: 18, padding: "22px 20px",
      position: "relative", overflow: "hidden",
    }}>
      <div style={{
        position: "absolute", right: -30, top: -30, width: 120, height: 120, borderRadius: 999,
        background: `radial-gradient(circle, ${C.emerald} 0%, transparent 70%)`, opacity: 0.15,
      }} />
      <div style={{
        display: "inline-flex", gap: 6, alignItems: "center",
        background: "rgba(34, 197, 94, 0.18)", color: C.emeraldBright,
        padding: "4px 10px", borderRadius: 999,
        fontSize: 10, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase",
      }}>
        <Sparkles size={10} /> Já falta pouco!
      </div>
      <div className="serif" style={{
        fontSize: 20, fontWeight: 500, marginTop: 8, letterSpacing: -0.3,
      }}>
        O seu problema está a <span style={{ color: C.emeraldBright, fontStyle: "italic" }}>4 passos</span> de ficar resolvido.
      </div>
      <div style={{ marginTop: 18, position: "relative" }}>
        {steps.map((step, i) => {
          const Icon = step.icon;
          const isLast = i === steps.length - 1;
          return (
            <div key={i} style={{
              display: "flex", alignItems: "flex-start", gap: 12,
              position: "relative", paddingBottom: isLast ? 0 : 14,
            }}>
              {!isLast && (
                <div style={{
                  position: "absolute", left: 13, top: 28,
                  width: 2, height: "calc(100% - 14px)",
                  background: "rgba(255,255,255,0.12)",
                }} />
              )}
              <div style={{
                width: 28, height: 28, borderRadius: 999, flexShrink: 0,
                background: step.current ? C.emeraldBright : "rgba(255,255,255,0.08)",
                color: step.current ? C.forest : "rgba(255,255,255,0.5)",
                display: "grid", placeItems: "center",
                border: step.current ? `2px solid ${C.emeraldBright}` : `2px solid rgba(255,255,255,0.12)`,
                boxShadow: step.current ? `0 0 0 4px rgba(34, 197, 94, 0.15)` : "none",
                position: "relative", zIndex: 1,
              }}>
                <Icon size={13} strokeWidth={step.current ? 3 : 2} />
              </div>
              <div style={{ flex: 1, paddingTop: 5 }}>
                <div style={{
                  fontSize: 13.5, fontWeight: step.current ? 600 : 400,
                  color: step.current ? C.paper : "rgba(255,255,255,0.7)",
                }}>{step.title}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// LISTA DE SERVIÇOS POR CATEGORIA
// ═══════════════════════════════════════════════════════════════════

function ServiceListScreen({ categoryId, onBack, onSelectService, onSelectPersonalizado }) {
  const category = getCategory(categoryId);
  const [activeSub, setActiveSub] = useState("todos");
  const [search, setSearch] = useState("");
  const sectionRefs = useRef({});

  if (!category) return null;

  const filtered = search
    ? category.subcategorias.map(sub => ({
        ...sub,
        services: sub.services.filter(s => s.name.toLowerCase().includes(search.toLowerCase())),
      })).filter(sub => sub.services.length > 0)
    : activeSub === "todos" ? category.subcategorias
      : category.subcategorias.filter(s => s.id === activeSub);

  const scrollToSub = (id) => {
    setActiveSub(id);
    setTimeout(() => sectionRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };

  const totalServicos = category.subcategorias.reduce((n, s) => n + s.services.length, 0);

  return (
    <Shell>
      <TopBar onBack={onBack} title={category.nome} subtitle={`${totalServicos} serviços · Caldas da Rainha`} />

      <div style={{ padding: "14px 18px 0" }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          background: C.paper, border: `1px solid ${C.line}`,
          borderRadius: 12, padding: "10px 14px",
        }}>
          <Search size={16} color={C.stone} />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder={`Procurar em ${category.nome}...`}
            style={{
              flex: 1, border: "none", outline: "none", background: "transparent",
              fontSize: 14, fontFamily: "inherit", color: C.ink,
            }}
          />
          {search && (
            <button onClick={() => setSearch("")} style={{
              background: "transparent", border: "none", cursor: "pointer", color: C.stone,
              display: "grid", placeItems: "center",
            }}><X size={14} /></button>
          )}
        </div>
      </div>

      {!search && (
        <div className="no-scrollbar" style={{
          display: "flex", gap: 6, overflowX: "auto",
          padding: "14px 18px 6px", scrollSnapType: "x proximity",
        }}>
          <SubPill active={activeSub === "todos"} onClick={() => scrollToSub("todos")}>Todos</SubPill>
          {category.subcategorias.map(sub => (
            <SubPill key={sub.id} active={activeSub === sub.id} onClick={() => scrollToSub(sub.id)}>
              {sub.icon} {sub.nome}
            </SubPill>
          ))}
        </div>
      )}

      <div style={{ padding: "4px 18px 140px" }}>
        {!search && (
          <button onClick={onSelectPersonalizado} style={{
            width: "100%", textAlign: "left", cursor: "pointer",
            background: `linear-gradient(135deg, ${C.forest} 0%, ${C.forestSoft} 100%)`,
            color: C.paper, border: "none",
            borderRadius: 20, padding: 20, marginTop: 12,
            position: "relative", overflow: "hidden",
            boxShadow: `0 16px 40px -18px ${C.forestDeep}`,
          }}>
            <div style={{
              position: "absolute", right: -24, top: -24,
              fontSize: 140, opacity: 0.08, pointerEvents: "none",
            }}>{category.emoji}</div>
            <div style={{
              display: "flex", alignItems: "center", gap: 6,
              fontSize: 10, fontWeight: 700, letterSpacing: 1.2,
              textTransform: "uppercase", color: C.emeraldBright,
            }}>
              <Sparkles size={11} /> À medida em {category.nome}
            </div>
            <div className="serif" style={{
              fontSize: 22, fontWeight: 500, marginTop: 8, lineHeight: 1.2,
            }}>Serviço personalizado</div>
            <div style={{ fontSize: 13, opacity: 0.85, marginTop: 6, maxWidth: 320, lineHeight: 1.4 }}>
              {category.hero}
            </div>
            <div style={{
              marginTop: 14, paddingTop: 14,
              borderTop: `1px solid rgba(255,255,255,0.15)`,
              display: "flex", justifyContent: "space-between", alignItems: "flex-end",
            }}>
              <div>
                <div style={{ fontSize: 11, opacity: 0.7 }}>Por hora</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 2 }}>
                  <span style={{ fontSize: 12, opacity: 0.6, textDecoration: "line-through" }}>
                    {eur(category.personalizadoRateOriginal)}
                  </span>
                  <span className="serif" style={{ fontSize: 22, fontWeight: 600, color: C.emeraldBright }}>
                    {eur(category.personalizadoRate)}
                  </span>
                </div>
              </div>
              <div style={{
                background: C.emerald, color: C.paper, padding: "8px 14px",
                borderRadius: 999, fontSize: 12, fontWeight: 600,
                display: "flex", alignItems: "center", gap: 4,
              }}>Personalizar <ChevronRight size={14} /></div>
            </div>
          </button>
        )}

        {filtered.map(sub => (
          <div key={sub.id} ref={el => (sectionRefs.current[sub.id] = el)}
            style={{ marginTop: 28, scrollMarginTop: 140 }}>
            <div style={{
              display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10,
            }}>
              <div className="serif" style={{ fontSize: 17, fontWeight: 600, letterSpacing: -0.15 }}>
                {sub.icon} {sub.nome}
              </div>
              <div style={{ fontSize: 11, color: C.stone, fontWeight: 500 }}>{sub.services.length}</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {sub.services.map(s => (
                <ServiceCard key={s.id} service={s} categoryColor={category.color} onClick={() => onSelectService(s)} />
              ))}
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: 40, color: C.stone, fontSize: 14 }}>
            Nenhum serviço encontrado para "{search}".
          </div>
        )}
      </div>
    </Shell>
  );
}

function SubPill({ children, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: "8px 14px", borderRadius: 999,
      background: active ? C.forest : C.paper,
      color: active ? C.paper : C.ink,
      border: `1px solid ${active ? C.forest : C.line}`,
      fontSize: 12, fontWeight: 600, cursor: "pointer",
      whiteSpace: "nowrap", flexShrink: 0, scrollSnapAlign: "start",
    }}>{children}</button>
  );
}

function ServiceCard({ service, categoryColor, onClick }) {
  const isGrupo = service.tipo === "grupo";
  const hasDiscount = service.priceOriginal && service.priceOriginal > service.price;
  const discountPct = hasDiscount
    ? Math.round(((service.priceOriginal - service.price) / service.priceOriginal) * 100) : 0;

  return (
    <button onClick={onClick} style={{
      background: C.paper, border: `1px solid ${C.line}`,
      borderRadius: 14, padding: 12,
      display: "flex", gap: 12, alignItems: "center",
      cursor: "pointer", textAlign: "left", width: "100%",
    }}>
      <div style={{
        width: 56, height: 56, flexShrink: 0, borderRadius: 12,
        background: service.eco ? "#E8F5EE" : `${categoryColor || C.emerald}15`,
        color: service.eco ? "#2D7A5F" : (categoryColor || C.emerald),
        display: "grid", placeItems: "center", position: "relative",
      }}>
        {service.eco ? <Leaf size={24} /> : <Wrench size={22} />}
        {service.popular && (
          <div style={{
            position: "absolute", top: -6, right: -6,
            background: C.emerald, color: C.paper,
            width: 22, height: 22, borderRadius: 999,
            display: "grid", placeItems: "center",
            boxShadow: `0 2px 6px -1px ${C.emeraldDark}`,
          }}><Star size={11} fill={C.paper} color={C.paper} /></div>
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: C.ink, lineHeight: 1.25 }}>
          {service.name}
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 6, flexWrap: "wrap" }}>
          {service.eco && <Chip tone="eco" icon={Leaf}>Eco</Chip>}
          {service.popular && <Chip tone="emerald" icon={Star}>Popular</Chip>}
          {!isGrupo && hasDiscount && discountPct >= 10 && <Chip tone="discount">−{discountPct}%</Chip>}
        </div>
        <div style={{ marginTop: 6, display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
          {isGrupo ? (
            <>
              <span style={{ fontSize: 11, color: C.stone, fontWeight: 500 }}>desde</span>
              <span style={{ fontSize: 15, fontWeight: 700, color: C.ink }}>
                {`€${service.variants[0].price.toFixed(2).replace(".", ",")}`}
              </span>
              <span style={{ fontSize: 11, color: C.stone }}>
                · {service.variants.length} tipologias
              </span>
            </>
          ) : (
            <PriceTag price={service.price} priceOriginal={service.priceOriginal} size="sm" />
          )}
        </div>
      </div>
      <ChevronRight size={18} color={C.stone} style={{ flexShrink: 0 }} />
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════════
// PERSONALIZADO LANDING (por categoria)
// ═══════════════════════════════════════════════════════════════════

function PersonalizadoLanding({ category, onBack, onContinue }) {
  return (
    <Shell>
      <TopBar onBack={onBack} title="" />
      <div style={{ padding: "8px 18px 140px" }}>
        <div style={{
          background: C.emeraldPale, borderRadius: 24,
          padding: "36px 20px 28px", textAlign: "center", overflow: "hidden",
        }}>
          <div style={{ fontSize: 76, lineHeight: 1 }}>{category.emoji}</div>
          <div style={{
            display: "inline-flex", gap: 5, alignItems: "center",
            background: C.paper, color: C.emerald,
            padding: "5px 12px", borderRadius: 999,
            fontSize: 10, fontWeight: 700, letterSpacing: 1.3, textTransform: "uppercase",
            marginTop: 16, border: `1px solid ${C.emeraldSoft}`,
          }}>
            <Sparkles size={11} /> {category.nome} · Personalizado
          </div>
          <div className="serif" style={{
            fontSize: 26, fontWeight: 500, marginTop: 12, lineHeight: 1.15,
            letterSpacing: -0.4, color: C.ink,
          }}>
            Procura um serviço <em style={{ color: C.emerald, fontStyle: "italic" }}>à medida</em>?
          </div>
          <div style={{
            fontSize: 13.5, color: C.stone, marginTop: 10, lineHeight: 1.5,
            maxWidth: 320, margin: "10px auto 0",
          }}>{category.hero}</div>
        </div>

        <div style={{
          marginTop: 16, background: C.paper,
          border: `1.5px solid ${C.emeraldSoft}`, borderRadius: 16, padding: "16px 18px",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <div>
            <div style={{ fontSize: 11, color: C.stone, fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase" }}>
              Preço por hora
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 4 }}>
              <span style={{ fontSize: 13, color: C.stone, textDecoration: "line-through" }}>
                {eur(category.personalizadoRateOriginal)}
              </span>
              <span className="serif" style={{ fontSize: 26, fontWeight: 600, color: C.forest }}>
                {eur(category.personalizadoRate)}
              </span>
            </div>
          </div>
          <div style={{
            background: C.emeraldSoft, color: C.emeraldDark,
            padding: "6px 10px", borderRadius: 999,
            fontSize: 11, fontWeight: 700, letterSpacing: 0.3,
          }}>
            −{Math.round((1 - category.personalizadoRate / category.personalizadoRateOriginal) * 100)}%
          </div>
        </div>

        <div style={{ marginTop: 28 }}>
          <div style={{ textAlign: "center" }}>
            <div className="serif" style={{ fontSize: 20, fontWeight: 600, letterSpacing: -0.2 }}>
              Ideal para
            </div>
            <div style={{ width: 36, height: 2, background: C.emerald, margin: "8px auto 20px", borderRadius: 2 }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <ValueRow icon={Wrench} title="Trabalho à medida, sem complicações" desc="Pelo seu técnico de confiança, que já conhece a sua casa." />
            <ValueRow icon={Sparkles} title="Tarefas únicas ou difíceis de explicar" desc={`Ideal para quando o trabalho não está no catálogo de ${category.nome}.`} />
            <ValueRow icon={RefreshCw} title="Várias pequenas tarefas numa só visita" desc="Agrupa e resolve tudo numa deslocação — poupa tempo e taxa." />
            <ValueRow icon={Check} title="Podemos já ter o que procura" desc={`Antes de pedir à medida, consulte os serviços fixos de ${category.nome}.`} />
          </div>
        </div>
      </div>
      <StickyCTA>
        <PrimaryButton onClick={onContinue}>Continuar</PrimaryButton>
      </StickyCTA>
    </Shell>
  );
}

// ═══════════════════════════════════════════════════════════════════
// PERSONALIZADO FORM
// ═══════════════════════════════════════════════════════════════════

function PersonalizadoForm({ category, onBack, onContinue, state, setState }) {
  const hoursEstimate = (state.horas || 1) * category.personalizadoRate;
  const canContinue = (state.description || "").length >= 30;

  return (
    <Shell>
      <TopBar onBack={onBack} title={`${category.nome} · Personalizado`} />
      <div style={{ padding: "8px 18px 140px" }}>
        <div style={{
          background: C.emeraldPale, border: `1px solid ${C.emeraldSoft}`,
          borderRadius: 12, padding: "12px 16px",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <div style={{ fontSize: 12, color: C.stone, fontWeight: 500 }}>Por hora</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
            <span style={{ fontSize: 11.5, color: C.stone, textDecoration: "line-through" }}>
              {eur(category.personalizadoRateOriginal)}
            </span>
            <span className="serif" style={{ fontSize: 16, fontWeight: 600, color: C.forest }}>
              {eur(category.personalizadoRate)}
            </span>
          </div>
        </div>

        <div style={{ marginTop: 24 }}>
          <div className="serif" style={{ fontSize: 17, fontWeight: 600 }}>Em que podemos ajudar?</div>
          <div style={{ fontSize: 12.5, color: C.stone, marginTop: 4, lineHeight: 1.4 }}>
            Quanto mais detalhe, mais fácil será encontrar o profissional certo para si.
          </div>
          <textarea
            value={state.description || ""}
            onChange={e => setState(p => ({ ...p, description: e.target.value }))}
            placeholder={`Descreva o trabalho de ${category.nome.toLowerCase()}...`}
            maxLength={500}
            style={{
              marginTop: 12, width: "100%", minHeight: 130,
              background: C.paper, border: `1px solid ${C.line}`,
              borderRadius: 12, padding: 14, fontSize: 13.5,
              fontFamily: "inherit", color: C.ink, resize: "vertical", outline: "none",
            }}
          />
          <div style={{ fontSize: 11, color: C.stone, marginTop: 4, textAlign: "right" }}>
            {(state.description || "").length}/500
          </div>
        </div>

        <div style={{ marginTop: 20 }}>
          <div className="serif" style={{ fontSize: 17, fontWeight: 600 }}>Horas estimadas</div>
          <div style={{ fontSize: 12.5, color: C.stone, marginTop: 4, lineHeight: 1.4 }}>
            O valor final é ajustado ao tempo real (mínimo 1h, arredondado a 30 min).
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginTop: 12 }}>
            {[1, 2, 3, 4].map(h => {
              const sel = (state.horas || 1) === h;
              return (
                <button key={h} onClick={() => setState(p => ({ ...p, horas: h }))} style={{
                  background: sel ? C.forest : C.paper,
                  color: sel ? C.paper : C.ink,
                  border: `2px solid ${sel ? C.forest : C.line}`,
                  borderRadius: 12, padding: "14px 0",
                  fontSize: 15, fontWeight: 600, cursor: "pointer",
                }}>
                  {h === 4 ? "+3h" : `${h}h`}
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <StickyCTA>
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "baseline",
          marginBottom: 10, padding: "0 4px",
        }}>
          <span style={{ fontSize: 12, color: C.stone }}>Estimativa para {state.horas || 1}h</span>
          <span className="serif" style={{ fontSize: 20, fontWeight: 600, color: C.forest }}>
            {eur(hoursEstimate)}
          </span>
        </div>
        <PrimaryButton onClick={onContinue} disabled={!canContinue}>
          {canContinue ? "Continuar" : "Descreva o trabalho (mín. 30 carac.)"}
        </PrimaryButton>
      </StickyCTA>
    </Shell>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SELECTOR DE VARIANTE (tipologia/tamanho) — para serviços-grupo
// ═══════════════════════════════════════════════════════════════════

function VariantPickerScreen({ parent, category, onBack, onContinue }) {
  // Pré-selecciona a variante marcada como Popular, ou a primeira
  const popularVariant = parent.variants.find(v => v.popular);
  const initial = popularVariant || parent.variants[0];
  const [selectedId, setSelectedId] = useState(initial.id);
  const selected = parent.variants.find(v => v.id === selectedId);

  return (
    <Shell>
      <TopBar onBack={onBack} title={parent.name} subtitle="Escolha a tipologia" />
      <div style={{ padding: "16px 18px 140px" }}>
        <div style={{
          background: `${category.color}15`, borderRadius: 20,
          padding: "24px 20px", textAlign: "center",
        }}>
          <div style={{ fontSize: 48 }}>{category.emoji}</div>
          <div className="serif" style={{ fontSize: 19, fontWeight: 500, marginTop: 10 }}>
            {parent.name}
          </div>
          {parent.tagline && (
            <div style={{
              fontSize: 12.5, color: C.stone, marginTop: 8,
              lineHeight: 1.4, fontStyle: "italic",
            }}>
              {parent.tagline}
            </div>
          )}
        </div>

        <div style={{
          marginTop: 22, fontSize: 13, fontWeight: 600, color: C.ink,
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <span>Qual a tipologia da sua casa?</span>
          <span style={{ fontSize: 11, color: C.stone, fontWeight: 500 }}>
            {parent.variants.length} opções
          </span>
        </div>

        <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
          {parent.variants.map(v => {
            const isSelected = v.id === selectedId;
            const hasDiscount = v.priceOriginal && v.priceOriginal > v.price;
            return (
              <button
                key={v.id}
                onClick={() => setSelectedId(v.id)}
                style={{
                  background: isSelected ? `${category.color}08` : C.paper,
                  border: `2px solid ${isSelected ? category.color : C.line}`,
                  borderRadius: 12, padding: "14px 14px",
                  display: "flex", alignItems: "center", gap: 12,
                  cursor: "pointer", textAlign: "left", width: "100%",
                  transition: "all 0.15s",
                }}
              >
                <div style={{
                  width: 20, height: 20, borderRadius: 999,
                  border: `2px solid ${isSelected ? category.color : C.stoneLight}`,
                  background: isSelected ? category.color : "transparent",
                  display: "grid", placeItems: "center", flexShrink: 0,
                }}>
                  {isSelected && <Check size={12} color={C.paper} strokeWidth={3} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap",
                  }}>
                    <span style={{ fontSize: 14.5, fontWeight: 600, color: C.ink }}>
                      {v.label}
                    </span>
                    {v.hint && (
                      <span style={{ fontSize: 12, color: C.stone }}>
                        {v.hint}
                      </span>
                    )}
                    {v.popular && (
                      <Chip tone="emerald" icon={Star}>Popular</Chip>
                    )}
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: C.ink }}>
                    {`€${v.price.toFixed(2).replace(".", ",")}`}
                  </div>
                  {hasDiscount && (
                    <div style={{ fontSize: 11, color: C.stone, textDecoration: "line-through" }}>
                      {`€${v.priceOriginal.toFixed(2).replace(".", ",")}`}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Info fixa do grupo — não repetir no detalhe */}
        {parent.duracao && (
          <div style={{
            marginTop: 18, padding: "12px 14px",
            background: C.cream, borderRadius: 10,
            fontSize: 12, color: C.stone,
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <Clock size={14} color={C.emerald} />
            Duração: <strong style={{ color: C.ink }}>{parent.duracao}</strong>
          </div>
        )}
      </div>

      <StickyCTA>
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "baseline",
          marginBottom: 10, padding: "0 4px",
        }}>
          <span style={{ fontSize: 12, color: C.stone }}>{selected.label} · Preço</span>
          <PriceTag price={selected.price} priceOriginal={selected.priceOriginal} size="lg" />
        </div>
        <PrimaryButton onClick={() => onContinue(selected, parent)}>
          Continuar
        </PrimaryButton>
      </StickyCTA>
    </Shell>
  );
}

// ═══════════════════════════════════════════════════════════════════
// DETALHE SERVIÇO FIXO
// ═══════════════════════════════════════════════════════════════════

function ServiceDetailScreen({ service, category, parent, onBack, onContinue }) {
  // Fonte das flags de opção — o pai do grupo (quando existe), senão o próprio serviço
  const optionSource = parent || service;

  // Opções de frequência activas (via template)
  const frequencyOptions = getFrequencyOptions(service, parent);
  const hasFrequency = !!frequencyOptions;
  const hasAnyOption = optionSource.hasProductsOption || hasFrequency;

  // Estado — o default da frequência é sempre a 1ª opção da template (Pontual ou Mensal consoante template)
  const defaultFrequencyId = hasFrequency ? frequencyOptions[0].id : "pontual";
  const [productsId, setProductsId]   = useState("cliente");
  const [frequencyId, setFrequencyId] = useState(defaultFrequencyId);

  // Preço profunda para o pack "mensal + profunda trimestral" (só relevante para cln_home)
  // Hardcoded ao T2 profunda do demo — o Claude Code vai ler do SQL via categoria
  const deepPriceForBundle = 89.90;

  // Cálculo dinâmico de preço
  const basePrice = service.price;
  const basePriceOriginal = service.priceOriginal;
  const productsExtra = optionSource.productsExtraPrice;
  const effectivePrice = hasAnyOption
    ? calcDynamicPrice(basePrice, productsId, frequencyId, productsExtra, deepPriceForBundle, frequencyOptions)
    : basePrice;
  const currentFreq = hasFrequency ? frequencyOptions.find(f => f.id === frequencyId) : null;
  const priceSuffix = currentFreq ? currentFreq.suffix : "";

  return (
    <Shell>
      <TopBar onBack={onBack} title={service.name} />
      <div style={{ padding: "16px 18px 140px" }}>
        <div style={{
          background: `${category.color}15`, borderRadius: 20,
          padding: "32px 20px", textAlign: "center", overflow: "hidden",
        }}>
          <div style={{ fontSize: 60 }}>{category.emoji}</div>
          <div className="serif" style={{ fontSize: 22, fontWeight: 500, marginTop: 12 }}>
            {service.name}
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 12, flexWrap: "wrap" }}>
            <Chip icon={Shield} tone="emerald">90 dias garantia</Chip>
            {service.eco && <Chip icon={Leaf} tone="eco">Eco</Chip>}
            {service.popular && <Chip icon={Star} tone="emerald">Popular</Chip>}
          </div>
        </div>

        <div style={{
          marginTop: 20, padding: "14px 0",
          borderTop: `1px solid ${C.line}`, borderBottom: `1px solid ${C.line}`,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 12, color: C.stone, marginBottom: 4 }}>
                {priceSuffix ? "Preço do plano" : "Preço fixo do serviço"}
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <span style={{ fontSize: 22, fontWeight: 700, color: C.ink }}>
                  {`€${effectivePrice.toFixed(2).replace(".", ",")}`}
                </span>
                {priceSuffix && (
                  <span style={{ fontSize: 12, color: C.stone, fontWeight: 500 }}>{priceSuffix}</span>
                )}
                {basePriceOriginal && basePriceOriginal > basePrice && !priceSuffix && (
                  <span style={{ fontSize: 13, color: C.stone, textDecoration: "line-through" }}>
                    {`€${basePriceOriginal.toFixed(2).replace(".", ",")}`}
                  </span>
                )}
              </div>
            </div>
            <Chip tone="emerald" icon={Lock}>Sem surpresas</Chip>
          </div>
        </div>

        {service.tagline && (
          <div style={{
            marginTop: 18, padding: "14px 16px", background: `${category.color}08`,
            border: `1px solid ${category.color}20`, borderRadius: 12,
          }}>
            <div style={{ fontSize: 13, color: C.ink, lineHeight: 1.5, fontStyle: "italic" }}>
              {service.tagline}
            </div>
            {service.duracao && (
              <div style={{
                fontSize: 11.5, color: C.stone, marginTop: 8,
                display: "flex", alignItems: "center", gap: 6,
              }}>
                <Clock size={12} /> Duração típica: <strong style={{ color: C.ink }}>{service.duracao}</strong>
              </div>
            )}
          </div>
        )}

        {/* Opções dinâmicas: produtos e frequência */}
        <OptionsSection
          service={service} parent={optionSource}
          productsId={productsId} setProductsId={setProductsId}
          frequencyId={frequencyId} setFrequencyId={setFrequencyId}
          accent={category.color}
        />

        {/* Inclui / Não inclui / FAQ */}
        {service.inclui && service.inclui.length > 0 && (
          <DetailSection title="O que está incluído" icon={Check} iconColor={C.emerald}>
            {service.inclui.map((item, i) => (
              <DetailItem key={i} icon={Check} iconColor={C.emerald}>{item}</DetailItem>
            ))}
          </DetailSection>
        )}

        {service.naoInclui && service.naoInclui.length > 0 && (
          <DetailSection title="O que não está incluído" icon={X} iconColor={C.stone}>
            {service.naoInclui.map((item, i) => (
              <DetailItem key={i} icon={X} iconColor={C.stone}>{item}</DetailItem>
            ))}
          </DetailSection>
        )}

        {service.faq && service.faq.length > 0 && (
          <DetailSection title="Perguntas frequentes" icon={MessageSquare} iconColor={C.forest}>
            {service.faq.map((item, i) => (
              <FaqItem key={i} q={item.q} a={item.a} />
            ))}
          </DetailSection>
        )}

        {/* Fallback gracioso se o serviço não tem detalhe ainda — 3 valores centrais */}
        {!service.inclui && (
          <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 16 }}>
            <ValueRow icon={Lock} title="Técnico fixo, escolhido por si" desc="Sempre o mesmo profissional da nossa rede de confiança." />
            <ValueRow icon={Shield} title="90 dias de garantia" desc="Se o problema voltar, regressamos sem custos adicionais." />
            <ValueRow icon={MessageSquare} title="Chat directo e relatório fotográfico" desc="Fala com o técnico e recebe relatório no fim." />
          </div>
        )}
      </div>

      <StickyCTA>
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "baseline",
          marginBottom: 10, padding: "0 4px",
        }}>
          <span style={{ fontSize: 12, color: C.stone }}>
            {priceSuffix ? "Preço do plano" : "Preço"}
          </span>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
            <span style={{ fontSize: 20, fontWeight: 700, color: C.ink }}>
              {`€${effectivePrice.toFixed(2).replace(".", ",")}`}
            </span>
            {priceSuffix && (
              <span style={{ fontSize: 12, color: C.stone, fontWeight: 500 }}>{priceSuffix}</span>
            )}
          </div>
        </div>
        <PrimaryButton onClick={() => onContinue({
          productsId, frequencyId,
          effectivePrice, priceSuffix,
        })}>
          Continuar
        </PrimaryButton>
      </StickyCTA>
    </Shell>
  );
}

// ═══════════════════════════════════════════════════════════════════
// FINALIZAR PEDIDO (checkout unificado)
// ═══════════════════════════════════════════════════════════════════

function FinalizarPedido({ selected, category, isPersonalizado, onBack, onConfirm, state, setState }) {
  const [modal, setModal] = useState(null);

  // Se o cliente configurou opções no detalhe (produtos/frequência), usar o preço efectivo
  const serviceOptions = state.serviceOptions;
  const servicePrice = isPersonalizado
    ? (state.horas || 1) * category.personalizadoRate
    : (serviceOptions?.effectivePrice ?? selected.price);
  const servicePriceOriginal = isPersonalizado
    ? (state.horas || 1) * category.personalizadoRateOriginal
    : (serviceOptions?.effectivePrice ? null : selected.priceOriginal);
  const priceSuffix = serviceOptions?.priceSuffix || "";

  let scheduleSurcharge = 0;
  let scheduleSurchargeLabel = null;
  if (state.scheduleMode === "imediato") {
    scheduleSurcharge = IMEDIATO_FEE;
    scheduleSurchargeLabel = "Serviço imediato";
  } else if (
    state.scheduleMode === "agendar" &&
    (state.selectedSlots || []).length > 0 &&
    (state.selectedSlots || []).every(s => s.day === "hoje")
  ) {
    scheduleSurcharge = HOJE_FEE;
    scheduleSurchargeLabel = "Agendado para hoje";
  }

  const total = servicePrice + TRAVEL_FEE + PROTECTION_FEE_NOW + scheduleSurcharge;
  const scheduleOk = state.scheduleMode === "imediato" ||
    (state.scheduleMode === "agendar" && (state.selectedSlots || []).length > 0);
  const canBook = state.paymentMethod !== null && scheduleOk;
  const slots = state.selectedSlots || [];
  const hasBilling = state.billing?.nif;

  return (
    <Shell>
      <TopBar onBack={onBack} title="Finalizar pedido" />

      <div style={{ padding: "0 0 200px" }}>
        {/* Mapa */}
        <div style={{
          height: 160, background: C.emeraldPale,
          position: "relative", overflow: "hidden",
          borderBottom: `1px solid ${C.line}`,
        }}>
          <div style={{
            position: "absolute", inset: 0,
            background: `repeating-linear-gradient(45deg, ${C.emeraldSoft} 0, ${C.emeraldSoft} 1px, transparent 1px, transparent 12px)`,
            opacity: 0.6,
          }} />
          <div style={{
            position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -60%)",
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: 999,
              background: C.forest, color: C.paper,
              display: "grid", placeItems: "center",
              boxShadow: `0 8px 20px -4px ${C.forestDeep}`,
            }}><MapPin size={16} fill={C.paper} /></div>
          </div>
          <button style={{
            position: "absolute", bottom: 14, left: "50%", transform: "translateX(-50%)",
            background: C.paper, color: C.ink,
            border: `1px solid ${C.line}`, borderRadius: 999,
            padding: "6px 14px", fontSize: 12, fontWeight: 600,
            cursor: "pointer", boxShadow: `0 4px 12px -4px rgba(0,0,0,0.1)`,
          }}>Editar localização</button>
        </div>

        <div style={{ padding: "16px 18px 0" }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "12px 0", borderBottom: `1px solid ${C.line}`,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: C.emeraldPale, color: C.emerald,
              display: "grid", placeItems: "center", flexShrink: 0,
            }}><MapPin size={18} /></div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Rua Palmira Bastos, 4</div>
              <div style={{ fontSize: 12, color: C.stone }}>Caldas da Rainha</div>
            </div>
            <ChevronRight size={18} color={C.stone} />
          </div>

          <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <button onClick={() => {
              setState(p => ({ ...p, scheduleMode: "agendar" }));
              setModal("schedule");
            }} style={{
              background: state.scheduleMode === "agendar" ? C.emeraldPale : C.paper,
              border: `2px solid ${state.scheduleMode === "agendar" ? C.emerald : C.line}`,
              borderRadius: 14, padding: 14, textAlign: "left", cursor: "pointer",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Calendar size={16} color={state.scheduleMode === "agendar" ? C.emerald : C.stone} />
                <span style={{ fontSize: 14, fontWeight: 600 }}>Agendar</span>
              </div>
              <div style={{ fontSize: 11.5, color: C.stone, marginTop: 4, lineHeight: 1.3 }}>
                {state.scheduleMode === "agendar" && slots.length > 0
                  ? slots.length === 1 ? `${slots[0].dayLabel}, ${slots[0].time}`
                    : `${slots.length} horários flexíveis`
                  : "Selecione dia e hora"}
              </div>
            </button>
            <button onClick={() => setState(p => ({ ...p, scheduleMode: "imediato", selectedSlots: [] }))} style={{
              background: state.scheduleMode === "imediato" ? C.emeraldPale : C.paper,
              border: `2px solid ${state.scheduleMode === "imediato" ? C.emerald : C.line}`,
              borderRadius: 14, padding: 14, textAlign: "left", cursor: "pointer",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Zap size={16} color={state.scheduleMode === "imediato" ? C.emerald : C.stone} />
                <span style={{ fontSize: 14, fontWeight: 600 }}>Imediato</span>
                <span style={{
                  marginLeft: "auto", fontSize: 10, color: "#92400E", fontWeight: 700,
                  background: C.amberSoft, padding: "1px 5px", borderRadius: 4,
                }}>+{eur(IMEDIATO_FEE)}</span>
              </div>
              <div style={{ fontSize: 11.5, color: C.stone, marginTop: 4, lineHeight: 1.3 }}>
                30-40 minutos
              </div>
            </button>
          </div>
        </div>

        <Divisor />

        <div style={{ padding: "0 18px" }}>
          <div className="serif" style={{ fontSize: 18, fontWeight: 600 }}>O seu serviço</div>
          <div style={{
            marginTop: 12, display: "flex", gap: 12, alignItems: "flex-start",
            padding: "14px", background: C.paper,
            border: `1px solid ${C.line}`, borderRadius: 14,
          }}>
            <div style={{
              width: 48, height: 48, flexShrink: 0, borderRadius: 10,
              background: `${category.color}15`, color: category.color,
              display: "grid", placeItems: "center", fontSize: 22,
            }}>{category.emoji}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>
                {isPersonalizado ? `${category.nome} · Personalizado` : selected.name}
              </div>
              <div style={{ fontSize: 11.5, color: C.stone, marginTop: 2 }}>
                {isPersonalizado
                  ? `${state.horas || 1}h × ${eur(category.personalizadoRate)}/h`
                  : category.nome}
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 6 }}>
                {servicePriceOriginal && servicePriceOriginal > servicePrice && (
                  <span style={{ fontSize: 11.5, color: C.stone, textDecoration: "line-through" }}>
                    {eur(servicePriceOriginal)}
                  </span>
                )}
                <span className="serif" style={{ fontSize: 16, fontWeight: 600, color: C.forest }}>
                  {eur(servicePrice)}
                </span>
              </div>
            </div>
            <button style={{
              background: C.paper, border: `1px solid ${C.line}`,
              borderRadius: 999, width: 32, height: 32,
              display: "grid", placeItems: "center", cursor: "pointer", color: C.stone,
            }}><Trash2 size={14} /></button>
          </div>

          <button onClick={() => setModal("photos")} style={{
            marginTop: 10, width: "100%",
            background: C.paper, border: `1px solid ${C.line}`,
            borderRadius: 14, padding: 14,
            display: "flex", alignItems: "center", gap: 12,
            cursor: "pointer", textAlign: "left",
          }}>
            <div style={{
              width: 36, height: 36, flexShrink: 0, borderRadius: 10,
              background: state.notes || (state.photos || []).length ? C.emeraldPale : C.stoneLight,
              color: state.notes || (state.photos || []).length ? C.emerald : C.stone,
              display: "grid", placeItems: "center",
            }}><FileImage size={18} /></div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600 }}>Fotografias e notas</div>
              <div style={{
                fontSize: 12, color: C.stone, marginTop: 2,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {state.notes
                  ? state.notes.slice(0, 48) + (state.notes.length > 48 ? "..." : "")
                  : (state.photos || []).length > 0
                    ? `${(state.photos || []).length} fotografia${(state.photos || []).length > 1 ? "s" : ""}`
                    : "Adicionar detalhes e imagens"}
              </div>
            </div>
            <ChevronRight size={18} color={C.stone} />
          </button>
        </div>

        <Divisor />

        <div style={{ padding: "0 18px" }}>
          <div className="serif" style={{ fontSize: 18, fontWeight: 600 }}>Detalhes do pagamento</div>
          <div style={{
            marginTop: 12, padding: 16, background: C.paper,
            border: `1px solid ${C.line}`, borderRadius: 14,
          }}>
            <LineRow label="Subtotal" value={servicePrice} valueOriginal={servicePriceOriginal} />
            <LineRow label="Taxa de deslocação" value={TRAVEL_FEE} />
            <LineRow label="Taxa de proteção" value={PROTECTION_FEE_NOW} valueOriginal={PROTECTION_FEE} strike />
            {scheduleSurcharge > 0 && <LineRow label={scheduleSurchargeLabel} value={scheduleSurcharge} />}
            <div style={{
              marginTop: 10, paddingTop: 12, borderTop: `1px solid ${C.line}`,
              display: "flex", justifyContent: "space-between", alignItems: "baseline",
            }}>
              <span style={{ fontSize: 15, fontWeight: 700 }}>Total a pagar</span>
              <span className="serif" style={{ fontSize: 22, fontWeight: 600, color: C.forest }}>
                {eur(total)}
              </span>
            </div>
          </div>
        </div>

        <div style={{ padding: "20px 18px 0" }}><JaFaltaPouco /></div>

        <div style={{ padding: "24px 18px 0" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div className="serif" style={{ fontSize: 18, fontWeight: 600 }}>Concluir pedido</div>
            <Chip tone="amber">Obrigatório</Chip>
          </div>

          <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <button onClick={() => setState(p => ({ ...p, paymentMethod: "dinheiro" }))} style={{
              background: C.paper,
              border: `2px solid ${state.paymentMethod === "dinheiro" ? C.emerald : C.line}`,
              borderRadius: 12, padding: "14px 16px",
              display: "flex", alignItems: "center", gap: 8, cursor: "pointer",
            }}>
              <Banknote size={18} color={state.paymentMethod === "dinheiro" ? C.emerald : C.stone} />
              <span style={{ fontSize: 14, fontWeight: 600 }}>Dinheiro</span>
            </button>
            <button onClick={() => setState(p => ({ ...p, paymentMethod: "cartao" }))} style={{
              background: C.paper,
              border: `2px solid ${state.paymentMethod === "cartao" ? C.emerald : C.line}`,
              borderRadius: 12, padding: "14px 16px",
              display: "flex", alignItems: "center", gap: 8, cursor: "pointer",
            }}>
              <CreditCard size={18} color={state.paymentMethod === "cartao" ? C.emerald : C.stone} />
              <span style={{ fontSize: 14, fontWeight: 600 }}>Cartão</span>
            </button>
          </div>

          <button style={{
            marginTop: 12, width: "100%",
            background: C.emeraldPale, border: `1px solid ${C.emeraldSoft}`,
            borderRadius: 12, padding: "12px 14px",
            display: "flex", alignItems: "center", gap: 10, cursor: "pointer", textAlign: "left",
          }}>
            <Tag size={16} color={C.emerald} />
            <span style={{ fontSize: 13, color: C.emeraldDark, fontWeight: 600, flex: 1 }}>
              Promo {PROMO_CODE} aplicado
            </span>
            <span style={{
              fontSize: 11, color: C.emeraldDark, fontWeight: 700,
              background: C.paper, padding: "3px 8px", borderRadius: 999,
            }}>−{eur(PROMO_SAVINGS)}</span>
          </button>

          <button onClick={() => setModal("billing")} style={{
            marginTop: 8, width: "100%",
            background: hasBilling ? C.emeraldPale : C.paper,
            border: `1px solid ${hasBilling ? C.emeraldSoft : C.line}`,
            borderRadius: 12, padding: "12px 14px",
            display: "flex", alignItems: "center", gap: 10, cursor: "pointer", textAlign: "left",
          }}>
            <Receipt size={16} color={hasBilling ? C.emerald : C.stone} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, color: C.ink, fontWeight: 600 }}>
                {hasBilling ? "Dados de faturação" : "Adicionar dados de faturação"}
              </div>
              {hasBilling && (
                <div style={{ fontSize: 11.5, color: C.stone, marginTop: 2 }}>
                  {state.billing.nome} · NIF {state.billing.nif}
                </div>
              )}
            </div>
            <ChevronRight size={16} color={C.stone} />
          </button>
        </div>

        <Divisor />

        <div style={{ padding: "0 18px" }}>
          <div className="serif" style={{ fontSize: 18, fontWeight: 600 }}>O que inclui sempre</div>
          <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 18 }}>
            <ValueRow icon={Lock} title="Técnico fixo, escolhido por si" desc="Sempre o mesmo profissional da nossa rede de confiança." />
            <ValueRow icon={Shield} title="90 dias de garantia" desc="Se o problema voltar, regressamos sem custos adicionais." />
            <ValueRow icon={RefreshCw} title="Cancelamento livre" desc="Cancele até 15 min ou antes de ser atribuído." />
            <ValueRow icon={Wrench} title="Materiais aprovados por si" desc="Qualquer custo extra precisa da sua confirmação antes." />
            <ValueRow icon={MessageSquare} title="Chat directo e relatório fotográfico" desc="Fala com o técnico e recebe relatório no fim." />
          </div>
        </div>
      </div>

      <StickyCTA banner={`Reserve agora e poupe ${eur(PROMO_SAVINGS)} em descontos`}>
        <PrimaryButton onClick={onConfirm} disabled={!canBook}>
          {!state.paymentMethod ? "Escolha método de pagamento"
            : !scheduleOk ? "Escolha Agendar ou Imediato"
            : "Agendar serviço"}
        </PrimaryButton>
      </StickyCTA>

      {modal === "schedule" && (
        <ScheduleModal slots={state.selectedSlots} onClose={() => setModal(null)}
          onConfirm={(slots) => {
            setState(p => ({ ...p, selectedSlots: slots, scheduleMode: "agendar" }));
            setModal(null);
          }} />
      )}
      {modal === "photos" && (
        <PhotosNotesModal notes={state.notes} photos={state.photos} onClose={() => setModal(null)}
          onConfirm={({ notes, photos }) => {
            setState(p => ({ ...p, notes, photos }));
            setModal(null);
          }} />
      )}
      {modal === "billing" && (
        <BillingModal billing={state.billing} onClose={() => setModal(null)}
          onConfirm={(billing) => {
            setState(p => ({ ...p, billing }));
            setModal(null);
          }} />
      )}
    </Shell>
  );
}

function LineRow({ label, value, valueOriginal, strike }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "baseline",
      padding: "4px 0", fontSize: 13.5,
    }}>
      <span style={{ color: C.ink }}>{label}</span>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
        {valueOriginal !== undefined && valueOriginal !== null && valueOriginal > value && (
          <span style={{ fontSize: 12, color: C.stone, textDecoration: "line-through" }}>
            {eur(valueOriginal)}
          </span>
        )}
        <span style={{ fontWeight: 600, color: strike && value === 0 ? C.emerald : C.ink }}>
          {eur(value)}
        </span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// CONFIRMADO
// ═══════════════════════════════════════════════════════════════════

function ConfirmadoScreen({ onRestart }) {
  return (
    <Shell>
      <div style={{
        minHeight: "100vh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", padding: 32, textAlign: "center",
      }}>
        <div style={{
          width: 80, height: 80, borderRadius: 999,
          background: C.emeraldSoft, color: C.emerald,
          display: "grid", placeItems: "center",
          boxShadow: `0 12px 40px -12px ${C.emerald}`,
        }}><Check size={36} strokeWidth={3} /></div>
        <div className="serif" style={{ fontSize: 28, fontWeight: 500, marginTop: 24, letterSpacing: -0.4 }}>
          Pedido confirmado
        </div>
        <div style={{ fontSize: 14, color: C.stone, marginTop: 10, maxWidth: 300, lineHeight: 1.5 }}>
          Estamos a atribuir o seu técnico de confiança. Receberá notificação em instantes.
        </div>
        <button onClick={onRestart} style={{
          marginTop: 32, background: "transparent",
          color: C.emerald, border: `1px solid ${C.emerald}`,
          borderRadius: 12, padding: "10px 20px",
          fontSize: 13, fontWeight: 600, cursor: "pointer",
        }}>← Voltar ao início</button>
      </div>
    </Shell>
  );
}

// ═══════════════════════════════════════════════════════════════════
// APP ROOT
// ═══════════════════════════════════════════════════════════════════

export default function App() {
  const [screen, setScreen] = useState("home");
  const [categoryId, setCategoryId] = useState(null);
  const [selected, setSelected] = useState(null);
  const [isPersonalizado, setIsPersonalizado] = useState(false);
  const [personalizadoPicker, setPersonalizadoPicker] = useState(false);
  const [state, setState] = useState({
    description: "", horas: 1,
    scheduleMode: null, selectedSlots: [],
    notes: "", photos: [], billing: null, paymentMethod: null,
  });
  const [variantParent, setVariantParent] = useState(null);

  const category = categoryId ? getCategory(categoryId) : null;

  const restart = () => {
    setCategoryId(null); setSelected(null); setIsPersonalizado(false);
    setVariantParent(null);
    setState({
      description: "", horas: 1,
      scheduleMode: null, selectedSlots: [],
      notes: "", photos: [], billing: null, paymentMethod: null,
    });
    setScreen("home");
  };

  const handleHomeSelect = (id) => {
    if (id === "__personalizado__") {
      setPersonalizadoPicker(true);
      return;
    }
    setCategoryId(id); setScreen("category");
  };

  const handlePickerSelect = (id) => {
    setPersonalizadoPicker(false);
    setCategoryId(id);
    setIsPersonalizado(true);
    setScreen("landing");
  };

  const handleServiceSelect = (s) => {
    setIsPersonalizado(false);
    if (s.tipo === "grupo") {
      setVariantParent(s);
      setScreen("variant");
    } else {
      setSelected(s);
      setVariantParent(null);
      setScreen("detail");
    }
  };

  const handleVariantContinue = (variant, parent) => {
    // Fundir detalhe do pai com preço/label da variante
    const mergedService = {
      ...parent,
      ...variant,
      name: `${parent.name} ${variant.label}`,
      tipo: "fixo",
    };
    setSelected(mergedService);
    setScreen("detail");
  };

  return (
    <>
      {screen === "home" && (
        <HomeScreen onSelectCategory={handleHomeSelect} />
      )}
      {screen === "category" && category && (
        <ServiceListScreen
          categoryId={categoryId}
          onBack={() => setScreen("home")}
          onSelectService={handleServiceSelect}
          onSelectPersonalizado={() => { setIsPersonalizado(true); setScreen("landing"); }}
        />
      )}
      {screen === "variant" && variantParent && category && (
        <VariantPickerScreen
          parent={variantParent} category={category}
          onBack={() => setScreen("category")}
          onContinue={handleVariantContinue}
        />
      )}
      {screen === "landing" && category && (
        <PersonalizadoLanding
          category={category}
          onBack={() => setScreen("category")}
          onContinue={() => setScreen("form")}
        />
      )}
      {screen === "form" && category && (
        <PersonalizadoForm
          category={category}
          onBack={() => setScreen("landing")}
          onContinue={() => setScreen("checkout")}
          state={state} setState={setState}
        />
      )}
      {screen === "detail" && selected && category && (
        <ServiceDetailScreen
          service={selected} category={category} parent={variantParent}
          onBack={() => setScreen(variantParent ? "variant" : "category")}
          onContinue={(options) => {
            // Guardar as opções (produtos, frequência, preço efectivo) no state
            // para o FinalizarPedido usar e criar a ordem correcta
            setState(prev => ({ ...prev, serviceOptions: options }));
            setScreen("checkout");
          }}
        />
      )}
      {screen === "checkout" && category && (
        <FinalizarPedido
          selected={selected} category={category} isPersonalizado={isPersonalizado}
          onBack={() => setScreen(isPersonalizado ? "form" : "detail")}
          onConfirm={() => setScreen("done")}
          state={state} setState={setState}
        />
      )}
      {screen === "done" && <ConfirmadoScreen onRestart={restart} />}

      {/* Picker de categoria para o Personalizado directo da Home */}
      {personalizadoPicker && (
        <BottomSheet
          title="De que área é o trabalho?"
          onClose={() => setPersonalizadoPicker(false)}
        >
          <div style={{ padding: "4px 0 8px" }}>
            <div style={{ fontSize: 13, color: C.stone, lineHeight: 1.5, marginBottom: 16 }}>
              Escolha a categoria mais próxima. No passo seguinte descreve o trabalho por palavras suas e enviamos o técnico certo.
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
              {CATEGORIES.map(cat => {
                const Icon = cat.icon;
                return (
                  <button
                    key={cat.id}
                    onClick={() => handlePickerSelect(cat.id)}
                    style={{
                      background: C.paper,
                      border: `1px solid ${C.line}`, borderRadius: 12,
                      padding: "12px 10px", cursor: "pointer",
                      display: "flex", alignItems: "center", gap: 10,
                      textAlign: "left",
                      transition: "all 0.15s",
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = cat.color;
                      e.currentTarget.style.background = `${cat.color}08`;
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = C.line;
                      e.currentTarget.style.background = C.paper;
                    }}
                  >
                    <div style={{
                      width: 36, height: 36, borderRadius: 9,
                      background: `${cat.color}15`, color: cat.color,
                      display: "grid", placeItems: "center", flexShrink: 0,
                    }}>
                      <Icon size={18} />
                    </div>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: C.ink }}>
                      {cat.nome}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </BottomSheet>
      )}
    </>
  );
}
