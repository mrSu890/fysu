import { BUSINESS } from "@/lib/business"
import { renderDoc, renderText, SITE_URL, type Block } from "@/lib/emailBlocks"

export { SITE_URL }
export type { Block }

export type Campaign = {
  subject: string
  /** 2e objet : la moitié des destinataires reçoit celui-ci (test A/B) */
  subjectB?: string
  preheader?: string
  blocks: Block[]
}

export type Footer = { intro: string; link: string; prefs?: string }

export function renderEmail(c: Campaign, unsubUrl: string, lang = "fr", footer?: Footer, prefsUrl?: string): { html: string; text: string } {
  return {
    html: renderDoc({ preheader: c.preheader, blocks: c.blocks, unsubUrl, business: BUSINESS, lang, footer, prefsUrl }),
    text: renderText(c.blocks, unsubUrl, footer?.link),
  }
}
