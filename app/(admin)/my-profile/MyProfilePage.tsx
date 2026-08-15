"use client";

import React, { JSX, useMemo, useState } from "react";
import useSWR from "swr";
import dayjs from "dayjs";

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
import {
  MyProfileEmploymentData,
  MyProfilePersonalData,
} from "@/app/types/my-profile";
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
} from "@/app/types/my-profile-service";

type TabKey = "overview" | "personal" | "career" | "leave";

const tabs: Array<{
  key: TabKey;
  label: string;
  icon: string;
  description: string;
}> = [
  {
    key: "overview",
    label: "Overview",
    icon: "pi pi-id-card",
    description: "Profile summary, personal data, and employment snapshot.",
  },
  {
    key: "personal",
    label: "Personal",
    icon: "pi pi-user",
    description: "Identity, address, family, and emergency contact.",
  },
  {
    key: "career",
    label: "Career",
    icon: "pi pi-briefcase",
    description: "Employment, education, training, and work experience.",
  },
  {
    key: "leave",
    label: "Leave Balance",
    icon: "pi pi-calendar",
    description: "Available leave balance by period and leave type.",
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
  if (!value) return "-";

  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format("DD MMM YYYY") : "-";
};

const formatDateTime = (value?: string | null) => {
  if (!value) return "-";

  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format("DD MMM YYYY HH:mm") : "-";
};

const boolText = (value?: boolean | null) => {
  if (value === true) return "Yes";
  if (value === false) return "No";
  return "-";
};

const activeTag = (value?: boolean | null) => {
  if (value === true) {
    return <Tag value="Active" severity="success" />;
  }

  if (value === false) {
    return <Tag value="Inactive" severity="secondary" />;
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
  return (
    <div className="py-6 text-center text-sm text-slate-500">
      No {label} found.
    </div>
  );
};

const MyProfilePage = () => {
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
        Failed to load My Profile data. Please refresh the page or contact
        administrator.
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
            <div className="text-sm font-medium text-slate-500">My Profile</div>
            <h1
              className="mt-1 text-2xl font-semibold leading-snug text-slate-900"
              style={{ overflowWrap: "anywhere" }}
              title={employeeName}
            >
              {employeeName}
            </h1>

            <div className="mt-2 flex flex-wrap justify-center gap-2 md:justify-start">
              {employmentData?.code && (
                <Tag value={`Code: ${employmentData.code}`} severity="info" />
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
              <div className="text-xs text-blue-700">Leave Balance</div>
              <div className="mt-1 text-xl font-semibold text-blue-900">
                {totalLeaveClosingBalance}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="text-xs text-slate-500">Join Date</div>
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
    const data = personalData as MyProfilePersonalData | undefined;

    return (
      <SectionCard
        title="Personal Data"
        description="Basic employee personal information."
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          <InfoItem label="First Name" value={data?.first_name} />
          <InfoItem label="Middle Name" value={data?.middle_name} />
          <InfoItem label="Last Name" value={data?.last_name} />
          <InfoItem label="Preferred Name" value={data?.preferred_name} />
          <InfoItem label="Birth Place" value={data?.birth_place} />
          <InfoItem label="Date of Birth" value={formatDate(data?.dob)} />

          <InfoItem
            label="Gender"
            value={data?.gender_name ?? data?.gender_id}
          />

          <InfoItem
            label="Religion"
            value={data?.religion_name ?? data?.religion_id}
          />

          <InfoItem
            label="Marital Status"
            value={data?.marital_status_name ?? data?.marital_status_id}
          />

          <InfoItem label="Phone Number" value={data?.phone_number} />
          <InfoItem label="Personal Email" value={data?.personal_email} />
          <InfoItem label="Work Email" value={data?.work_email} />

          <InfoItem
            label="Nationality"
            value={
              data?.nationality_country_name ?? data?.nationality_country_id
            }
          />
        </div>
      </SectionCard>
    );
  };

  const renderEmploymentData = () => {
    const data = employmentData as MyProfileEmploymentData | null | undefined;

    return (
      <SectionCard
        title="Employment Data"
        description="Current employment assignment and organization data."
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          <InfoItem label="Employee Code" value={data?.code} />
          <InfoItem label="Join Date" value={formatDate(data?.join_date)} />
          <InfoItem label="End Date" value={formatDate(data?.end_date)} />
          <InfoItem
            label="Probation End Date"
            value={formatDate(data?.probation_end_date)}
          />
          <InfoItem
            label="Confirmation Date"
            value={formatDate(data?.confirmation_date)}
          />

          <InfoItem
            label="Agency"
            value={data?.agency_name ?? data?.agency_id}
          />

          <InfoItem
            label="Branch"
            value={data?.branch_name ?? data?.branch_id}
          />

          <InfoItem
            label="Department"
            value={data?.department_name ?? data?.department_id}
          />

          <InfoItem
            label="Position"
            value={data?.position_name ?? data?.position_id}
          />

          <InfoItem
            label="Employment Status"
            value={data?.employment_status_name ?? data?.employment_status_id}
          />

          <InfoItem
            label="Supervisor"
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
        title="Identity & Address"
        description="Identity documents and registered address information."
      >
        <DataTable
          value={identityRows}
          dataKey="id"
          stripedRows
          scrollable
          emptyMessage={<TableEmptyMessage label="identity data" />}
        >
          <Column
            header="Identity Type"
            body={(row: EmployeeIdentityRow) =>
              row.identity_type_name || row.identity_type_id
            }
            style={{ minWidth: "12rem" }}
          />
          <Column
            field="number"
            header="Number"
            style={{ minWidth: "12rem" }}
          />
          <Column
            header="Expire Date"
            body={(row: EmployeeIdentityRow) => formatDate(row.expire_date)}
            style={{ minWidth: "10rem" }}
          />
          <Column
            field="citizen_address"
            header="Citizen Address"
            style={{ minWidth: "16rem" }}
          />
          <Column
            field="residential_address"
            header="Residential Address"
            style={{ minWidth: "16rem" }}
          />
          <Column
            header="Permanent"
            body={(row: EmployeeIdentityRow) => boolText(row.is_permanent)}
            style={{ minWidth: "9rem" }}
          />
          <Column
            header="Status"
            body={(row: EmployeeIdentityRow) => activeTag(row.is_active)}
            style={{ minWidth: "9rem" }}
          />
        </DataTable>
      </SectionCard>
    );
  };

  const renderFamily = () => {
    return (
      <SectionCard
        title="Family"
        description="Family member data registered in employee profile."
      >
        <DataTable
          value={familyRows}
          dataKey="id"
          stripedRows
          scrollable
          emptyMessage={<TableEmptyMessage label="family data" />}
        >
          <Column field="name" header="Name" style={{ minWidth: "12rem" }} />
          <Column
            header="Relationship"
            body={(row: EmployeeFamilyRow) =>
              row.relationship_name || row.relationship_id
            }
            style={{ minWidth: "12rem" }}
          />
          <Column
            header="Date of Birth"
            body={(row: EmployeeFamilyRow) => formatDate(row.dob)}
            style={{ minWidth: "10rem" }}
          />
          <Column
            header="Gender"
            body={(row: EmployeeFamilyRow) => row.gender_name || row.gender_id}
            style={{ minWidth: "9rem" }}
          />
          <Column
            header="Marital"
            body={(row: EmployeeFamilyRow) =>
              row.marital_name || row.marital_status
            }
            style={{ minWidth: "10rem" }}
          />
          <Column field="job" header="Job" style={{ minWidth: "10rem" }} />
          <Column
            field="phone1"
            header="Phone 1"
            style={{ minWidth: "10rem" }}
          />
          <Column
            field="phone2"
            header="Phone 2"
            style={{ minWidth: "10rem" }}
          />
          <Column
            header="Status"
            body={(row: EmployeeFamilyRow) => activeTag(row.is_active)}
            style={{ minWidth: "9rem" }}
          />
        </DataTable>
      </SectionCard>
    );
  };

  const renderEmergencyContact = () => {
    return (
      <SectionCard
        title="Emergency Contact"
        description="Emergency contact information."
      >
        <DataTable
          value={emergencyRows}
          dataKey="id"
          stripedRows
          scrollable
          emptyMessage={<TableEmptyMessage label="emergency contact data" />}
        >
          <Column field="name" header="Name" style={{ minWidth: "12rem" }} />
          <Column
            header="Relationship"
            body={(row: EmployeeEmergencyContactRow) =>
              row.relationship_name || row.relationship_id
            }
            style={{ minWidth: "12rem" }}
          />
          <Column field="phone" header="Phone" style={{ minWidth: "10rem" }} />
          <Column
            header="Status"
            body={(row: EmployeeEmergencyContactRow) =>
              activeTag(row.is_active)
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
    return (
      <SectionCard title={title} description={description}>
        <DataTable
          value={rows}
          dataKey="id"
          stripedRows
          scrollable
          emptyMessage={<TableEmptyMessage label={title.toLowerCase()} />}
        >
          <Column field="name" header="Name" style={{ minWidth: "12rem" }} />
          <Column
            field="institution_name"
            header="Institution"
            style={{ minWidth: "14rem" }}
          />
          <Column field="major" header="Major" style={{ minWidth: "12rem" }} />
          <Column
            field="degree"
            header="Degree"
            style={{ minWidth: "10rem" }}
          />
          <Column
            header="Start Date"
            body={(row: EmployeeEducationRow) => formatDate(row.start_date)}
            style={{ minWidth: "10rem" }}
          />
          <Column
            header="End Date"
            body={(row: EmployeeEducationRow) => formatDate(row.end_date)}
            style={{ minWidth: "10rem" }}
          />
          <Column field="score" header="Score" style={{ minWidth: "8rem" }} />
          <Column
            field="held_by"
            header="Held By"
            style={{ minWidth: "10rem" }}
          />
          <Column
            header="Certificate"
            body={(row: EmployeeEducationRow) => boolText(row.is_certificate)}
            style={{ minWidth: "9rem" }}
          />
          <Column
            header="Status"
            body={(row: EmployeeEducationRow) => activeTag(row.is_active)}
            style={{ minWidth: "9rem" }}
          />
        </DataTable>
      </SectionCard>
    );
  };

  const renderWorkExperience = () => {
    return (
      <SectionCard
        title="Work Experience"
        description="Previous company and professional experience records."
      >
        <DataTable
          value={workExperienceRows}
          dataKey="id"
          stripedRows
          scrollable
          emptyMessage={<TableEmptyMessage label="work experience data" />}
        >
          <Column
            field="company"
            header="Company"
            style={{ minWidth: "14rem" }}
          />
          <Column
            field="position"
            header="Position"
            style={{ minWidth: "14rem" }}
          />
          <Column
            header="Start Date"
            body={(row: EmployeeWorkExperienceRow) =>
              formatDate(row.start_date)
            }
            style={{ minWidth: "10rem" }}
          />
          <Column
            header="End Date"
            body={(row: EmployeeWorkExperienceRow) => formatDate(row.end_date)}
            style={{ minWidth: "10rem" }}
          />
          <Column
            header="Status"
            body={(row: EmployeeWorkExperienceRow) => activeTag(row.is_active)}
            style={{ minWidth: "9rem" }}
          />
        </DataTable>
      </SectionCard>
    );
  };

  const renderLeaveBalance = () => {
    return (
      <SectionCard
        title="Leave Balance"
        description="Leave balance by leave type and active period."
      >
        <DataTable
          value={leaveBalanceRows}
          dataKey="id"
          stripedRows
          scrollable
          emptyMessage={<TableEmptyMessage label="leave balance data" />}
        >
          <Column
            header="Leave Type"
            body={(row: EmployeeLeaveBalance) =>
              row.leave_type_name || row.leave_type_id
            }
            style={{ minWidth: "14rem" }}
          />
          <Column
            header="Period Start"
            body={(row: EmployeeLeaveBalance) => formatDate(row.period_start)}
            style={{ minWidth: "10rem" }}
          />
          <Column
            header="Period End"
            body={(row: EmployeeLeaveBalance) => formatDate(row.period_end)}
            style={{ minWidth: "10rem" }}
          />
          <Column
            field="opening_balance"
            header="Opening"
            style={{ minWidth: "8rem" }}
          />
          <Column
            field="entitlement"
            header="Entitlement"
            style={{ minWidth: "8rem" }}
          />
          <Column field="taken" header="Taken" style={{ minWidth: "8rem" }} />
          <Column
            field="adjustment"
            header="Adjustment"
            style={{ minWidth: "8rem" }}
          />
          <Column
            field="expired_balance"
            header="Expired"
            style={{ minWidth: "8rem" }}
          />
          <Column
            field="closing_balance"
            header="Closing"
            style={{ minWidth: "8rem" }}
          />
          <Column
            header="Updated At"
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

    return renderOverview();
  };

  return (
    <div className="flex flex-col gap-5">
      {renderError()}

      {renderProfileSummary()}

      <Card>
        <div className="flex flex-col gap-5">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              Employee Data
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              This page is read-only and shows your employee profile based on
              the logged-in account.
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
                        <span className="font-semibold">{tab.label}</span>
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
                      {activeTabMeta.label}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {activeTabMeta.description}
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
