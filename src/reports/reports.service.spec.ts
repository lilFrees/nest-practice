import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { Report } from './reports.entity';
import { User } from '../users/user.entity';
import { CreateReportDto } from './dto/create-report.dto';
import { GetEstimateDto } from './dto/get-estimate.dto';

describe('ReportsService', () => {
  let service: ReportsService;
  let repo: {
    create: jest.Mock;
    save: jest.Mock;
    find: jest.Mock;
    findOne: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let qb: Record<string, jest.Mock>;

  const user = { id: 1, email: 'a@a.com', name: 'A' } as User;
  const reportDto: CreateReportDto = {
    make: 'toyota',
    model: 'corolla',
    year: 2018,
    mileage: 50_000,
    lat: 41.3,
    lng: 69.2,
    price: 12_000,
  };

  beforeEach(async () => {
    qb = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      setParameters: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue({ price: 11_500 }),
    };

    repo = {
      create: jest.fn((dto: Partial<Report>) => ({ ...dto }) as Report),
      save: jest.fn((report: Report) => Promise.resolve({ id: 1, ...report })),
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      createQueryBuilder: jest.fn(() => qb),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        { provide: getRepositoryToken(Report), useValue: repo },
      ],
    }).compile();

    service = module.get<ReportsService>(ReportsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('creates a report from the dto, attaches the user and saves it', async () => {
      const report = await service.create(reportDto, user);

      expect(repo.create).toHaveBeenCalledWith(reportDto);
      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({ ...reportDto, user }),
      );
      expect(report).toMatchObject({ id: 1, ...reportDto, user });
    });
  });

  describe('getAll', () => {
    it('returns all reports from the repository', async () => {
      const reports = [{ id: 1 }, { id: 2 }] as Report[];
      repo.find.mockResolvedValue(reports);

      await expect(service.getAll()).resolves.toEqual(reports);
      expect(repo.find).toHaveBeenCalled();
    });
  });

  describe('changeApproval', () => {
    it('throws NotFoundException if the report does not exist', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.changeApproval('42', true)).rejects.toThrow(
        NotFoundException,
      );
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('looks the report up by the numeric id', async () => {
      repo.findOne.mockResolvedValue({ id: 42, approved: false });

      await service.changeApproval('42', true);

      expect(repo.findOne).toHaveBeenCalledWith({ where: { id: 42 } });
    });

    it('approves a report', async () => {
      repo.findOne.mockResolvedValue({ id: 5, approved: false });

      const report = await service.changeApproval('5', true);

      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({ id: 5, approved: true }),
      );
      expect(report.approved).toBe(true);
    });

    it('rejects (un-approves) a report', async () => {
      repo.findOne.mockResolvedValue({ id: 5, approved: true });

      const report = await service.changeApproval('5', false);

      expect(report.approved).toBe(false);
    });
  });

  describe('createEstimate', () => {
    const query: GetEstimateDto = {
      make: 'toyota',
      model: 'corolla',
      year: 2018,
      mileage: 50_000,
      lat: 41.3,
      lng: 69.2,
    };

    it('returns the raw result of the query', async () => {
      await expect(service.createEstimate(query)).resolves.toEqual({
        price: 11_500,
      });
    });

    it('averages price and filters by make, model, location, year and approval', async () => {
      await service.createEstimate(query);

      expect(qb.select).toHaveBeenCalledWith('AVG(price)', 'price');
      expect(qb.where).toHaveBeenCalledWith('make = :make', {
        make: 'toyota',
      });
      expect(qb.andWhere).toHaveBeenCalledWith('model = :model', {
        model: 'corolla',
      });
      expect(qb.andWhere).toHaveBeenCalledWith('lng - :lng BETWEEN -5 and 5', {
        lng: 69.2,
      });
      expect(qb.andWhere).toHaveBeenCalledWith('lat - :lat BETWEEN -5 and 5', {
        lat: 41.3,
      });
      expect(qb.andWhere).toHaveBeenCalledWith(
        'year - :year BETWEEN -3 and 3',
        { year: 2018 },
      );
      expect(qb.andWhere).toHaveBeenCalledWith('approved is TRUE');
    });

    it('orders by mileage and limits to 3 rows', async () => {
      await service.createEstimate(query);

      expect(qb.orderBy).toHaveBeenCalledWith('mileage - :mileage', 'DESC');
      expect(qb.setParameters).toHaveBeenCalledWith({ mileage: 50_000 });
      expect(qb.limit).toHaveBeenCalledWith(3);
      expect(qb.getRawOne).toHaveBeenCalled();
    });
  });
});
