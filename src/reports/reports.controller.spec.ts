import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { Report } from './reports.entity';
import { User } from '../users/user.entity';
import { CreateReportDto } from './dto/create-report.dto';
import { GetEstimateDto } from './dto/get-estimate.dto';

describe('ReportsController', () => {
  let controller: ReportsController;
  let fakeReportsService: {
    create: jest.Mock;
    changeApproval: jest.Mock;
    createEstimate: jest.Mock;
  };

  const user = { id: 7, email: 'a@a.com', name: 'A' } as User;
  const reportDto: CreateReportDto = {
    make: 'honda',
    model: 'civic',
    year: 2015,
    mileage: 80_000,
    lat: 40,
    lng: 70,
    price: 9_000,
  };

  beforeEach(async () => {
    fakeReportsService = {
      create: jest.fn((dto: CreateReportDto, u: User) =>
        Promise.resolve({ id: 1, approved: false, ...dto, user: u } as Report),
      ),
      changeApproval: jest.fn((id: string, approved: boolean) =>
        Promise.resolve({ id: parseInt(id), approved } as Report),
      ),
      createEstimate: jest.fn().mockResolvedValue({ price: 8_500 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReportsController],
      providers: [{ provide: ReportsService, useValue: fakeReportsService }],
    }).compile();

    controller = module.get<ReportsController>(ReportsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('createReport passes the body and current user to the service', async () => {
    const report = await controller.createReport(reportDto, user);

    expect(fakeReportsService.create).toHaveBeenCalledWith(reportDto, user);
    expect(report).toMatchObject({ ...reportDto, user });
  });

  it('approveReport passes the id and approved flag to the service', async () => {
    const report = await controller.approveReport('3', { approved: true });

    expect(fakeReportsService.changeApproval).toHaveBeenCalledWith('3', true);
    expect(report).toEqual({ id: 3, approved: true });
  });

  it('approveReport propagates NotFoundException from the service', async () => {
    fakeReportsService.changeApproval.mockRejectedValue(
      new NotFoundException('report not found'),
    );

    await expect(
      controller.approveReport('999', { approved: true }),
    ).rejects.toThrow(NotFoundException);
  });

  it('getEstimate passes the query to the service and returns the estimate', async () => {
    const query: GetEstimateDto = {
      make: 'honda',
      model: 'civic',
      year: 2015,
      mileage: 80_000,
      lat: 40,
      lng: 70,
    };

    await expect(controller.getEstimate(query)).resolves.toEqual({
      price: 8_500,
    });
    expect(fakeReportsService.createEstimate).toHaveBeenCalledWith(query);
  });
});
