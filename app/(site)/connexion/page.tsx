import { Suspense } from "react";
import { ConnexionForm } from "./ConnexionForm";

export default function ConnexionPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="font-[family-name:var(--font-display)] text-5xl text-white">Connexion</h1>
      <p className="mt-3 text-sm text-white/60">Accédez à votre compte et à vos réservations.</p>
      <Suspense fallback={<p className="mt-8 text-sm text-white/50">Chargement…</p>}>
        <ConnexionForm />
      </Suspense>
    </div>
  );
}
