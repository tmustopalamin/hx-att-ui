import { confirmDialog } from "primereact/confirmdialog";
import { requestActionConfirmation } from "./ActionConfirmDialog";

jest.mock("primereact/confirmdialog", () => ({
  ConfirmDialog: () => null,
  confirmDialog: jest.fn(),
}));

describe("requestActionConfirmation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("creates a grouped confirmation and runs the accepted action", () => {
    const onAccept = jest.fn();

    requestActionConfirmation({
      action: "Delete record",
      target: "Employee 42",
      severity: "danger",
      onAccept,
    });

    const options = (confirmDialog as jest.Mock).mock.calls[0][0] as {
      group: string;
      accept: () => void;
      reject: () => void;
      onHide: () => void;
      acceptLabel: string;
      rejectLabel: string;
    };

    expect(options.group).toBe("hris-action-confirm");
    expect(options.acceptLabel).toBe("Delete record");
    expect(options.rejectLabel).toBe("Cancel");
    options.reject();
    expect(onAccept).not.toHaveBeenCalled();
    options.onHide();
    expect(onAccept).not.toHaveBeenCalled();

    requestActionConfirmation({
      action: "Delete record",
      onAccept,
    });
    const acceptedOptions = (confirmDialog as jest.Mock).mock.calls[1][0] as {
      accept: () => void;
    };
    acceptedOptions.accept();
    expect(onAccept).toHaveBeenCalledTimes(1);
  });

  it("routes legacy-shaped confirmations to the shared group and settles once", () => {
    const onAccept = jest.fn();

    requestActionConfirmation({
      header: "Delete record",
      message: "Delete this record?",
      accept: onAccept,
    });

    const options = (confirmDialog as jest.Mock).mock.calls[0][0] as {
      group: string;
      accept: () => void;
      reject: () => void;
      onHide: (result: string) => void;
    };

    expect(options.group).toBe("hris-action-confirm");
    options.accept();
    options.accept();
    options.onHide("accept");
    options.reject();

    expect(onAccept).toHaveBeenCalledTimes(1);
  });
});
