export const formatPrice = (precio: number): string => {
  return `$${precio.toLocaleString("es-MX")} MXN`;
};
