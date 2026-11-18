import { Transform, Type } from 'class-transformer';
import { IsDefined, IsString, Length, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCommentFieldsDto {
  @ApiProperty({ example: 'Nice article!', maxLength: 2000 })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(1, 2000)
  body!: string;
}

export class CreateCommentDto {
  @ApiProperty({ type: CreateCommentFieldsDto })
  @IsDefined()
  @ValidateNested()
  @Type(() => CreateCommentFieldsDto)
  comment!: CreateCommentFieldsDto;
}