import artboard1 from "../../asset/Artboard 1.png";
import artboard2 from "../../asset/Artboard 2.png";
import artboard3 from "../../asset/Artboard 3.png";
import artboard4 from "../../asset/Artboard 4.png";
import artboard5 from "../../asset/Artboard 5.png";
import artboard6 from "../../asset/Artboard 6.png";
import artboard7 from "../../asset/Artboard 7.png";
import artboard8 from "../../asset/Artboard 8.png";
import artboard9 from "../../asset/Artboard 9.png";
import artboard10 from "../../asset/Artboard 10.png";
import artboard11 from "../../asset/Artboard 11.png";

export type CatalogueItem = {
  image: string;
  productId: string;
  slug: string;
  name: string;
  series: string;
  detail: string;
  description: string;
  price: number;
};

export const READY_STOCK_CATALOGUE: CatalogueItem[] = [
  { image: artboard1, productId: "33333333-0000-0000-0000-000000000001", slug: "javas-fireman-clasp", name: "Javas Fireman Clasp", series: "Javas", detail: "Monochrome long sleeve", description: "Kemeja long sleeve dengan motif flora Nusantara monokrom dan konstruksi Mandarin collar. Fireman clasp menjadi aksen utama pada siluet yang tegas dan elegan.", price: 1299000 },
  { image: artboard2, productId: "33333333-0000-0000-0000-000000000002", slug: "green-javas-fireman-clasp", name: "Green Javas Fireman Clasp", series: "Javas", detail: "Emerald long sleeve", description: "Interpretasi hijau emerald dari seri Javas dengan panel batik kontras, Mandarin collar, dan fireman clasp untuk karakter heritage yang modern.", price: 1299000 },
  { image: artboard3, productId: "33333333-0000-0000-0000-000000000003", slug: "phoenix-fireman-clasp", name: "Phoenix Fireman Clasp", series: "Phoenix", detail: "Crimson statement jacket", description: "Statement jacket dengan phoenix crimson dan motif ornamental yang berani. Dibuat untuk menjadi pusat perhatian dengan konstruksi collar yang rapi.", price: 1499000 },
  { image: artboard4, productId: "33333333-0000-0000-0000-000000000004", slug: "dragon-fireman-clasp", name: "Dragon Fireman Clasp", series: "Dragon", detail: "Full-colour batik jacket", description: "Jaket batik penuh warna dengan karakter naga yang kuat. Potongan terstruktur dan fireman clasp menjaga keseimbangan antara tradisi dan tailoring kontemporer.", price: 1499000 },
  { image: artboard5, productId: "33333333-0000-0000-0000-000000000005", slug: "white-phoenix-fireman-clasp", name: "White Phoenix Fireman Clasp", series: "Phoenix", detail: "White long sleeve", description: "Kemeja putih dengan aksen phoenix dan detail batik yang memberikan kontras bersih. Siluet long sleeve dirancang untuk pemakaian formal maupun semi-formal.", price: 1299000 },
  { image: artboard6, productId: "33333333-0000-0000-0000-000000000006", slug: "blue-phoenix-fireman-clasp", name: "Blue Phoenix Fireman Clasp", series: "Phoenix", detail: "Blue long sleeve", description: "Palet biru yang tenang dipadukan dengan motif phoenix dan fireman clasp. Konstruksi Mandarin collar memberi tampilan khas RAWTIX.", price: 1299000 },
  { image: artboard7, productId: "33333333-0000-0000-0000-000000000007", slug: "suryanila-phoenix-fireman-clasp", name: "Suryanila Phoenix Fireman Clasp", series: "Phoenix", detail: "Blue printed jacket", description: "Jaket printed bernuansa biru dengan motif phoenix yang ekspresif. Dirancang sebagai signature piece dengan detail panel dan collar yang presisi.", price: 1499000 },
  { image: artboard8, productId: "33333333-0000-0000-0000-000000000008", slug: "sutra-atbm-brown-fireman-clasp", name: "Sutra ATBM Fireman Clasp", series: "Sutra ATBM", detail: "Brown patterned jacket", description: "Jaket bermotif cokelat yang menonjolkan tekstur kain ATBM. Fireman clasp dan Mandarin collar membentuk tampilan heritage yang refined.", price: 1399000 },
  { image: artboard9, productId: "33333333-0000-0000-0000-000000000009", slug: "sutra-atbm-black-fireman-clasp", name: "Sutra ATBM Fireman Clasp", series: "Sutra ATBM", detail: "Black patterned jacket", description: "Versi hitam dari seri Sutra ATBM dengan motif yang dalam dan versatile. Siluetnya mudah dipadukan untuk acara siang maupun malam.", price: 1399000 },
  { image: artboard10, productId: "33333333-0000-0000-0000-000000000010", slug: "swarna-ananta-long-sleeve", name: "Swarna Ananta Fireman Clasp", series: "Swarna Ananta", detail: "Long sleeve signature piece", description: "Signature piece long sleeve dengan motif Swarna Ananta yang kaya simbol. Konstruksi collar dan clasp dibuat untuk tampilan berkarakter.", price: 1399000 },
  { image: artboard11, productId: "33333333-0000-0000-0000-000000000011", slug: "swarna-ananta-short-sleeve", name: "Swarna Ananta Fireman Clasp", series: "Swarna Ananta", detail: "Short sleeve signature piece", description: "Versi short sleeve yang lebih ringan dari seri Swarna Ananta. Motif heritage tetap menjadi fokus dengan potongan yang nyaman untuk iklim tropis.", price: 1199000 },
];
