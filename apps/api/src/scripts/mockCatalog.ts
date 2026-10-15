/**
 * Starter catalogue built from the mock data in /data/data.ts.
 *
 * Prices, discount prices, sizes, stock and bestseller flags come from the
 * entry for the same image. For img12–img19 the mock names, categories and
 * descriptions did not match the photos, so the names, categories and
 * descriptions below describe what each photo actually shows.
 * Mock ratings, review counts and orders are not imported: the store has no
 * review system and orders must come from real customers.
 */

export interface MockCategory {
  slug: string;
  name: string;
  description: string;
  displayOrder: number;
}

export interface MockProduct {
  image: string;
  name: string;
  category: string;
  description: string;
  /** GHS, as in the mock data */
  price: number;
  offerPrice: number | null;
  sizes: string[];
  stock: number;
  bestseller: boolean;
}

export const MOCK_CATEGORIES: MockCategory[] = [
  { slug: "t-shirts-and-tops", name: "T-Shirts & Tops", description: "Everyday tees, tanks and sleeveless tops.", displayOrder: 1 },
  { slug: "shirts", name: "Shirts", description: "Button-down and utility shirts.", displayOrder: 2 },
  { slug: "hoodies-and-sweatshirts", name: "Hoodies & Sweatshirts", description: "Warm, comfortable layers for cool evenings.", displayOrder: 3 },
  { slug: "jackets", name: "Jackets", description: "Outer layers for every season.", displayOrder: 4 },
  { slug: "trousers-and-jeans", name: "Trousers & Jeans", description: "Smart trousers, relaxed jeans and cargo pants.", displayOrder: 5 },
  { slug: "shorts", name: "Shorts", description: "Denim shorts and jorts.", displayOrder: 6 },
  { slug: "caps-and-hats", name: "Caps & Hats", description: "Caps and beanies to finish the look.", displayOrder: 7 },
  { slug: "underwear", name: "Underwear", description: "Everyday underwear essentials.", displayOrder: 8 },
];

const LETTER = ["S", "M", "L", "XL", "XXL"];

export const MOCK_PRODUCTS: MockProduct[] = [
  { image: "img1.jpg", name: "White Oversized Tee", category: "t-shirts-and-tops", description: "Plain white tee with a relaxed oversized fit and dropped shoulders. Easy to dress up or down.", price: 320, offerPrice: 260, sizes: LETTER, stock: 45, bestseller: true },
  { image: "img2.jpg", name: "Black Tee", category: "t-shirts-and-tops", description: "Classic black crew-neck T-shirt with short sleeves — an everyday wardrobe staple.", price: 280, offerPrice: null, sizes: LETTER, stock: 32, bestseller: false },
  { image: "img3.jpg", name: "Green Utility Shirt", category: "shirts", description: "Sage green long-sleeve utility shirt with two flap chest pockets. Wear it buttoned or open over a tee.", price: 85, offerPrice: 65, sizes: LETTER, stock: 120, bestseller: false },
  { image: "img4.jpg", name: "Burgundy Sweatshirt", category: "hoodies-and-sweatshirts", description: "Crew-neck sweatshirt in a rich burgundy with ribbed cuffs and hem.", price: 100, offerPrice: null, sizes: LETTER, stock: 85, bestseller: true },
  { image: "img5.jpg", name: "Tan Hoodie", category: "hoodies-and-sweatshirts", description: "Camel pullover hoodie with a drawstring hood and front kangaroo pocket.", price: 420, offerPrice: 350, sizes: LETTER, stock: 28, bestseller: true },
  { image: "img6.jpg", name: "Cream Corduroy Jacket", category: "jackets", description: "Cream corduroy jacket with a button front and two chest pockets.", price: 190, offerPrice: 155, sizes: LETTER, stock: 55, bestseller: false },
  { image: "img7.jpg", name: "Yankees Cap", category: "caps-and-hats", description: "Two-tone cream and brown baseball cap with an embroidered NY logo and adjustable strap.", price: 175, offerPrice: null, sizes: [], stock: 40, bestseller: false },
  { image: "img8.jpg", name: "TNF Beanie", category: "caps-and-hats", description: "Chunky ribbed knit beanie in tan with a fold-over cuff.", price: 210, offerPrice: 180, sizes: [], stock: 38, bestseller: false },
  { image: "img9.jpg", name: "Black Trousers", category: "trousers-and-jeans", description: "Tailored black trousers with a straight leg — smart enough for work and events.", price: 120, offerPrice: null, sizes: ["28", "30", "32", "34", "36"], stock: 75, bestseller: false },
  { image: "img10.jpg", name: "Baggy Gray Jeans", category: "trousers-and-jeans", description: "Wide-leg baggy jeans in a washed grey with a faded finish.", price: 135, offerPrice: null, sizes: ["28", "30", "32", "34", "36"], stock: 50, bestseller: true },
  { image: "img11.jpg", name: "Denim Jorts", category: "shorts", description: "Light-wash denim shorts with a slightly distressed finish.", price: 290, offerPrice: 250, sizes: ["28", "30", "32", "34", "36", "38"], stock: 35, bestseller: true },
  { image: "img12.jpg", name: "Washed Barrel Jeans", category: "trousers-and-jeans", description: "Grey washed jeans with a curved barrel leg and relaxed fit.", price: 95, offerPrice: null, sizes: ["28", "30", "32", "34"], stock: 60, bestseller: false },
  { image: "img13.jpg", name: "White Graphic Hoodie", category: "hoodies-and-sweatshirts", description: "White pullover hoodie with a black ink graphic print on the sleeve.", price: 80, offerPrice: 65, sizes: LETTER, stock: 70, bestseller: false },
  { image: "img14.jpg", name: "White NY Sweatshirt", category: "hoodies-and-sweatshirts", description: "White crew-neck sweatshirt with a small NY logo on the chest.", price: 105, offerPrice: null, sizes: LETTER, stock: 45, bestseller: false },
  { image: "img15.jpg", name: "Dark Wash Denim Shorts", category: "shorts", description: "Knee-length denim shorts in a dark vintage wash.", price: 65, offerPrice: 50, sizes: ["28", "30", "32", "34", "36"], stock: 100, bestseller: false },
  { image: "img16.jpg", name: "Black Boxer Briefs", category: "underwear", description: "Black stretch boxer briefs with a contrast logo waistband.", price: 240, offerPrice: 200, sizes: ["S", "M", "L", "XL"], stock: 42, bestseller: false },
  { image: "img17.jpg", name: "Tan Sleeveless Top", category: "t-shirts-and-tops", description: "Relaxed sleeveless top in a soft tan with a small chest logo.", price: 195, offerPrice: null, sizes: LETTER, stock: 50, bestseller: true },
  { image: "img18.jpg", name: "White Ribbed Tank Top", category: "t-shirts-and-tops", description: "Classic white ribbed tank top — wear alone or as a base layer.", price: 210, offerPrice: 175, sizes: LETTER, stock: 38, bestseller: true },
  { image: "img19.jpg", name: "Black Ribbed Tank Top", category: "t-shirts-and-tops", description: "Fitted black ribbed tank top with a scoop neckline.", price: 350, offerPrice: 300, sizes: ["S", "M", "L", "XL"], stock: 25, bestseller: false },
  { image: "img20.jpg", name: "Beige Cargo Pants", category: "trousers-and-jeans", description: "Beige wide-leg cargo pants with side utility pockets.", price: 180, offerPrice: null, sizes: ["28", "30", "32", "34", "36"], stock: 48, bestseller: false },
];
