import React, { lazy, Suspense } from "react";

const TimeAttendanceDetail = () => {
  const renderSalaryBank = () => {
    const SalaryDetailSection = lazy(() => import("./SalaryDetailSection"));
    // const BankDetailSection = lazy(() => import("./BankDetailSection"));

    return (
      <Suspense fallback={<p>Loading...</p>}>
        <div className="flex flex-col gap-10">
          <SalaryDetailSection />
          {/* <BankDetailSection /> */}
        </div>
      </Suspense>
    );
  };

  return renderSalaryBank();
};

export default TimeAttendanceDetail;
