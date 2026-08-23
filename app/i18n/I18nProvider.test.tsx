import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import en from "./messages/en";
import id from "./messages/id";
import zhCN from "./messages/zh-CN";
import { I18nProvider, useI18n } from "./I18nProvider";
import { translateStaticText } from "./staticTranslations";

const Probe = () => {
  const { locale, setLocale, t, formatNumber } = useI18n();
  return (
    <div>
      <span data-testid="locale">{locale}</span>
      <span data-testid="title">{t("auth.login.title")}</span>
      <span data-testid="static-title">{t("static.10tvoe1")}</span>
      <span data-testid="supplemental-static">{t("static.112tcox")}</span>
      <span data-testid="number">{formatNumber(1234567)}</span>
      <button type="button" onClick={() => void setLocale("id")}>
        change
      </button>
    </div>
  );
};

describe("I18nProvider", () => {
  it("keeps all locale dictionaries in parity", () => {
    expect(Object.keys(id).sort()).toEqual(Object.keys(en).sort());
    expect(Object.keys(zhCN).sort()).toEqual(Object.keys(en).sort());
  });

  it("starts in English and changes locale without remounting the tree", async () => {
    render(
      <I18nProvider initialLocale="en" initialMessages={en}>
        <Probe />
      </I18nProvider>,
    );

    expect(screen.getByTestId("locale").textContent).toBe("en");
    expect(screen.getByTestId("title").textContent).toBe("Welcome back");
    expect(screen.getByTestId("static-title").textContent).toBe(
      "Account Settings",
    );

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "change" }));
    });

    await waitFor(() => {
      expect(screen.getByTestId("locale").textContent).toBe("id");
    });
    expect(screen.getByTestId("title").textContent).toBe(
      "Selamat datang kembali",
    );
    expect(screen.getByTestId("static-title").textContent).toBe(
      "Pengaturan Akun",
    );
    expect(screen.getByTestId("supplemental-static").textContent).toBe(
      "Tidak tersedia",
    );
    expect(document.cookie).toContain("ui_locale=id");
  });

  it("translates static content and option labels without a runtime dependency", () => {
    expect(translateStaticText("Every 5 minutes", "id")).toBe("Setiap 5 menit");
    expect(translateStaticText("Every 5 minutes", "zh-CN")).toBe("每 5 分钟");
    expect(translateStaticText("to", "id")).toBe("sampai");
    expect(translateStaticText("total records", "id")).toBe("total data");
  });
});
