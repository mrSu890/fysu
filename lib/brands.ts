/* ====================================================================
   MARQUES (style de la fiche produit)
   fysu = fiche classique · The Wave = fond rouge et vague · Kiban Collector = sombre
   ==================================================================== */

export type BrandId = "fysu" | "thewave" | "kiban"

export type BrandConfig = {
  id: BrandId
  label: string
  // page de la marque sur le site (null = pas de page)
  path: string | null
}

export const BRANDS: Record<BrandId, BrandConfig> = {
  fysu: { id: "fysu", label: "fysu", path: null },
  thewave: { id: "thewave", label: "The Wave", path: "/thewave" },
  kiban: { id: "kiban", label: "Kiban Collector", path: "/kiban-collector" },
}

export const BRAND_LIST = Object.values(BRANDS)

export function isBrandId(value: unknown): value is BrandId {
  return typeof value === "string" && value in BRANDS
}

export function getBrandId(value: unknown): BrandId {
  return isBrandId(value) ? value : "fysu"
}

// Couleurs de The Wave (les mêmes que la page /thewave)
export const WAVE = {
  RED: "#e10813",
  PINK: "#f5b0b3",
  // rouge un peu plus foncé : la vague est discrète derrière la fiche produit
  DEEP: "#c4050f",
  PATH:
    "M1820 1833 C1808 1834 1780 1839 1761 1840 C1742 1841 1723 1842 1704 1840 C1685 1838 1666 1837 1647 1829 C1628 1822 1606 1810 1592 1795 C1579 1780 1571 1758 1566 1739 C1562 1720 1566 1701 1566 1682 C1567 1663 1572 1644 1572 1625 C1571 1606 1570 1587 1564 1568 C1558 1549 1549 1529 1535 1511 C1522 1493 1501 1475 1483 1462 C1465 1449 1445 1440 1426 1432 C1407 1424 1388 1419 1369 1414 C1350 1409 1332 1407 1313 1404 C1294 1402 1275 1401 1256 1400 C1237 1400 1218 1400 1199 1400 C1180 1401 1161 1402 1142 1404 C1123 1406 1104 1409 1085 1412 C1066 1414 1047 1418 1028 1422 C1009 1425 990 1429 971 1434 C952 1438 933 1443 914 1448 C895 1453 876 1458 857 1463 C838 1469 819 1475 800 1481 C781 1487 762 1494 743 1500 C724 1507 705 1515 686 1522 C667 1529 649 1537 630 1545 C611 1553 592 1561 573 1570 C554 1578 535 1587 516 1596 C497 1605 478 1614 459 1624 C440 1633 421 1642 402 1652 C383 1661 364 1671 345 1681 C326 1691 307 1700 288 1710 C269 1720 250 1730 231 1739 C212 1749 193 1759 174 1769 C155 1778 136 1788 117 1797 C98 1807 79 1816 60 1825 C41 1834 12 1848 3 1852 L0 1852 L-3 2579 L1824 2579Z",
}
