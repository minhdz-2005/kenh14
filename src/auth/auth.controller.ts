import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { CurrentUser } from './current-user.decorator';
import { JwtAuthGuard } from './jwt-auth.guard';
import { AuthenticatedUser } from './auth.types';
import { LoginUserDto } from './dto/login-user.dto';
import { RegisterUserDto } from './dto/register-user.dto';

@ApiTags('auth')
@Controller()
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('users')
  @ApiOperation({ summary: 'Register a user' })
  @ApiCreatedResponse({ description: 'The new user and access token' })
  register(@Body() body: RegisterUserDto) {
    return this.auth.register(body.user);
  }

  @Post('users/login')
  @ApiOperation({ summary: 'Log in with email and password' })
  @ApiOkResponse({ description: 'The authenticated user and access token' })
  login(@Body() body: LoginUserDto) {
    return this.auth.login(body.user);
  }

  @Get('user')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get the current authenticated user' })
  @ApiOkResponse({ description: 'The current user and current access token' })
  getCurrentUser(@CurrentUser() user: AuthenticatedUser) {
    return this.auth.getCurrentUser(user);
  }

  @Post('users/logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke the current access token' })
  @ApiNoContentResponse({ description: 'The token has been revoked' })
  async logout(@CurrentUser() user: AuthenticatedUser): Promise<void> {
    await this.auth.logout(user);
  }
}
