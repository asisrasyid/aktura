/** Convert integer to Indonesian words (terbilang) */
function bilang(n: number): string {
  if (n === 0) return '';
  if (n < 20) {
    const w = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam',
      'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas', 'dua belas',
      'tiga belas', 'empat belas', 'lima belas', 'enam belas',
      'tujuh belas', 'delapan belas', 'sembilan belas'];
    return w[n];
  }
  if (n < 100) {
    const tens = Math.floor(n / 10);
    const rem  = n % 10;
    return bilang(tens) + ' puluh' + (rem ? ' ' + bilang(rem) : '');
  }
  if (n < 200) {
    const rem = n % 100;
    return 'seratus' + (rem ? ' ' + bilang(rem) : '');
  }
  if (n < 1_000) {
    const h = Math.floor(n / 100);
    const rem = n % 100;
    return bilang(h) + ' ratus' + (rem ? ' ' + bilang(rem) : '');
  }
  if (n < 2_000) {
    const rem = n % 1_000;
    return 'seribu' + (rem ? ' ' + bilang(rem) : '');
  }
  if (n < 1_000_000) {
    const k = Math.floor(n / 1_000);
    const rem = n % 1_000;
    return bilang(k) + ' ribu' + (rem ? ' ' + bilang(rem) : '');
  }
  if (n < 1_000_000_000) {
    const m = Math.floor(n / 1_000_000);
    const rem = n % 1_000_000;
    return bilang(m) + ' juta' + (rem ? ' ' + bilang(rem) : '');
  }
  if (n < 1_000_000_000_000) {
    const b = Math.floor(n / 1_000_000_000);
    const rem = n % 1_000_000_000;
    return bilang(b) + ' miliar' + (rem ? ' ' + bilang(rem) : '');
  }
  const t = Math.floor(n / 1_000_000_000_000);
  const rem = n % 1_000_000_000_000;
  return bilang(t) + ' triliun' + (rem ? ' ' + bilang(rem) : '');
}

export function terbilang(n: number): string {
  if (n === 0) return 'Nol Rupiah';
  const words = bilang(Math.floor(n)).trim();
  return words.charAt(0).toUpperCase() + words.slice(1) + ' Rupiah';
}
