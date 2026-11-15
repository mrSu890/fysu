import { BUSINESS } from "@/lib/business"
import { renderDoc, renderText, SITE_URL, type Block } from "@/lib/emailBlocks"

export { SITE_URL }
export type { Block }

export type Campaign = {
  subject: string
  preheader?: string
  blocks: Block[]
}

export type Footer = { intro: string; link: string }

export function renderEmail(c: Campaign, unsubUrl: string, lang = "fr", footer?: Footer): { html: string; text: string } {
  return {
    html: renderDoc({ preheader: c.preheader, blocks: c.blocks, unsubUrl, business: BUSINESS, lang, footer }),
    text: renderText(c.blocks, unsubUrl, footer?.link),
  }
}
