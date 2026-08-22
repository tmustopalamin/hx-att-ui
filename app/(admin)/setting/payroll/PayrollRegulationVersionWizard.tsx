"use client";

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
      const codeOrder = left.code.localeCompare(right.code);
      return (
        codeOrder || right.effective_from.localeCompare(left.effective_from)
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
      header="Buat versi baru"
      visible={visible}
      modal
      draggable={false}
      resizable={false}
      style={{ width: "95vw", maxWidth: "48rem" }}
      onHide={() => !saving && onHide()}
      footer={
        <div className="flex justify-between gap-2">
          <Button
            label="Batal"
            severity="secondary"
            text
            disabled={saving}
            onClick={onHide}
          />
          <div className="flex gap-2">
            {step > 0 && (
              <Button
                label="Kembali"
                severity="secondary"
                outlined
                disabled={saving}
                onClick={() => setStep((current) => current - 1)}
              />
            )}
            {step < 2 ? (
              <Button
                label="Lanjut"
                icon="pi pi-arrow-right"
                iconPos="right"
                disabled={!canContinue}
                onClick={() => setStep((current) => current + 1)}
              />
            ) : (
              <Button
                label="Buat Draft"
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
            Belum ada regulation package berstatus Published. Buat package
            pertama melalui menu Advanced terlebih dahulu.
          </div>
        ) : step === 0 ? (
          <div className="flex flex-col gap-4">
            <div>
              <h3 className="m-0 text-base font-semibold text-slate-800">
                Salin aturan yang sudah berlaku
              </h3>
              <p className="m-0 mt-1 text-sm leading-6 text-slate-500">
                Semua parameter, bracket tarif, dan test case akan disalin ke
                draft baru. Versi lama tetap aman untuk payroll historis.
              </p>
            </div>
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
              Regulation yang menjadi sumber
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
                        {item.code} · {item.version} · berlaku{" "}
                        {item.effective_from}
                      </span>
                    </div>
                  ) : null
                }
              />
            </label>
            {source && (
              <div className="grid grid-cols-1 gap-3 rounded-lg bg-slate-50 p-4 text-sm sm:grid-cols-2">
                <Info label="Program" value={source.code} />
                <Info label="Versi sumber" value={source.version} />
                <Info label="Regulator" value={source.regulator} />
                <Info label="Berlaku sejak" value={source.effective_from} />
              </div>
            )}
          </div>
        ) : step === 1 ? (
          <div className="flex flex-col gap-4">
            <div>
              <h3 className="m-0 text-base font-semibold text-slate-800">
                Isi hanya perubahan dari pemerintah
              </h3>
              <p className="m-0 mt-1 text-sm leading-6 text-slate-500">
                Kode internal dan struktur teknis tidak perlu diisi di sini.
                Detail lanjutan tersedia melalui Advanced.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Versi baru *">
                <InputText
                  value={values.version}
                  placeholder={source ? `${source.version}-rev1` : "2026.1"}
                  className="w-full"
                  onChange={(event) => update("version", event.target.value)}
                />
              </Field>
              <Field label="Mulai berlaku *">
                <PrimeDatePicker
                  value={values.effective_from}
                  className="w-full"
                  onValueChange={(value) => update("effective_from", value)}
                />
              </Field>
              <Field label="Berlaku sampai (opsional)">
                <PrimeDatePicker
                  value={values.effective_to}
                  className="w-full"
                  onValueChange={(value) =>
                    update("effective_to", value || null)
                  }
                />
              </Field>
              <Field label="Nomor peraturan">
                <InputText
                  value={values.regulation_number ?? ""}
                  className="w-full"
                  onChange={(event) =>
                    update("regulation_number", event.target.value)
                  }
                />
              </Field>
              <Field label="Link sumber resmi">
                <InputText
                  value={values.source_url ?? ""}
                  className="w-full"
                  onChange={(event) => update("source_url", event.target.value)}
                />
              </Field>
              <Field label="Catatan perubahan">
                <InputText
                  value={values.notes ?? ""}
                  className="w-full"
                  placeholder="Contoh: batas TER harian berubah"
                  onChange={(event) => update("notes", event.target.value)}
                />
              </Field>
            </div>
            {source &&
              values.effective_from &&
              values.effective_from <= source.effective_from && (
                <div className="text-xs text-amber-700">
                  Mulai berlaku harus setelah versi sumber (
                  {source.effective_from}) agar periode payroll tidak tumpang
                  tindih.
                </div>
              )}
            {!effectiveWindowValid && (
              <div className="text-xs text-amber-700">
                Berlaku sampai tidak boleh sebelum tanggal mulai berlaku.
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div>
              <h3 className="m-0 text-base font-semibold text-slate-800">
                Periksa sebelum membuat draft
              </h3>
              <p className="m-0 mt-1 text-sm leading-6 text-slate-500">
                Draft akan membawa salinan detail dari versi sumber dan harus
                melewati test, approval, lalu publish.
              </p>
            </div>
            <div className="divide-y divide-slate-200 rounded-lg border border-slate-200">
              <Summary
                label="Sumber"
                value={source ? `${source.code} · ${source.version}` : "-"}
              />
              <Summary label="Versi baru" value={values.version || "-"} />
              <Summary
                label="Periode berlaku"
                value={`${values.effective_from || "-"}${values.effective_to ? ` s/d ${values.effective_to}` : ""}`}
              />
              <Summary
                label="Nomor peraturan"
                value={values.regulation_number || "Mengikuti sumber"}
              />
              <Summary label="Catatan" value={values.notes || "Tidak ada"} />
              <div className="border-t border-slate-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800">
                Parameter, tabel tarif, dan test case dari sumber akan ikut
                disalin. Setelah draft dibuat, periksa perubahan angka dan
                jalankan test sebelum approval.
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
