import type { Property } from "@/types";
import property1 from "@/assets/property-1.jpg";
import property2 from "@/assets/property-2.jpg";
import property3 from "@/assets/property-3.jpg";

export const properties: Property[] = [
  {
    id: "prop-001",
    title: "Residencia Premium en Lomas de Angelópolis",
    price: "$12,500,000 MXN",
    location: "Lomas de Angelópolis, Puebla",
    beds: 4,
    baths: 3,
    sqft: "320 m²",
    imageUrl: property1,
    featured: true,
  },
  {
    id: "prop-002",
    title: "Casa de Lujo en La Vista Country Club",
    price: "$18,900,000 MXN",
    location: "La Vista Country Club, Puebla",
    beds: 5,
    baths: 4,
    sqft: "410 m²",
    imageUrl: property2,
    featured: true,
  },
  {
    id: "prop-003",
    title: "Departamento Moderno en Sonterra",
    price: "$6,200,000 MXN",
    location: "Sonterra, Angelópolis",
    beds: 3,
    baths: 2,
    sqft: "180 m²",
    imageUrl: property3,
    featured: true,
  },
];

export const stats = [
  { value: "850+", label: "Propiedades Listadas" },
  { value: "3,200+", label: "Clientes Satisfechos" },
  { value: "45+", label: "Reconocimientos" },
];
