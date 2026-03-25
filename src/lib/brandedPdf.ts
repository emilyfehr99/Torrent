import { jsPDF } from 'jspdf';
import { BRAND, TEAM_LOGO_PATH } from './branding';

function loadImageDimensions(dataUrl: string): Promise<{ w: number; h: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => reject(new Error('image load failed'));
    img.src = dataUrl;
  });
}

export async function fetchLogoDataUrl(path: string = TEAM_LOGO_PATH): Promise<string | null> {
  try {
    const res = await fetch(path);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const r = new FileReader();
      r.onloadend = () => resolve(r.result as string);
      r.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/**
 * Letter-size PDF with Torrent teal header, optional logo, navy title, body text.
 */
export async function buildBrandedPdf(opts: {
  title: string;
  subtitle?: string;
  body: string;
  filename: string;
}): Promise<void> {
  const doc = new jsPDF({ unit: 'mm', format: 'letter' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const m = 14;
  const maxW = pageW - m * 2;

  const teal = BRAND.teal;
  const navy = BRAND.navy;

  doc.setFillColor(teal[0], teal[1], teal[2]);
  doc.rect(0, 0, pageW, 10, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('SEATTLE TORRENT · MICROSTATS', m, 6.5);

  const logoUrl = await fetchLogoDataUrl();
  let yBody = 22;

  doc.setTextColor(navy[0], navy[1], navy[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);

  if (logoUrl) {
    try {
      const { w: iw, h: ih } = await loadImageDimensions(logoUrl);
      const logoH = 16;
      const logoW = (logoH * iw) / ih;
      doc.addImage(logoUrl, 'PNG', m, 12, logoW, logoH);
      doc.text(opts.title, m + logoW + 4, 18);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(BRAND.muted[0], BRAND.muted[1], BRAND.muted[2]);
      if (opts.subtitle) {
        doc.text(opts.subtitle, m + logoW + 4, 24);
      }
      yBody = 12 + logoH + 8;
    } catch {
      doc.text(opts.title, m, 20);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(BRAND.muted[0], BRAND.muted[1], BRAND.muted[2]);
      if (opts.subtitle) doc.text(opts.subtitle, m, 26);
      yBody = 32;
    }
  } else {
    doc.text(opts.title, m, 20);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(BRAND.muted[0], BRAND.muted[1], BRAND.muted[2]);
    if (opts.subtitle) doc.text(opts.subtitle, m, 26);
    yBody = 32;
  }

  doc.setDrawColor(BRAND.coral[0], BRAND.coral[1], BRAND.coral[2]);
  doc.setLineWidth(0.35);
  doc.line(m, yBody - 4, pageW - m, yBody - 4);

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const lines = doc.splitTextToSize(opts.body, maxW);
  const lineH = 5;
  let y = yBody;
  const footer = () => {
    doc.setFontSize(7.5);
    doc.setTextColor(BRAND.muted[0], BRAND.muted[1], BRAND.muted[2]);
    doc.text(
      `Seattle Torrent Analytics · ${new Date().toLocaleString()}`,
      m,
      pageH - 7,
    );
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(10);
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (y + lineH > pageH - 14) {
      footer();
      doc.addPage();
      y = 18;
    }
    doc.text(line, m, y);
    y += lineH;
  }
  footer();

  doc.save(opts.filename);
}
