// Voice dictation is hidden until it is ready for a bank:
// - the Web Speech API in Chrome and Edge streams audio to the vendor's cloud
//   recognizer, which needs a data-handling decision first;
// - there is no feedback yet for an unsupported browser, a denied microphone
//   permission, or the interim transcript.
// Flipping this back on restores the adapter in the provider and the composer
// buttons together.
export const DICTATION_ENABLED = false
