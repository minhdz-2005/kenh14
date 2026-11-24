import { Transform } from 'class-transformer';
import { IsOptional, IsString, Length, Matches } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateArticleFieldsDto {
  @ApiPropertyOptional({ example: '', maxLength: 200 })
  @Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    return value.trim() || undefined;
  })
  @IsOptional()
  @IsString()
  @Length(1, 200)
  title?: string;

  @ApiPropertyOptional({ example: '', maxLength: 1000 })
  @Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    return value.trim() || undefined;
  })
  @IsOptional()
  @IsString()
  @Length(1, 1000)
  description?: string;

  @ApiPropertyOptional({ example: '' })
  @Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    return value.trim() ? value : undefined;
  })
  @IsOptional()
  @IsString()
  @Length(1, 100000)
  @Matches(/\S/)
  body?: string;
}
