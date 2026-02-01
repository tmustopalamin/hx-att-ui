"use client";

import React, { use, useEffect, useState } from "react";
import { PanelMenu } from "primereact/panelmenu";
import { MenuItem, MenuItemOptions } from "primereact/menuitem";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface Params {
  id: string
}

interface Props {
  params: Promise<Params>;
}

const VerticalTabview = ({ params }: Props) => {
  const resolvedParams = use(params)
  const pathname = usePathname();
  const [expandedKeys, setExpandedKeys] = useState<any>({});

  useEffect(() => {
    if (pathname) {
      const segments = pathname.split('/').filter(Boolean)

      if (segments[2] === 'general') {
        setExpandedKeys({});
        setExpandedKeys({ general: true, time: false, payroll: false });
        return;
      }

      if (segments[2] === 'time') {
        setExpandedKeys({});
        setExpandedKeys({ general: false, time: true, payroll: false });
        return;
      }

      if (segments[2] === 'payroll') {
        setExpandedKeys({});
        setExpandedKeys({ general: false, time: false, payroll: true });
        return;
      }
    }
  }, [pathname]);

  const itemRenderer = (item: MenuItem, options: MenuItemOptions) => {
    // @ts-expect-error: rightIcon is used for custom rendering, not part of MenuItem
    const rightIcon = item.rightIcon;

    return (
      <>
        {item.url && (
          <>
            <Link href={item.url}>
              <div
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
              </div>
            </Link>
          </>
        )}

        {!item.url && (
          <>
            <div
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
            </div>

          </>
        )}
      </>
    );
  };


  const items = [
    {
      key: 'general',
      label: 'General',
      icon: 'pi pi-user',
      rightIcon: 'pi pi-angle-down',
      template: itemRenderer,
      items: [
        {
          label: 'Personal',
          template: itemRenderer,
          url: `/employees/${resolvedParams.id}/general/personal`,
        },
        {
          label: 'Employment',
          template: itemRenderer,
          url: `/employees/${resolvedParams.id}/general/employment`,
        },
        {
          label: 'Education & Experience',
          template: itemRenderer,
          url: `/employees/${resolvedParams.id}/general/education`,
        },
      ]
    },
    {
      key: 'time',
      label: 'Time Management',
      icon: 'pi pi-calendar-clock',
      rightIcon: 'pi pi-angle-down',
      template: itemRenderer,
      items: [
        {
          label: 'Attendance',
          template: itemRenderer,
          url: `/employees/${resolvedParams.id}/time/attendance`,
        },
        {
          label: 'Overtime',
          template: itemRenderer,
          url: `/employees/${resolvedParams.id}/time/overtime`,
        },
        {
          label: 'Leave',
          template: itemRenderer,
          url: `/employees/${resolvedParams.id}/time/leave`,
        }
      ]
    },
    {
      key: 'payroll',
      label: 'Payroll',
      icon: 'pi pi-money-bill',
      rightIcon: 'pi pi-angle-down',
      template: itemRenderer,
      items: [
        {
          label: 'Income Component',
          template: itemRenderer,
          url: `/employees/${resolvedParams.id}/payroll/income-component`,
        },
        {
          label: 'Deduction Component',
          template: itemRenderer,
          url: `/employees/${resolvedParams.id}/payroll/deduction-component`,
        },
      ]
    }
  ];

  return (
    <div className="card flex justify-content-center">
      <PanelMenu model={items} className="w-full md:w-20rem" expandedKeys={expandedKeys} onExpandedKeysChange={setExpandedKeys} />
    </div>
  );
}

export default VerticalTabview;
