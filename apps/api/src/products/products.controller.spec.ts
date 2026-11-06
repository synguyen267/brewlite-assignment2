import { Test, TestingModule } from '@nestjs/testing';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

describe('ProductsController', () => {
  let controller: ProductsController;

  const productsService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [{ provide: ProductsService, useValue: productsService }],
    }).compile();

    controller = module.get<ProductsController>(ProductsController);
  });

  it('GET /products gọi service.findAll và trả kết quả', async () => {
    const products = [{ id: 1, name: 'Cà phê sữa', price: 29000 }];
    productsService.findAll.mockResolvedValue(products);

    await expect(controller.findAll()).resolves.toEqual(products);
    expect(productsService.findAll).toHaveBeenCalledTimes(1);
  });

  it('GET /products/:id gọi service.findOne với đúng id', async () => {
    const product = { id: 7, name: 'Trà đào', price: 35000 };
    productsService.findOne.mockResolvedValue(product);

    await expect(controller.findOne(7)).resolves.toEqual(product);
    expect(productsService.findOne).toHaveBeenCalledWith(7);
  });
});
