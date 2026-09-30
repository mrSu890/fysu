export type ProductImage = {
  id: number;
  url: string;
  color: string;
};

export type ProductSize = {
  id: string;        
  product_id: number;
  size: string;
  stock: number;
  is_active: boolean;
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
  release_date?: string | null;
  category: string;
  colors: number;
  details?: string | null;
  size_fit?: string | null;
  care_instructions: string | null;
  shipping: string | null;
  size_guide_image_url?: string | null

  category_id: number | null;  

  categories?: Pick<Category, "id" | "name"> | null;

  product_images: ProductImage[];
  product_sizes: ProductSize[];

  product_suggestions: ProductType[];

  product_info_blocks: InfoBloc[];
};
