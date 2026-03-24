const fs = require('fs');

// Master
let m = fs.readFileSync('src/app/product-master/page.tsx', 'utf8');
m = m.replace('import { useProducts } from "@/lib/use-products";', 'import { useProducts } from "@/contexts/ProductsContext";');
m = m.replace('const { products, isLoaded', 'const { products, loading');
m = m.replace('if (!isLoaded', 'if (loading');
m = m.replace(/product\.partNumber\}/g, 'product.part_number}');
m = m.replace(/\{product\.([a-zA-Z]+)\}/g, '{(product as any).$1 || product.specification?.$1}');
fs.writeFileSync('src/app/product-master/page.tsx', m);

// Specs
let s = fs.readFileSync('src/app/product-specifications/page.tsx', 'utf8');
s = s.replace('import { useProducts } from "@/lib/use-products";', 'import { useProducts } from "@/contexts/ProductsContext";');
s = s.replace('const { products, isLoaded', 'const { products, loading');
s = s.replace('if (!isLoaded', 'if (loading');
s = s.replace(/p\.partNumber/g, 'p.part_number');
s = s.replace(/partInfo\?\.(?!part_number|partDescription|specification)([a-zA-Z]+)/g, '(partInfo?.$1 || partInfo?.specification?.$1)');
fs.writeFileSync('src/app/product-specifications/page.tsx', s);

console.log('Fixed properly!');
