export function changeTheme(theme: string) {
  const link = document.getElementById("theme-link") as HTMLLinkElement;
  if (link) {
    link.href = `/themes/${theme}.css`;
  }
}
