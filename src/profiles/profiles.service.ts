import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Profile } from './profile.entity';

@Injectable()
export class ProfilesService {
  constructor(
    @InjectRepository(Profile)
    private readonly profiles: Repository<Profile>,
  ) {}

  findByUsername(username: string): Promise<Profile | null> {
    return this.profiles.findOne({
      where: { user: { username } },
      relations: { user: true },
    });
  }
}
