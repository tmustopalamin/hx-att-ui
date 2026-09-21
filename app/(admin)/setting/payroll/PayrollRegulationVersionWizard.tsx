"use client";
import { useI18n } from "@/app/i18n";

import { useEffect, useMemo, useState } from "react";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";

import PrimeDatePicker from "@/app/_components/PrimeDatePicker";
import { createPayrollRegulationVersion } from "@/app/services/payroll-configuration-service";
import type {
  NewPayrollRegulationVersion,
  PayrollRegulationPackage,
} from "@/app/types/payroll-configuration";

type Props = {
  visible: boolean;
  packages: PayrollRegulationPackage[];
  onHide: () => void;
  onCreated: (packageItem: PayrollRegulationPackage) => void;
  onError: (error: unknown) => void;
};

type WizardValues = NewPayrollRegulationVersion;

const EMPTY_VALUES: WizardValues = {
  version: "",
  effective_from: "",
  effective_to: null,
  regulation_number: null,
  source_url: null,
  notes: null,
};

const publishedSources = (packages: PayrollRegulationPackage[]) =>
  packages
    .filter((packageItem) => packageItem.status === "PUBLISHED")
    .sort((left, right) => {
      const codeOrder = (left.code ?? "").localeCompare(right.code ?? "");
      return (
        codeOrder ||
        (right.effective_from ?? "").localeCompare(left.effective_from ?? "")
      );
    });

const optional = (value: string | null | undefined) => value?.trim() || null;

export default function PayrollRegulationVersionWizard({
  visible,
  packages,
  onHide,
  onCreated,
  onError,
}: Props) {
  const { t: i18nT } = useI18n();
  const sources = useMemo(() => publishedSources(packages), [packages]);
  const [step, setStep] = useState(0);
  const [sourceId, setSourceId] = useState<number | null>(null);
  const [values, setValues] = useState<WizardValues>(EMPTY_VALUES);
  const [saving, setSaving] = useState(false);

  const source = sources.find((item) => item.id === sourceId) ?? null;
  const effectiveWindowValid =
    !values.effective_to || values.effective_to >= values.effective_from;

  useEffect(() => {
    if (!visible) return;
    setStep(0);
    const defaultSource = sources.reduce<PayrollRegulationPackage | null>(
      (current, item) =>
        !current || item.effective_from > current.effective_from
          ? item
          : current,
      null,
    );
    setSourceId(defaultSource?.id ?? null);
    setValues(EMPTY_VALUES);
  }, [visible, sources]);

  useEffect(() => {
    if (!source) return;
    setValues((current) => ({
      ...current,
      regulation_number: source.regulation_number,
      source_url: source.source_url,
    }));
  }, [source]);

  const update = <K extends keyof WizardValues>(
    key: K,
    value: WizardValues[K],
  ) => setValues((current) => ({ ...current, [key]: value }));

  const canContinue =
    source !== null &&
    (step !== 1 ||
      (values.version.trim() !== "" &&
        values.effective_from > source.effective_from &&
        effectiveWindowValid));

  const createVersion = async () => {
    if (
      !source ||
      !values.version.trim() ||
      !values.effective_from ||
      values.effective_from <= source.effective_from ||
      !effectiveWindowValid
    ) {
      return;
    }
    try {
      setSaving(true);
      const created = await createPayrollRegulationVersion(
        source.id,
        source.row_version,
        {
          ...values,
          version: values.version.trim(),
          regulation_number: optional(values.regulation_number),
          source_url: optional(values.source_url),
          notes: optional(values.notes),
        },
      );
      onCreated(created);
      onHide();
    } catch (error: unknown) {
      onError(error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      header={i18nT("static.1qhcwwo")}
      visible={visible}
      modal
      draggable={false}
      resizable={false}
      style={{ width: "95vw", maxWidth: "48rem" }}
      onHide={() => !saving && onHide()}
      footer={
        <div className="flex justify-between gap-2">
          <Button
            label={i18nT("static.1mtd50l")}
            severity="secondary"
            text
            disabled={saving}
            onClick={onHide}
          />
          <div className="flex gap-2">
            {step > 0 && (
              <Button
                label={i18nT("static.eysymu")}
                severity="secondary"
                outlined
                disabled={saving}
                onClick={() => setStep((current) => current - 1)}
              />
            )}
            {step < 2 ? (
              <Button
                label={i18nT("static.tn9krz")}
                icon="pi pi-arrow-right"
                iconPos="right"
                disabled={!canContinue}
                onClick={() => setStep((current) => current + 1)}
              />
            ) : (
              <Button
                label={i18nT("static.1i3p2sa")}
                icon="pi pi-check"
                loading={saving}
                disabled={!source}
                onClick={() => void createVersion()}
              />
            )}
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-5 pt-2">
        <div className="grid grid-cols-3 gap-2">
          {[
            ["1", "Pilih sumber"],
            ["2", "Ubah nilai"],
            ["3", "Periksa"],
          ].map(([number, label], index) => (
            <div
              key={number}
              className={`rounded-lg border px-3 py-2 text-center text-xs ${
                step === index
                  ? "border-blue-300 bg-blue-50 font-semibold text-blue-700"
                  : "border-slate-200 text-slate-500"
              }`}
            >
              <span className="mr-1 font-mono">{number}</span>
              {label}
            </div>
          ))}
        </div>

        {sources.length === 0 ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
            {i18nT("static.1dszq6j")}{" "}
          </div>
        ) : step === 0 ? (
          <div className="flex flex-col gap-4">
            <div>
              <h3 className="m-0 text-base font-semibold text-slate-800">
                {i18nT("static.29hxcp")}{" "}
              </h3>
              <p className="m-0 mt-1 text-sm leading-6 text-slate-500">
                {i18nT("static.9oe3y")}{" "}
              </p>
            </div>
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
              {i18nT("static.q10e4o")}{" "}
              <Dropdown
                value={sourceId}
                options={sources}
                optionLabel="name"
                optionValue="id"
                className="w-full"
                onChange={(event) => setSourceId(event.value ?? null)}
                itemTemplate={(item: PayrollRegulationPackage) =>
                  item ? (
                    <div className="flex flex-col gap-1 py-1">
                      <span className="font-medium text-slate-800">
                        {item.name}
                      </span>
                      <span className="font-mono text-xs text-slate-500">
                        {item.code} {i18nT("static.19xoda3")} {item.version}{" "}
                        {i18nT("static.17ucgh8")} {item.effective_from}
                      </span>
                    </div>
                  ) : null
                }
              />
            </label>
            {source && (
              <div className="grid grid-cols-1 gap-3 rounded-lg bg-slate-50 p-4 text-sm sm:grid-cols-2">
                <Info label={i18nT("static.1if8prf")} value={source.code} />
                <Info label={i18nT("static.s0kipy")} value={source.version} />
                <Info label={i18nT("static.phhmg")} value={source.regulator} />
                <Info
                  label={i18nT("static.1q2tdpr")}
                  value={source.effective_from}
                />
              </div>
            )}
          </div>
        ) : step === 1 ? (
          <div className="flex flex-col gap-4">
            <div>
              <h3 className="m-0 text-base font-semibold text-slate-800">
                {i18nT("static.1bdtuyy")}{" "}
              </h3>
              <p className="m-0 mt-1 text-sm leading-6 text-slate-500">
                {i18nT("static.uvw12z")}{" "}
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label={i18nT("static.1vk237g")}>
                <InputText
                  value={values.version}
                  placeholder={
                    source
                      ? i18nT("static.1c390f0", { p0: source.version })
                      : "2026.1"
                  }
                  className="w-full"
                  onChange={(event) => update("version", event.target.value)}
                />
              </Field>
              <Field label={i18nT("static.17qe8t7")}>
                <PrimeDatePicker
                  value={values.effective_from}
                  className="w-full"
                  onValueChange={(value) => update("effective_from", value)}
                />
              </Field>
              <Field label={i18nT("static.11a3atu")}>
                <PrimeDatePicker
                  value={values.effective_to}
                  className="w-full"
                  onValueChange={(value) =>
                    update("effective_to", value || null)
                  }
                />
              </Field>
              <Field label={i18nT("static.1rpywa2")}>
                <InputText
                  value={values.regulation_number ?? ""}
                  className="w-full"
                  onChange={(event) =>
                    update("regulation_number", event.target.value)
                  }
                />
              </Field>
              <Field label={i18nT("static.o8vx8b")}>
                <InputText
                  value={values.source_url ?? ""}
                  className="w-full"
                  onChange={(event) => update("source_url", event.target.value)}
                />
              </Field>
              <Field label={i18nT("static.1apezaf")}>
                <InputText
                  value={values.notes ?? ""}
                  className="w-full"
                  placeholder={i18nT("static.17yxvme")}
                  onChange={(event) => update("notes", event.target.value)}
                />
              </Field>
            </div>
            {source &&
              values.effective_from &&
              values.effective_from <= source.effective_from && (
                <div className="text-xs text-amber-700">
                  {i18nT("static.tkrszt")} {source.effective_from}
                  {i18nT("static.zfb4r")}{" "}
                </div>
              )}
            {!effectiveWindowValid && (
              <div className="text-xs text-amber-700">
                {i18nT("static.o27ebo")}{" "}
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div>
              <h3 className="m-0 text-base font-semibold text-slate-800">
                {i18nT("static.1ikhcg7")}{" "}
              </h3>
              <p className="m-0 mt-1 text-sm leading-6 text-slate-500">
                {i18nT("static.o31ck7")}{" "}
              </p>
            </div>
            <div className="divide-y divide-slate-200 rounded-lg border border-slate-200">
              <Summary
                label={i18nT("static.lo79d5")}
                value={
                  source
                    ? i18nT("static.9hnqb2", {
                        p0: source.code,
                        p1: source.version,
                      })
                    : "-"
                }
              />
              <Summary
                label={i18nT("static.yxtbl6")}
                value={values.version || "-"}
              />
              <Summary
                label={i18nT("static.1e8gma1")}
                value={i18nT("static.jhyx2o", {
                  p0: values.effective_from || "-",
                  p1: values.effective_to
                    ? i18nT("static.f5ghiv", { p0: values.effective_to })
                    : "",
                })}
              />
              <Summary
                label={i18nT("static.1rpywa2")}
                value={values.regulation_number || i18nT("static.aw39ks")}
              />
              <Summary
                label={i18nT("static.trr5c5")}
                value={values.notes || i18nT("static.19hlzfa")}
              />
              <div className="border-t border-slate-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800">
                {i18nT("static.1ilzesl")}{" "}
              </div>
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
      {label}
      {children}
    </label>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-slate-400">
        {label}
      </div>
      <div className="mt-1 font-medium text-slate-700">{value}</div>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-sm font-medium text-slate-800 sm:text-right">
        {value}
      </span>
    </div>
  );
}
