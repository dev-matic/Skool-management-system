/**
 * FAKE demo figures for the dashboard preview only. No real school, pupil,
 * teacher or payment. Every number on the preview is derived from these lists,
 * so the tiles, charts and tables always agree with each other.
 */
import { Money, sumMoney } from "@/domain/money";

export const PREVIEW_SCHOOL = "Demo Basic School";
export const PREVIEW_TERM = "Term 1, 2026/2027";
/** The day the preview pretends it is (ISO). */
export const PREVIEW_TODAY = "2026-10-06";

export interface PreviewClass {
  name: string;
  enrolled: number;
  /** Term fee per pupil in GHS. */
  fee: string;
  /** Paid towards this term so far in GHS. */
  collected: string;
  /** Present today, or null when the register is not marked yet. */
  presentToday: number | null;
  classTeacher: string;
}

export const CLASSES: PreviewClass[] = [
  {
    name: "KG 1",
    enrolled: 28,
    fee: "750",
    collected: "15750",
    presentToday: 26,
    classTeacher: "Akua Nyarko",
  },
  {
    name: "KG 2",
    enrolled: 30,
    fee: "750",
    collected: "17250",
    presentToday: 29,
    classTeacher: "Adwoa Asare",
  },
  {
    name: "Basic 1",
    enrolled: 34,
    fee: "850",
    collected: "21420",
    presentToday: 31,
    classTeacher: "Selorm Agbeko",
  },
  {
    name: "Basic 2",
    enrolled: 32,
    fee: "850",
    collected: "18700",
    presentToday: 30,
    classTeacher: "Mariama Seidu",
  },
  {
    name: "Basic 3",
    enrolled: 35,
    fee: "850",
    collected: "23375",
    presentToday: 33,
    classTeacher: "Efua Owusu",
  },
  {
    name: "Basic 4",
    enrolled: 33,
    fee: "900",
    collected: "19350",
    presentToday: 32,
    classTeacher: "Yaw Mensah",
  },
  {
    name: "Basic 5",
    enrolled: 31,
    fee: "900",
    collected: "20250",
    presentToday: null,
    classTeacher: "Kofi Boadu",
  },
  {
    name: "Basic 6",
    enrolled: 36,
    fee: "900",
    collected: "25200",
    presentToday: 34,
    classTeacher: "Abdul-Rahman Issah",
  },
  {
    name: "JHS 1",
    enrolled: 38,
    fee: "1050",
    collected: "26250",
    presentToday: 35,
    classTeacher: "Kwabena Frimpong",
  },
  {
    name: "JHS 2A",
    enrolled: 27,
    fee: "1050",
    collected: "21525",
    presentToday: 25,
    classTeacher: "Nana Ama Osei",
  },
  {
    name: "JHS 2B",
    enrolled: 26,
    fee: "1050",
    collected: "14700",
    presentToday: null,
    classTeacher: "Elikem Dzradosi",
  },
  {
    name: "JHS 3",
    enrolled: 40,
    fee: "1050",
    collected: "33600",
    presentToday: 37,
    classTeacher: "Kwame Darko",
  },
];

/** This term's payments by method in GHS. Adds up to the classes' collected total. */
export const PAYMENTS_BY_METHOD: {
  method: string;
  group: "momo" | "cash" | "bank";
  amount: string;
}[] = [
  { method: "MTN MoMo", group: "momo", amount: "128450" },
  { method: "Telecel Cash", group: "momo", amount: "31220" },
  { method: "AirtelTigo Money", group: "momo", amount: "9680" },
  { method: "Cash", group: "cash", amount: "61840" },
  { method: "Bank", group: "bank", amount: "26180" },
];

export const RECEIPTS_TODAY: {
  receipt: string;
  time: string;
  pupil: string;
  className: string;
  method: string;
  amount: string;
}[] = [
  {
    receipt: "DBS-0418",
    time: "11:42",
    pupil: "Yaa Boateng",
    className: "Basic 4",
    method: "MTN MoMo",
    amount: "450",
  },
  {
    receipt: "DBS-0417",
    time: "10:55",
    pupil: "Fiifi Quansah",
    className: "JHS 1",
    method: "Cash",
    amount: "300",
  },
  {
    receipt: "DBS-0416",
    time: "10:20",
    pupil: "Abena Kyei",
    className: "KG 2",
    method: "Telecel Cash",
    amount: "375",
  },
  {
    receipt: "DBS-0415",
    time: "09:48",
    pupil: "Kwaku Ofori",
    className: "JHS 3",
    method: "MTN MoMo",
    amount: "525",
  },
  {
    receipt: "DBS-0414",
    time: "08:31",
    pupil: "Ewurabena Eshun",
    className: "Basic 2",
    method: "Bank",
    amount: "850",
  },
  {
    receipt: "DBS-0413",
    time: "07:56",
    pupil: "Selasi Kumah",
    className: "Basic 6",
    method: "MTN MoMo",
    amount: "200",
  },
];

export type AgeBucket = "0-30" | "31-60" | "60+";

/** Pupils with the largest balances (this term plus anything brought forward). */
export const LARGEST_ARREARS: {
  pupil: string;
  className: string;
  balance: string;
  daysOverdue: number;
}[] = [
  { pupil: "Nii Armah Tetteh", className: "JHS 3", balance: "1890", daysOverdue: 97 },
  { pupil: "Afia Danso", className: "JHS 2B", balance: "1575", daysOverdue: 72 },
  { pupil: "Esi Badu", className: "Basic 6", balance: "1350", daysOverdue: 64 },
  { pupil: "Kojo Antwi", className: "JHS 1", balance: "1050", daysOverdue: 45 },
  { pupil: "Adjoa Sarpong", className: "Basic 3", balance: "850", daysOverdue: 28 },
  { pupil: "Kwesi Amponsah", className: "JHS 2B", balance: "840", daysOverdue: 28 },
  { pupil: "Akosua Frimpomaa", className: "Basic 5", balance: "900", daysOverdue: 28 },
  { pupil: "Mawuli Adzaku", className: "KG 1", balance: "750", daysOverdue: 28 },
];

/** All outstanding balances grouped by how long the oldest unpaid charge has been due. */
export const ARREARS_AGEING: { bucket: AgeBucket; pupils: number; amount: string }[] = [
  { bucket: "0-30", pupils: 151, amount: "70110" },
  { bucket: "31-60", pupils: 34, amount: "19960" },
  { bucket: "60+", pupils: 21, amount: "40660" },
];

/** Whole-school attendance rate per week of the term, in percent. */
export const ATTENDANCE_BY_WEEK: { week: string; rate: number }[] = [
  { week: "Wk 1", rate: 96.1 },
  { week: "Wk 2", rate: 95.4 },
  { week: "Wk 3", rate: 94.8 },
  { week: "Wk 4", rate: 92.3 },
  { week: "Wk 5", rate: 93.9 },
];

export interface PendingItem {
  kind: "register" | "scores" | "reconcile";
  title: string;
  detail: string;
  className: string | null;
}

export const PENDING: PendingItem[] = [
  {
    kind: "register",
    title: "Basic 5 register not marked",
    detail: "Class teacher: Kofi Boadu",
    className: "Basic 5",
  },
  {
    kind: "register",
    title: "JHS 2B register not marked",
    detail: "Class teacher: Elikem Dzradosi",
    className: "JHS 2B",
  },
  {
    kind: "scores",
    title: "JHS 2B Science scores incomplete",
    detail: "14 of 26 entered · due 16/10/2026",
    className: "JHS 2B",
  },
  {
    kind: "scores",
    title: "Basic 6 Mathematics scores missing",
    detail: "0 of 36 entered · due 16/10/2026",
    className: "Basic 6",
  },
  {
    kind: "reconcile",
    title: "3 mobile money payments to reconcile",
    detail: "Telecel Cash · recorded today",
    className: null,
  },
];

// ---------------------------------------------------------------------------
// Derived figures (what the real metrics module will compute from the database)

export function expectedFees(c: PreviewClass): Money {
  return new Money(c.fee).times(c.enrolled);
}

export function feeSummary(classes: readonly PreviewClass[]) {
  const expected = sumMoney(classes.map(expectedFees));
  const collected = sumMoney(classes.map((c) => new Money(c.collected)));
  return {
    expected,
    collected,
    outstanding: expected.minus(collected),
    /** Percent to one decimal place; 0 when nothing is expected. */
    rate: expected.isZero() ? 0 : collected.div(expected).times(100).toDecimalPlaces(1).toNumber(),
  };
}

export function attendanceSummary(classes: readonly PreviewClass[]) {
  const marked = classes.filter((c) => c.presentToday !== null);
  const enrolled = marked.reduce((n, c) => n + c.enrolled, 0);
  const present = marked.reduce((n, c) => n + (c.presentToday ?? 0), 0);
  return {
    present,
    absent: enrolled - present,
    notMarked: classes.length - marked.length,
    /** Percent of pupils in marked classes who are present, one decimal place. */
    rate: enrolled === 0 ? null : Math.round((present / enrolled) * 1000) / 10,
  };
}

export function ageBucket(daysOverdue: number): AgeBucket {
  if (daysOverdue <= 30) return "0-30";
  if (daysOverdue <= 60) return "31-60";
  return "60+";
}

export function percentOf(part: Money, whole: Money): number {
  return whole.isZero() ? 0 : part.div(whole).times(100).toDecimalPlaces(1).toNumber();
}
