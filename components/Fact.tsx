export function Fact({ value }: { value: string }) {
  if (value.trim().length === 0) {
    return <span className="tbc">To be confirmed</span>;
  }
  return <>{value}</>;
}
