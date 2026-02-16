declare module 'shpjs' {
  function shp(input: ArrayBuffer | string): Promise<GeoJSON.FeatureCollection | GeoJSON.FeatureCollection[]>
  export = shp
}
