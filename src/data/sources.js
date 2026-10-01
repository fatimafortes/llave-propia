// Official sources shown next to every route (hard rule 8).
// `reviewed` is the date someone actually checked the page, not the build date.

export const SOURCES = {
  renewal: {
    label: 'SAT · Renueva el certificado de tu e.firma',
    url: 'https://wwwmat.sat.gob.mx/tramites/63992/renueva-el-certificado-de-tu-e.firma-(antes-firma-electronica)',
    reviewed: '30/09/2026',
  },
  satId: {
    label: 'SAT · Renovar e.firma a través de SAT ID',
    url: 'https://wwwmat.sat.gob.mx/tramites/90298/solicitud-de-autorizacion-para-renovar-el-certificado-de-e.firma-a-traves-de-la-aplicacion-sat-id',
    reviewed: '30/09/2026',
  },
  // Page reviewed 30/09/2026. The list's own date (SAT's "actualizada al") comes from public/data/69b.json.
  list69b: {
    label: 'SAT · Contribuyentes con operaciones presuntamente inexistentes (69-B)',
    url: 'https://wwwmat.sat.gob.mx/consultas/76674/consulta-la-relacion-de-contribuyentes-con-operaciones-presuntamente-inexistentes',
    reviewed: '30/09/2026',
  },
  // No login needed; also lists MarcaSAT 55 627 22 728 and denuncias@sat.gob.mx.
  denuncia: {
    label: 'SAT · Presenta tu queja o denuncia',
    url: 'https://wwwmat.sat.gob.mx/aplicacion/50409/presenta-tu-queja-o-denuncia',
    reviewed: '30/09/2026',
  },
}

export const LINKS = {
  certisat: 'https://aplicacionesc.mat.sat.gob.mx/certisat/',
  certifica:
    'https://wwwmat.sat.gob.mx/aplicacion/16660/genera-y-descarga-tus-archivos-a-traves-de-la-aplicacion-certifica',
  satId: 'https://satid.sat.gob.mx/',
  citas: 'https://citas.sat.gob.mx/',
  facturas: 'https://portalcfdi.facturaelectronica.sat.gob.mx/',
  denuncia: 'https://wwwmat.sat.gob.mx/aplicacion/50409/presenta-tu-queja-o-denuncia',
}
