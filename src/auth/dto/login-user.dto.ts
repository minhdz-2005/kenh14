import { Type } from 'class-transformer';
import {
  IsDefined,
  IsEmail,
  IsString,
  Length,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginCredentialsDto {
  @ApiProperty({ example: 'minh@example.com' })
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @ApiProperty({ example: 'a-strong-password', minLength: 8, maxLength: 72 })
  @IsString()
  @Length(8, 72)
  password!: string;
}

export class LoginUserDto {
  @ApiProperty({ type: LoginCredentialsDto })
  @IsDefined()
  @ValidateNested()
  @Type(() => LoginCredentialsDto)
  user!: LoginCredentialsDto;
}
