# Requirements

## Goal

A low-cost school management system for Ghanaian schools. First customer is one
small school (under ~500 students); it will later be sold to other schools, so
multi-tenancy is designed in from day one.

## Ghana context

- Currency GHS. Ghanaian phone numbers (+233), validated and normalised.
- Three-term academic year. Grading scale, class score vs exam score weighting,
  and term/class structure are configurable per school.
- Levels: KG, Primary, JHS, possibly SHS — flexible class structure.
- Fees mostly paid by mobile money (MTN MoMo, Telecel Cash, AirtelTigo Money),
  plus cash and bank. Payments are designed around recording and reconciling these.
- Parents reached mainly by SMS/WhatsApp, via a swappable provider abstraction.
- Student data is children's personal data: follow Ghana's Data Protection Act
  principles — least privilege, audit logs, encryption in transit, backups.

## Users and interface

- Admin, bursar and teachers use desktops/laptops: dense tables, keyboard-friendly
  data entry, bulk actions, A4 print-ready report cards, receipts and class lists.
- Responsive so parents can check results/balances on a phone, without
  compromising desktop.
- Slow/unreliable internet: light pages, clear loading and error states, no lost
  data entry.

## Phase 1 (MVP)

1. Accounts & roles
2. School setup: academic years, terms, classes, subjects, teacher assignments
3. Student records with bulk CSV/Excel import
4. Attendance
5. Grades and printable report cards
6. Fees and payments with receipts and arrears reports

## Later phases (not yet)

SMS notifications, parent portal, announcements/calendar, library, inventory, HR,
multi-school onboarding and billing, scanning/OCR of paper records.
