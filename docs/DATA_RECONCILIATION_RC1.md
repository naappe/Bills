# RC1 Data Reconciliation Findings

Status: **Release blocker identified**

Date: 2026-08-02

## 1. MVR 500 spend difference

The Inventory KPI totals only bills whose vendor name matches a record in `public.vendors`.

One active bill does not match the vendor master:

| Bill ID | Date | Vendor | Amount |
|---:|---|---|---:|
| 3021 | 2026-07-22 | Jamna Fish | MVR 500.00 |

This explains the full difference between:

- Reports / Cost total: MVR 950,479.29
- Inventory matched-vendor spend: MVR 949,979.29
- Difference: MVR 500.00

### Required decision

Choose one of these non-destructive resolutions:

1. Add or correctly link `Jamna Fish` in the vendor master, after confirming it is a legitimate supplier.
2. Keep it unmatched and rename the Inventory KPI to `Matched vendor spend`, while separately showing unmatched bill spend.

Do not change the bill amount merely to make the KPIs agree.

## 2. Vendor-count difference

Current live database counts:

- Active vendor-master records: 144
- All non-deleted vendor-master records: 144
- Distinct vendor names used by active bills: 145
- Unmatched bill vendor names: 1 (`Jamna Fish`)

The difference is therefore explained by the same unmatched bill vendor.

## 3. Supply test-looking records

The following active Supply records appear to be placeholders:

| ID | Name | Unit | Rate | Stock | Created |
|---:|---|---|---:|---:|---|
| 4 | asd | PCS | 0 | 0 | 2026-07-28 |
| 14 | asdasd | PCS | 0 | 0 | 2026-07-28 |
| 30 | asdasdasd | PCS | 0 | 0 | 2026-07-28 |

They have no vendor, zero rate, and zero stock.

### Required decision

Confirm with the data owner whether these records are valid. If they are test records, deactivate them rather than deleting them so the change remains reversible and auditable.

## Release impact

The v1.0 tag remains blocked until:

- the unmatched vendor decision is completed or explicitly accepted;
- the Supply placeholder records are reviewed;
- the resulting KPI meanings are verified and documented.

No production records were changed while producing this report.
