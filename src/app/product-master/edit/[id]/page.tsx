"use client";

import { ProductForm } from "@/components/product-master/product-form";
import { useParams } from "next/navigation";

export default function EditProductPage() {
    const params = useParams();
    const id = params?.id as string;
    
    if (!id) return null;

    return <ProductForm isEdit productId={id} />;
}
