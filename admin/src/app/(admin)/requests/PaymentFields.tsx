export function paymentAmount(raw: string): number | null {
  if (!raw.trim()) return null;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 0 || value > 2147483647) {
    throw new Error("Enter a whole payment amount between 0 and 2,147,483,647 INR.");
  }
  return value;
}

export function PaymentFields({ amount, status, disabled, onAmount, onStatus }: {
  amount: string; status: string; disabled: boolean;
  onAmount: (value: string) => void; onStatus: (value: string) => void;
}) {
  return <div className="mt-5 grid grid-cols-2 gap-3">
    <label className="block text-sm font-bold">Payment amount (INR)
      <input type="number" min={0} max={2147483647} step={1} disabled={disabled} className="input-box mt-2 w-full" value={amount} onChange={e => onAmount(e.target.value)} placeholder="Optional" />
    </label>
    <label className="block text-sm font-bold">Payment status
      <select disabled={disabled} className="input-box mt-2 w-full" value={status} onChange={e => onStatus(e.target.value)}>
        <option value="unpaid">Unpaid</option><option value="paid">Paid</option>
      </select>
    </label>
  </div>;
}
