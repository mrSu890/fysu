// flou gris très léger affiché avant qu'une photo soit chargée (au lieu d'une case vide)
export const BLUR =
  "data:image/svg+xml;base64," +
  (typeof btoa === "function"
    ? btoa("<svg xmlns='http://www.w3.org/2000/svg' width='4' height='5'><rect width='4' height='5' fill='rgb(128,128,128)' fill-opacity='.16'/></svg>")
    : Buffer.from("<svg xmlns='http://www.w3.org/2000/svg' width='4' height='5'><rect width='4' height='5' fill='rgb(128,128,128)' fill-opacity='.16'/></svg>").toString("base64"))
