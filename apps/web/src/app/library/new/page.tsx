import { NewDocument } from "./NewDocument";

export const metadata = { title: "Add text · Speed Read It" };

export default function NewDocumentPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Add to your library</h1>
      <NewDocument />
    </div>
  );
}
