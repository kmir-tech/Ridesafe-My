// leaflet.heat patches global L — no real exports needed
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare module "leaflet.heat" {
  const heat: unknown;
  export default heat;
}
