import { Injectable, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Report } from './reports.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateReportDto } from './dto/create-report.dto';
import { User } from '../users/user.entity';
import { GetEstimateDto } from './dto/get-estimate.dto';

@Injectable()
export class ReportsService {
  constructor(@InjectRepository(Report) private repo: Repository<Report>) {}

  create(reportDto: CreateReportDto, user: User) {
    const report = this.repo.create(reportDto);
    report.user = user;

    return this.repo.save(report);
  }

  getAll() {
    return this.repo.find();
  }

  async changeApproval(id: string, approved: boolean) {
    const report = await this.repo.findOne({ where: { id: parseInt(id) } });

    if (!report) {
      throw new NotFoundException('report not found');
    }

    report.approved = approved;
    return this.repo.save(report);
  }

  createEstimate({ make, model, lat, lng, mileage, year }: GetEstimateDto) {
    return this.repo
      .createQueryBuilder()
      .limit(3)
      .select('AVG(price)', 'price')
      .where('make = :make', { make })
      .andWhere('model = :model', { model })
      .andWhere('lng - :lng BETWEEN -5 and 5', { lng })
      .andWhere('lat - :lat BETWEEN -5 and 5', { lat })
      .andWhere('year - :year BETWEEN -3 and 3', { year })
      .andWhere('approved is TRUE')
      .orderBy('mileage - :mileage', 'DESC')
      .setParameters({ mileage })
      .getRawOne();
  }
}
