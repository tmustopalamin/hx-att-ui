"use client";

import { useI18n } from "@/app/i18n";
import { Dialog } from "primereact/dialog";
import { Button } from "primereact/button";

type EmployeeScheduleHelpDialogProps = {
  visible: boolean;
  onHide: () => void;
};

const EmployeeScheduleHelpDialog = ({
  visible,
  onHide,
}: EmployeeScheduleHelpDialogProps) => {
  const { t: i18nT } = useI18n();

  return (
    <Dialog
      visible={visible}
      onHide={onHide}
      modal
      draggable={false}
      resizable={false}
      header={i18nT("static.1x2sh5o")}
      style={{ width: "min(42rem, calc(100vw - 2rem))" }}
      footer={
        <Button
          type="button"
          label={i18nT("static.1l0xxoj")}
          icon="pi pi-times"
          severity="secondary"
          onClick={onHide}
        />
      }
    >
      <div className="flex flex-col gap-4 text-sm leading-6 text-slate-600">
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-blue-900">
          <p className="m-0 font-semibold">{i18nT("static.19itws9")}</p>
          <p className="m-0 mt-1">{i18nT("static.147kc1o")}</p>
        </div>

        <dl className="grid gap-3 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-x-4">
          <dt className="font-semibold text-slate-800">
            {i18nT("static.fywzdp")}
          </dt>
          <dd className="m-0">{i18nT("static.11bj3wg")}</dd>

          <dt className="font-semibold text-slate-800">
            {i18nT("static.1c6l4uy")}
          </dt>
          <dd className="m-0">{i18nT("static.xzgpeh")}</dd>

          <dt className="font-semibold text-slate-800">
            {i18nT("static.15ge9fu")}
          </dt>
          <dd className="m-0">{i18nT("static.6x84cg")}</dd>

          <dt className="font-semibold text-slate-800">
            {i18nT("static.a0nkg3")}
          </dt>
          <dd className="m-0">{i18nT("static.1fdehkf")}</dd>
        </dl>
      </div>
    </Dialog>
  );
};

export default EmployeeScheduleHelpDialog;
