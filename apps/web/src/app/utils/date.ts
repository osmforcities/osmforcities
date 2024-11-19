const numberFormat = new Intl.NumberFormat("en", { style: "decimal" });

export const getAge = (timestamp: string) => {
  const start = new Date(timestamp);
  const now = new Date();
  const diffInDays = Math.floor(
    (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffInDays >= 365)
    return `${numberFormat.format(Math.floor(diffInDays / 365))} y`;
  if (diffInDays >= 30)
    return `${numberFormat.format(Math.floor(diffInDays / 30))} mo`;
  if (diffInDays >= 7)
    return `${numberFormat.format(Math.floor(diffInDays / 7))} w`;
  return `${numberFormat.format(diffInDays)}d`;
};
