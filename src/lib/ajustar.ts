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
    const noCabe = () =>
      texto.scrollHeight > caja.clientHeight + 1 || texto.scrollWidth > caja.clientWidth + 1;
    while (noCabe() && tamano > minimo) {
      tamano = Math.max(minimo, tamano - 0.5);
      texto.style.fontSize = `${tamano}px`;
    }
  }
}
