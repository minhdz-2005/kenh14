import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: '' })
  @Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    return value.trim().toLowerCase() || undefined;
  })
  @ValidateIf((_object, value) => value !== undefined)
  @IsEmail()
  @MaxLength(254)
  email?: string;

  @ApiPropertyOptional({ example: '', minLength: 3, maxLength: 30 })
  @Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    return value.trim() || undefined;
  })
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @Length(3, 30)
  @Matches(/^[a-zA-Z0-9_-]+$/)
  username?: string;

  @ApiPropertyOptional({ example: '', maxLength: 100 })
  @Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    return value.trim() || undefined;
  })
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @Length(1, 100)
  name?: string;

  @ApiPropertyOptional({ example: '', maxLength: 2000 })
  @Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    if (value.length === 0) return undefined;
    return value.trim() || null;
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  bio?: string | null;

  @ApiPropertyOptional({ example: '', maxLength: 150 })
  @Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    return value.trim() || undefined;
  })
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MaxLength(150)
  workAt?: string | null;

  @ApiPropertyOptional({ example: '', maxLength: 150 })
  @Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    return value.trim() || undefined;
  })
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MaxLength(150)
  location?: string | null;
}
