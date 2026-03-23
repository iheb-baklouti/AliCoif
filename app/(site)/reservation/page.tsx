import { prisma } from "@/lib/prisma";
import { BookingPanel } from "@/components/BookingPanel";
import { SalonSeats } from "@/components/SalonSeats";

export const dynamic = "force-dynamic";

export default async function ReservationPage() {
  const services = await prisma.service.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <h1 className="font-[family-name:var(--font-display)] text-5xl text-white">Réservation</h1>
      <p className="mt-4 max-w-2xl text-lg text-white/65">
        Salon hommes — choisissez un service et un créneau. Connectez-vous pour envoyer une demande : le salon valide ou
        propose un autre horaire. Suivi des sièges en direct après confirmation.
      </p>
      <div className="mt-10 grid gap-10 lg:grid-cols-2">
        <BookingPanel services={services} />
        <SalonSeats />
      </div>
    </div>
  );
}
