/** Vite asset URL imports (`import worker from "./x.js?url"`). */
declare module "*?url" {
  const src: string
  export default src
}
