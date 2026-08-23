import PrimeReact, { localeOptions } from "primereact/api";
import "@/app/_components/PrimeReactLocaleProvider";

describe("PrimeReact locales", () => {
  it("starts with the safe English locale before the provider mounts", () => {
    expect(PrimeReact.locale).toBe("en");
  });

  it("registers the Indonesian calendar labels and date format", () => {
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

  it("registers Simplified Chinese calendar labels", () => {
    const locale = localeOptions("zh-CN") as {
      today: string;
      monthNames: string[];
      dayNames: string[];
      firstDayOfWeek: number;
    };

    expect(locale.today).toBe("今天");
    expect(locale.monthNames[0]).toBe("一月");
    expect(locale.dayNames[0]).toBe("星期日");
    expect(locale.firstDayOfWeek).toBe(1);
  });
});
