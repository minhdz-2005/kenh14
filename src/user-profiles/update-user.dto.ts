import { Transform, Type } from 'class-transformer';
import {
  IsEmail,
  IsDefined,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserFieldsDto {
  @ApiPropertyOptional({ example: 'minh@example.com' })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsEmail()
  @MaxLength(254)
  email?: string;

  @ApiPropertyOptional({ example: 'minhnguyen', minLength: 3, maxLength: 30 })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(3, 30)
  @Matches(/^[a-zA-Z0-9_-]+$/)
  username?: string;

  @ApiPropertyOptional({ minLength: 8, maxLength: 72 })
  @IsOptional()
  @IsString()
  @Length(8, 72)
  password?: string;

  @ApiPropertyOptional({ example: 'I write about technology.' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  bio?: string | null;
}

export class UpdateUserDto {
  @ApiProperty({ type: UpdateUserFieldsDto })
  @IsDefined()
  @ValidateNested()
  @Type(() => UpdateUserFieldsDto)
  user!: UpdateUserFieldsDto;
}
