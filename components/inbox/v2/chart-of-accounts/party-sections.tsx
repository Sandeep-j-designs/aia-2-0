import React from "react";
import { Paperclip, Plus, Trash2 } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  COA_BANK_OPTIONS,
  COUNTRIES,
  GST_TREATMENT_OPTIONS,
  INDIAN_STATES,
} from "@/config/pages/inbox/chart-of-accounts";
import {
  getGstRules,
  korefiTreatmentOf,
} from "@/schemas/inbox/chart-of-accounts";
import { stateFromGstin } from "@/utils/pages/inbox/chart-of-accounts";
import { Tooltip } from "@/components/common/tooltip";
import { T } from "@/components/inbox/v2/ui";
import {
  ComboField,
  FieldCell,
  FieldGrid,
  FormCard,
  OpeningBalanceFields,
  SECTION_HEAD,
  SwitchList,
  SwitchPanel,
  SwitchRow,
  TextField,
  digits,
  upperAlnum,
  type FormApi,
} from "./form-fields";
import {
  FROM_GSTIN_PAN,
  FROM_GSTIN_STATE,
  isYes,
  panFromGstin,
  yesNo,
} from "./form-sections";

/**
 * form-8, the party ledger (Sundry Debtors and Sundry Creditors).
 *
 * Production: forms/form-8/party-details-section.tsx and details-tabs.tsx,
 * whose tabs reuse the vendor master's GST, address, bank and contact forms
 * (components/merchants/merchant-form/*). The Link-GSTIN-to-address modal and
 * the Documents upload are not built here.
 */

export type PartyTab =
  "gst-details" | "address-details" | "bank-details" | "contact-person";

export const PARTY_TABS: { key: PartyTab; label: string }[] = [
  { key: "gst-details", label: "GST Details" },
  { key: "address-details", label: "Address Details" },
  { key: "bank-details", label: "Bank Details" },
  { key: "contact-person", label: "Contact Person" },
];

/** Which tab holds a failing field, so Save can open it. */
export const tabOfField = (path: string): PartyTab | null =>
  // GST Treatment heads the GST tab's registration row (7 Oct 2026).
  path.startsWith("gstDetails") || path === "gstTreatmentUuid"
    ? "gst-details"
    : path.startsWith("customerMerchantAddresses")
      ? "address-details"
      : path.startsWith("bankDetails")
        ? "bank-details"
        : path.startsWith("contactInformations")
          ? "contact-person"
          : null;

/* ---------------------------------------------------------- Party Details */
/*
 * Quarters (7 Oct 2026). The legal name is the one long value, so it takes
 * a half; GST Treatment moved to the GST tab, where it heads the
 * registration it governs. Bill wise tracking is a switch row under the
 * boxes, and Credit Period opens in its tinted panel.
 */
export const PartyDetailsSection = ({ f }: { f: FormApi }) => (
  <FormCard title="Party Details" cols={4}>
    <TextField
      f={f}
      name="legalName"
      label="Legal Name"
      placeholder="Enter Legal Name"
      span={6}
    />
    <TextField
      f={f}
      name="mobileNo"
      label="Phone Number"
      type="tel"
      inputMode="numeric"
      maxLength={10}
      prefix="+91"
      filter={digits(10)}
    />
    <TextField
      f={f}
      name="emailId"
      label="Email ID"
      type="email"
      placeholder="Enter Email ID"
    />
    <OpeningBalanceFields f={f} />
    <SwitchList>
      <SwitchRow
        label="Bill wise tracking"
        checked={isYes(f.values.maintainBalancesBillByBill)}
        onChange={(checked) =>
          f.set("maintainBalancesBillByBill", yesNo(checked))
        }
        error={f.error("maintainBalancesBillByBill")}
      />
    </SwitchList>
    {isYes(f.values.maintainBalancesBillByBill) ? (
      <SwitchPanel label="Bill wise tracking">
        <TextField
          f={f}
          name="paymentTerms"
          label="Credit Period"
          inputMode="numeric"
          maxLength={4}
          suffix="days"
          filter={digits(4)}
        />
      </SwitchPanel>
    ) : null}
  </FormCard>
);

/* ------------------------------------------------------------ GST Details */
/*
 * GST details read as one registration (7 Oct 2026): GST Treatment, GSTIN,
 * Source of Supply and PAN on one row of quarters, in that order. Each
 * column holds its place (a fixed start track), so a field the treatment
 * hides leaves its column empty rather than sliding the others left. A
 * further GSTIN (another state) is another row under the same column heads;
 * its first cell names it and holds the remove. State and PAN still fill
 * from the GSTIN as it is typed, and stay editable.
 */
const COL = { treatment: 1, gstin: 4, state: 7, pan: 10 } as const;

const GstDetailsTab = ({ f }: { f: FormApi }) => {
  const rules = getGstRules(korefiTreatmentOf(f.values.gstTreatmentUuid));
  const sourceRequired =
    rules.sourceOfSupplyRequired &&
    korefiTreatmentOf(f.values.gstTreatmentUuid) !== "business_none";
  const details = f.values.gstDetails;
  return (
    <div className="flex flex-col gap-5">
      {details.map((detail, index) => {
        const later = index > 0;
        const name = `GST - ${index + 1}`;
        const gstin = detail.gstin ?? "";
        const fromGstinState =
          !!detail.placeOfSupply &&
          stateFromGstin(gstin) === detail.placeOfSupply;
        return (
          <div
            key={index}
            role="group"
            aria-label={name}
            className={cn(later && "border-t border-pi-line pt-5")}
          >
            <FieldGrid cols={4}>
              {later ? (
                <FieldCell label="Registration" hideLabel start={COL.treatment}>
                  <div className="flex h-[38px] items-center gap-2">
                    <span className="text-[13px] font-medium text-pi-ink">
                      {name}
                    </span>
                    <Tooltip message={`Remove ${name} and its state and PAN.`}>
                      <button
                        type="button"
                        aria-label={`Remove ${name}`}
                        className="grid size-7 place-items-center rounded-sm text-pi-faint hover:bg-pi-head-bg hover:text-pi-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-pi-brand"
                        onClick={() =>
                          f.set(
                            "gstDetails",
                            details.filter((__, i) => i !== index)
                          )
                        }
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </Tooltip>
                  </div>
                </FieldCell>
              ) : (
                <ComboField
                  f={f}
                  name="gstTreatmentUuid"
                  label="GST Treatment"
                  required
                  title="Select treatment"
                  options={GST_TREATMENT_OPTIONS}
                  start={COL.treatment}
                  onPicked={(value) =>
                    f.set(
                      "gstTreatment",
                      GST_TREATMENT_OPTIONS.find((o) => o.value === value)
                        ?.korefiGstTreatment ?? ""
                    )
                  }
                />
              )}
              {rules.showGSTIN ? (
                <TextField
                  f={f}
                  name={`gstDetails.${index}.gstin`}
                  label="GSTIN"
                  required={rules.gstinRequired}
                  placeholder="GST Number"
                  maxLength={15}
                  start={COL.gstin}
                  hideLabel={later}
                  filter={(raw) => {
                    const next = upperAlnum(15)(raw);
                    // production's autoFillGstDetails: state and PAN from GSTIN.
                    const state = stateFromGstin(next);
                    if (state)
                      f.set(`gstDetails.${index}.placeOfSupply`, state);
                    if (next.length >= 12)
                      f.set(`gstDetails.${index}.panNo`, next.slice(2, 12));
                    return next;
                  }}
                />
              ) : null}
              {rules.showSourceOfSupply ? (
                <ComboField
                  f={f}
                  name={`gstDetails.${index}.placeOfSupply`}
                  label="Source of Supply"
                  required={sourceRequired}
                  title="Source of Supply"
                  options={INDIAN_STATES}
                  start={COL.state}
                  hideLabel={later}
                  {...(fromGstinState && !later
                    ? { tag: "From GSTIN", tagTitle: FROM_GSTIN_STATE }
                    : {})}
                />
              ) : null}
              <TextField
                f={f}
                name={`gstDetails.${index}.panNo`}
                label="PAN Number"
                placeholder="PAN Number"
                maxLength={10}
                filter={upperAlnum(10)}
                start={COL.pan}
                hideLabel={later}
                {...(panFromGstin(gstin, detail.panNo ?? "") && !later
                  ? { tag: "From GSTIN", tagTitle: FROM_GSTIN_PAN }
                  : {})}
              />
            </FieldGrid>
          </div>
        );
      })}
      <div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            f.set("gstDetails", [
              ...details,
              { gstin: "", panNo: "", placeOfSupply: "" },
            ])
          }
        >
          <Plus className="h-4 w-4" />
          Add GSTIN
        </Button>
      </div>
    </div>
  );
};

/* --------------------------------------------------------- Address Details */
const AddressBlock = ({
  f,
  kind,
}: {
  f: FormApi;
  kind: "billing" | "shipping";
}) => {
  const base = `customerMerchantAddresses.${kind}.0`;
  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-[13px] font-medium text-pi-ink">
        {kind === "billing" ? "Billing Address" : "Shipping Address"}
      </h3>
      <p className={cn(T.label, "-mt-2")}>Address-1</p>
      {/* The three lines in thirds, then Country, State, City and Pincode
          in quarters: each row full, every box one line (7 Oct 2026). */}
      <FieldGrid cols={3}>
        <TextField
          f={f}
          name={`${base}.addrLine_1`}
          label="Address Line 1"
          placeholder="Address Line 1"
        />
        <TextField
          f={f}
          name={`${base}.addrLine_2`}
          label="Address Line 2"
          placeholder="Address Line 2"
        />
        <TextField
          f={f}
          name={`${base}.addrLine_3`}
          label="Address Line 3"
          placeholder="Address Line 3"
        />
      </FieldGrid>
      <FieldGrid cols={4}>
        <ComboField
          f={f}
          name={`${base}.country`}
          label="Country"
          title="Country"
          options={COUNTRIES}
        />
        <ComboField
          f={f}
          name={`${base}.state`}
          label="State"
          title="State"
          options={INDIAN_STATES}
        />
        <TextField
          f={f}
          name={`${base}.city`}
          label="City"
          placeholder="City"
        />
        <TextField
          f={f}
          name={`${base}.pincode`}
          label="Pincode"
          placeholder="Pincode"
          inputMode="numeric"
          maxLength={6}
          filter={digits(6)}
        />
      </FieldGrid>
    </div>
  );
};

/* ------------------------------------------------- Bank and Contact Person */
const BankTab = ({ f }: { f: FormApi }) => (
  <FieldGrid cols={4}>
    <TextField
      f={f}
      name="bankDetails.0.accountName"
      label="Account Holder Name"
      placeholder="Account Holder Name"
    />
    <ComboField
      f={f}
      name="bankDetails.0.bankName"
      label="Bank Name"
      title="Bank Name"
      options={COA_BANK_OPTIONS}
      hasSearch
    />
    <TextField
      f={f}
      name="bankDetails.0.accountNumber"
      label="Account Number"
      placeholder="Account Number"
      inputMode="numeric"
      maxLength={18}
      filter={digits(18)}
    />
    <TextField
      f={f}
      name="bankDetails.0.ifscCode"
      label="IFSC Code"
      placeholder="IFSC Code"
      maxLength={11}
      filter={upperAlnum(11)}
    />
    <TextField
      f={f}
      name="bankDetails.0.upiId"
      label="UPI ID"
      placeholder="Enter UPI ID"
    />
  </FieldGrid>
);

const ContactTab = ({ f }: { f: FormApi }) => (
  <FieldGrid cols={4}>
    <TextField
      f={f}
      name="contactInformations.0.firstName"
      label="First Name"
      placeholder="First Name"
    />
    <TextField
      f={f}
      name="contactInformations.0.lastName"
      label="Last Name"
      placeholder="Last Name"
    />
    <TextField
      f={f}
      name="contactInformations.0.email"
      label="Email"
      type="email"
      placeholder="Email"
    />
    <TextField
      f={f}
      name="contactInformations.0.phoneNo"
      label="Phone Number"
      type="tel"
      inputMode="numeric"
      maxLength={10}
      placeholder="Phone Number"
      filter={digits(10)}
    />
  </FieldGrid>
);

/* --------------------------------------------------------------- the tabs */
export const PartyDetailsTabs = ({
  f,
  isSundryDebtor,
  tab,
  onTabChange,
  tabsWithErrors,
}: {
  f: FormApi;
  isSundryDebtor: boolean;
  tab: PartyTab;
  onTabChange: (tab: PartyTab) => void;
  tabsWithErrors: Set<PartyTab>;
}) => (
  // A section like the others (7 Oct 2026): a hairline above, no card; the
  // tab bar is its heading.
  <section className="border-t border-pi-line pt-2">
    <Tabs value={tab} onValueChange={(next) => onTabChange(next as PartyTab)}>
      <TabsList className="mb-5 h-auto w-full justify-start gap-6 overflow-x-auto rounded-none border-b border-pi-line bg-transparent p-0">
        {PARTY_TABS.map((entry) => (
          <TabsTrigger
            key={entry.key}
            value={entry.key}
            className="h-12 gap-2 rounded-none border-b-2 border-transparent px-0 text-[14px] font-medium text-pi-body shadow-none hover:text-pi-ink data-[state=active]:border-pi-brand data-[state=active]:bg-transparent data-[state=active]:text-pi-ink data-[state=active]:shadow-none"
          >
            {entry.label}
            {tabsWithErrors.has(entry.key) ? (
              // A field on this tab failed Save; the dot says where to look.
              <span
                aria-label="Has errors"
                className="size-[7px] rounded-full bg-pi-danger-dot"
              />
            ) : null}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
    {tab === "gst-details" ? <GstDetailsTab f={f} /> : null}
    {tab === "address-details" ? (
      <div className="flex flex-col gap-8">
        <AddressBlock f={f} kind="billing" />
        {isSundryDebtor ? <AddressBlock f={f} kind="shipping" /> : null}
      </div>
    ) : null}
    {tab === "bank-details" ? <BankTab f={f} /> : null}
    {tab === "contact-person" ? <ContactTab f={f} /> : null}
  </section>
);

/** production's DocumentsForm. Uploading is not part of this prototype. */
export const DocumentsSection = ({
  onUnbuilt,
}: {
  onUnbuilt: (what: string) => void;
}) => (
  <section className="form-section flex items-center justify-between gap-4 border-t border-pi-line pt-5">
    <div>
      <h2 className={SECTION_HEAD}>Documents</h2>
      <p className={cn(T.sub, "mt-1")}>
        Agreements, GST certificates or cancelled cheques for this party.
      </p>
    </div>
    <Button
      type="button"
      variant="outline"
      onClick={() => onUnbuilt("Attaching documents to a ledger")}
    >
      <Paperclip className="h-4 w-4" />
      Upload Documents
    </Button>
  </section>
);
