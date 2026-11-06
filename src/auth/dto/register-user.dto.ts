import { Type } from 'class-transformer';
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

export class RegisterCredentialsDto {
  @ApiProperty({ example: 'minh@example.com' })
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @ApiProperty({ example: 'minhnguyen', minLength: 3, maxLength: 30 })
  @IsString()
  @Length(3, 30)
  @Matches(/^[a-zA-Z0-9_-]+$/)
  username!: string;

  @ApiProperty({ example: 'a-strong-password', minLength: 8, maxLength: 72 })
  @IsString()
  @Length(8, 72)
  password!: string;
}

export class RegisterUserDto {
  @ApiProperty({ type: RegisterCredentialsDto })
  @IsDefined()
  @ValidateNested()
  @Type(() => RegisterCredentialsDto)
  user!: RegisterCredentialsDto;
}
