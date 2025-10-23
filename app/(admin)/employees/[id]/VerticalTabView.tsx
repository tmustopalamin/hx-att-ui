"use client";

import React, { use } from "react";
import { PanelMenu } from "primereact/panelmenu";
import { MenuItem, MenuItemOptions } from "primereact/menuitem";
import { useRouter } from "next/navigation";

interface Params {
  id: string
}

interface Props {
  params: Promise<Params>;
  onTitlePageChange: (title: string) => void;
}

const VerticalTabview = ({ params, onTitlePageChange }: Props) => {
  const router = useRouter();
  const resolvedParams = use(params)

  const itemRenderer = (item: MenuItem, options: MenuItemOptions) => {
    // @ts-expect-error: rightIcon is used for custom rendering, not part of MenuItem
    const rightIcon = item.rightIcon;

    return (
      <a
        className="flex align-items-center justify-between px-3 py-2 cursor-pointer"
        onClick={options.onClick}
      >
        <div className="gap-2">
          <span className={`${item.icon} text-primary`} />
          <span className={`mx-2 ${item.items && "font-semibold"}`}>
            {item.label}
          </span>
        </div>
        {rightIcon && (
          <span className={`${rightIcon} text-primary justify-self-end`} />
        )}
      </a>
    );
  };


  const items: MenuItem[] = [
    {
      label: 'General',
      icon: 'pi pi-user',
      // @ts-expect-error: rightIcon is used for custom rendering, not part of MenuItem
      rightIcon: 'pi pi-angle-down',
      template: itemRenderer,
      items: [
        {
          label: 'Personal',
          template: itemRenderer,
          command: () => {
            router.push(`/employees/${resolvedParams.id}/general/personal`);
            onTitlePageChange('Personal Information');
          }

        },
        {
          label: 'Employment',
          template: itemRenderer,
          command: () => {
            router.push(`/employees/${resolvedParams.id}/general/employment`);
            onTitlePageChange('Employment Information');
          }
        },
        {
          label: 'Education & Experience',
          template: itemRenderer,
          command: () => {
            router.push(`/employees/${resolvedParams.id}/general/education`);
            onTitlePageChange('Education & Experience');
          }
        },
      ]
    },
    {
      label: 'Time Management',
      icon: 'pi pi-calendar-clock',
      // @ts-expect-error: rightIcon is used for custom rendering, not part of MenuItem
      rightIcon: 'pi pi-angle-down',
      template: itemRenderer,
      items: [
        {
          label: 'Attendance',
          template: itemRenderer,
          command: () => {
            router.push(`/employees/${resolvedParams.id}/time/attendance`);
            onTitlePageChange('Attendance');
          }
        },
        {
          label: 'Overtime',
          template: itemRenderer,
          command: () => {
            router.push(`/employees/${resolvedParams.id}/time/overtime`);
            onTitlePageChange('Overtime');
          }
        },
        {
          label: 'Leave',
          template: itemRenderer,
          command: () => {
            router.push(`/employees/${resolvedParams.id}/time/leave`);
            onTitlePageChange('Leave');
          }
        }
      ]
    },
    {
      label: 'Payroll',
      icon: 'pi pi-money-bill',
      // @ts-expect-error: rightIcon is used for custom rendering, not part of MenuItem
      rightIcon: 'pi pi-angle-down',
      template: itemRenderer,
      items: [
        {
          label: 'Income Component',
          template: itemRenderer,
          command: () => {
            router.push(`/employees/${resolvedParams.id}/payroll/income-component`);
            onTitlePageChange('Income Component');
          }
        },
        {
          label: 'Deduction Component',
          template: itemRenderer,
          command: () => {
            router.push(`/employees/${resolvedParams.id}/payroll/deduction-component`);
            onTitlePageChange('Deduction Component');
          }
        },
        {
          label: 'Tax',
          template: itemRenderer,
          command: () => {
            router.push(`personal`);
          }
        },
        {
          label: 'BPJS',
          template: itemRenderer,
          command: () => {
            router.push(`personal`);
          }
        },

      ]
    }
  ];
  return (
    <div className="card flex justify-content-center">
      <PanelMenu model={items} className="w-full md:w-20rem" />
    </div>
  );
}

export default VerticalTabview;
