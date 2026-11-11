// Autoajuste: en las cajas marcadas con data-ajustar, si el texto no cabe se
// reduce su tamaño de letra (de 0,5 en 0,5 px) hasta que quepa o hasta el
// mínimo de data-ajustar-min (10 px por defecto). Así un título corto sale al
// tamaño del diseño y uno largo no se monta sobre el resto del certificado.
//
// En la plantilla: <div class="titulo" data-ajustar data-ajustar-min="11">
//   <p>{{titulo}}</p></div>, con la caja de alto y ancho fijos.
export function ajustarTextos(doc: Document) {
  const vista = doc.defaultView;
  if (!vista) return;
  for (const caja of Array.from(doc.querySelectorAll<HTMLElement>("[data-ajustar]"))) {
    const texto = (caja.firstElementChild as HTMLElement | null) ?? caja;
    const minimo = Number(caja.dataset.ajustarMin) || 10;
    let tamano = parseFloat(vista.getComputedStyle(texto).fontSize);
    // Espacio útil de la caja (sin su relleno).
    const estilo = vista.getComputedStyle(caja);
    const alto =
      caja.clientHeight - parseFloat(estilo.paddingTop) - parseFloat(estilo.paddingBottom);
    const ancho =
      caja.clientWidth - parseFloat(estilo.paddingLeft) - parseFloat(estilo.paddingRight);
    let anchoUtil = ancho;
    const noCabe = () => texto.scrollHeight > alto + 1 || texto.scrollWidth > anchoUtil + 1;
    const reducir = () => {
      while (noCabe() && tamano > minimo) {
        tamano = Math.max(minimo, tamano - 0.5);
        texto.style.fontSize = `${tamano}px`;
      }
    };
    reducir();
    // Si ni con el mínimo cabe y la caja admite más ancho (data-ajustar-ancho-max),
    // se ensancha centrada y se vuelve a ajustar desde el tamaño del diseño. Solo
    // pasa con textos muy largos: el resto sale igual que antes.
    const anchoMax = Number(caja.dataset.ajustarAnchoMax) || 0;
    if (noCabe() && anchoMax > caja.offsetWidth) {
      const extra = anchoMax - caja.offsetWidth;
      caja.style.left = `${caja.offsetLeft - extra / 2}px`;
      caja.style.width = `${anchoMax}px`;
      anchoUtil = ancho + extra;
      texto.style.fontSize = "";
      tamano = parseFloat(vista.getComputedStyle(texto).fontSize);
      reducir();
    }
  }
}
