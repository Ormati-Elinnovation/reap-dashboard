export function fmt(n: number): string {
  return (n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function money(n: number): string {
  return "$" + fmt(n);
}
