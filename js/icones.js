// Ícones em SVG inline — nada de emoji.
const svg = (corpo, extra = '') =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" ${extra}>${corpo}</svg>`;

export const ic = {
  mais: svg('<path d="M12 5v14M5 12h14"/>'),
  fechar: svg('<path d="M18 6 6 18M6 6l12 12"/>'),
  seta: svg('<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>'),
  lapis: svg('<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>'),
  lixeira: svg('<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/>'),
  camera: svg('<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2Z"/><circle cx="12" cy="13" r="4"/>'),
  escudo: svg('<path d="M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5Z"/>'),
  camisa: svg('<path d="M16 3 12 5 8 3 3 6l2 4 2-1v11h10V9l2 1 2-4Z"/>'),
  som: svg('<path d="M11 5 6 9H2v6h4l5 4Z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/>'),
  semSom: svg('<path d="M11 5 6 9H2v6h4l5 4Z"/><path d="M22 9l-6 6M16 9l6 6"/>'),
  pessoa: svg('<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/>'),
  troca: svg('<path d="M7 4 3 8l4 4"/><path d="M3 8h13a5 5 0 0 1 0 10h-3"/>'),
  play: svg('<path d="M6 4l14 8-14 8Z" fill="currentColor" stroke-width="1"/>'),
  pausa: svg('<path d="M8 4v16M16 4v16" stroke-width="3.2"/>'),
  saida: svg('<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5M21 12H9"/>'),
  campo: svg('<rect x="2" y="4" width="20" height="16" rx="2"/><path d="M12 4v16"/><circle cx="12" cy="12" r="3"/>'),
};
