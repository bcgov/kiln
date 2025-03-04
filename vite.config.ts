import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    target: 'esnext',  // Use "esnext" or "es2022" for modern environments
  },
  
  server: {
    host: '0.0.0.0',   // Allows access from any network interface
    
  },
})
