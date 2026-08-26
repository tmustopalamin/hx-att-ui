"use client";
import { useI18n } from "@/app/i18n";

import React, { JSX, useMemo, useState } from "react";
import useSWR from "swr";
import {
  formatDate as formatDisplayDate,
  formatDateTime as formatDisplayDateTime,
} from "@/app/utils/date-format";

import { Avatar } from "primereact/avatar";
import { Card } from "primereact/card";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Divider } from "primereact/divider";
import { ProgressSpinner } from "primereact/progressspinner";
import { Tag } from "primereact/tag";

import {
  EmployeeEducationRow,
  EmployeeEmergencyContactRow,
  EmployeeFamilyRow,
  EmployeeIdentityRow,
  EmployeeWorkExperienceRow,
} from "@/app/types/employee-general";
import { EmployeeLeaveBalance } from "@/app/types/employee-leave-balance";
import {
  getMyProfilePersonalData,
  getMyProfileEmploymentData,
  getMyProfileIdentityAddressData,
  getMyProfileFamilyData,
  getMyProfileEmergencyContactData,
  getMyProfileFormalEducationData,
  getMyProfileInformalEducationData,
  getMyProfileWorkExperienceData,
  getMyProfileLeaveBalance,
  getMyProfileHrRecords,
} from "@/app/services/my-profile-service";
import type { MyProfileHrRecords as MyProfileHrRecordsData } from "@/app/types/my-profile-hr-records";
import {
  MyProfileHrRecords as MyProfileHrRecordsPanel,
  MyProfileHrSnapshot,
} from "./MyProfileHrRecords";

type TabKey = "overview" | "personal" | "career" | "leave" | "hr-records";

const tabs: Array<{
  key: TabKey;
  labelKey: string;
  icon: string;
  descriptionKey: string;
}> = [
  {
    key: "overview",
    labelKey: "Overview",
    icon: "pi pi-id-card",
    descriptionKey: "Profile summary, personal data, and employment snapshot.",
  },
  {
    key: "personal",
    labelKey: "Personal",
    icon: "pi pi-user",
    descriptionKey: "Identity, address, family, and emergency contact.",
  },
  {
    key: "career",
    labelKey: "Career",
    icon: "pi pi-briefcase",
    descriptionKey: "Employment, education, training, and work experience.",
  },
  {
    key: "leave",
    labelKey: "Leave Balance",
    icon: "pi pi-calendar",
    descriptionKey: "Available leave balance by period and leave type.",
  },
  {
    key: "hr-records",
    labelKey: "HR Records",
    icon: "pi pi-briefcase",
    descriptionKey:
      "Documents, assigned assets, learning, and lifecycle tasks.",
  },
];

const getPhotoUrl = (photoUrl?: string | null) => {
  if (!photoUrl) return undefined;

  if (photoUrl.startsWith("http://") || photoUrl.startsWith("https://")) {
    return photoUrl;
  }

  if (photoUrl.startsWith("/")) {
    return photoUrl;
  }

  return `/api/public/images/uploads/${encodeURIComponent(photoUrl)}`;
};

const formatDate = (value?: string | null) => {
  return formatDisplayDate(value);
};

const formatDateTime = (value?: string | null) => {
  return formatDisplayDateTime(value);
};

const boolText = (
  value: boolean | null | undefined,
  translate: (key: string) => string,
) => {
  if (value === true) return translate("Yes");
  if (value === false) return translate("No");
  return "-";
};

const activeTag = (
  value: boolean | null | undefined,
  translate: (key: string) => string,
) => {
  if (value === true) {
    return <Tag value={translate("static.8qzyhb")} severity="success" />;
  }

  if (value === false) {
    return <Tag value={translate("static.13zf5vc")} severity="secondary" />;
  }

  return <span className="text-slate-400">-</span>;
};

const emptyText = (value?: string | number | null) => {
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
};

const InfoItem = ({
  label,
  value,
  children,
}: {
  label: string;
  value?: string | number | null;
  children?: React.ReactNode;
}) => {
  return (
    <div className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-1 min-w-0 break-words text-sm font-semibold text-slate-900">
        {children ?? emptyText(value)}
      </div>
    </div>
  );
};

const SectionCard = ({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) => {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        {description && (
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        )}
      </div>

      {children}
    </div>
  );
};

const TableEmptyMessage = ({ label }: { label: string }) => {
  const { t: i18nT } = useI18n();
  return (
    <div className="py-6 text-center text-sm text-slate-500">
      {i18nT("static.r5wqai")} {label} {i18nT("static.1clvyxv")}{" "}
    </div>
  );
};

const MyProfilePage = () => {
  const { t: i18nT, tText } = useI18n();
  const [activeTab, setActiveTab] = useState<TabKey>("overview");

  const {
    data: personalData,
    isLoading: isPersonalLoading,
    error: personalError,
  } = useSWR("/api/my-profile/personal-data", getMyProfilePersonalData, {
    revalidateOnFocus: false,
  });

  const { data: employmentData } = useSWR(
    "/api/my-profile/employment-data",
    getMyProfileEmploymentData,
    { revalidateOnFocus: false },
  );

  const { data: identityRows = [] } = useSWR(
    "/api/my-profile/identity-address-data",
    getMyProfileIdentityAddressData,
    { revalidateOnFocus: false },
  );

  const { data: familyRows = [] } = useSWR(
    "/api/my-profile/family-data",
    getMyProfileFamilyData,
    { revalidateOnFocus: false },
  );

  const { data: emergencyRows = [] } = useSWR(
    "/api/my-profile/emergency-contact-data",
    getMyProfileEmergencyContactData,
    { revalidateOnFocus: false },
  );

  const { data: formalEducationRows = [] } = useSWR(
    "/api/my-profile/education-data/formal",
    getMyProfileFormalEducationData,
    { revalidateOnFocus: false },
  );

  const { data: informalEducationRows = [] } = useSWR(
    "/api/my-profile/education-data/informal",
    getMyProfileInformalEducationData,
    { revalidateOnFocus: false },
  );

  const { data: workExperienceRows = [] } = useSWR(
    "/api/my-profile/work-experience-data",
    getMyProfileWorkExperienceData,
    { revalidateOnFocus: false },
  );

  const { data: leaveBalanceRows = [] } = useSWR(
    "/api/my-profile/leave-balance",
    getMyProfileLeaveBalance,
    { revalidateOnFocus: false },
  );

  const {
    data: hrRecords,
    isLoading: isHrRecordsLoading,
    error: hrRecordsError,
    mutate: mutateHrRecords,
  } = useSWR<MyProfileHrRecordsData>(
    "/api/my-profile/hr-records",
    getMyProfileHrRecords,
    { revalidateOnFocus: true },
  );

  const activeTabMeta = useMemo(() => {
    return tabs.find((tab) => tab.key === activeTab) ?? tabs[0];
  }, [activeTab]);

  const employeeName = useMemo(() => {
    if (!personalData) return "Employee";

    const fullName = [
      personalData.first_name,
      personalData.middle_name,
      personalData.last_name,
    ]
      .filter(Boolean)
      .join(" ");

    return personalData.preferred_name || fullName || "Employee";
  }, [personalData]);

  const initials = useMemo(() => {
    const first = personalData?.first_name?.trim()?.charAt(0) ?? "";
    const last = personalData?.last_name?.trim()?.charAt(0) ?? "";

    return `${first}${last}`.toUpperCase() || "EM";
  }, [personalData]);

  const totalLeaveClosingBalance = useMemo(() => {
    return leaveBalanceRows.reduce(
      (total, row) => total + (row.closing_balance ?? 0),
      0,
    );
  }, [leaveBalanceRows]);

  const renderError = () => {
    if (!personalError) return null;

    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {i18nT("static.l397t7")}{" "}
      </div>
    );
  };

  const renderProfileSummary = () => {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-5 md:flex-row md:items-center">
          <div className="flex justify-center md:justify-start">
            {isPersonalLoading ? (
              <div className="flex h-28 w-28 items-center justify-center rounded-full bg-slate-100">
                <ProgressSpinner style={{ width: "36px", height: "36px" }} />
              </div>
            ) : (
              <Avatar
                label={initials}
                image={getPhotoUrl(personalData?.photo_url)}
                shape="circle"
                className="bg-blue-100 text-blue-700"
                style={{ width: "7rem", height: "7rem", fontSize: "2.5rem" }}
              />
            )}
          </div>

          <div className="min-w-0 flex-1 text-center md:text-left">
            <div className="text-sm font-medium text-slate-500">
              {i18nT("static.1g5mem2")}
            </div>
            <h1
              className="mt-1 text-2xl font-semibold leading-snug text-slate-900"
              style={{ overflowWrap: "anywhere" }}
              title={employeeName}
            >
              {employeeName}
            </h1>

            <div className="mt-2 flex flex-wrap justify-center gap-2 md:justify-start">
              {employmentData?.code && (
                <Tag
                  value={i18nT("static.1blnt6m", { p0: employmentData.code })}
                  severity="info"
                />
              )}
              {employmentData?.position_name && (
                <Tag value={employmentData.position_name} severity="success" />
              )}
              {employmentData?.branch_name && (
                <Tag value={employmentData.branch_name} severity="secondary" />
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 md:w-[22rem]">
            <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3">
              <div className="text-xs text-blue-700">
                {i18nT("static.1es4nt0")}
              </div>
              <div className="mt-1 text-xl font-semibold text-blue-900">
                {totalLeaveClosingBalance}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="text-xs text-slate-500">
                {i18nT("static.136fqhb")}
              </div>
              <div className="mt-1 text-sm font-semibold text-slate-900">
                {formatDate(employmentData?.join_date)}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderPersonalData = () => {
    const data = personalData;

    return (
      <SectionCard
        title={i18nT("static.16u7g4f")}
        description={i18nT("static.1wknqwv")}
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          <InfoItem label={i18nT("static.6yjm7s")} value={data?.first_name} />
          <InfoItem label={i18nT("static.1i6ktxn")} value={data?.middle_name} />
          <InfoItem label={i18nT("static.16p3u1s")} value={data?.last_name} />
          <InfoItem
            label={i18nT("static.f7e5k1")}
            value={data?.preferred_name}
          />
          <InfoItem label={i18nT("static.vqo7c5")} value={data?.birth_place} />
          <InfoItem
            label={i18nT("static.1ierxyf")}
            value={formatDate(data?.dob)}
          />

          <InfoItem
            label={i18nT("static.1adu274")}
            value={data?.gender_name ?? data?.gender_id}
          />

          <InfoItem
            label={i18nT("static.1y626di")}
            value={data?.religion_name ?? data?.religion_id}
          />

          <InfoItem
            label={i18nT("static.s7ogwz")}
            value={data?.marital_status_name ?? data?.marital_status_id}
          />

          <InfoItem
            label={i18nT("static.1v8ev2w")}
            value={data?.phone_number}
          />
          <InfoItem
            label={i18nT("static.1kdz0sl")}
            value={data?.personal_email}
          />
          <InfoItem label={i18nT("static.3ewaq0")} value={data?.work_email} />

          <InfoItem
            label={i18nT("static.jvv0p5")}
            value={
              data?.nationality_country_name ?? data?.nationality_country_id
            }
          />
        </div>
      </SectionCard>
    );
  };

  const renderEmploymentData = () => {
    const data = employmentData;

    return (
      <SectionCard
        title={i18nT("static.mirjw9")}
        description={i18nT("static.18lfm5x")}
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          <InfoItem label={i18nT("static.ncb762")} value={data?.code} />
          <InfoItem
            label={i18nT("static.136fqhb")}
            value={formatDate(data?.join_date)}
          />
          <InfoItem
            label={i18nT("static.1j4m31m")}
            value={formatDate(data?.end_date)}
          />
          <InfoItem
            label={i18nT("static.1ignfpe")}
            value={formatDate(data?.probation_end_date)}
          />
          <InfoItem
            label={i18nT("static.404n94")}
            value={formatDate(data?.confirmation_date)}
          />

          <InfoItem
            label={i18nT("static.1v3zejm")}
            value={data?.agency_name ?? data?.agency_id}
          />

          <InfoItem
            label={i18nT("static.19gzx45")}
            value={data?.branch_name ?? data?.branch_id}
          />

          <InfoItem
            label={i18nT("static.1430r53")}
            value={data?.department_name ?? data?.department_id}
          />

          <InfoItem
            label={i18nT("static.1quewx6")}
            value={data?.position_name ?? data?.position_id}
          />

          <InfoItem
            label={i18nT("static.p2ngjv")}
            value={data?.employment_status_name ?? data?.employment_status_id}
          />

          <InfoItem
            label={i18nT("static.q02xcn")}
            value={
              data?.supervisor_employee_name ?? data?.supervisor_employee_id
            }
          />
        </div>
      </SectionCard>
    );
  };

  const renderIdentityAddress = () => {
    return (
      <SectionCard
        title={i18nT("static.s7msxp")}
        description={i18nT("static.6ryhkc")}
      >
        <DataTable
          value={identityRows}
          dataKey="id"
          stripedRows
          scrollable
          emptyMessage={<TableEmptyMessage label={i18nT("static.oa1cep")} />}
        >
          <Column
            header={i18nT("static.4mj4o9")}
            body={(row: EmployeeIdentityRow) =>
              row.identity_type_name || row.identity_type_id
            }
            style={{ minWidth: "12rem" }}
          />
          <Column
            field="number"
            header={i18nT("static.r616tc")}
            style={{ minWidth: "12rem" }}
          />
          <Column
            header={i18nT("static.u2ldwy")}
            body={(row: EmployeeIdentityRow) => formatDate(row.expire_date)}
            style={{ minWidth: "10rem" }}
          />
          <Column
            field="citizen_address"
            header={i18nT("static.1r1dn73")}
            style={{ minWidth: "16rem" }}
          />
          <Column
            field="residential_address"
            header={i18nT("static.12qzyx9")}
            style={{ minWidth: "16rem" }}
          />
          <Column
            header={i18nT("static.2cd61x")}
            body={(row: EmployeeIdentityRow) =>
              boolText(row.is_permanent, i18nT)
            }
            style={{ minWidth: "9rem" }}
          />
          <Column
            header={i18nT("static.3pd73")}
            body={(row: EmployeeIdentityRow) => activeTag(row.is_active, i18nT)}
            style={{ minWidth: "9rem" }}
          />
        </DataTable>
      </SectionCard>
    );
  };

  const renderFamily = () => {
    return (
      <SectionCard
        title={i18nT("static.1ii54cp")}
        description={i18nT("static.nayytp")}
      >
        <DataTable
          value={familyRows}
          dataKey="id"
          stripedRows
          scrollable
          emptyMessage={<TableEmptyMessage label={i18nT("static.oiroz")} />}
        >
          <Column
            field="name"
            header={i18nT("static.4el6o6")}
            style={{ minWidth: "12rem" }}
          />
          <Column
            header={i18nT("static.7fp6jf")}
            body={(row: EmployeeFamilyRow) =>
              row.relationship_name || row.relationship_id
            }
            style={{ minWidth: "12rem" }}
          />
          <Column
            header={i18nT("static.1ierxyf")}
            body={(row: EmployeeFamilyRow) => formatDate(row.dob)}
            style={{ minWidth: "10rem" }}
          />
          <Column
            header={i18nT("static.1adu274")}
            body={(row: EmployeeFamilyRow) => row.gender_name || row.gender_id}
            style={{ minWidth: "9rem" }}
          />
          <Column
            header={i18nT("static.llzjaz")}
            body={(row: EmployeeFamilyRow) =>
              row.marital_name || row.marital_status
            }
            style={{ minWidth: "10rem" }}
          />
          <Column
            field="job"
            header={i18nT("static.ijqa2k")}
            style={{ minWidth: "10rem" }}
          />
          <Column
            field="phone1"
            header={i18nT("static.17pijxg")}
            style={{ minWidth: "10rem" }}
          />
          <Column
            field="phone2"
            header={i18nT("static.18jhd0d")}
            style={{ minWidth: "10rem" }}
          />
          <Column
            header={i18nT("static.3pd73")}
            body={(row: EmployeeFamilyRow) => activeTag(row.is_active, i18nT)}
            style={{ minWidth: "9rem" }}
          />
        </DataTable>
      </SectionCard>
    );
  };

  const renderEmergencyContact = () => {
    return (
      <SectionCard
        title={i18nT("static.682t3a")}
        description={i18nT("static.fi8q8u")}
      >
        <DataTable
          value={emergencyRows}
          dataKey="id"
          stripedRows
          scrollable
          emptyMessage={<TableEmptyMessage label={i18nT("static.1an64zm")} />}
        >
          <Column
            field="name"
            header={i18nT("static.4el6o6")}
            style={{ minWidth: "12rem" }}
          />
          <Column
            header={i18nT("static.7fp6jf")}
            body={(row: EmployeeEmergencyContactRow) =>
              row.relationship_name || row.relationship_id
            }
            style={{ minWidth: "12rem" }}
          />
          <Column
            field="phone"
            header={i18nT("static.kb2lhr")}
            style={{ minWidth: "10rem" }}
          />
          <Column
            header={i18nT("static.3pd73")}
            body={(row: EmployeeEmergencyContactRow) =>
              activeTag(row.is_active, i18nT)
            }
            style={{ minWidth: "9rem" }}
          />
        </DataTable>
      </SectionCard>
    );
  };

  const renderEducationTable = (
    title: string,
    description: string,
    rows: EmployeeEducationRow[],
  ) => {
    const localizedTitle = tText(title);

    return (
      <SectionCard title={localizedTitle} description={tText(description)}>
        <DataTable
          value={rows}
          dataKey="id"
          stripedRows
          scrollable
          emptyMessage={
            <TableEmptyMessage label={localizedTitle.toLowerCase()} />
          }
        >
          <Column
            field="name"
            header={i18nT("static.4el6o6")}
            style={{ minWidth: "12rem" }}
          />
          <Column
            field="institution_name"
            header={i18nT("static.1a523l1")}
            style={{ minWidth: "14rem" }}
          />
          <Column
            field="major"
            header={i18nT("static.6zybgi")}
            style={{ minWidth: "12rem" }}
          />
          <Column
            field="degree"
            header={i18nT("static.118dsp5")}
            style={{ minWidth: "10rem" }}
          />
          <Column
            header={i18nT("static.7bl5hd")}
            body={(row: EmployeeEducationRow) => formatDate(row.start_date)}
            style={{ minWidth: "10rem" }}
          />
          <Column
            header={i18nT("static.1j4m31m")}
            body={(row: EmployeeEducationRow) => formatDate(row.end_date)}
            style={{ minWidth: "10rem" }}
          />
          <Column
            field="score"
            header={i18nT("static.x9tsfp")}
            style={{ minWidth: "8rem" }}
          />
          <Column
            field="held_by"
            header={i18nT("static.1h4t9b7")}
            style={{ minWidth: "10rem" }}
          />
          <Column
            header={i18nT("static.l17574")}
            body={(row: EmployeeEducationRow) =>
              boolText(row.is_certificate, i18nT)
            }
            style={{ minWidth: "9rem" }}
          />
          <Column
            header={i18nT("static.3pd73")}
            body={(row: EmployeeEducationRow) =>
              activeTag(row.is_active, i18nT)
            }
            style={{ minWidth: "9rem" }}
          />
        </DataTable>
      </SectionCard>
    );
  };

  const renderWorkExperience = () => {
    return (
      <SectionCard
        title={i18nT("static.3ytfto")}
        description={i18nT("static.26jgwh")}
      >
        <DataTable
          value={workExperienceRows}
          dataKey="id"
          stripedRows
          scrollable
          emptyMessage={<TableEmptyMessage label={i18nT("static.8ylt0c")} />}
        >
          <Column
            field="company"
            header={i18nT("static.1hra0d8")}
            style={{ minWidth: "14rem" }}
          />
          <Column
            field="position"
            header={i18nT("static.1quewx6")}
            style={{ minWidth: "14rem" }}
          />
          <Column
            header={i18nT("static.7bl5hd")}
            body={(row: EmployeeWorkExperienceRow) =>
              formatDate(row.start_date)
            }
            style={{ minWidth: "10rem" }}
          />
          <Column
            header={i18nT("static.1j4m31m")}
            body={(row: EmployeeWorkExperienceRow) => formatDate(row.end_date)}
            style={{ minWidth: "10rem" }}
          />
          <Column
            header={i18nT("static.3pd73")}
            body={(row: EmployeeWorkExperienceRow) =>
              activeTag(row.is_active, i18nT)
            }
            style={{ minWidth: "9rem" }}
          />
        </DataTable>
      </SectionCard>
    );
  };

  const renderLeaveBalance = () => {
    return (
      <SectionCard
        title={i18nT("static.1es4nt0")}
        description={i18nT("static.hbt392")}
      >
        <DataTable
          value={leaveBalanceRows}
          dataKey="id"
          stripedRows
          scrollable
          emptyMessage={<TableEmptyMessage label={i18nT("static.15wjxh0")} />}
        >
          <Column
            header={i18nT("static.se3juw")}
            body={(row: EmployeeLeaveBalance) =>
              row.leave_type_name || row.leave_type_id
            }
            style={{ minWidth: "14rem" }}
          />
          <Column
            header={i18nT("static.rctpc")}
            body={(row: EmployeeLeaveBalance) => formatDate(row.period_start)}
            style={{ minWidth: "10rem" }}
          />
          <Column
            header={i18nT("static.1aquwpt")}
            body={(row: EmployeeLeaveBalance) => formatDate(row.period_end)}
            style={{ minWidth: "10rem" }}
          />
          <Column
            field="opening_balance"
            header={i18nT("static.dfet3")}
            style={{ minWidth: "8rem" }}
          />
          <Column
            field="entitlement"
            header={i18nT("static.ija3a8")}
            style={{ minWidth: "8rem" }}
          />
          <Column
            field="taken"
            header={i18nT("static.1neeuvc")}
            style={{ minWidth: "8rem" }}
          />
          <Column
            field="adjustment"
            header={i18nT("static.1ncp8v2")}
            style={{ minWidth: "8rem" }}
          />
          <Column
            field="expired_balance"
            header={i18nT("static.1gcie36")}
            style={{ minWidth: "8rem" }}
          />
          <Column
            field="closing_balance"
            header={i18nT("static.sd6odg")}
            style={{ minWidth: "8rem" }}
          />
          <Column
            header={i18nT("static.1wy0gb9")}
            body={(row: EmployeeLeaveBalance) => formatDateTime(row.updated_at)}
            style={{ minWidth: "12rem" }}
          />
        </DataTable>
      </SectionCard>
    );
  };

  const renderOverview = (): JSX.Element => {
    return (
      <div className="flex flex-col gap-5">
        {renderPersonalData()}
        {renderEmploymentData()}
      </div>
    );
  };

  const renderPersonal = (): JSX.Element => {
    return (
      <div className="flex flex-col gap-5">
        {renderPersonalData()}
        {renderIdentityAddress()}
        {renderFamily()}
        {renderEmergencyContact()}
      </div>
    );
  };

  const renderCareer = (): JSX.Element => {
    return (
      <div className="flex flex-col gap-5">
        {renderEmploymentData()}
        {renderEducationTable(
          "Formal Education",
          "School, diploma, bachelor, master, and other formal records.",
          formalEducationRows,
        )}
        {renderEducationTable(
          "Informal Education",
          "Course, workshop, training, and certification records.",
          informalEducationRows,
        )}
        {renderWorkExperience()}
      </div>
    );
  };

  const renderActiveContent = () => {
    if (activeTab === "overview") return renderOverview();
    if (activeTab === "personal") return renderPersonal();
    if (activeTab === "career") return renderCareer();
    if (activeTab === "leave") return renderLeaveBalance();
    if (activeTab === "hr-records") {
      return (
        <MyProfileHrRecordsPanel
          data={hrRecords}
          isLoading={isHrRecordsLoading}
          error={hrRecordsError}
          onRetry={() => {
            void mutateHrRecords();
          }}
        />
      );
    }

    return renderOverview();
  };

  return (
    <div className="flex flex-col gap-5">
      {renderError()}

      {renderProfileSummary()}

      <MyProfileHrSnapshot
        data={hrRecords}
        isLoading={isHrRecordsLoading}
        error={hrRecordsError}
        onRetry={() => {
          void mutateHrRecords();
        }}
      />

      <Card>
        <div className="flex flex-col gap-5">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              {i18nT("static.1dze6zf")}{" "}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {i18nT("static.hqxwq6")}{" "}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-2 md:flex-row md:flex-wrap">
                {tabs.map((tab) => {
                  const isActive = activeTab === tab.key;

                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setActiveTab(tab.key)}
                      className={`rounded-xl border px-4 py-3 text-left text-sm transition ${
                        isActive
                          ? "border-blue-200 bg-blue-600 text-white shadow-sm"
                          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`${tab.icon} text-sm`} />
                        <span className="font-semibold">
                          {tText(tab.labelKey)}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="rounded-xl bg-white px-4 py-3">
                <div className="flex items-start gap-3">
                  <span
                    className={`${activeTabMeta.icon} mt-0.5 text-blue-600`}
                  />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {tText(activeTabMeta.labelKey)}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {tText(activeTabMeta.descriptionKey)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Divider className="my-0" />

          {isPersonalLoading ? (
            <div className="flex min-h-[20rem] items-center justify-center">
              <ProgressSpinner />
            </div>
          ) : (
            renderActiveContent()
          )}
        </div>
      </Card>
    </div>
  );
};

export default MyProfilePage;
