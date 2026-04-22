import { useState, useRef, useMemo } from "react";
import {
  ArrowLeft, X, Check, Clock, Camera, Plus, MapPin, ChevronRight,
  Shield, Lock, MessageSquare, FileImage, RefreshCw, Wrench,
  Sparkles, Trash2, Tag, Receipt, Banknote, CreditCard, Info,
  Calendar, MapPinned, PartyPopper, Search, Star, Leaf, Zap,
} from "lucide-react";

// ═══════════════════════════════════════════════════════════════════
// PALETA v5-manutencao
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
// DADOS
// ═══════════════════════════════════════════════════════════════════
const TRAVEL_FEE = 5.90;
const PROTECTION_FEE = 0.98;
const PROTECTION_FEE_NOW = 0.00;
const IMEDIATO_FEE = 6.90;
const HOJE_FEE = 3.90;
const PROMO_CODE = "CHEGUEI50_";
const PROMO_SAVINGS = 4.99;

const PERSONALIZADO = {
  id: "personalizado",
  name: "Serviço personalizado",
  tagline: "Algo fora do comum? Descreva o trabalho e enviamos o técnico certo.",
  pricePerHour: 44.91,
  pricePerHourOriginal: 49.90,
  icon: "✨",
  type: "hourly",
};

const SUBCATEGORIES = [
  {
    id: "autoclismo", name: "Autoclismo e sanita", icon: "🚽",
    services: [
      { id: "auto-repair",    name: "Reparação de autoclismo",    price: 36.46,  priceOriginal: 42.90,  popular: true },
      { id: "auto-install",   name: "Instalação de autoclismo",   price: 30.43,  priceOriginal: 32.90 },
      { id: "seat-repair",    name: "Reparar tampo de sanita",    price: 27.65,  priceOriginal: 29.90 },
      { id: "seat-replace",   name: "Substituir tampo de sanita", price: 29.25,  priceOriginal: 32.50 },
      { id: "toilet-replace", name: "Substituir sanita",          price: 79.11,  priceOriginal: 87.90 },
      { id: "toilet-install", name: "Instalar sanita",            price: 57.15,  priceOriginal: 63.50 },
      { id: "toilet-remove",  name: "Remover sanita",             price: 57.15,  priceOriginal: 63.50 },
      { id: "toilet-unclog",  name: "Desentupir sanita",          price: 105.75, priceOriginal: 117.50 },
    ],
  },
  {
    id: "torneiras", name: "Torneiras", icon: "🚰",
    services: [
      { id: "bath-tap-repair",  name: "Reparar torneira de casa de banho",                          price: 35.55, priceOriginal: 39.50 },
      { id: "sink-tap-repair",  name: "Reparar torneira de lava-loiça",                             price: 35.55, priceOriginal: 39.50 },
      { id: "sink-tap-replace", name: "Substituir torneira de lavatório",                           price: 29.61, priceOriginal: 32.90 },
      { id: "kitchen-tap-eff",  name: "Substituir torneira de lava-loiça (Eficiência energética)",  price: 39.15, priceOriginal: 43.50, eco: true },
      { id: "bath-tap-eff",     name: "Substituir torneira de casa de banho (Eficiência energética)", price: 35.55, priceOriginal: 39.50, eco: true },
      { id: "safety-tap",       name: "Substituir torneira de segurança",                           price: 18.40, priceOriginal: 19.90 },
      { id: "bath-tap-install", name: "Instalar torneira de banheira",                              price: 35.55, priceOriginal: 39.50 },
    ],
  },
  {
    id: "fugas", name: "Fugas e diagnósticos", icon: "💧",
    services: [
      { id: "leak-diagnosis", name: "Diagnóstico de fuga de água",            price: 35.55,  priceOriginal: 39.50 },
      { id: "kitchen-leak",   name: "Fuga de água no lava-loiça",             price: 42.21,  priceOriginal: 46.90, popular: true },
      { id: "sink-leak",      name: "Fuga de água no lavatório",              price: 40.37,  priceOriginal: 42.50 },
      { id: "shower-leak",    name: "Reparar cabine de duche (Fuga de água)", price: 207.18, priceOriginal: 212.50 },
    ],
  },
  {
    id: "desentupimentos", name: "Desentupimentos", icon: "🌊",
    services: [
      { id: "kitchen-unclog",  name: "Desentupir lava-loiça",    price: 70.97, priceOriginal: 83.50 },
      { id: "bathroom-unclog", name: "Desentupir casa de banho", price: 83.25, priceOriginal: 92.50 },
    ],
  },
  {
    id: "lavatorio", name: "Lavatório", icon: "🪞",
    services: [
      { id: "valve-replace",  name: "Substituir válvula de lavatório", price: 33.15, priceOriginal: 34.90 },
      { id: "vanity-replace", name: "Substituir móvel de lavatório",   price: 82.35, priceOriginal: 91.50 },
      { id: "vanity-install", name: "Instalar móvel de lavatório",     price: 53.01, priceOriginal: 58.90 },
    ],
  },
  {
    id: "duche", name: "Duche e banheira", icon: "🚿",
    services: [
      { id: "shower-column",   name: "Substituir coluna de duche",                 price: 43.11,   priceOriginal: 47.90 },
      { id: "shower-head-eff", name: "Substituir chuveiro (Eficiência energética)", price: 35.01,   priceOriginal: 38.90, eco: true },
      { id: "shower-cabin",    name: "Substituir cabine de duche",                 price: 227.66,  priceOriginal: 233.50 },
      { id: "tub-to-shower",   name: "Substituir banheira por duche",              price: 2084.50, priceOriginal: null },
    ],
  },
  {
    id: "manutencao", name: "Manutenção", icon: "🧱",
    services: [
      { id: "grout-replace", name: "Substituir juntas de azulejos", price: 35.64, priceOriginal: 41.93 },
    ],
  },
];

const TIMESLOTS = [
  "07:00","07:30","08:00","08:30","09:00","09:30","10:00","10:30",
  "11:00","11:30","12:00","12:30","13:00","13:30","14:00","14:30",
  "15:00","15:30","16:00","16:30","17:00","17:30","18:00","18:30",
  "19:00","19:30","20:00","20:30","21:00","21:30","22:00",
];

// ═══════════════════════════════════════════════════════════════════
// HELPERS DE TEMPO
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
      label,
      date: fmtDate(d),
      extra: i === 0 ? HOJE_FEE : 0,
      dateObj: d,
    });
  }
  return days;
}

// Buffer de 90 minutos para slots do próprio dia
const BOOKING_BUFFER_MIN = 90;

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

function TopBar({ onBack, title, subtitle, onClose }) {
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
        }}>
          {title}
        </div>
        {subtitle && <div style={{ fontSize: 12, color: C.stone, marginTop: 1 }}>{subtitle}</div>}
      </div>
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
    }}>
      {children}
    </button>
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

// ═══════════════════════════════════════════════════════════════════
// BOTTOM SHEET
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
            width: 34, height: 34, borderRadius: 999,
            background: "transparent", border: "none", cursor: "pointer",
            display: "grid", placeItems: "center", color: C.ink,
          }}>
            <X size={18} />
          </button>
          <div className="serif" style={{
            flex: 1, fontSize: 17, fontWeight: 600, textAlign: "center", paddingRight: 34,
          }}>
            {title}
          </div>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 18px 0" }}>
          {children}
        </div>
        {footer && (
          <div style={{
            padding: "12px 18px 20px", borderTop: `1px solid ${C.line}`,
            background: C.cream, flexShrink: 0,
          }}>
            {footer}
          </div>
        )}
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MODAL — SELECIONAR DATA (com filtragem de slots passados)
// ═══════════════════════════════════════════════════════════════════

function ScheduleModal({ onClose, slots, onConfirm }) {
  const now = new Date();
  const DAYS = useMemo(() => getDays(), []);
  const todayAvailable = hasAvailableSlotsToday(now);

  // Se "hoje" não tem slots, abrir em "amanha"
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
          }}>
            Limpar tudo
          </button>
        )}
      </div>
      <PrimaryButton onClick={() => onConfirm(selected)} disabled={selected.length === 0}>
        Confirmar
      </PrimaryButton>
    </div>
  );

  return (
    <BottomSheet title="Selecionar data" onClose={onClose} footer={footer}>
      {/* Tabs dos dias */}
      <div className="no-scrollbar" style={{
        display: "flex", gap: 0, overflowX: "auto",
        borderBottom: `1px solid ${C.line}`, marginBottom: 16,
      }}>
        {DAYS.map(d => {
          const isActive = activeDay === d.id;
          const daySlots = selected.filter(s => s.day === d.id).length;
          const isHojeDisabled = d.id === "hoje" && !todayAvailable;
          return (
            <button
              key={d.id}
              onClick={() => !isHojeDisabled && setActiveDay(d.id)}
              disabled={isHojeDisabled}
              style={{
                flex: "0 0 auto", padding: "10px 14px",
                background: "transparent", border: "none",
                borderBottom: `2px solid ${isActive ? C.forest : "transparent"}`,
                cursor: isHojeDisabled ? "not-allowed" : "pointer",
                textAlign: "left", minWidth: 92,
                opacity: isHojeDisabled ? 0.4 : 1,
              }}
            >
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
                  }}>
                    {daySlots}
                  </span>
                )}
                {d.extra > 0 && (
                  <span style={{ fontSize: 10.5, color: C.amber, fontWeight: 600 }}>
                    +{eur(d.extra)}
                  </span>
                )}
              </div>
              <div style={{ fontSize: 11, color: C.stone, marginTop: 2 }}>
                {d.date}
              </div>
            </button>
          );
        })}
      </div>

      {/* Info banner */}
      <div style={{
        background: C.emeraldPale, border: `1px solid ${C.emeraldSoft}`,
        borderRadius: 12, padding: "10px 12px",
        display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 16,
      }}>
        <Calendar size={16} color={C.emerald} style={{ flexShrink: 0, marginTop: 2 }} />
        <div style={{ fontSize: 12.5, color: C.forestSoft, lineHeight: 1.4 }}>
          Tem um horário flexível? Pode selecionar <strong>até 5 horários disponíveis</strong> — aumenta a probabilidade de conseguir o técnico de preferência.
        </div>
      </div>

      {/* Aviso se hoje não tem slots */}
      {activeDay === "hoje" && !todayAvailable && (
        <div style={{
          background: C.amberSoft, border: `1px solid ${C.amber}`,
          borderRadius: 12, padding: "12px 14px", marginBottom: 16,
          display: "flex", gap: 10, alignItems: "flex-start",
        }}>
          <Info size={16} color={C.amber} style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={{ fontSize: 12.5, color: "#92400E", lineHeight: 1.4 }}>
            Sem horários disponíveis hoje. Escolha outro dia ou use a opção <strong>Imediato</strong> para chegada em 30-40 min.
          </div>
        </div>
      )}

      {/* Grid de horas */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, paddingBottom: 16,
      }}>
        {TIMESLOTS.map(t => {
          const bookable = isSlotBookable(activeDay, t, now);
          const sel = isSelected(activeDay, t);
          const atLimit = selected.length >= 5 && !sel;
          const disabled = !bookable || atLimit;

          return (
            <button
              key={t}
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
                transition: "all 0.12s",
              }}
              title={!bookable ? "Horário já passado ou demasiado próximo" : undefined}
            >
              {t}
            </button>
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
        <div style={{ fontSize: 14, fontWeight: 600, color: C.ink, marginBottom: 6 }}>
          Fotografias
        </div>
        <div style={{ fontSize: 12.5, color: C.stone, marginBottom: 12, lineHeight: 1.4 }}>
          Adicione imagens para ajudar o técnico a preparar-se para o serviço.
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
              }}>
                <X size={12} />
              </button>
            </div>
          ))}
          {localPhotos.length < 5 && (
            <button onClick={addPhoto} style={{
              aspectRatio: "1", borderRadius: 12, background: C.paper,
              border: `1.5px dashed ${C.stoneLight}`,
              display: "grid", placeItems: "center", cursor: "pointer", color: C.stone,
            }}>
              <Plus size={24} />
            </button>
          )}
        </div>
        <div style={{ fontSize: 11, color: C.stone, marginTop: 6, textAlign: "right" }}>
          {localPhotos.length}/5 fotografias
        </div>
      </div>

      <div style={{ marginTop: 24 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: C.ink, marginBottom: 6 }}>
          Notas sobre o serviço
        </div>
        <div style={{ fontSize: 12.5, color: C.stone, marginBottom: 12, lineHeight: 1.4 }}>
          Adicione notas como os exemplos seguintes:
        </div>
        <div style={{
          background: C.paper, border: `1px solid ${C.line}`,
          borderRadius: 12, padding: 12, marginBottom: 12,
        }}>
          <ExampleLine>Se precisa que o técnico compre algum material</ExampleLine>
          <ExampleLine>A marca e modelo do aparelho avariado, e o erro que aparece</ExampleLine>
          <ExampleLine>Áreas específicas da casa que deseja que sejam intervencionadas</ExampleLine>
          <ExampleLine last>Instruções de acesso — porteiro, código do prédio, estacionamento</ExampleLine>
        </div>
        <textarea
          value={localNotes}
          onChange={e => setLocalNotes(e.target.value)}
          maxLength={200}
          placeholder="Ex: Torneira da cozinha pinga há 2 dias, já substituí vedantes sem sucesso. Prédio com porteiro no R/C."
          style={{
            width: "100%", minHeight: 100, background: C.paper,
            border: `1px solid ${C.line}`, borderRadius: 12, padding: 14,
            fontSize: 13.5, fontFamily: "inherit", color: C.ink,
            resize: "vertical", outline: "none",
          }}
        />
        <div style={{ fontSize: 11, color: C.stone, marginTop: 4, textAlign: "right" }}>
          {localNotes.length}/200
        </div>
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
      <div style={{ fontSize: 12.5, color: C.stone, lineHeight: 1.45 }}>
        {children}
      </div>
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
        }}>
          Identificação fiscal
        </div>
        <FormField label="Nome" value={local.nome} onChange={v => setLocal(p => ({ ...p, nome: v }))} placeholder="Nome completo" />
        <FormField label="NIF" value={local.nif} onChange={v => setLocal(p => ({ ...p, nif: v.replace(/\D/g, "").slice(0, 9) }))} placeholder="9 dígitos" inputMode="numeric" />
      </div>
      <div style={{ marginTop: 28 }}>
        <div style={{
          fontSize: 13, fontWeight: 700, color: C.ink,
          textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 14,
        }}>
          Morada de faturação
        </div>
        <FormField label="Morada" value={local.morada} onChange={v => setLocal(p => ({ ...p, morada: v }))} placeholder="Rua, número, andar" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.3fr", gap: 10 }}>
          <FormField label="Código postal" value={local.cp} onChange={v => setLocal(p => ({ ...p, cp: v }))} placeholder="0000-000" />
          <FormField label="Localidade" value={local.localidade} onChange={v => setLocal(p => ({ ...p, localidade: v }))} placeholder="Cidade" />
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
// BLOCO — JÁ FALTA POUCO
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
        position: "relative",
      }}>
        <Sparkles size={10} /> Já falta pouco!
      </div>
      <div className="serif" style={{
        fontSize: 20, fontWeight: 500, marginTop: 8, letterSpacing: -0.3, position: "relative",
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
                  fontSize: 13.5,
                  fontWeight: step.current ? 600 : 400,
                  color: step.current ? C.paper : "rgba(255,255,255,0.7)",
                }}>
                  {step.title}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// ECRÃ 1 — LISTA DE SERVIÇOS (catálogo + personalizado hero)
// ═══════════════════════════════════════════════════════════════════

function ServiceListScreen({ onBack, onSelectService, onSelectPersonalizado }) {
  const [activeSub, setActiveSub] = useState("todos");
  const [search, setSearch] = useState("");
  const sectionRefs = useRef({});

  const filtered = search
    ? SUBCATEGORIES.map(sub => ({
        ...sub, services: sub.services.filter(s => s.name.toLowerCase().includes(search.toLowerCase())),
      })).filter(sub => sub.services.length > 0)
    : activeSub === "todos" ? SUBCATEGORIES : SUBCATEGORIES.filter(s => s.id === activeSub);

  const scrollToSub = (id) => {
    setActiveSub(id);
    setTimeout(() => sectionRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };

  const totalServicos = SUBCATEGORIES.reduce((n, s) => n + s.services.length, 0);

  return (
    <Shell>
      <TopBar onBack={onBack} title="Canalização" subtitle={`${totalServicos} serviços · Caldas da Rainha`} />

      {/* Pesquisa */}
      <div style={{ padding: "14px 18px 0" }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          background: C.paper, border: `1px solid ${C.line}`,
          borderRadius: 12, padding: "10px 14px",
        }}>
          <Search size={16} color={C.stone} />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Procurar serviço..."
            style={{
              flex: 1, border: "none", outline: "none", background: "transparent",
              fontSize: 14, fontFamily: "inherit", color: C.ink,
            }}
          />
          {search && (
            <button onClick={() => setSearch("")} style={{
              background: "transparent", border: "none", cursor: "pointer", color: C.stone,
              display: "grid", placeItems: "center",
            }}>
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Pills */}
      {!search && (
        <div className="no-scrollbar" style={{
          display: "flex", gap: 6, overflowX: "auto",
          padding: "14px 18px 6px", scrollSnapType: "x proximity",
        }}>
          <SubPill active={activeSub === "todos"} onClick={() => scrollToSub("todos")}>Todos</SubPill>
          {SUBCATEGORIES.map(sub => (
            <SubPill key={sub.id} active={activeSub === sub.id} onClick={() => scrollToSub(sub.id)}>
              {sub.icon} {sub.name}
            </SubPill>
          ))}
        </div>
      )}

      <div style={{ padding: "4px 18px 140px" }}>
        {/* Personalizado HERO */}
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
            }}>✨</div>
            <div style={{
              display: "flex", alignItems: "center", gap: 6,
              fontSize: 10, fontWeight: 700, letterSpacing: 1.2,
              textTransform: "uppercase", opacity: 0.8, color: C.emeraldBright,
            }}>
              <Sparkles size={11} /> À medida
            </div>
            <div className="serif" style={{
              fontSize: 22, fontWeight: 500, marginTop: 8, lineHeight: 1.2,
            }}>
              Serviço personalizado
            </div>
            <div style={{ fontSize: 13, opacity: 0.85, marginTop: 6, maxWidth: 320, lineHeight: 1.4 }}>
              Algo fora do comum? Descreva o trabalho e enviamos o técnico certo.
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
                    {eur(PERSONALIZADO.pricePerHourOriginal)}
                  </span>
                  <span className="serif" style={{ fontSize: 22, fontWeight: 600, color: C.emeraldBright }}>
                    {eur(PERSONALIZADO.pricePerHour)}
                  </span>
                </div>
              </div>
              <div style={{
                background: C.emerald, color: C.paper, padding: "8px 14px",
                borderRadius: 999, fontSize: 12, fontWeight: 600,
                display: "flex", alignItems: "center", gap: 4,
              }}>
                Personalizar <ChevronRight size={14} />
              </div>
            </div>
          </button>
        )}

        {/* Subcategorias */}
        {filtered.map(sub => (
          <div key={sub.id} ref={el => (sectionRefs.current[sub.id] = el)}
            style={{ marginTop: 28, scrollMarginTop: 140 }}
          >
            <div style={{
              display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10,
            }}>
              <div className="serif" style={{ fontSize: 17, fontWeight: 600, letterSpacing: -0.15 }}>
                {sub.icon} {sub.name}
              </div>
              <div style={{ fontSize: 11, color: C.stone, fontWeight: 500 }}>{sub.services.length}</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {sub.services.map(s => (
                <ServiceCard key={s.id} service={s} onClick={() => onSelectService(s)} />
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
    }}>
      {children}
    </button>
  );
}

function ServiceCard({ service, onClick }) {
  const hasDiscount = service.priceOriginal && service.priceOriginal > service.price;
  const discountPct = hasDiscount
    ? Math.round(((service.priceOriginal - service.price) / service.priceOriginal) * 100)
    : 0;

  return (
    <button onClick={onClick} style={{
      background: C.paper, border: `1px solid ${C.line}`,
      borderRadius: 14, padding: 12,
      display: "flex", gap: 12, alignItems: "center",
      cursor: "pointer", textAlign: "left", width: "100%",
    }}>
      <div style={{
        width: 56, height: 56, flexShrink: 0, borderRadius: 12,
        background: service.eco ? "#E8F5EE" : C.emeraldPale,
        color: service.eco ? "#2D7A5F" : C.emerald,
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
          }}>
            <Star size={11} fill={C.paper} color={C.paper} />
          </div>
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: C.ink, lineHeight: 1.25 }}>
          {service.name}
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 6, flexWrap: "wrap" }}>
          {service.eco && <Chip tone="eco" icon={Leaf}>Eco</Chip>}
          {service.popular && <Chip tone="emerald" icon={Star}>Popular</Chip>}
          {hasDiscount && discountPct >= 10 && <Chip tone="discount">−{discountPct}%</Chip>}
        </div>
        <div style={{ marginTop: 6 }}>
          <PriceTag price={service.price} priceOriginal={service.priceOriginal} size="sm" />
        </div>
      </div>
      <ChevronRight size={18} color={C.stone} style={{ flexShrink: 0 }} />
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════════
// ECRÃ 2 — LANDING PERSONALIZADO
// ═══════════════════════════════════════════════════════════════════

function PersonalizadoLanding({ onBack, onContinue }) {
  return (
    <Shell>
      <TopBar onBack={onBack} title="" />
      <div style={{ padding: "8px 18px 140px" }}>
        <div style={{
          background: C.emeraldPale, borderRadius: 24,
          padding: "36px 20px 28px", textAlign: "center",
          position: "relative", overflow: "hidden",
        }}>
          <div style={{ fontSize: 76, lineHeight: 1, position: "relative" }}>✨</div>
          <div style={{
            display: "inline-flex", gap: 5, alignItems: "center",
            background: C.paper, color: C.emerald,
            padding: "5px 12px", borderRadius: 999,
            fontSize: 10, fontWeight: 700, letterSpacing: 1.3, textTransform: "uppercase",
            marginTop: 16, position: "relative", border: `1px solid ${C.emeraldSoft}`,
          }}>
            <Sparkles size={11} /> Serviço personalizado
          </div>
          <div className="serif" style={{
            fontSize: 26, fontWeight: 500, marginTop: 12, lineHeight: 1.15,
            letterSpacing: -0.4, color: C.ink, position: "relative",
          }}>
            Procura um serviço <em style={{ color: C.emerald, fontStyle: "italic" }}>à medida</em>?
          </div>
          <div style={{
            fontSize: 13.5, color: C.stone, marginTop: 10, lineHeight: 1.5,
            maxWidth: 320, margin: "10px auto 0", position: "relative",
          }}>
            Descreva o trabalho e o seu técnico de confiança aparece para resolver — à hora, sem surpresas.
          </div>
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
                {eur(PERSONALIZADO.pricePerHourOriginal)}
              </span>
              <span className="serif" style={{ fontSize: 26, fontWeight: 600, color: C.forest }}>
                {eur(PERSONALIZADO.pricePerHour)}
              </span>
            </div>
          </div>
          <div style={{
            background: C.emeraldSoft, color: C.emeraldDark,
            padding: "6px 10px", borderRadius: 999,
            fontSize: 11, fontWeight: 700, letterSpacing: 0.3,
          }}>−10%</div>
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
            <ValueRow icon={Sparkles} title="Tarefas únicas ou difíceis de explicar" desc="Ideal para quando o trabalho não está no catálogo standard." />
            <ValueRow icon={RefreshCw} title="Várias pequenas tarefas numa só visita" desc="Agrupa e resolve tudo numa deslocação — poupa tempo e taxa." />
            <ValueRow icon={Check} title="Podemos já ter o que procura" desc="Antes de pedir à medida, consulte os +500 serviços do catálogo." />
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
// ECRÃ 3 — FORMULÁRIO PERSONALIZADO
// ═══════════════════════════════════════════════════════════════════

function PersonalizadoForm({ onBack, onContinue, state, setState }) {
  const hoursEstimate = (state.horas || 1) * PERSONALIZADO.pricePerHour;
  const canContinue = (state.description || "").length >= 30;

  return (
    <Shell>
      <TopBar onBack={onBack} title="Serviço personalizado" />
      <div style={{ padding: "8px 18px 140px" }}>
        <div style={{
          background: C.emeraldPale, border: `1px solid ${C.emeraldSoft}`,
          borderRadius: 12, padding: "12px 16px",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <div style={{ fontSize: 12, color: C.stone, fontWeight: 500 }}>Por hora</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
            <span style={{ fontSize: 11.5, color: C.stone, textDecoration: "line-through" }}>
              {eur(PERSONALIZADO.pricePerHourOriginal)}
            </span>
            <span className="serif" style={{ fontSize: 16, fontWeight: 600, color: C.forest }}>
              {eur(PERSONALIZADO.pricePerHour)}
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
            placeholder="Descreva o problema ou tarefa..." maxLength={500}
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
// ECRÃ 4 — DETALHE DE SERVIÇO (regular, versão compacta)
// ═══════════════════════════════════════════════════════════════════

function ServiceDetailScreen({ service, onBack, onContinue }) {
  return (
    <Shell>
      <TopBar onBack={onBack} title={service.name} />
      <div style={{ padding: "16px 18px 140px" }}>
        <div style={{
          background: C.emeraldPale, borderRadius: 20,
          padding: "32px 20px", textAlign: "center", overflow: "hidden",
        }}>
          <div style={{ fontSize: 60 }}>🔧</div>
          <div className="serif" style={{ fontSize: 22, fontWeight: 500, marginTop: 12 }}>
            {service.name}
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 12, flexWrap: "wrap" }}>
            <Chip icon={Shield} tone="emerald">90 dias garantia</Chip>
            {service.eco && <Chip icon={Leaf} tone="eco">Eco</Chip>}
            {service.popular && <Chip icon={Star} tone="emerald">Popular</Chip>}
          </div>
        </div>

        <div style={{ marginTop: 20, padding: "14px 0", borderTop: `1px solid ${C.line}`, borderBottom: `1px solid ${C.line}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 12, color: C.stone, marginBottom: 4 }}>Preço fixo do serviço</div>
              <PriceTag price={service.price} priceOriginal={service.priceOriginal} size="lg" />
            </div>
            <Chip tone="emerald" icon={Lock}>Sem surpresas</Chip>
          </div>
        </div>

        <div style={{
          marginTop: 20, padding: 16, background: C.paper,
          border: `1px solid ${C.line}`, borderRadius: 14,
          display: "flex", gap: 12, alignItems: "flex-start",
        }}>
          <Info size={18} color={C.emerald} style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={{ fontSize: 13, color: C.ink, lineHeight: 1.5 }}>
            Este serviço tem preço fixo. O detalhe do que está incluído, não incluído, variações e FAQ está a ser enriquecido — pode avançar com a reserva mesmo assim.
          </div>
        </div>

        <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 16 }}>
          <ValueRow icon={Lock} title="Técnico fixo, escolhido por si" desc="Sempre o mesmo profissional da nossa rede de confiança." />
          <ValueRow icon={Shield} title="90 dias de garantia" desc="Se o problema voltar, regressamos sem custos adicionais." />
          <ValueRow icon={MessageSquare} title="Chat directo e relatório fotográfico" desc="Fala com o técnico e recebe relatório no fim." />
        </div>
      </div>

      <StickyCTA>
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "baseline",
          marginBottom: 10, padding: "0 4px",
        }}>
          <span style={{ fontSize: 12, color: C.stone }}>Preço</span>
          <PriceTag price={service.price} priceOriginal={service.priceOriginal} size="lg" />
        </div>
        <PrimaryButton onClick={onContinue}>Continuar</PrimaryButton>
      </StickyCTA>
    </Shell>
  );
}

// ═══════════════════════════════════════════════════════════════════
// ECRÃ 5 — FINALIZAR PEDIDO (unificado: personalizado + regular)
// ═══════════════════════════════════════════════════════════════════

function FinalizarPedido({ selected, isPersonalizado, onBack, onConfirm, state, setState }) {
  const [modal, setModal] = useState(null);

  // Cálculo de preço
  const servicePrice = isPersonalizado
    ? (state.horas || 1) * PERSONALIZADO.pricePerHour
    : selected.price;
  const servicePriceOriginal = isPersonalizado
    ? (state.horas || 1) * PERSONALIZADO.pricePerHourOriginal
    : selected.priceOriginal;

  // Surcharge (Imediato OU slots Hoje)
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

  const scheduleOk =
    state.scheduleMode === "imediato" ||
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
            }}>
              <MapPin size={16} fill={C.paper} />
            </div>
          </div>
          <button style={{
            position: "absolute", bottom: 14, left: "50%", transform: "translateX(-50%)",
            background: C.paper, color: C.ink,
            border: `1px solid ${C.line}`, borderRadius: 999,
            padding: "6px 14px", fontSize: 12, fontWeight: 600,
            cursor: "pointer", boxShadow: `0 4px 12px -4px rgba(0,0,0,0.1)`,
          }}>
            Editar localização
          </button>
        </div>

        <div style={{ padding: "16px 18px 0" }}>
          {/* Morada */}
          <div style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "12px 0", borderBottom: `1px solid ${C.line}`,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: C.emeraldPale, color: C.emerald,
              display: "grid", placeItems: "center", flexShrink: 0,
            }}>
              <MapPin size={18} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Rua Palmira Bastos, 4</div>
              <div style={{ fontSize: 12, color: C.stone }}>Caldas da Rainha</div>
            </div>
            <ChevronRight size={18} color={C.stone} />
          </div>

          {/* Agendar / Imediato — lado a lado */}
          <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {/* Agendar */}
            <button
              onClick={() => {
                setState(p => ({ ...p, scheduleMode: "agendar" }));
                setModal("schedule");
              }}
              style={{
                background: state.scheduleMode === "agendar" ? C.emeraldPale : C.paper,
                border: `2px solid ${state.scheduleMode === "agendar" ? C.emerald : C.line}`,
                borderRadius: 14, padding: 14, textAlign: "left", cursor: "pointer",
                position: "relative",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Calendar size={16} color={state.scheduleMode === "agendar" ? C.emerald : C.stone} />
                <span style={{ fontSize: 14, fontWeight: 600 }}>Agendar</span>
              </div>
              <div style={{ fontSize: 11.5, color: C.stone, marginTop: 4, lineHeight: 1.3 }}>
                {state.scheduleMode === "agendar" && slots.length > 0
                  ? slots.length === 1
                    ? `${slots[0].dayLabel}, ${slots[0].time}`
                    : `${slots.length} horários flexíveis`
                  : "Selecione dia e hora"}
              </div>
            </button>

            {/* Imediato */}
            <button
              onClick={() => setState(p => ({ ...p, scheduleMode: "imediato", selectedSlots: [] }))}
              style={{
                background: state.scheduleMode === "imediato" ? C.emeraldPale : C.paper,
                border: `2px solid ${state.scheduleMode === "imediato" ? C.emerald : C.line}`,
                borderRadius: 14, padding: 14, textAlign: "left", cursor: "pointer",
                position: "relative",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Zap size={16} color={state.scheduleMode === "imediato" ? C.emerald : C.stone} />
                <span style={{ fontSize: 14, fontWeight: 600 }}>Imediato</span>
                <span style={{
                  marginLeft: "auto", fontSize: 10, color: "#92400E", fontWeight: 700,
                  background: C.amberSoft, padding: "1px 5px", borderRadius: 4,
                }}>
                  +{eur(IMEDIATO_FEE)}
                </span>
              </div>
              <div style={{ fontSize: 11.5, color: C.stone, marginTop: 4, lineHeight: 1.3 }}>
                30-40 minutos
              </div>
            </button>
          </div>
        </div>

        <Divisor />

        {/* O seu serviço */}
        <div style={{ padding: "0 18px" }}>
          <div className="serif" style={{ fontSize: 18, fontWeight: 600 }}>O seu serviço</div>

          <div style={{
            marginTop: 12, display: "flex", gap: 12, alignItems: "flex-start",
            padding: "14px", background: C.paper,
            border: `1px solid ${C.line}`, borderRadius: 14,
          }}>
            <div style={{
              width: 48, height: 48, flexShrink: 0, borderRadius: 10,
              background: C.emeraldPale, color: C.emerald,
              display: "grid", placeItems: "center", fontSize: 22,
            }}>
              {isPersonalizado ? "✨" : <Wrench size={22} />}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>
                {isPersonalizado ? "Serviço personalizado" : selected.name}
              </div>
              <div style={{ fontSize: 11.5, color: C.stone, marginTop: 2 }}>
                {isPersonalizado
                  ? `${state.horas || 1}h × ${eur(PERSONALIZADO.pricePerHour)}/h`
                  : "Preço fixo do serviço"}
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
            }}>
              <Trash2 size={14} />
            </button>
          </div>

          {/* Fotos e notas */}
          <button
            onClick={() => setModal("photos")}
            style={{
              marginTop: 10, width: "100%",
              background: C.paper, border: `1px solid ${C.line}`,
              borderRadius: 14, padding: 14,
              display: "flex", alignItems: "center", gap: 12,
              cursor: "pointer", textAlign: "left",
            }}
          >
            <div style={{
              width: 36, height: 36, flexShrink: 0, borderRadius: 10,
              background: state.notes || (state.photos || []).length ? C.emeraldPale : C.stoneLight,
              color: state.notes || (state.photos || []).length ? C.emerald : C.stone,
              display: "grid", placeItems: "center",
            }}>
              <FileImage size={18} />
            </div>
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

        {/* Resumo de pagamento */}
        <div style={{ padding: "0 18px" }}>
          <div className="serif" style={{ fontSize: 18, fontWeight: 600 }}>Detalhes do pagamento</div>
          <div style={{
            marginTop: 12, padding: 16, background: C.paper,
            border: `1px solid ${C.line}`, borderRadius: 14,
          }}>
            <LineRow label="Subtotal" value={servicePrice} valueOriginal={servicePriceOriginal} />
            <LineRow label="Taxa de deslocação" value={TRAVEL_FEE} />
            <LineRow label="Taxa de proteção" value={PROTECTION_FEE_NOW} valueOriginal={PROTECTION_FEE} strike />
            {scheduleSurcharge > 0 && (
              <LineRow label={scheduleSurchargeLabel} value={scheduleSurcharge} />
            )}
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

        {/* Já falta pouco */}
        <div style={{ padding: "20px 18px 0" }}>
          <JaFaltaPouco />
        </div>

        {/* Método de pagamento */}
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

        {/* O que inclui sempre */}
        <div style={{ padding: "0 18px" }}>
          <div className="serif" style={{ fontSize: 18, fontWeight: 600 }}>O que inclui sempre</div>
          <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 18 }}>
            <ValueRow icon={Lock} title="Técnico fixo, escolhido por si" desc="Sempre o mesmo profissional da nossa rede de confiança — nunca anónimo." />
            <ValueRow icon={Shield} title="90 dias de garantia" desc="Se o mesmo problema voltar, regressamos sem custos adicionais." />
            <ValueRow icon={RefreshCw} title="Cancelamento livre" desc="Cancele ou reagende gratuitamente até 15 min ou antes de ser atribuído." />
            <ValueRow icon={Wrench} title="Materiais aprovados por si" desc="Qualquer custo extra precisa da sua confirmação antes de ser cobrado." />
            <ValueRow icon={MessageSquare} title="Chat directo e relatório fotográfico" desc="Fala com o técnico a qualquer momento e recebe relatório no fim." />
          </div>
        </div>
      </div>

      <StickyCTA banner={`Reserve agora e poupe ${eur(PROMO_SAVINGS)} em descontos`}>
        <PrimaryButton onClick={onConfirm} disabled={!canBook}>
          {!state.paymentMethod
            ? "Escolha método de pagamento"
            : !scheduleOk
              ? "Escolha Agendar ou Imediato"
              : "Agendar serviço"}
        </PrimaryButton>
      </StickyCTA>

      {/* Modais */}
      {modal === "schedule" && (
        <ScheduleModal
          slots={state.selectedSlots}
          onClose={() => setModal(null)}
          onConfirm={(slots) => {
            setState(p => ({ ...p, selectedSlots: slots, scheduleMode: "agendar" }));
            setModal(null);
          }}
        />
      )}
      {modal === "photos" && (
        <PhotosNotesModal
          notes={state.notes} photos={state.photos}
          onClose={() => setModal(null)}
          onConfirm={({ notes, photos }) => {
            setState(p => ({ ...p, notes, photos }));
            setModal(null);
          }}
        />
      )}
      {modal === "billing" && (
        <BillingModal
          billing={state.billing}
          onClose={() => setModal(null)}
          onConfirm={(billing) => {
            setState(p => ({ ...p, billing }));
            setModal(null);
          }}
        />
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
        <span style={{
          fontWeight: 600,
          color: strike && value === 0 ? C.emerald : C.ink,
        }}>
          {eur(value)}
        </span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// ECRÃ FINAL
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
        }}>
          <Check size={36} strokeWidth={3} />
        </div>
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
        }}>
          ← Ver demo novamente
        </button>
      </div>
    </Shell>
  );
}

// ═══════════════════════════════════════════════════════════════════
// APP ROOT
// ═══════════════════════════════════════════════════════════════════

export default function App() {
  const [screen, setScreen] = useState("list");
  const [selected, setSelected] = useState(null);
  const [isPersonalizado, setIsPersonalizado] = useState(false);
  const [state, setState] = useState({
    description: "", horas: 1,
    scheduleMode: null, selectedSlots: [],
    notes: "", photos: [], billing: null, paymentMethod: null,
  });

  const restart = () => {
    setSelected(null); setIsPersonalizado(false);
    setState({
      description: "", horas: 1,
      scheduleMode: null, selectedSlots: [],
      notes: "", photos: [], billing: null, paymentMethod: null,
    });
    setScreen("list");
  };

  return (
    <>
      {screen === "list" && (
        <ServiceListScreen
          onBack={restart}
          onSelectService={(s) => { setSelected(s); setIsPersonalizado(false); setScreen("detail"); }}
          onSelectPersonalizado={() => { setSelected(PERSONALIZADO); setIsPersonalizado(true); setScreen("landing"); }}
        />
      )}
      {screen === "landing" && (
        <PersonalizadoLanding
          onBack={() => setScreen("list")}
          onContinue={() => setScreen("form")}
        />
      )}
      {screen === "form" && (
        <PersonalizadoForm
          onBack={() => setScreen("landing")}
          onContinue={() => setScreen("checkout")}
          state={state} setState={setState}
        />
      )}
      {screen === "detail" && selected && (
        <ServiceDetailScreen
          service={selected}
          onBack={() => setScreen("list")}
          onContinue={() => setScreen("checkout")}
        />
      )}
      {screen === "checkout" && selected && (
        <FinalizarPedido
          selected={selected}
          isPersonalizado={isPersonalizado}
          onBack={() => setScreen(isPersonalizado ? "form" : "detail")}
          onConfirm={() => setScreen("done")}
          state={state} setState={setState}
        />
      )}
      {screen === "done" && <ConfirmadoScreen onRestart={restart} />}
    </>
  );
}
