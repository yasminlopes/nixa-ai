// Script de inicialização de tema — roda de forma SÍNCRONA no <head>, antes do
// primeiro paint. Lê a preferência salva (ou a do sistema) e aplica a classe
// `.dark` no <html> imediatamente, evitando flash de tema claro ao recarregar
// em dark. O ThemeProvider depois só sincroniza o state React com a classe que
// este script já colocou — sem tocar no DOM, logo sem flash.
//
// A chave e os valores ('light' | 'dark' | 'system') são os mesmos usados pelo
// ThemeProvider (STORAGE_KEY = 'nixa-theme'). A condição cobre os quatro casos:
//   'dark'            → dark
//   'light'           → light
//   'system' | null   → segue a preferência do SO (prefers-color-scheme)
export const themeScript = `
(function () {
  try {
    var theme = localStorage.getItem('nixa-theme');
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (theme === 'dark' || (theme !== 'light' && prefersDark)) {
      document.documentElement.classList.add('dark');
    }
  } catch (e) {}
})();
`;
