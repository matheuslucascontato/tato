export const MAX_CENTS = 99_999_999_999;
/** Converts Brazilian decimal text to integer cents, without floating point arithmetic. */
export function parseMoney(input: string, signed = false): number {
  const value = input.trim();
  if (!/^-?(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,2})?$/.test(value))
    throw new Error('Use um valor como 1.234,56, com até duas casas decimais.');
  const negative = value.startsWith('-');
  const [whole, decimal = ''] = value.replace('-', '').replaceAll('.', '').split(',');
  const cents = BigInt(whole) * 100n + BigInt(decimal.padEnd(2, '0'));
  if (cents > BigInt(MAX_CENTS)) throw new Error('O limite por valor é R$ 999.999.999,99.');
  if (!signed && (negative || cents === 0n)) throw new Error('Informe um valor maior que zero.');
  return Number(negative ? -cents : cents);
}
export function money(cents: bigint | number): string {
  const value = BigInt(cents);
  const abs = value < 0n ? -value : value;
  return `${value < 0n ? '− ' : ''}R$ ${(abs / 100n).toLocaleString('pt-BR')},${String(abs % 100n).padStart(2, '0')}`;
}
export function moneyInput(cents: number): string {
  const value = BigInt(cents);
  const abs = value < 0n ? -value : value;
  return `${value < 0n ? '-' : ''}${abs / 100n},${String(abs % 100n).padStart(2, '0')}`;
}
