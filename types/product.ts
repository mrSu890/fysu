export type ProductImage = {
  id: number;
  url: string;
  color: string;
};

export type ProductColor = {
  id: string;
  product_id: number;
  name: string;
  hex: string;
  display_order: number;
};

export type ProductSize = {
  id: string;        
  product_id: number;
  size: string;
  stock: number;
  is_active: boolean;
  color_id?: string | null;
};

export type Category = {
  id: number;
  name: string;
  slug: string;
};

export type InfoBloc = {
  id: string;
  image_url: string;
  title: string;
  subtitle: string;
  content: string;
}

export type ProductType = {
  id: number;
  name: string;
  description: string;
  price: number;
  createdAt: string;          
  slug: string;
  gender: string;
  product_type?: string | null;
  availability?: string | null;
  brand?: string | null;
  wave_bg?: string | null;
  olfactive_family?: string | null;
  evocation?: string | null;
  release_date?: string | null;
  category: string;
  colors: number;
  details?: string | null;
  size_fit?: string | null;
  care_instructions: string | null;
  shipping: string | null;
  size_guide_image_url?: string | null
  size_guide?: import("@/lib/sizeGuide").SizeGuide | null

  category_id: number | null;  

  categories?: Pick<Category, "id" | "name"> | null;

  product_images: ProductImage[];
  product_sizes: ProductSize[];
  product_colors?: ProductColor[];

  product_suggestions: ProductType[];

  product_info_blocks: InfoBloc[];
};
