import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite'; 
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(), 
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    // one React instance for every package (lucide-react icons call useContext)
    dedupe: ['react', 'react-dom'],
  },
  // Pre-bundle these together at startup. Otherwise a page that first imports lucide-react
  // can trigger a late re-optimisation that pairs it with a second React copy:
  // "Cannot read properties of null (reading 'useContext')" and a blank page.
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-dom/client', 'react-router-dom', 'lucide-react'],
  },
});