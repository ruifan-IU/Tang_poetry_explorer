import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Long_Cang, Ma_Shan_Zheng, Noto_Serif_SC } from "next/font/google";
import { Navbar } from "./components/Navbar";
import { DEFAULT_POEM_FONT, POEM_FONT_COOKIE, isPoemFont } from "@/lib/poem-fonts";
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

export const metadata: Metadata = {
  title: "唐诗博览",
  description: "阅读、收藏、背诵全唐诗",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // The reader's poem font, applied in the server HTML so the page never
  // flashes the default font first.
  const saved = (await cookies()).get(POEM_FONT_COOKIE)?.value;
  const poemFont = isPoemFont(saved) ? saved : DEFAULT_POEM_FONT;

  // zh-CN picks Simplified Chinese glyph forms for the Han characters Chinese
  // shares with Japanese and Korean, and tells screen readers and search
  // engines the page language.
  return (
    <html
      lang="zh-CN"
      data-poem-font={poemFont}
      className={[notoSerifSC, maShanZheng, longCang]
        .map((font) => font.variable)
        .join(" ")}
    >
      <body className="antialiased">
        <Navbar poemFont={poemFont} />
        {children}
      </body>
    </html>
  );
}
