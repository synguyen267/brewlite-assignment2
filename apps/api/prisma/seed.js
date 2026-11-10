const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const products = [
  { name: 'Cà phê sữa', price: 35000, imageUrl: 'https://picsum.photos/seed/ca-phe-sua/400/300' },
  { name: 'Americano', price: 40000, imageUrl: 'https://picsum.photos/seed/americano/400/300' },
  { name: 'Cappuccino', price: 45000, imageUrl: 'https://picsum.photos/seed/cappuccino/400/300' },
  { name: 'Latte', price: 45000, imageUrl: 'https://picsum.photos/seed/latte/400/300' },
  { name: 'Bạc xỉu', price: 38000, imageUrl: 'https://picsum.photos/seed/bac-xiu/400/300' },
  { name: 'Trà đào', price: 39000, imageUrl: 'https://picsum.photos/seed/tra-dao/400/300' },
  { name: 'Trà vải', price: 39000, imageUrl: 'https://picsum.photos/seed/tra-vai/400/300' },
  { name: 'Matcha latte', price: 50000, imageUrl: 'https://picsum.photos/seed/matcha/400/300' },
  { name: 'Cà phê kem trứng', price: 60000, imageUrl: 'https://picsum.photos/seed/ca-phe-kem-trung/400/300' },
  { name: 'Cà phê kem muối' , price: 55000, imageUrl: 'https://picsum.photos/seed/ca-phe-kem-muoi/400/300' },
  { name: 'Trà sữa trân châu', price: 45000, imageUrl: 'https://picsum.photos/seed/tra-sua-tran-chau/400/300' },
  { name: 'Trà sữa kem', price: 50000, imageUrl: 'https://picsum.photos/seed/tra-sua-kem/400/300' },
];

async function main() {
  // Không ghi đè khi đã có dữ liệu (tránh xóa menu và lỗi khóa ngoại khi đã có
  // đơn hàng). Đặt SEED_RESET=true để xóa và nạp lại từ đầu.
  const existing = await prisma.product.count();
  if (existing > 0 && process.env.SEED_RESET !== 'true') {
    console.log(`Bỏ qua seed: đã có ${existing} sản phẩm`);
    return;
  }
  await prisma.product.deleteMany();
  await prisma.product.createMany({ data: products });
  console.log(`Seed xong: ${products.length} sản phẩm`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());