import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { ProductsService } from './products.service';

describe('ProductsService', () => {
  let service: ProductsService;

  const prisma = {
    product: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
  };

  const sample = [
    { id: 1, name: 'Cà phê sữa', price: 29000, imageUrl: '/img/1.jpg' },
    { id: 2, name: 'Trà đào', price: 35000, imageUrl: '/img/2.jpg' },
  ];

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
  });

  describe('findAll', () => {
    it('trả về danh sách sản phẩm sắp xếp theo id tăng dần', async () => {
      prisma.product.findMany.mockResolvedValue(sample);

      const result = await service.findAll();

      expect(result).toEqual(sample);
      expect(prisma.product.findMany).toHaveBeenCalledWith({
        select: { id: true, name: true, price: true, imageUrl: true },
        orderBy: { id: 'asc' },
      });
    });

    it('trả về mảng rỗng khi chưa có sản phẩm', async () => {
      prisma.product.findMany.mockResolvedValue([]);

      await expect(service.findAll()).resolves.toEqual([]);
    });
  });

  describe('findOne', () => {
    it('trả về sản phẩm khi tồn tại', async () => {
      prisma.product.findUnique.mockResolvedValue(sample[0]);

      const result = await service.findOne(1);

      expect(result).toEqual(sample[0]);
      expect(prisma.product.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        select: { id: true, name: true, price: true, imageUrl: true },
      });
    });

    it('ném NotFoundException khi không tìm thấy sản phẩm', async () => {
      prisma.product.findUnique.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });
});
