import { Transform, Type } from 'class-transformer';
import {
  IsDefined,
  IsString,
  Length,
  Matches,
  ValidateNested,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateArticleFieldsDto {
  @ApiProperty({ example: 'A new article', maxLength: 200 })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(1, 200)
  title!: string;

  @ApiProperty({ example: 'A short description', maxLength: 1000 })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(1, 1000)
  description!: string;

  @ApiProperty({ example: 'Article content goes here.' })
  @IsString()
  @Length(1, 100000)
  @Matches(/\S/)
  body!: string;
}

export class CreateArticleDto {
  @ApiProperty({ type: CreateArticleFieldsDto })
  @IsDefined()
  @ValidateNested()
  @Type(() => CreateArticleFieldsDto)
  article!: CreateArticleFieldsDto;
}
