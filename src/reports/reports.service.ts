import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Report } from './reports.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateReportDto } from './dto/create-report.dto';

@Injectable()
export class ReportsService {
  constructor(@InjectRepository(Report) private repo: Repository<Report>) {}

  async create(reportDto: CreateReportDto) {
    const report = this.repo.create(reportDto);

    return this.repo.save(report);
  }
}
