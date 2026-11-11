import { Transform, Type } from 'class-transformer';
import {
  IsDefined,
  IsEmail,
  IsString,
  Length,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { MaxPasswordBytes } from './max-password-bytes.validator';
import {
  MAX_PASSWORD_BYTES,
  MIN_PASSWORD_CHARACTERS,
} from '../password.constants';

export class LoginCredentialsDto {
  @ApiProperty({ example: 'minh@example.com' })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @ApiProperty({
    example: 'a-strong-password',
    minLength: MIN_PASSWORD_CHARACTERS,
    maxLength: MAX_PASSWORD_BYTES,
  })
  @IsString()
  @MaxPasswordBytes()
  @Length(MIN_PASSWORD_CHARACTERS, MAX_PASSWORD_BYTES)
  password!: string;
}

export class LoginUserDto {
  @ApiProperty({ type: LoginCredentialsDto })
  @IsDefined()
  @ValidateNested()
  @Type(() => LoginCredentialsDto)
  user!: LoginCredentialsDto;
}
