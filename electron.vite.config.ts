import { resolve } from 'path';
import { defineConfig } from 'electron-vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  main: {
    build: {
      rollupOptions: {
        external: [
          'electron-magickwand',
          'electron-magickwand/native',
          'exiftool-vendored',
          'xxhash-addon',
          '@fiahfy/icns',
          '@napi-rs/canvas',
          'pdfjs-dist',
          'pdfjs-dist/legacy/build/pdf.mjs'
        ]
      }
    },
    resolve: {
      alias: {
        '@shared': resolve('src/shared')
      }
    }
  },
  preload: {
    resolve: {
      alias: {
        '@shared': resolve('src/shared')
      }
    }
  },
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src'),
        '@shared': resolve('src/shared')
      }
    },
    plugins: [vue()]
  }
});
