import { prisma } from "./prisma";
import { SEAT_COUNT } from "./salon";

export type BusinessHours = {
  open: string;
  close: string;
  slotMinutes: number;
};

const DEFAULT: BusinessHours = {
  open: "09:00",
  close: "19:00",
  slotMinutes: 30,
};

export async function getBusinessHours(): Promise<BusinessHours> {
  const row = await prisma.setting.findUnique({ where: { key: "business_hours" } });
  if (!row) return DEFAULT;
  try {
    return { ...DEFAULT, ...JSON.parse(row.value) };
  } catch {
    return DEFAULT;
  }
}

function parseTime(dayStart: Date, hm: string) {
  const [h, m] = hm.split(":").map((x) => Number.parseInt(x, 10));
  const d = new Date(dayStart);
  d.setHours(h, m || 0, 0, 0);
  return d;
}

/** Créneaux disponibles (ISO) pour une journée : max SEAT_COUNT réservations au même créneau. */
export async function getAvailableSlotStarts(day: Date): Promise<string[]> {
  const { open, close, slotMinutes } = await getBusinessHours();
  const dayStart = new Date(day);
  dayStart.setHours(0, 0, 0, 0);
  const openAt = parseTime(dayStart, open);
  const closeAt = parseTime(dayStart, close);
  const step = slotMinutes * 60_000;
  const now = new Date();
  const out: string[] = [];

  for (let t = openAt.getTime(); t + step <= closeAt.getTime(); t += step) {
    const slotStart = new Date(t);
    if (slotStart < now) continue;
    const slotEnd = new Date(t + step);
    const count = await prisma.reservation.count({
      where: {
        status: { in: ["PENDING", "CONFIRMED", "IN_PROGRESS"] },
        scheduledAt: { gte: slotStart, lt: slotEnd },
      },
    });
    if (count < SEAT_COUNT) out.push(slotStart.toISOString());
  }
  return out;
}
