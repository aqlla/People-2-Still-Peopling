import { defineConfig } from 'vite'

export default defineConfig({
  base: '/people-2-still-peopling/',
  assetsInclude: ['geometries/*.json'],
  build: {
    target: "ES2022"
  },
})