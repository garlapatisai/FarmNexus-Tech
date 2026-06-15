export function formatINR(n: number) {
  return `₹${Number(n).toLocaleString('en-IN')}`
}
