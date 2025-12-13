import { providerIdProcess } from "./actions";

export default function TestProviderIdPage() {
  return (
    <form action={providerIdProcess}>
      <button type="submit">Login by Provider ID</button>
    </form>
  );
}
