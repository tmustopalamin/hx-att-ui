import PrimeReact, { localeOptions } from "primereact/api";
import "@/app/_components/PrimeReactLocaleProvider";

describe("PrimeReact Indonesian locale", () => {
  it("sets Indonesian as the active locale before components mount", () => {
    expect(PrimeReact.locale).toBe("id");
  });

  it("registers Indonesian calendar labels and date format", () => {
    const locale = localeOptions("id") as {
      dateFormat: string;
      monthNames: string[];
      dayNames: string[];
      firstDayOfWeek: number;
    };

    expect(locale.dateFormat).toBe("dd MM yy");
    expect(locale.monthNames[7]).toBe("Agustus");
    expect(locale.dayNames[2]).toBe("Selasa");
    expect(locale.firstDayOfWeek).toBe(1);
  });
});
