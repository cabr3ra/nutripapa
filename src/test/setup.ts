// Configuración común de los tests: matchers de jest-dom y limpieza del DOM
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Sin `globals: true`, Testing Library no limpia solo; lo hacemos tras cada test
afterEach(() => {
  cleanup()
})
