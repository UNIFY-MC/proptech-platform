/* ═══════════════════════════════════════════════════════════════════════
 *  UploadFaturaStep — step 0 opcional do simulador
 *  ─────────────────────────────────────────────────────────────────────
 *  Props:
 *    onOcrDone(extracted)  — chamado quando OCR conclui com sucesso
 *      extracted: { seg?, kva?, kwh?, comercializador?, valor_atual?,
 *                   cpe?, factura_id, confidence, ocr_data, forcar_manual? }
 *    onSkip()              — utilizador escolhe preencher manualmente
 * ═══════════════════════════════════════════════════════════════════ */

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { uploadFaturaERunOcr } from '../lib/queries.js';

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

const MIME_ACEITES = {
  'application/pdf': ['.pdf'],
  'image/jpeg':      ['.jpg', '.jpeg'],
  'image/png':       ['.png'],
};

const STAGE_TEXT = {
  uploading:     'A enviar ficheiro…',
  inserting_row: 'A registar…',
  ocr_running:   'A extrair dados com IA…',
  done:          'Concluído',
};

function confidenceBadge(confidence) {
  if (confidence == null) return null;
  const pct = Math.round(confidence * 100);
  let bg, fg, label;
  if (confidence >= 0.8)       { bg = 'var(--green)'; fg = '#fff'; label = pct + '% confiança'; }
  else if (confidence >= 0.5)  { bg = 'var(--gold)';  fg = '#fff'; label = pct + '% confiança'; }
  else                         { bg = 'var(--red)';   fg = '#fff'; label = pct + '% — verificar'; }
  return (
    <span style={{
      fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 600,
      padding: '2px 8px', borderRadius: 4, background: bg, color: fg,
    }}>
      {label}
    </span>
  );
}

function fEurOcr(n) {
  if (n == null) return '—';
  return '€' + Number(n).toFixed(2);
}

export default function UploadFaturaStep({ onOcrDone, onSkip }) {
  const [fase, setFase] = useState('idle'); // idle | rgpd | uploading | done | error
  const [ficheiro, setFicheiro] = useState(null);
  const [progress, setProgress] = useState({ stage: '', pct: 0 });
  const [erroMsg, setErroMsg] = useState('');
  const [ocrResult, setOcrResult] = useState(null);

  const onDrop = useCallback((aceites, rejeitados) => {
    if (rejeitados && rejeitados.length > 0) {
      const r = rejeitados[0];
      const code = r.errors && r.errors[0] && r.errors[0].code;
      if (code === 'file-too-large') {
        setErroMsg('Ficheiro demasiado grande. Máximo 10 MB.');
      } else if (code === 'file-invalid-type') {
        setErroMsg('Tipo de ficheiro não suportado. Aceita PDF, JPG ou PNG.');
      } else {
        setErroMsg('Ficheiro inválido.');
      }
      return;
    }
    if (aceites && aceites.length > 0) {
      setFicheiro(aceites[0]);
      setErroMsg('');
      setFase('rgpd');
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: MIME_ACEITES,
    maxSize: MAX_SIZE_BYTES,
    multiple: false,
  });

  const iniciarUpload = async () => {
    if (!ficheiro) return;
    setFase('uploading');
    setErroMsg('');
    try {
      const resultado = await uploadFaturaERunOcr({
        file: ficheiro,
        onProgress: (p) => setProgress(p),
      });
      setOcrResult(resultado);
      setFase('done');
    } catch (e) {
      setErroMsg(e.message || 'Erro desconhecido durante o upload.');
      setFase('error');
    }
  };

  const usarDados = () => {
    if (!ocrResult) return;
    const d = ocrResult.ocr_data || {};
    onOcrDone({
      kva:             d.kva             != null ? d.kva             : null,
      kwh:             d.kwh_mensal      != null ? d.kwh_mensal      : null,
      comercializador: d.comercializador || null,
      valor_atual:     d.total_mensal    != null ? d.total_mensal    : null,
      cpe:             d.cpe             || null,
      factura_id:      ocrResult.factura_id,
      confidence:      d.confidence      != null ? d.confidence      : null,
      ocr_data:        d,
    });
  };

  const corrigirManualmente = () => {
    if (!ocrResult) return;
    const d = ocrResult.ocr_data || {};
    onOcrDone({
      kva:             d.kva             != null ? d.kva             : null,
      kwh:             d.kwh_mensal      != null ? d.kwh_mensal      : null,
      comercializador: d.comercializador || null,
      valor_atual:     d.total_mensal    != null ? d.total_mensal    : null,
      cpe:             d.cpe             || null,
      factura_id:      ocrResult.factura_id,
      confidence:      d.confidence      != null ? d.confidence      : null,
      ocr_data:        d,
      forcar_manual:   true,
    });
  };

  const tentarNovamente = () => {
    setFase('idle');
    setFicheiro(null);
    setProgress({ stage: '', pct: 0 });
    setErroMsg('');
    setOcrResult(null);
  };

  const card = {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    padding: '28px 32px',
    maxWidth: 520,
    margin: '0 auto',
  };
  const btnPrimary = {
    background: 'var(--blue)', color: '#fff', border: 'none', borderRadius: 6,
    padding: '9px 20px', fontSize: 12, fontFamily: 'var(--mono)',
    letterSpacing: '.08em', textTransform: 'uppercase', cursor: 'pointer',
  };
  const btnOutline = {
    background: 'none', color: 'var(--muted)', border: '1px solid var(--border)',
    borderRadius: 6, padding: '9px 20px', fontSize: 12, fontFamily: 'var(--mono)',
    letterSpacing: '.08em', textTransform: 'uppercase', cursor: 'pointer',
  };
  const btnGreen = {
    background: 'var(--green)', color: '#fff', border: 'none', borderRadius: 6,
    padding: '9px 20px', fontSize: 12, fontFamily: 'var(--mono)',
    letterSpacing: '.08em', textTransform: 'uppercase', cursor: 'pointer',
  };
  const titulo = {
    fontSize: 17, fontWeight: 700, color: 'var(--text)', marginBottom: 4, letterSpacing: '-.01em',
  };
  const sub = {
    fontSize: 12, color: 'var(--muted)', marginBottom: 24, lineHeight: 1.5,
  };
  const erroBox = {
    background: 'rgba(139,26,26,0.07)', border: '1px solid var(--red)',
    borderRadius: 6, padding: '10px 14px', fontSize: 12, color: 'var(--red)',
    fontFamily: 'var(--mono)', marginBottom: 14,
  };
  const row = {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginTop: 16,
  };
  const labelMono = {
    fontSize: 9, fontFamily: 'var(--mono)', letterSpacing: '.1em',
    textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 3,
  };

  // FASE: idle
  if (fase === 'idle') {
    const dropzone = {
      border: '2px dashed ' + (isDragActive ? 'var(--blue)' : 'var(--border2)'),
      borderRadius: 8,
      padding: '36px 24px',
      textAlign: 'center',
      cursor: 'pointer',
      background: isDragActive ? 'rgba(26,82,150,0.04)' : 'var(--surface2)',
      transition: 'all .15s',
      marginBottom: 20,
    };
    return (
      <div style={card}>
        <div style={titulo}>Carrega a tua fatura</div>
        <div style={sub}>
          Extraímos automaticamente os teus dados em segundos.<br />
          Preferes preencher manualmente? Usa o botão abaixo.
        </div>
        {erroMsg && <div style={erroBox}>{erroMsg}</div>}
        <div {...getRootProps()} style={dropzone}>
          <input {...getInputProps()} />
          <div style={{ fontSize: 13, color: isDragActive ? 'var(--blue)' : 'var(--muted)', fontFamily: 'var(--mono)' }}>
            {isDragActive ? 'Larga aqui o ficheiro' : 'Arrasta para aqui ou clica para escolher'}
          </div>
          <div style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--mono)', marginTop: 6, letterSpacing: '.06em', textTransform: 'uppercase' }}>
            PDF · JPG · PNG · Máx. 10 MB
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button style={btnOutline} onClick={onSkip}>Preencher manualmente</button>
        </div>
      </div>
    );
  }

  // FASE: modal RGPD
  if (fase === 'rgpd') {
    const tamanhoKB = Math.round((ficheiro ? ficheiro.size : 0) / 1024);
    return (
      <div style={card}>
        <div style={titulo}>Consentimento de dados</div>
        <div style={{ ...sub, marginBottom: 20 }}>Antes de continuar, precisamos do teu acordo.</div>
        <div style={{
          background: 'var(--surface2)', border: '1px solid var(--border)',
          borderRadius: 8, padding: '16px 20px', marginBottom: 20,
          fontSize: 12, color: 'var(--text)', lineHeight: 1.6,
        }}>
          <p style={{ fontWeight: 600, marginBottom: 8 }}>O que recolhemos e porquê</p>
          <p style={{ marginBottom: 6 }}>
            O ficheiro <strong>{ficheiro ? ficheiro.name : ''}</strong> ({tamanhoKB} KB) será guardado de forma privada e segura.
          </p>
          <ul style={{ paddingLeft: 16, marginBottom: 8 }}>
            <li>A tua fatura fica armazenada na tua conta, encriptada.</li>
            <li>Extraímos automaticamente: CPE, kVA, kWh, comercializador e valor mensal.</li>
            <li>Podes apagar a fatura a qualquer momento na tua ficha de cliente.</li>
            <li>Os dados são usados exclusivamente para calcular poupanças.</li>
          </ul>
          <p style={{ fontSize: 11, color: 'var(--muted)' }}>
            Retenção: indefinida, com direito ao apagamento garantido. Conforme RGPD Art. 17.
          </p>
        </div>
        <div style={row}>
          <button style={btnOutline} onClick={() => setFase('idle')}>Cancelar</button>
          <button style={btnPrimary} onClick={iniciarUpload}>Aceito e continuar</button>
        </div>
      </div>
    );
  }

  // FASE: uploading
  if (fase === 'uploading') {
    return (
      <div style={card}>
        <div style={titulo}>A processar fatura…</div>
        <div style={{ ...sub, marginBottom: 20 }}>{STAGE_TEXT[progress.stage] || 'A processar…'}</div>
        <div style={{ height: 4, background: 'var(--surface3)', borderRadius: 2, overflow: 'hidden', marginBottom: 8 }}>
          <div style={{ height: '100%', background: 'var(--blue)', borderRadius: 2, transition: 'width .3s ease', width: progress.pct + '%' }} />
        </div>
        <div style={{ fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--muted)', textAlign: 'right', marginBottom: 20 }}>
          {progress.pct}%
        </div>
        <div style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center' }}>
          {ficheiro ? ficheiro.name : ''}
        </div>
      </div>
    );
  }

  // FASE: error
  if (fase === 'error') {
    return (
      <div style={card}>
        <div style={titulo}>Não foi possível processar a fatura</div>
        <div style={erroBox}>{erroMsg}</div>
        <div style={row}>
          <button style={btnOutline} onClick={onSkip}>Preencher manualmente</button>
          <button style={btnPrimary} onClick={tentarNovamente}>Tentar novamente</button>
        </div>
      </div>
    );
  }

  // FASE: done
  if (fase === 'done' && ocrResult) {
    const d = ocrResult.ocr_data || {};
    const confidence = d.confidence != null ? d.confidence : ocrResult.ocr_confidence;
    const confidenceBaixo = confidence != null && confidence < 0.5;
    const gridOcr = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 20px', marginBottom: 20 };
    const valMono = { fontSize: 14, fontFamily: 'var(--mono)', fontWeight: 600, color: 'var(--text)' };

    return (
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <div style={titulo}>Dados extraídos</div>
          {confidenceBadge(confidence)}
        </div>
        <div style={{ ...sub, marginBottom: 20 }}>{ficheiro ? ficheiro.name : ''}</div>

        {confidenceBaixo && (
          <div style={{ background: 'rgba(139,26,26,0.07)', border: '1px solid var(--red)', borderRadius: 6, padding: '10px 14px', fontSize: 12, color: 'var(--red)', marginBottom: 16, lineHeight: 1.5 }}>
            Confiança baixa. Verifica os campos antes de continuar ou escolhe "Corrigir manualmente".
          </div>
        )}

        <div style={gridOcr}>
          {[
            { l: 'CPE',             v: d.cpe             || '—' },
            { l: 'Potência',        v: d.kva != null ? d.kva + ' kVA' : '—' },
            { l: 'Consumo mensal',  v: d.kwh_mensal != null ? d.kwh_mensal + ' kWh' : '—' },
            { l: 'Comercializador', v: d.comercializador  || '—' },
            { l: 'Plano',           v: d.plano            || '—' },
            { l: 'Total mensal',    v: fEurOcr(d.total_mensal) },
          ].map((item) => (
            <div key={item.l}>
              <div style={labelMono}>{item.l}</div>
              <div style={valMono}>{item.v}</div>
            </div>
          ))}
        </div>

        <div style={row}>
          <button style={btnOutline} onClick={corrigirManualmente}>Corrigir manualmente</button>
          <button style={btnGreen} onClick={usarDados}>Continuar com estes dados</button>
        </div>
        <div style={{ textAlign: 'center', marginTop: 12 }}>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--mono)' }} onClick={onSkip}>
            Começar sem dados da fatura
          </button>
        </div>
      </div>
    );
  }

  return null;
}
