import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Cactus_Classical_Serif, Long_Cang, Ma_Shan_Zheng, Noto_Serif_SC } from "next/font/google";
import { LocaleProvider } from "./components/LocaleProvider";
import { Navbar } from "./components/Navbar";
import { PageBackground } from "./components/PageBackground";
import { randomBackground } from "@/lib/backgrounds";
import { DEFAULT_POEM_FONT, POEM_FONT_COOKIE, isPoemFont } from "@/lib/poem-fonts";
import { DEFAULT_THEME, THEME_COOKIE, isTheme } from "@/lib/theme";
import { htmlLang } from "@/lib/locale";
import { getLocale, getMessages } from "@/lib/locale-server";
// LXGW WenKai GB (霞鹜文楷) isn't on Google Fonts; this package ships it
// split into unicode-range chunks. Regular weight only.
import "lxgw-wenkai-gb-web/lxgwwenkaigb-regular/result.css";
import "./globals.css";

// Poem typefaces the reader can choose (lib/poem-fonts.ts; the stacks are in
// globals.css). Noto Serif SC is also the UI font. There is no CJK subset to preload, so nothing is preloaded:
// each stylesheet splits its font into unicode-range chunks, and a browser
// downloads only the chunks for characters on the page, in the font in use.
const notoSerifSC = Noto_Serif_SC({
  variable: "--font-noto-serif-sc",
  display: "swap",
  preload: false,
});
const cactusClassicalSerif = Cactus_Classical_Serif({
  weight: "400",
  variable: "--font-cactus-classical-serif",
  display: "swap",
  preload: false,
});
const maShanZheng = Ma_Shan_Zheng({
  weight: "400",
  variable: "--font-ma-shan-zheng",
  display: "swap",
  preload: false,
});
const longCang = Long_Cang({
  weight: "400",
  variable: "--font-long-cang",
  display: "swap",
  preload: false,
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getMessages();
  return { title: t.brand, description: t.description };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // The reader's poem font, applied in the server HTML so the page never
  // flashes the default font first.
  const cookieStore = await cookies();
  const savedFont = cookieStore.get(POEM_FONT_COOKIE)?.value;
  const poemFont = isPoemFont(savedFont) ? savedFont : DEFAULT_POEM_FONT;
  // Light or dark, likewise in the server HTML so the page never flashes
  // the other one; 'system' sets no attribute and CSS follows the OS.
  const savedTheme = cookieStore.get(THEME_COOKIE)?.value;
  const theme = isTheme(savedTheme) ? savedTheme : DEFAULT_THEME;
  // A new painting on each page load; the layout stays mounted across
  // in-app navigation, so it's the same one until the next load.
  const background = randomBackground();
  // The interface language (lib/locale.ts), in the server HTML like the rest.
  const locale = await getLocale();

  // lang tells screen readers and search engines the interface language.
  // The poems, poets and tags are Chinese whatever it is, so the elements
  // showing them carry lang="zh-CN" themselves -- which also makes the
  // browser pick Simplified Chinese glyph forms for the Han characters
  // Chinese shares with Japanese and Korean.
  return (
    <html
      lang={htmlLang(locale)}
      data-poem-font={poemFont}
      data-theme={theme === "system" ? undefined : theme}
      className={[notoSerifSC, cactusClassicalSerif, maShanZheng, longCang]
        .map((font) => font.variable)
        .join(" ")}
    >
      <body className="antialiased">
        <LocaleProvider locale={locale}>
          <PageBackground background={background} />
          <Navbar poemFont={poemFont} theme={theme} />
          {children}
        </LocaleProvider>
      </body>
    </html>
  );
}
