// Account app links carry a web-only prefix that is not an Expo Router route.
export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  try {
    const url = new URL(path, "liftwise:///");
    const isAccountLink =
      url.protocol === "https:" &&
      url.hostname === "myaccount.chefu.co.za" &&
      url.pathname === "/app/liftwise/sso-callback";
    const isNativeLink =
      url.protocol === "liftwise:" &&
      ((url.hostname === "app" &&
        url.pathname === "/liftwise/sso-callback") ||
        (!url.hostname && url.pathname === "/app/liftwise/sso-callback"));

    if (isAccountLink || isNativeLink) {
      return `/sso-callback${url.search}${url.hash}`;
    }
  } catch {
    // Native intents can contain arbitrary strings. Leave other links alone.
  }
  return path;
}
