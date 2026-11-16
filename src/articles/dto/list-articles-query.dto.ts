import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, Length, Max, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

function toOptionalInteger(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  if (value.trim() === '') return undefined;
  return Number(value);
}

function trimOptionalString(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  return value.trim() || undefined;
}

export class ListArticlesQueryDto {
  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20 })
  @Transform(({ value }) => toOptionalInteger(value))
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ minimum: 0, default: 0 })
  @Transform(({ value }) => toOptionalInteger(value))
  @IsOptional()
  @IsInt()
  @Min(0)
  offset?: number;

  @ApiPropertyOptional({ maxLength: 30 })
  @Transform(({ value }) => trimOptionalString(value))
  @IsOptional()
  @IsString()
  @Length(3, 30)
  author?: string;

  @ApiPropertyOptional({ maxLength: 30 })
  @Transform(({ value }) => trimOptionalString(value))
  @IsOptional()
  @IsString()
  @Length(3, 30)
  favorited?: string;
}
