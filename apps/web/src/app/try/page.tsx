import { TryReader } from "./TryReader";

export const metadata = { title: "Try it · Read Butler" };

export default function TryPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Try the reader</h1>
        <p className="text-sm text-muted">Nothing is saved. Sign in to keep a library and track your speed.</p>
      </div>
      <TryReader />
    </div>
  );
}
