import { fireEvent, render, screen } from "@testing-library/react";
import PrimeDatePicker from "@/app/_components/PrimeDatePicker";

jest.mock("primereact/calendar", () => ({
  Calendar: (props: {
    dateFormat?: string;
    locale?: string;
    showTime?: boolean;
    onChange: (event: { value: Date }) => void;
  }) => (
    <button
      type="button"
      data-testid="calendar"
      data-date-format={props.dateFormat}
      data-locale={props.locale}
      data-show-time={String(Boolean(props.showTime))}
      onClick={() =>
        props.onChange({ value: new Date(2026, 7, 18, 14, 30, 45) })
      }
    >
      calendar
    </button>
  ),
}));

describe("PrimeDatePicker", () => {
  it("uses the Indonesian date-picker display format and preserves date payloads", () => {
    const onValueChange = jest.fn();

    render(
      <PrimeDatePicker value="2026-08-18" onValueChange={onValueChange} />,
    );

    const calendar = screen.getByTestId("calendar");
    expect(calendar.getAttribute("data-date-format")).toBe("dd MM yy");
    expect(calendar.getAttribute("data-locale")).toBe("id");
    expect(calendar.getAttribute("data-show-time")).toBe("false");

    fireEvent.click(calendar);
    expect(onValueChange).toHaveBeenCalledWith("2026-08-18");
  });

  it("keeps the existing datetime payload contract when time is enabled", () => {
    const onValueChange = jest.fn();

    render(
      <PrimeDatePicker
        value="2026-08-18T14:30"
        withTime
        onValueChange={onValueChange}
      />,
    );

    const calendar = screen.getByTestId("calendar");
    expect(calendar.getAttribute("data-show-time")).toBe("true");

    fireEvent.click(calendar);
    expect(onValueChange).toHaveBeenCalledWith("2026-08-18T14:30");
  });
});
