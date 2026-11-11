import { Transform, Type } from 'class-transformer';
import {
  IsDefined,
  IsEmail,
  IsString,
  Length,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { MaxPasswordBytes } from './max-password-bytes.validator';
import {
  MAX_PASSWORD_BYTES,
  MIN_PASSWORD_CHARACTERS,
} from '../password.constants';

export class RegisterCredentialsDto {
  @ApiProperty({ example: 'minh@example.com' })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @ApiProperty({ example: 'minhnguyen', minLength: 3, maxLength: 30 })
  @IsString()
  @Length(3, 30)
  @Matches(/^[a-zA-Z0-9_-]+$/)
  username!: string;

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

export class RegisterUserDto {
  @ApiProperty({ type: RegisterCredentialsDto })
  @IsDefined()
  @ValidateNested()
  @Type(() => RegisterCredentialsDto)
  user!: RegisterCredentialsDto;
}
